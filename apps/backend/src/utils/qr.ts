import QRCode from 'qrcode';

export interface QROptions {
  format?: 'png' | 'svg';
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
}

/**
 * Generate a QR code as a data URL (base64 PNG).
 */
export async function generateQRDataUrl(
  text: string,
  options: QROptions = {}
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options.width || 400,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  });
}

/**
 * Generate a QR code as a PNG buffer.
 */
export async function generateQRBuffer(
  text: string,
  options: QROptions = {}
): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: options.width || 400,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  });
}

/**
 * Generate a QR code as SVG string.
 */
export async function generateQRSvg(
  text: string,
  options: QROptions = {}
): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    width: options.width || 400,
    margin: options.margin || 2,
    color: {
      dark: options.color?.dark || '#000000',
      light: options.color?.light || '#ffffff',
    },
  });
}
