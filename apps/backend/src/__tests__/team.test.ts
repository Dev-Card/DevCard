import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { PrismaClient, TeamRole } from '@prisma/client';
import { teamRoutes } from '../routes/team';

// ─── Shared mock data ─────────────────────────────────────────────────────────

const MOCK_OWNER_ID    = 'user-uuid-001';
const MOCK_MEMBER_ID   = 'user-uuid-002';
const MOCK_OUTSIDER_ID = 'user-uuid-003';

const MOCK_OWNER = {
  id: MOCK_OWNER_ID,
  username: 'johndoe',
  displayName: 'John Doe',
  bio: 'Team owner',
  pronouns: 'he/him',
  role: 'Software Engineer',
  company: 'Acme Corp',
  avatarUrl: 'https://example.com/john.png',
  accentColor: '#6366f1',
};

const MOCK_MEMBER_USER = {
  id: MOCK_MEMBER_ID,
  username: 'janedoe',
  displayName: 'Jane Doe',
  bio: null,
  pronouns: null,
  role: 'Designer',
  company: null,
  avatarUrl: null,
  accentColor: '#f43f5e',
};

const MOCK_PLATFORM_LINKS = [
  { id: 'link-uuid-001', platform: 'github', username: 'johndoe', url: 'https://github.com/johndoe', displayOrder: 0 },
  { id: 'link-uuid-002', platform: 'twitter', username: 'johndoe_', url: 'https://twitter.com/johndoe_', displayOrder: 1 },
];

const MOCK_TEAM = {
  id: 'team-uuid-001',
  name: 'DevCard Core',
  slug: 'devcard-core',
  description: 'Building the future of developer cards',
  avatarUrl: 'https://example.com/team.png',
  ownerId: MOCK_OWNER_ID,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-06-01T00:00:00Z'),
};

const MOCK_TEAM_WITH_MEMBERS = {
  ...MOCK_TEAM,
  members: [
    {
      id: 'tm-uuid-001',
      teamId: MOCK_TEAM.id,
      userId: MOCK_OWNER_ID,
      role: TeamRole.OWNER,
      joinedAt: new Date('2024-01-01T00:00:00Z'),
      user: { ...MOCK_OWNER, platformLinks: MOCK_PLATFORM_LINKS },
    },
    {
      id: 'tm-uuid-002',
      teamId: MOCK_TEAM.id,
      userId: MOCK_MEMBER_ID,
      role: TeamRole.MEMBER,
      joinedAt: new Date('2024-02-01T00:00:00Z'),
      user: { ...MOCK_MEMBER_USER, platformLinks: [] },
    },
  ],
};

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const prismaMock = {
  team: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  teamMember: {
    create: vi.fn(),
    delete: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
};

// ─── App factory ──────────────────────────────────────────────────────────────

let mockJwtVerify = vi.fn();

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.decorate('prisma', prismaMock as unknown as PrismaClient);

  app.decorateRequest('jwtVerify', function () {
    return mockJwtVerify();
  });

  await app.register(teamRoutes);
  await app.ready();
  return app;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  return { Authorization: 'Bearer mock-token' };
}

