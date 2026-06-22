import { Resvg } from '@resvg/resvg-js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type OgImageOptions = {
  /** Profile page username — shown in the card footer URL. */
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  /** Hex accent colour from the user's profile (e.g. "#6366f1"). */
  accentColor: string;
  /** Ordered platform metadata. Only the first four are rendered as badges. */
  platforms: Array<{
    name: string;
    color: string;
    icon: string;
  }>;
  /** Total number of connected platforms (may exceed platforms.length). */
  platformCount: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {return str;}
  return `${str.slice(0, Math.max(0, maxLength - 1))}\u2026`;
}

function sanitizeHexColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#6366f1';
}

// ── Avatar fetch ──────────────────────────────────────────────────────────────
// Only HTTPS URLs are fetched, and hostnames are validated against private/local
// IP ranges (SSRF guard). A 3-second AbortController timeout prevents blocking
// the HTTP response. The download size is capped to prevent unbounded memory
// allocation. Returns null on any failure so the caller renders the initials fallback instead.

export function isSafeAvatarUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();

    if (hostname === 'localhost') {
      return false;
    }

    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return false;
    }

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = hostname.match(ipv4Regex);
    if (ipv4Match) {
      const octets = ipv4Match.slice(1).map(Number);
      if (octets.some(o => o < 0 || o > 255)) {
        return false;
      }
      const [o1, o2] = octets;
      // 127.0.0.0/8 - Loopback
      if (o1 === 127) {
        return false;
      }
      // 10.0.0.0/8 - Private
      if (o1 === 10) {
        return false;
      }
      // 172.16.0.0/12 - Private
      if (o1 === 172 && (o2 >= 16 && o2 <= 31)) {
        return false;
      }
      // 192.168.0.0/16 - Private
      if (o1 === 192 && o2 === 168) {
        return false;
      }
      // 169.254.0.0/16 - Link-local
      if (o1 === 169 && o2 === 254) {
        return false;
      }
      // 0.0.0.0/8 - Broadcast / local
      if (o1 === 0) {
        return false;
      }
    }

    if (hostname.includes(':')) {
      const cleanIp = hostname.startsWith('[') && hostname.endsWith(']')
        ? hostname.slice(1, -1)
        : hostname;

      const normalized = cleanIp.toLowerCase();
      if (normalized === '::1' || normalized === '0:0:0:0:0:0:0:1') {
        return false;
      }
      if (normalized.startsWith('fe80') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
        return false;
      }
      if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
        return false;
      }
      if (normalized.startsWith('::ffff:')) {
        const mappedIpv4 = normalized.slice(7);
        return isSafeAvatarUrl(`https://${mappedIpv4}`);
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function fetchAvatarBase64(
  url: string,
): Promise<{ data: string; mimeType: string } | null> {
  if (!isSafeAvatarUrl(url)) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
    }, 3000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!response.ok) {
      return null;
    }

    const rawContentType = response.headers.get('content-type') ?? 'image/jpeg';
    const mimeType = rawContentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/')) {
      return null;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const parsedLength = parseInt(contentLength, 10);
      if (Number.isInteger(parsedLength) && parsedLength > MAX_SIZE) {
        return null;
      }
    }

    let arrayBuffer: ArrayBuffer;
    if (response.body && typeof response.body.getReader === 'function') {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          receivedLength += value.length;
          if (receivedLength > MAX_SIZE) {
            await reader.cancel().catch(() => {});
            return null;
          }
          chunks.push(value);
        }
      }
      const combined = new Uint8Array(receivedLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      arrayBuffer = combined.buffer;
    } else {
      // Fallback
      arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_SIZE) {
        return null;
      }
    }

    return { data: Buffer.from(arrayBuffer).toString('base64'), mimeType };
  } catch {
    return null;
  }
}

// ── SVG template ──────────────────────────────────────────────────────────────

