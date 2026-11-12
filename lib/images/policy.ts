export type UploadKind = "avatar" | "background";
export type SniffedFormat = "jpeg" | "png" | "webp";

export const MAX_INPUT_BYTES: Record<UploadKind, number> = { avatar: 2_000_000, background: 4_000_000 };
export const MAX_INPUT_PIXELS = 24_000_000;
export const MULTIPART_OVERHEAD_BYTES = 16_384;

const OUTPUT_BOX: Record<UploadKind, { width: number; height: number; fit: "crop" | "scale-down" }> = {
  avatar: { width: 400, height: 400, fit: "crop" },
  background: { width: 1920, height: 1080, fit: "scale-down" },
};
export const outputTransform = (kind: UploadKind) => OUTPUT_BOX[kind];

export class UploadError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

const ascii = (bytes: Uint8Array, start: number, length: number) => String.fromCharCode(...bytes.subarray(start, start + length));

export function sniffFormat(bytes: Uint8Array): SniffedFormat {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (ascii(bytes, 0, 8) === "\x89PNG\r\n\x1a\n") return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 0, 3) === "GIF") throw new UploadError(415, "GIF files are not accepted. Choose a JPEG, PNG, or WebP.");
  throw new UploadError(415, "Choose a JPEG, PNG, or WebP image.");
}

function isAnimatedWebp(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 12; offset + 8 <= bytes.length; ) {
    const type = ascii(bytes, offset, 4);
    if (type === "ANIM" || type === "ANMF") return true;
    if (type === "VP8X" && offset + 9 <= bytes.length && (bytes[offset + 8] & 0x02) !== 0) return true;
    offset += 8 + view.getUint32(offset + 4, true) + (view.getUint32(offset + 4, true) % 2);
  }
  return false;
}

function isAnimatedPng(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 8; offset + 8 <= bytes.length; ) {
    const type = ascii(bytes, offset + 4, 4);
    if (type === "acTL") return true;
    if (type === "IDAT") return false;
    offset += 12 + view.getUint32(offset);
  }
  return false;
}

export function assertStill(format: SniffedFormat, bytes: Uint8Array) {
  const animated = (format === "webp" && isAnimatedWebp(bytes)) || (format === "png" && isAnimatedPng(bytes));
  if (animated) throw new UploadError(422, "Animated images are not accepted. Choose a still image.");
}

export function assertDimensions(width: number, height: number) {
  if (!(width > 0 && height > 0)) throw new UploadError(422, "That image could not be read. Choose a different file.");
  if (width * height > MAX_INPUT_PIXELS) throw new UploadError(413, "That image has too many pixels. Choose one under 24 megapixels.");
}

export const sizeLimitMessage = (kind: UploadKind) => `That file is too large. ${kind === "avatar" ? "Photos" : "Backgrounds"} can be up to ${MAX_INPUT_BYTES[kind] / 1_000_000} MB.`;

export const QUOTA_MESSAGE = "Image uploads are paused because today's free image limit was reached. Your current images still work. Try again tomorrow.";

export function isQuotaError(error: unknown) {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /quota|limit exceeded|too many requests|\b429\b|rate.?limit/i.test(text);
}
