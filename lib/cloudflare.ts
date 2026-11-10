import { getCloudflareContext } from "@opennextjs/cloudflare";

export function getBindings(): CloudflareEnv {
  return getCloudflareContext().env;
}

export async function getBindingsAsync(): Promise<CloudflareEnv> {
  return (await getCloudflareContext({ async: true })).env;
}
