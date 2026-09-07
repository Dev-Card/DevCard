import QRCode from 'qrcode';

export interface QROptions {
  format?: 'png' | 'svg';
  width?: number;
  margin?: number;
  errorCorrection?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a QR code as a data URL (base64 PNG).
 * Uses error correction level H by default for better readability when printed small.
 */
export async function generateQRDataUrl(
  text: string,
  options: QROptions = {}
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options.width || 400,
    margin: options.margin || 2,
    errorCorrectionLevel: options.errorCorrection || 'H',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  });
}

/**
 * Generate a QR code as a PNG buffer.
 * Uses error correction level H by default for better readability when printed small.
 */
export async function generateQRBuffer(
  text: string,
  options: QROptions = {}
): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: options.width || 400,
    margin: options.margin || 2,
    errorCorrectionLevel: options.errorCorrection || 'H',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  });
}

/**
 * Generate a QR code as SVG string.
 * Uses error correction level H by default for better readability when printed small.
 */
export async function generateQRSvg(
  text: string,
  options: QROptions = {}
): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    width: options.width || 400,
    margin: options.margin || 2,
    errorCorrectionLevel: options.errorCorrection || 'H',
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  });
}