function buildOgSvg(
  opts: OgImageOptions,
  avatarEmbed: { data: string; mimeType: string } | null,
): string {
  const { username, displayName, bio, accentColor, platforms, platformCount } =
    opts;
  const safeAccent = sanitizeHexColor(accentColor);

  const safeName = escapeXml(truncate(displayName, 26));
  const safeUser = escapeXml(username);
  const initial = escapeXml(displayName.charAt(0).toUpperCase());

  const rawBio = bio ? truncate(bio, 100) : '';
  const safeBio = escapeXml(rawBio);
  const hasBio = safeBio.length > 0;

  const platformLabel = escapeXml(
    platformCount === 1 ? '1 platform' : `${platformCount} platforms`,
  );

  // Vertical positions shift when a bio is present.
  const countY = hasBio ? 296 : 243;
  const badgeY = hasBio ? 338 : 288;

  // clipPath only required when embedding an actual avatar image.
  const avatarDef = avatarEmbed
    ? '<clipPath id="avatarClip"><circle cx="180" cy="240" r="90"/></clipPath>'
    : '';

  const avatarSection = avatarEmbed
    ? `<circle cx="180" cy="240" r="95" fill="${safeAccent}" opacity="0.18"/>
    <image href="data:${avatarEmbed.mimeType};base64,${avatarEmbed.data}" x="90" y="150" width="180" height="180" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice"/>`
    : `<circle cx="180" cy="240" r="95" fill="${safeAccent}" opacity="0.18"/>
    <circle cx="180" cy="240" r="90" fill="${safeAccent}"/>
    <text x="180" y="265" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="64" font-weight="700" fill="white">${initial}</text>`;

  // First four platform slugs rendered as pill badges.
  const platformBadges = platforms
    .slice(0, 4)
    .map((platform, index) => {
      const bx = 300 + index * 152;
      const platformColor = sanitizeHexColor(platform.color);
      const safeIcon = escapeXml(platform.icon.slice(0, 2).toUpperCase());
      const safePlatform = escapeXml(truncate(platform.name, 10));
      return `<rect x="${bx}" y="${badgeY}" width="138" height="40" rx="20" fill="#111827" stroke="${platformColor}" stroke-width="1.5"/>
    <circle cx="${bx + 25}" cy="${badgeY + 20}" r="12" fill="${platformColor}"/>
    <text x="${bx + 25}" y="${badgeY + 25}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" fill="#ffffff" font-weight="800">${safeIcon}</text>
    <text x="${bx + 82}" y="${badgeY + 26}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" fill="#f8fafc" font-weight="600">${safePlatform}</text>`;
    })
    .join('\n    ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    ${avatarDef}
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="#0f172a"/>
  <!-- Accent glow — top-left origin, bottom-right echo -->
  <circle cx="0" cy="0" r="560" fill="${safeAccent}" opacity="0.10"/>
  <circle cx="1200" cy="630" r="280" fill="${safeAccent}" opacity="0.05"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="8" height="630" fill="${safeAccent}"/>

  <!-- Avatar / initials -->
  ${avatarSection}

  <!-- Display name -->
  <text x="300" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="#f8fafc">${safeName}</text>

  <!-- Bio (skipped when empty) -->
  ${hasBio ? `<text x="300" y="243" font-family="system-ui, -apple-system, sans-serif" font-size="24" fill="#94a3b8">${safeBio}</text>` : ''}

  <!-- Platform count -->
  <text x="300" y="${countY}" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="${safeAccent}" font-weight="600">${platformLabel} connected</text>

  <!-- Platform badges -->
  ${platformBadges}

  <!-- Divider -->
  <rect x="80" y="518" width="1040" height="1" fill="#1e293b"/>

  <!-- DevCard brand mark -->
  <rect x="80" y="545" width="10" height="34" rx="5" fill="${safeAccent}"/>
  <text x="100" y="569" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#f1f5f9">DevCard</text>
  <text x="80" y="607" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="#475569">devcard.dev/${safeUser}</text>
</svg>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates a 1200×630 PNG social-preview card for the given profile.
 *
 * The avatar is fetched and embedded as a base64 data URI so that resvg
 * can rasterise it without network access during rendering.  If the fetch
 * fails (or the URL is not HTTPS), the first letter of the display name is
 * used as a coloured initial instead.
 */
export async function generateOgImage(opts: OgImageOptions): Promise<Buffer> {
  let avatarEmbed: { data: string; mimeType: string } | null = null;
  if (opts.avatarUrl) {
    avatarEmbed = await fetchAvatarBase64(opts.avatarUrl);
  }

  const svg = buildOgSvg(opts, avatarEmbed);

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width' as const, value: 1200 },
    font: { loadSystemFonts: true },
  });

  return resvg.render().asPng();
}
