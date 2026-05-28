import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

/**
 * Font definitions for the OG image renderer.
 * Satori requires font data as raw Buffers — it cannot load fonts from URLs
 * at render time.  We store them locally and fall back to the Google Fonts
 * GitHub CDN on first boot if the local copies are missing.
 */
const FONTS = {
  regular: {
    filename: 'Inter-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf',
  },
  bold: {
    filename: 'Inter-Bold.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Bold.ttf',
  },
};

/** In-memory cache so subsequent OG image requests skip disk I/O. */
let cachedFonts: { regular: Buffer; bold: Buffer } | null = null;

/**
 * Downloads a font from a remote URL and persists it to the local assets
 * directory so future server starts avoid the network round-trip.
 */
async function downloadFont(url: string, destPath: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download font from ${url}: HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  return buffer;
}

/**
 * Returns Inter Regular and Bold font Buffers required by satori for OG image
 * rendering.  Resolution order:
 *  1. In-memory cache (fastest — avoids repeated disk reads per request)
 *  2. Local disk  (`src/assets/Inter-*.ttf` committed or downloaded on first boot)
 *  3. Google Fonts GitHub CDN (self-healing: downloads & persists locally on miss)
 */
export async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (cachedFonts) {
    return cachedFonts;
  }

  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  const regularPath = path.join(ASSETS_DIR, FONTS.regular.filename);
  const boldPath = path.join(ASSETS_DIR, FONTS.bold.filename);

  const regularBuffer = fs.existsSync(regularPath)
    ? fs.readFileSync(regularPath)
    : await downloadFont(FONTS.regular.url, regularPath);

  const boldBuffer = fs.existsSync(boldPath)
    ? fs.readFileSync(boldPath)
    : await downloadFont(FONTS.bold.url, boldPath);

  cachedFonts = { regular: regularBuffer, bold: boldBuffer };
  return cachedFonts;
}
