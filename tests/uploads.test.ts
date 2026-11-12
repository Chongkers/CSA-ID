import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { multipartRequest } from "./helpers";
import { QUOTA_MESSAGE, UploadError } from "@/lib/images/policy";
import { readUpload, reencode, storeImage } from "@/lib/images/upload";

const fixture = (name: string) => new Uint8Array(readFileSync(join(process.cwd(), "tests/fixtures", name)));
const ascii = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

async function rejection(promise: Promise<unknown>) {
  const error = await promise.then(() => null, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(UploadError);
  return error as UploadError;
}

let mf: Miniflare;
let images: ImagesBinding;
let kv: KVNamespace;

beforeAll(async () => {
  mf = new Miniflare({ modules: true, script: "export default { fetch() { return new Response('ok') } }", images: { binding: "IMAGES" }, kvNamespaces: ["KV"] } as ConstructorParameters<typeof Miniflare>[0]);
  const bindings = await mf.getBindings<{ IMAGES: ImagesBinding; KV: KVNamespace }>();
  images = bindings.IMAGES;
  kv = bindings.KV;
});
afterAll(() => mf.dispose());

describe("readUpload", () => {
  it("rejects an oversized Content-Length without reading the body", async () => {
    const request = new Request("http://x/api/uploads/avatar", { method: "POST", body: "x", headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "9000000" } });
    const bodyRead = vi.spyOn(request, "body", "get");
    const error = await rejection(readUpload(request, "avatar"));
    expect(error.status).toBe(413);
    expect(error.message).toMatch(/2 MB/);
    expect(bodyRead).not.toHaveBeenCalled();
  });

  it("rejects a missing Content-Length", async () => {
    const request = new Request("http://x", { method: "POST", body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4)); c.close(); } }), duplex: "half", headers: { "content-type": "multipart/form-data; boundary=x" } } as RequestInit);
    expect((await rejection(readUpload(request, "avatar"))).status).toBe(411);
  });

  it("stops reading a stream that exceeds the cap despite a small Content-Length", async () => {
    let chunks = 0;
    const body = new ReadableStream<Uint8Array>({ pull(controller) { chunks++; controller.enqueue(new Uint8Array(1_000_000)); } });
    const request = new Request("http://x", { method: "POST", body, duplex: "half", headers: { "content-type": "multipart/form-data; boundary=x", "content-length": "100" } } as RequestInit);
    expect((await rejection(readUpload(request, "avatar"))).status).toBe(413);
    expect(chunks).toBeLessThan(6);
  });

  it("rejects a file over the per-kind limit and accepts one under it", async () => {
    const big = new Uint8Array(2_100_000);
    big.set(fixture("gps.jpg"));
    expect((await rejection(readUpload(await multipartRequest("http://x", big), "avatar"))).status).toBe(413);
    const ok = await readUpload(await multipartRequest("http://x", big), "background");
    expect(ok.byteLength).toBe(big.byteLength);
  });
});

describe("reencode", () => {
  it("strips EXIF and GPS metadata from a JPEG and crops the avatar", async () => {
    const source = fixture("gps.jpg");
    expect(ascii(source)).toContain("Exif");
    expect(ascii(source)).toContain("secret-camera");
    const stored = new Uint8Array(await reencode(images, source, "avatar"));
    const text = ascii(stored);
    expect(text.startsWith("RIFF")).toBe(true);
    expect(text.slice(8, 12)).toBe("WEBP");
    for (const marker of ["EXIF", "Exif", "XMP", "GPS", "secret-camera", "secret-owner"]) expect(text).not.toContain(marker);
    const info = await images.info(new Blob([stored as BlobPart]).stream());
    expect(info).toMatchObject({ format: "image/webp", width: 400, height: 400 });
  });

  it("fits a background within 1920x1080", async () => {
    const stored = await reencode(images, fixture("wide.jpg"), "background");
    const info = await images.info(new Blob([stored]).stream());
    expect("width" in info && info.width <= 1920 && info.height <= 1080).toBe(true);
  });

  it("accepts PNG and still WebP", async () => {
    for (const name of ["plain.png", "still.webp"]) expect((await reencode(images, fixture(name), "avatar")).byteLength).toBeGreaterThan(0);
  });

  it.each([
    ["anim.gif", 415, /GIF/],
    ["vector.svg", 415, /JPEG, PNG, or WebP/],
    ["animated.webp", 422, /Animated/],
    ["animated.png", 422, /Animated/],
    ["broken.jpg", 422, /could not be read/],
    ["huge.png", 413, /too many pixels/],
  ])("rejects %s with a clear message", async (name, status, message) => {
    const error = await rejection(reencode(images, fixture(name), "background"));
    expect(error.status).toBe(status);
    expect(error.message).toMatch(message);
  });

  it("returns the quota message when the Images binding reports an exhausted quota", async () => {
    const exhausted = { info: async () => { throw new Error("IMAGES_TRANSFORM_ERROR 9422: transformation quota exceeded"); } } as unknown as ImagesBinding;
    const error = await rejection(reencode(exhausted, fixture("plain.png"), "avatar"));
    expect(error).toMatchObject({ status: 429, message: QUOTA_MESSAGE });
  });
});

describe("storeImage", () => {
  it("writes the bytes with the content type in metadata", async () => {
    await storeImage(kv, "img/p/avatar/a.webp", new Uint8Array([1, 2, 3]).buffer);
    const stored = await kv.getWithMetadata<{ contentType: string }>("img/p/avatar/a.webp", "arrayBuffer");
    expect(stored.metadata?.contentType).toBe("image/webp");
    expect(stored.value?.byteLength).toBe(3);
  });

  it("returns the quota message once and does not retry when KV writes are exhausted", async () => {
    const put = vi.fn().mockRejectedValue(new Error("KV put() limit exceeded for the day."));
    const error = await rejection(storeImage({ put } as unknown as KVNamespace, "k", new ArrayBuffer(1)));
    expect(error).toMatchObject({ status: 429, message: QUOTA_MESSAGE });
    expect(put).toHaveBeenCalledTimes(1);
  });
});
