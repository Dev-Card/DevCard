/* eslint-disable no-bitwise */
import { generateVCard, VCardInput } from '@devcard/shared';

/**
 * Mobile-specific utility wrapper for generating vCard strings.
 */
export function getProfileVCard(profile: VCardInput): string {
  return generateVCard(profile);
}

/**
 * Encodes a string into Base64 format using a pure JavaScript implementation.
 * Safe to use in any React Native environment without relying on Node.js Buffer or browser btoa.
 */
export function encodeBase64(str: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  let i = 0;
  
  // Convert string to UTF-8 byte array to preserve non-ASCII characters
  const utf8Bytes: number[] = [];
  for (let j = 0; j < str.length; j++) {
    let c = str.charCodeAt(j);
    if (c < 128) {
      utf8Bytes.push(c);
    } else if (c < 2048) {
      utf8Bytes.push((c >> 6) | 192);
      utf8Bytes.push((c & 63) | 128);
    } else {
      utf8Bytes.push((c >> 12) | 224);
      utf8Bytes.push(((c >> 6) & 63) | 128);
      utf8Bytes.push((c & 63) | 128);
    }
  }

  const byteLength = utf8Bytes.length;
  while (i < byteLength) {
    const byte1 = utf8Bytes[i++];
    const byte2 = i < byteLength ? utf8Bytes[i++] : NaN;
    const byte3 = i < byteLength ? utf8Bytes[i++] : NaN;

    const enc1 = byte1 >> 2;
    const enc2 = ((byte1 & 3) << 4) | (isNaN(byte2) ? 0 : byte2 >> 4);
    const enc3 = isNaN(byte2) ? 64 : ((byte2 & 15) << 2) | (isNaN(byte3) ? 0 : byte3 >> 6);
    const enc4 = isNaN(byte3) ? 64 : byte3 & 63;

    result += chars.charAt(enc1) + chars.charAt(enc2) +
              (enc3 === 64 ? '=' : chars.charAt(enc3)) +
              (enc4 === 64 ? '=' : chars.charAt(enc4));
  }
  return result;
}
