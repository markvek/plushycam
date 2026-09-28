const encoder = new TextEncoder();
const decoder = new TextDecoder();
export const MAX_FRAME_BYTES = 4 * 1024 * 1024;

function indexOf(bytes: Uint8Array, needle: Uint8Array): number {
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[bytes.length - 2] === 0xff &&
    bytes[bytes.length - 1] === 0xd9
  );
}

/** Read frame dimensions from JPEG metadata without decoding the pixels. */
export function jpegAspectRatio(bytes: Uint8Array): number | undefined {
  if (!isJpeg(bytes)) return undefined;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 0xff) return undefined;
    while (bytes[offset] === 0xff) offset++;
    const marker = bytes[offset++];
    if (marker === 0xda || marker === 0xd9) return undefined;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = (bytes[offset] << 8) | bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return undefined;
    // SOF markers, excluding Huffman tables, JPEG extensions, and arithmetic tables.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      if (length < 8) return undefined;
      const height = (bytes[offset + 3] << 8) | bytes[offset + 4];
      const width = (bytes[offset + 5] << 8) | bytes[offset + 6];
      return width > 0 && height > 0 ? width / height : undefined;
    }
    offset += length;
  }
  return undefined;
}

/** Bounded multipart parser. Supports length-delimited and boundary-delimited JPEG parts. */
export class MjpegParser {
  private buffer = new Uint8Array(0);
  private readonly delimiter: Uint8Array;
  private inBody = false;
  private length: number | null = null;

  constructor(contentType: string) {
    const match = /boundary\s*=\s*(?:"([^"]+)"|([^;\s]+))/i.exec(contentType);
    if (!/^multipart\/x-mixed-replace\b/i.test(contentType) || !match)
      throw new Error(
        'The camera did not return an MJPEG stream. Check the selected model and endpoint.',
      );
    const boundary = match[1] ?? match[2];
    if (!boundary || boundary.length > 100 || /[\r\n]/.test(boundary))
      throw new Error('Invalid MJPEG boundary.');
    this.delimiter = encoder.encode(`--${boundary}`);
  }

  push(chunk: Uint8Array): Uint8Array[] {
    if (this.buffer.length + chunk.length > MAX_FRAME_BYTES * 2)
      throw new Error('The camera frame exceeded the supported size.');
    const combined = new Uint8Array(this.buffer.length + chunk.length);
    combined.set(this.buffer);
    combined.set(chunk, this.buffer.length);
    this.buffer = combined;
    const frames: Uint8Array[] = [];
    while (true) {
      if (!this.inBody) {
        const start = indexOf(this.buffer, this.delimiter);
        if (start < 0) {
          if (this.buffer.length > 16384) throw new Error('Invalid MJPEG headers.');
          break;
        }
        this.buffer = this.buffer.slice(start);
        const end = indexOf(this.buffer, encoder.encode('\r\n\r\n'));
        if (end < 0) {
          if (this.buffer.length > 16384) throw new Error('MJPEG headers are too large.');
          break;
        }
        if (end > 16384) throw new Error('MJPEG headers are too large.');
        const headers = decoder.decode(this.buffer.slice(0, end));
        if (!/content-type:\s*image\/jpeg\s*(?:\r\n|$)/i.test(headers))
          throw new Error('Expected JPEG frames from the camera.');
        const size = /content-length:\s*([^\r\n]+)/i.exec(headers)?.[1];
        this.length = size === undefined ? null : Number(size);
        if (
          this.length !== null &&
          (!Number.isInteger(this.length) || this.length < 4 || this.length > MAX_FRAME_BYTES)
        )
          throw new Error('Invalid camera frame length.');
        this.buffer = this.buffer.slice(end + 4);
        this.inBody = true;
      }
      const boundaryAt = this.length === null ? indexOf(this.buffer, this.delimiter) : -1;
      const end = this.length ?? (boundaryAt < 0 ? -1 : boundaryAt - 2);
      if (end < 0 || this.buffer.length < end) {
        if (this.buffer.length > MAX_FRAME_BYTES)
          throw new Error('The camera frame exceeded the supported size.');
        break;
      }
      const frame = this.buffer.slice(0, end);
      if (!isJpeg(frame)) throw new Error('The camera sent an incomplete JPEG frame.');
      frames.push(frame);
      this.buffer = this.buffer.slice(end);
      this.inBody = false;
      this.length = null;
    }
    return frames;
  }
}