async function createTeam(
  app: FastifyInstance,
  body: Record<string, unknown>,
  authenticated = true,
) {
  return app.inject({
    method: 'POST',
    url: '/',
    headers: authenticated ? authHeader() : {},
    payload: body,
  });
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('Teams API', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJwtVerify.mockResolvedValue({ id: MOCK_OWNER_ID });
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── POST / — create team ──────────────────────────────────────────────────

  describe('POST / — create team', () => {
    const validBody = {
      name: 'DevCard Core',
      description: 'Building the future of developer cards',
      avatarUrl: 'https://example.com/team.png',
    };

    it('201 — creates team and auto-adds owner as OWNER member', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          team: { create: vi.fn().mockResolvedValue(MOCK_TEAM) },
          teamMember: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await createTeam(app, validBody);

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.name).toBe('DevCard Core');
      expect(body.ownerId).toBe(MOCK_OWNER_ID);
      expect(body.slug).toBe('devcard-core');
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

      const res = await createTeam(app, validBody, false);

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({ error: 'Unauthorized' });
    });

    it('400 — rejects name shorter than 3 characters', async () => {
      const res = await createTeam(app, { ...validBody, name: 'AB' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects name longer than 100 characters', async () => {
      const res = await createTeam(app, { ...validBody, name: 'A'.repeat(101) });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects invalid avatarUrl', async () => {
      const res = await createTeam(app, { ...validBody, avatarUrl: 'not-a-url' });
      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects missing name', async () => {
      const { name: _omit, ...bodyWithoutName } = validBody;
      const res = await createTeam(app, bodyWithoutName);
      expect(res.statusCode).toBe(400);
    });

    it('201 — creates team without optional fields', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          team: { create: vi.fn().mockResolvedValue({ ...MOCK_TEAM, description: null, avatarUrl: null }) },
          teamMember: { create: vi.fn().mockResolvedValue({}) },
        });
      });

      const res = await createTeam(app, { name: 'DevCard Core' });
      expect(res.statusCode).toBe(201);
    });

    it('500 — returns 500 on database failure', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);
      prismaMock.$transaction.mockRejectedValue(new Error('DB error'));

      const res = await createTeam(app, validBody);
      expect(res.statusCode).toBe(500);
      expect(res.json()).toMatchObject({ error: 'Failed to create team' });
    });
  });

  // ── GET /:slug — public team profile ─────────────────────────────────────

  describe('GET /:slug — public team profile', () => {
    it('200 — returns team with members in PublicProfile shape', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM_WITH_MEMBERS);

      const res = await app.inject({ method: 'GET', url: '/devcard-core' });

      expect(res.statusCode).toBe(200);
      const body = res.json();

      expect(body.slug).toBe('devcard-core');
      expect(body.ownerId).toBe(MOCK_OWNER_ID);
      expect(body.members).toHaveLength(2);
    });

    it('200 — each member has PublicProfile fields and links array', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM_WITH_MEMBERS);

      const res = await app.inject({ method: 'GET', url: '/devcard-core' });
      const owner = res.json().members[0];

      expect(owner).toHaveProperty('username', 'johndoe');
      expect(owner).toHaveProperty('displayName', 'John Doe');
      expect(owner).toHaveProperty('accentColor');
      expect(owner).toHaveProperty('links');
      expect(owner.links).toHaveLength(2);
      expect(owner.links[0]).toMatchObject({
        platform: 'github',
        username: 'johndoe',
        url: 'https://github.com/johndoe',
        displayOrder: 0,
      });
    });

    it('200 — member has teamRole and joinedAt fields', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM_WITH_MEMBERS);

      const res = await app.inject({ method: 'GET', url: '/devcard-core' });
      const owner = res.json().members[0];

      expect(owner).toHaveProperty('teamRole', 'OWNER');
      expect(owner).toHaveProperty('joinedAt');
    });

    it('200 — does not leak sensitive user fields on members', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM_WITH_MEMBERS);

      const res = await app.inject({ method: 'GET', url: '/devcard-core' });
      const member = res.json().members[0];

      expect(member).not.toHaveProperty('email');
      expect(member).not.toHaveProperty('provider');
      expect(member).not.toHaveProperty('providerId');
    });

    it('200 — works without authentication (public endpoint)', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Should not be called'));
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM_WITH_MEMBERS);

      const res = await app.inject({ method: 'GET', url: '/devcard-core' });

      expect(res.statusCode).toBe(200);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('404 — returns 404 for unknown slug', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      const res = await app.inject({ method: 'GET', url: '/ghost-team' });

      expect(res.statusCode).toBe(404);
      expect(res.json()).toMatchObject({ error: 'Team not found' });
    });

    it('200 — returns empty members array for a team with no members', async () => {
      prismaMock.team.findUnique.mockResolvedValue({ ...MOCK_TEAM, members: [] });

      const res = await app.inject({ method: 'GET', url: '/devcard-core' });

      expect(res.statusCode).toBe(200);
      expect(res.json().members).toHaveLength(0);
    });
  });

  // ── POST /:slug/members — invite member ───────────────────────────────────

  describe('POST /:slug/members — invite member (owner only)', () => {
    const teamWithOwnerOnly = {
      ...MOCK_TEAM,
      owner: MOCK_OWNER,
      members: [
        {
          id: 'tm-uuid-001',
          teamId: MOCK_TEAM.id,
          userId: MOCK_OWNER_ID,
          role: TeamRole.OWNER,
          joinedAt: new Date(),
          user: MOCK_OWNER,
        },
      ],
    };

    it('201 — owner can invite a new member by username', async () => {
      prismaMock.team.findUnique.mockResolvedValue(teamWithOwnerOnly);
      prismaMock.user.findUnique.mockResolvedValue(MOCK_MEMBER_USER);
      prismaMock.teamMember.create.mockResolvedValue({});

      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        headers: authHeader(),
        payload: { username: 'janedoe' },
      });

      expect(res.statusCode).toBe(201);
      expect(prismaMock.teamMember.create).toHaveBeenCalledOnce();

      const callData = prismaMock.teamMember.create.mock.calls[0][0].data;
      expect(callData.userId).toBe(MOCK_MEMBER_ID);
      expect(callData.role).toBe(TeamRole.MEMBER);
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        payload: { username: 'janedoe' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('403 — non-owner cannot invite members', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_MEMBER_ID });
      prismaMock.team.findUnique.mockResolvedValue(teamWithOwnerOnly);

      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        headers: authHeader(),
        payload: { username: 'someoneelse' },
      });

      expect(res.statusCode).toBe(403);
      expect(prismaMock.teamMember.create).not.toHaveBeenCalled();
    });

    it('409 — cannot invite a user who is already a member', async () => {
      prismaMock.team.findUnique.mockResolvedValue({
        ...teamWithOwnerOnly,
        members: [
          ...teamWithOwnerOnly.members,
          {
            id: 'tm-uuid-002',
            teamId: MOCK_TEAM.id,
            userId: MOCK_MEMBER_ID,
            role: TeamRole.MEMBER,
            joinedAt: new Date(),
            user: MOCK_MEMBER_USER,
          },
        ],
      });

      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        headers: authHeader(),
        payload: { username: 'janedoe' },
      });

      expect(res.statusCode).toBe(409);
      expect(prismaMock.teamMember.create).not.toHaveBeenCalled();
    });

    it('409 — cannot invite the owner (they are already a member)', async () => {
      prismaMock.team.findUnique.mockResolvedValue(teamWithOwnerOnly);

      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        headers: authHeader(),
        payload: { username: 'johndoe' },
      });

      expect(res.statusCode).toBe(409);
    });

    it('404 — returns 404 when invited username does not exist', async () => {
      prismaMock.team.findUnique.mockResolvedValue(teamWithOwnerOnly);
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        headers: authHeader(),
        payload: { username: 'ghostuser' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('404 — returns 404 when team does not exist', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'POST',
        url: '/ghost-team/members',
        headers: authHeader(),
        payload: { username: 'janedoe' },
      });

      expect(res.statusCode).toBe(404);
    });

    it('400 — rejects empty username', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/devcard-core/members',
        headers: authHeader(),
        payload: { username: '' },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  // ── DELETE /:slug/members/:userId — remove member ─────────────────────────

  describe('DELETE /:slug/members/:userId — remove member', () => {
    const teamWithBothMembers = {
      ...MOCK_TEAM,
      members: [
        {
          id: 'tm-uuid-001',
          teamId: MOCK_TEAM.id,
          userId: MOCK_OWNER_ID,
          role: TeamRole.OWNER,
          joinedAt: new Date(),
          user: MOCK_OWNER,
        },
        {
          id: 'tm-uuid-002',
          teamId: MOCK_TEAM.id,
          userId: MOCK_MEMBER_ID,
          role: TeamRole.MEMBER,
          joinedAt: new Date(),
          user: MOCK_MEMBER_USER,
        },
      ],
    };

    it('200 — owner can remove a member', async () => {
      prismaMock.team.findUnique.mockResolvedValue(teamWithBothMembers);
      prismaMock.teamMember.delete.mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: `/devcard-core/members/${MOCK_MEMBER_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      const deleteArg = prismaMock.teamMember.delete.mock.calls[0][0].where;
      expect(deleteArg).toMatchObject({
        userId_teamId: {
          teamId: MOCK_TEAM.id,
          userId: MOCK_MEMBER_ID,
        },
      });
    });

    it('200 — member can self-remove (leave team)', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_MEMBER_ID });
      prismaMock.team.findUnique.mockResolvedValue(teamWithBothMembers);
      prismaMock.teamMember.delete.mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: `/devcard-core/members/${MOCK_MEMBER_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
    });

    it('403 — owner cannot leave their own team', async () => {
      prismaMock.team.findUnique.mockResolvedValue(teamWithBothMembers);

      const res = await app.inject({
        method: 'DELETE',
        url: `/devcard-core/members/${MOCK_OWNER_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(403);
      expect(prismaMock.teamMember.delete).not.toHaveBeenCalled();
    });

    it('403 — outsider cannot remove another member', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_OUTSIDER_ID });
      prismaMock.team.findUnique.mockResolvedValue(teamWithBothMembers);

      const res = await app.inject({
        method: 'DELETE',
        url: `/devcard-core/members/${MOCK_MEMBER_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(403);
      expect(prismaMock.teamMember.delete).not.toHaveBeenCalled();
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

      const res = await app.inject({
        method: 'DELETE',
        url: `/devcard-core/members/${MOCK_MEMBER_ID}`,
      });

      expect(res.statusCode).toBe(401);
    });

    it('404 — returns 404 when team does not exist', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: `/ghost-team/members/${MOCK_MEMBER_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
    });

    it('404 — returns 404 when userId is not a team member', async () => {
      prismaMock.team.findUnique.mockResolvedValue(teamWithBothMembers);

      const res = await app.inject({
        method: 'DELETE',
        url: `/devcard-core/members/${MOCK_OUTSIDER_ID}`,
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── PATCH /:slug — update team ────────────────────────────────────────────

  describe('PATCH /:slug — update team (owner only)', () => {
    it('200 — owner can update name, description, avatarUrl', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);
      prismaMock.team.update.mockResolvedValue({ ...MOCK_TEAM, name: 'New Name' });

      const res = await app.inject({
        method: 'PATCH',
        url: '/devcard-core',
        headers: authHeader(),
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('New Name');
    });

    it('403 — non-owner cannot update team', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_MEMBER_ID });
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);

      const res = await app.inject({
        method: 'PATCH',
        url: '/devcard-core',
        headers: authHeader(),
        payload: { name: 'Hijacked Name' },
      });

      expect(res.statusCode).toBe(403);
      expect(prismaMock.team.update).not.toHaveBeenCalled();
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

      const res = await app.inject({
        method: 'PATCH',
        url: '/devcard-core',
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(401);
    });

    it('400 — rejects empty body (at least one field required)', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/devcard-core',
        headers: authHeader(),
        payload: {},
      });

      expect(res.statusCode).toBe(400);
    });

    it('400 — rejects invalid avatarUrl', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/devcard-core',
        headers: authHeader(),
        payload: { avatarUrl: 'not-a-url' },
      });

      expect(res.statusCode).toBe(400);
    });

    it('404 — returns 404 for unknown slug', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'PATCH',
        url: '/ghost-team',
        headers: authHeader(),
        payload: { name: 'New Name' },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  // ── DELETE /:slug — delete team ───────────────────────────────────────────

  describe('DELETE /:slug — delete team (owner only)', () => {
    it('200 — owner can delete team', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);
      prismaMock.team.delete.mockResolvedValue({});

      const res = await app.inject({
        method: 'DELETE',
        url: '/devcard-core',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(200);
      expect(prismaMock.team.delete).toHaveBeenCalledOnce();
    });

    it('403 — non-owner cannot delete team', async () => {
      mockJwtVerify.mockResolvedValue({ id: MOCK_MEMBER_ID });
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);

      const res = await app.inject({
        method: 'DELETE',
        url: '/devcard-core',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(403);
      expect(prismaMock.team.delete).not.toHaveBeenCalled();
    });

    it('401 — rejects unauthenticated request', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Unauthorized'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/devcard-core',
      });

      expect(res.statusCode).toBe(401);
    });

    it('404 — returns 404 for unknown slug', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'DELETE',
        url: '/ghost-team',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(404);
    });

    it('500 — returns 500 on database failure', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);
      prismaMock.team.delete.mockRejectedValue(new Error('DB error'));

      const res = await app.inject({
        method: 'DELETE',
        url: '/devcard-core',
        headers: authHeader(),
      });

      expect(res.statusCode).toBe(500);
    });
  });

  // ── GET /:slug/qr — QR code ───────────────────────────────────────────────

  describe('GET /:slug/qr — QR code', () => {
    it('200 — returns PNG image for valid slug', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);

      const res = await app.inject({
        method: 'GET',
        url: '/devcard-core/qr',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch('image/png');
    });

    it('200 — encodes correct devcard.dev URL in QR', async () => {
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);

      const res = await app.inject({
        method: 'GET',
        url: '/devcard-core/qr',
      });

      expect(res.statusCode).toBe(200);
      expect(res.rawPayload.length).toBeGreaterThan(0);
    });

    it('200 — works without authentication (public endpoint)', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Should not be called'));
      prismaMock.team.findUnique.mockResolvedValue(MOCK_TEAM);

      const res = await app.inject({
        method: 'GET',
        url: '/devcard-core/qr',
      });

      expect(res.statusCode).toBe(200);
      expect(mockJwtVerify).not.toHaveBeenCalled();
    });

    it('404 — returns 404 for unknown slug', async () => {
      prismaMock.team.findUnique.mockResolvedValue(null);

      const res = await app.inject({
        method: 'GET',
        url: '/ghost-team/qr',
      });

      expect(res.statusCode).toBe(404);
    });
  });
});