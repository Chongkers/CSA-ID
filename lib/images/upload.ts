import { assertDimensions, assertStill, isQuotaError, MAX_INPUT_BYTES, MULTIPART_OVERHEAD_BYTES, outputTransform, QUOTA_MESSAGE, sizeLimitMessage, sniffFormat, UploadError, type UploadKind } from "./policy";

export async function readUpload(request: Request, kind: UploadKind): Promise<Uint8Array> {
  const limit = MAX_INPUT_BYTES[kind];
  const cap = limit + MULTIPART_OVERHEAD_BYTES;
  const declared = request.headers.get("content-length");
  if (!declared || !/^\d+$/.test(declared)) throw new UploadError(411, "The upload size is missing. Try again.");
  if (Number(declared) > cap) throw new UploadError(413, sizeLimitMessage(kind));
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.startsWith("multipart/form-data") || !request.body) throw new UploadError(400, "Choose an image to upload.");

  const chunks: Uint8Array[] = [];
  let received = 0;
  const reader = request.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > cap) {
      await reader.cancel();
      throw new UploadError(413, sizeLimitMessage(kind));
    }
    chunks.push(value);
  }
  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }

  let file: unknown;
  try {
    file = (await new Response(body, { headers: { "content-type": contentType } }).formData()).get("file");
  } catch {
    throw new UploadError(400, "Choose an image to upload.");
  }
  if (!(file instanceof File) || file.size === 0) throw new UploadError(400, "Choose an image to upload.");
  if (file.size > limit) throw new UploadError(413, sizeLimitMessage(kind));
  return new Uint8Array(await file.arrayBuffer());
}

const toStream = (bytes: Uint8Array) => new Blob([bytes as BlobPart]).stream();

export async function reencode(images: ImagesBinding, bytes: Uint8Array, kind: UploadKind): Promise<ArrayBuffer> {
  assertStill(sniffFormat(bytes), bytes);
  try {
    const info = await images.info(toStream(bytes));
    if (!("width" in info)) throw new UploadError(415, "Choose a JPEG, PNG, or WebP image.");
    assertDimensions(info.width, info.height);
    const output = await images.input(toStream(bytes)).transform(outputTransform(kind)).output({ format: "image/webp", quality: 82 });
    return await output.response().arrayBuffer();
  } catch (error) {
    if (error instanceof UploadError) throw error;
    if (isQuotaError(error)) throw new UploadError(429, QUOTA_MESSAGE);
    throw new UploadError(422, "That image could not be read. Choose a different file.");
  }
}

export async function storeImage(kv: KVNamespace, key: string, image: ArrayBuffer) {
  try {
    await kv.put(key, image, { metadata: { contentType: "image/webp" } });
  } catch (error) {
    if (isQuotaError(error)) throw new UploadError(429, QUOTA_MESSAGE);
    throw new UploadError(503, "The image could not be saved. Try again later.");
  }
}
