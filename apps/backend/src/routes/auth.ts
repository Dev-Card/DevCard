import { handleDbError, isGitHubTokenError, isGoogleTokenError } from '../utils/error.util.js';
import { extractRawJwt, blocklistKey, signAccessToken  } from '../utils/jwt.js';
import { buildOAuthState, getMobileRedirectUri } from '../utils/oauth.js';
import { generateRefreshToken, hashIp, hashRefreshToken } from '../utils/refreshToken.js';
import { oAuthStartSchema } from '../validations/auth.validation.js';

import type { GitHubTokenErrorResponse, GitHubTokenResponse } from '../utils/error.util.js';
import type { OAuthStartQuery } from '../validations/auth.validation.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface GitHubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
}

const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

interface OAuthCallbackQuery {
  code: string;
  state?: string;
}

interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}


export async function authRoutes(app: FastifyInstance): Promise<void> {
  // Developer login bypass (development only)
  if (process.env.NODE_ENV !== 'production') {
    app.post('/dev-login', async (request: FastifyRequest, reply: FastifyReply) => {
      const user = await app.prisma.user.findUnique({ where: { username: 'devcard-demo' } });
      if (!user) {
        return reply.status(404).send({ error: 'Demo user not seeded' });
      }
      const token = app.jwt.sign({ id: user.id, username: user.username }, { expiresIn: '30d' });
      return { token };
    });
  }

  // GitHub OAuth start
  app.get('/github', async (request: FastifyRequest<{Querystring:  OAuthStartQuery}>, reply: FastifyReply) => {
    const clientId = process.env.GITHUB_CLIENT_ID; 
    if(!clientId){
      return reply.status(400).send()
    }
    const redirectUri = `${process.env.BACKEND_URL}/auth/github/callback`;

    const parsed = oAuthStartSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }
    const { state: clientState, mobile_redirect_uri: mobileRedirectUri } = parsed.data;
    const state = buildOAuthState(clientState, mobileRedirectUri);

    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });

    const params = new URLSearchParams({
      client_id: clientId, 
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      state,
    });

    const authUrl = `${GITHUB_AUTH_URL}?${params}`;
    app.log.debug({ provider: 'github' }, 'OAuth redirect initiated');
    return reply.redirect(authUrl);
  });

  // GitHub OAuth callback
  app.get('/github/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    //TODO: Add zod validation here
    const { code, state } = request.query;
    const storedState = request.cookies?.oauth_state;
    if (!state || !storedState || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid or missing OAuth state — possible CSRF attack' });
    }
    reply.clearCookie('oauth_state', { path: '/' });

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    try {
      const tokenRes = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: (process.env.GITHUB_CLIENT_ID || '').trim(),
          client_secret: (process.env.GITHUB_CLIENT_SECRET || '').trim(),
          code,
          redirect_uri: `${process.env.BACKEND_URL}/auth/github/callback`,
        }),
      });


    const tokenData = (await tokenRes.json()) as
      GitHubTokenResponse | GitHubTokenErrorResponse;

    if (!tokenRes.ok || isGitHubTokenError(tokenData)) {
      app.log.error(
        { tokenData, status: tokenRes.status },
        'GitHub token exchange failed',
      );

      return reply.status(400).send({
        error: 'Failed to authenticate with GitHub',
      });
    }
      const userRes = await fetch(GITHUB_USER_URL, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      const githubUser = (await userRes.json()) as GitHubUserResponse;;

      let email = githubUser.email;
      if (!email) {
        const emailsRes = await fetch('https://api.github.com/user/emails', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const emails = (await emailsRes.json()) as GitHubEmailResponse[];
        const primary = emails.find(
          (e) => e.primary && e.verified,
        );

        email = primary?.email ?? null;
      }

      if (!email) {
        return reply.status(400).send({
          error: 'No email returned by GitHub',
        });
      }

      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');

      const identity = await app.prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'github', 
            providerId: githubUser.id.toString()
          },
        },
        include: {
          user: true
        }
      })

      let user; 

      if (identity) {
        user = await app.prisma.user.update({
          where: {
            id: identity.user.id,
          },
          data: {
            email,
            displayName: githubUser.name || baseUsername,
            avatarUrl: githubUser.avatar_url,
            lastSignInAt: new Date(),
            isActive: true
          },
        });
      }else{

        const existingAccount = await app.prisma.user.findUnique({
          where: {
            email
          }
        })

        if(existingAccount){
          await app.prisma.userIdentity.create({
            data: {
              userId: existingAccount.id, 
              provider: 'github',
              providerId: githubUser.id.toString()
            }
          })
          user = existingAccount; 
        }else{
          user = await app.prisma.user.create({
            data: {
              email, 
              username: `${baseUsername}_${Date.now().toString(36)}`,
              displayName: githubUser.name || baseUsername,
              avatarUrl: githubUser.avatar_url,
              emailVerified: true, 
              isActive: true, 
              lastSignInAt: new Date(),
    
              identities: {
                create: {
                  provider: 'github',
                  providerId: githubUser.id.toString()
                }
              }
            }
          })
        }
      }
      
      const accessToken = signAccessToken(app, user)
      const refreshToken = generateRefreshToken()
      const refreshTokenHash = hashRefreshToken(refreshToken); 
      const ip = hashIp(request.ip)
      const userAgent = request.headers['user-agent'] ?? 'unknown';

      await app.prisma.refreshToken.create({
        data: {
          userId: user.id, 
          tokenHash: refreshTokenHash, 
          family: crypto.randomUUID(), 
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          ip, 
          userAgent
        }
      })

      if (request.query.state?.startsWith('mobile_')) {
        const exchangeCode = crypto.randomUUID();
        await app.redis.set(
          `mobile_exchange:${exchangeCode}`,
          JSON.stringify({ accessToken, refreshToken }),
          'EX', 60
        );
        const mobileRedirect = getMobileRedirectUri(request.query.state) 
          || process.env.MOBILE_REDIRECT_URI;
        return reply.redirect(`${mobileRedirect}?code=${exchangeCode}`);
      }

      reply.setCookie('access_Token', accessToken,{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });

      reply.setCookie('refresh_token',  refreshToken,{
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 90 * 24 * 60 * 60,
        },
      );
      return reply.redirect(`${process.env.PUBLIC_APP_URL}/dashboard`);
    } catch (error) {
      app.log.error({ error }, 'GitHub auth error');
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  // Google OAuth start
  app.get('/google', async (request: FastifyRequest<{Querystring: OAuthStartQuery}>, reply: FastifyReply) => {
    const clientId = process.env.GOOGLE_CLIENT_ID; 
    if(!clientId){
      return reply.status(400).send()
    }
    const redirectUri = `${process.env.BACKEND_URL}/auth/google/callback`;
    
    const parsed = oAuthStartSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors[0].message });
    }
    const { state: clientState, mobile_redirect_uri: mobileRedirectUri } = parsed.data;
    const state = buildOAuthState(clientState, mobileRedirectUri);
    
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60,
    });
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'offline',
    });

    const authUrl = `${GOOGLE_AUTH_URL}?${params}`;
    app.log.debug({ provider: 'google' }, 'OAuth redirect initiated');
    return reply.redirect(authUrl);
  });

  // Google callback
  app.get('/google/callback', async (request: FastifyRequest<{ Querystring: OAuthCallbackQuery }>, reply: FastifyReply) => {
    //TODO: Add zod validation here
    const { code, state } = request.query;

    const storedState = request.cookies?.oauth_state;
    if (!state || !storedState || state !== storedState) {
      return reply.status(400).send({ error: 'Invalid or missing OAuth state — possible CSRF attack' });
    }
    reply.clearCookie('oauth_state', { path: '/' });

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    try {
      const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          code,
          redirect_uri: `${process.env.BACKEND_URL}/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = (await tokenRes.json()) as GoogleTokenResponse
      if (!tokenRes.ok || isGoogleTokenError(tokenData)) {
        app.log.error({ tokenData, status: tokenRes.status }, 'Google token exchange failed');
        return reply.status(400).send({ error: 'Failed to authenticate with Google' });
      }

      const userRes = await fetch(GOOGLE_USER_URL, { headers: { Authorization: `Bearer ${tokenData.access_token}` } });
      const googleUser = (await userRes.json()) as GoogleUser;

      const baseUsername = googleUser.email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');

      const identity = await app.prisma.userIdentity.findUnique({
        where: {
          provider_providerId: {
            provider: 'google', 
            providerId: googleUser.id
          },
        },
        include: {
          user: true
        }
      })

      let user; 

      if (identity) {
        user = await app.prisma.user.update({
          where: {
            id: identity.user.id,
          },
          data: {
            email: googleUser.email,
            displayName: googleUser.name || baseUsername,
            avatarUrl: googleUser.picture,
            lastSignInAt: new Date(),
            isActive: true
          },
        });
      }else{
        const existingAccount = await app.prisma.user.findUnique({
          where: {
            email: googleUser.email
          }
        })

        if(existingAccount){
          await app.prisma.userIdentity.create({
            data: {
              userId: existingAccount.id, 
              provider: 'google', 
              providerId: googleUser.id
            }
          })

          user = existingAccount
        }else{
          user = await app.prisma.user.create({
            data: {
              email: googleUser.email, 
              username: `${baseUsername}_${Date.now().toString(36)}`,
              displayName: googleUser.name || baseUsername,
              avatarUrl: googleUser.picture,
              emailVerified: true, 
              isActive: true, 
              lastSignInAt: new Date(),
    
              identities: {
                create: {
                  provider: 'google',
                  providerId: googleUser.id
                }
              }
            }
          })

        }
      }
      
      const accessToken = signAccessToken(app, user)
      const refreshToken = generateRefreshToken()
      const refreshTokenHash = hashRefreshToken(refreshToken); 
      const ip = hashIp(request.ip)
      const userAgent = request.headers['user-agent'] ?? 'unknown';

      await app.prisma.refreshToken.create({
        data: {
          userId: user.id, 
          tokenHash: refreshTokenHash, 
          family: crypto.randomUUID(), 
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          ip, 
          userAgent
        }
      })

      if (request.query.state?.startsWith('mobile_')) {
        const exchangeCode = crypto.randomUUID();
        await app.redis.set(
          `mobile_exchange:${exchangeCode}`,
          JSON.stringify({ accessToken, refreshToken }),
          'EX', 60
        );
        const mobileRedirect = getMobileRedirectUri(request.query.state) 
          || process.env.MOBILE_REDIRECT_URI;
        return reply.redirect(`${mobileRedirect}?code=${exchangeCode}`);
      }

      reply.setCookie('access_Token', accessToken,{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60,
      });

      reply.setCookie('refresh_token',  refreshToken,{
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 90 * 24 * 60 * 60,
        },
      );

      app.log.info({
        user: user.id, 
        provider: 'google'
      }, 'User is authenticated');

      return reply.redirect(`${process.env.PUBLIC_APP_URL}/dashboard`);
    } catch (error) {
      handleDbError(error, request, reply)
      app.log.error({ error }, 'Google auth error');
      return reply.status(500).send({ error: 'Authentication failed' });
    }
  });

  app.post('/refresh', async(request: FastifyRequest, reply: FastifyReply) => {
     const refreshToken = request.cookies.refresh_token ?? (request.body as { refresh_token?: string })?.refresh_token;

    if (!refreshToken) {
      return reply.status(401).send({
        error: 'Refresh token missing',
      });
    }
    const tokenHash = hashRefreshToken(refreshToken); 

    try {
      
      const storedToken = await app.prisma.refreshToken.findUnique({
        where: {
          tokenHash
        }, 
        include: {
          user: true
        }
      })
  
    if (!storedToken) {
      return reply.status(401).send({
        error: 'Invalid refresh token',
      });
    }

    if (storedToken.revokedAt) {
      return reply.status(401).send({
        error: 'Refresh token revoked',
      });
    }

    if(storedToken.expiresAt < new Date()){
      return reply.status(401).send({
        error: 'Refresh token expired',
      });
    }

    await app.prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const newRefreshToken = generateRefreshToken(); 
    const newTokenHash = hashRefreshToken(newRefreshToken); 
    const ip = hashIp(request.ip)
    const userAgent = request.headers['user-agent'] ?? 'unknown';

    const details = {
      id: storedToken.user.id, 
      username: storedToken.user.username
    }

    await app.prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        family: storedToken.family,
        expiresAt: new Date(
          Date.now() + 90 * 24 * 60 * 60 * 1000,
        ),
        userAgent,
        ip,
      },
    });


    const accessToken = signAccessToken(app,details)

    const isMobileRequest = !request.cookies.refresh_token;
    if (isMobileRequest) {
      return reply.status(200).send({ accessToken, refreshToken: newRefreshToken });
    }

    reply.setCookie('access_Token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    reply.setCookie('refresh_token',newRefreshToken,{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 90 * 24 * 60 * 60,
      },
    );

    return reply.status(200).send('Token revoked')
  
    } catch (error) {
      handleDbError(error, request, reply)
      app.log.error(error)
    }

  })

  app.post('/mobile/exchange', async (request: FastifyRequest<{Body: {code: string}}>, reply: FastifyReply) => {
    const { code } = request.body;
    const raw = await app.redis.getdel(`mobile_exchange:${code}`);
    if (!raw) {return reply.status(400).send({ error: 'Invalid or expired exchange code' });}
    
    const { accessToken, refreshToken } = JSON.parse(raw);
    return { accessToken, refreshToken }; 
  });

  // Current user
  app.get('/me', {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.id;
    const user = await app.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        pronouns: true,
        role: true,
        company: true,
        avatarUrl: true,
        accentColor: true,
        createdAt: true,
        oauthTokens: { select: { platform: true, scopes: true, createdAt: true } },
      },
    });

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { oauthTokens, ...userData } = user;
    return { ...userData, connectedPlatforms: oauthTokens };
  });

  // Legacy endpoint kept for backward compatibility with existing clients.
  // Cookie-only logout — use DELETE /auth/logout for token revocation.
  app.post('/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    app.log.info('Legacy cookie-only logout called — token not blocklisted');
    reply.clearCookie('access_Token', { path: '/' });
    return reply.status(200).send({message: 'Logged out',});
  });

  // ─── Secure Logout — blocklists the token in Redis ───
  //
  // Requires a valid JWT so that only the token's owner can revoke it.
  // The token signature is hashed and stored in Redis with a TTL equal to the
  // token's remaining lifetime, so the entry self-cleans when the JWT expires.
  //
  // Tradeoff: if Redis is down the block write is skipped (non-fatal), but the
  // token will still expire naturally based on its exp claim.

  app.delete('/logout', {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const raw = extractRawJwt(request);

    if (raw && app.hasDecorator('redis')) {
      // jwt.decode() skips signature verification — safe here because the
      // authenticate preHandler above already called jwtVerify() successfully.
      const payload = app.jwt.decode<{ exp?: number }>(raw);
      const exp = payload?.exp;

      if (exp) {
        const ttl = exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          try {
            await app.redis.set(blocklistKey(raw), '1', 'EX', ttl);
          } catch (err) {
            // Non-fatal: log and continue. The token will expire on its own.
            app.log.warn({ err, userId: request.user?.id }, 'Redis blocklist write failed during logout — token will expire naturally');
          }
        }
      } else {
        // A JWT without exp cannot be given a finite Redis TTL, so it cannot be
        // actively revoked. This should never happen with tokens signed by this
        // server (we always pass expiresIn), but log a warning so it is
        // visible if a custom or third-party token ever reaches this path.
        app.log.warn(
          'JWT missing exp claim — skipping Redis blocklist; token cannot be actively revoked',
        );
      }
    }

    reply.clearCookie('access_Token', { path: '/' });
    reply.clearCookie('refresh_token', { path: '/' });

    const refreshToken = request.cookies.refresh_token ?? (request.body as { refresh_token?: string })?.refresh_token;
    if (refreshToken) {
      const hash = hashRefreshToken(refreshToken);
      await app.prisma.refreshToken.updateMany({
        where: { tokenHash: hash },
        data: { revokedAt: new Date() },
      });
      return reply.status(200).send({message: 'Logged out',});
    }

    return reply.status(200).send({ message: 'Logged out' });
  });
}

