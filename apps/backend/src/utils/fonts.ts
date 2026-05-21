import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets');

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

// In-memory cache for loaded font buffers
let cachedFonts: { regular: Buffer; bold: Buffer } | null = null;

/**
 * Downloads a font from a URL and saves it to the local assets directory.
 */
async function downloadFont(url: string, destPath: string): Promise<Buffer> {
  console.log(`[FontLoader] Downloading font from ${url}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download font from ${url}: Status ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Save locally
  fs.writeFileSync(destPath, buffer);
  console.log(`[FontLoader] Successfully saved font to ${destPath}`);
  
  return buffer;
}

/**
 * Loads the Inter Regular and Bold fonts.
 * Reads from disk first; if not present, downloads them from Google Fonts GitHub CDN
 * and caches them locally on disk and in memory.
 */
export async function loadFonts(): Promise<{ regular: Buffer; bold: Buffer }> {
  if (cachedFonts) {
    return cachedFonts;
  }

  // Ensure assets directory exists
  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  const regularPath = path.join(ASSETS_DIR, FONTS.regular.filename);
  const boldPath = path.join(ASSETS_DIR, FONTS.bold.filename);

  let regularBuffer: Buffer;
  let boldBuffer: Buffer;

  // Load Regular Font
  if (fs.existsSync(regularPath)) {
    regularBuffer = fs.readFileSync(regularPath);
  } else {
    try {
      regularBuffer = await downloadFont(FONTS.regular.url, regularPath);
    } catch (err) {
      console.error('[FontLoader] Error downloading regular font, using empty buffer fallback:', err);
      // Return empty buffer/error fallback if totally offline and unable to download
      throw err;
    }
  }

  // Load Bold Font
  if (fs.existsSync(boldPath)) {
    boldBuffer = fs.readFileSync(boldPath);
  } else {
    try {
      boldBuffer = await downloadFont(FONTS.bold.url, boldPath);
    } catch (err) {
      console.error('[FontLoader] Error downloading bold font, using empty buffer fallback:', err);
      throw err;
    }
  }

  cachedFonts = {
    regular: regularBuffer,
    bold: boldBuffer,
  };

  return cachedFonts;
}
