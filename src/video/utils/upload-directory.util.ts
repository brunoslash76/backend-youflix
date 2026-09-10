import { extname } from 'node:path';
const CONTENT_TYPES: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.m4s': 'video/iso.segment',
  '.mp4': 'video/mp4',
  '.jpg': 'image/jpeg',
  '.vtt': 'text/vtt',
};
export const contentTypeFor = (filename: string): string =>
  CONTENT_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream';