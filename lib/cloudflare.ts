import { getCloudflareContext } from "@opennextjs/cloudflare";

export type AppBindings = CloudflareEnv & {
  APP_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  IMAGES: ImagesBinding;
};

export function getBindings(): AppBindings {
  return getCloudflareContext().env as AppBindings;
}

export async function getBindingsAsync(): Promise<AppBindings> {
  return (await getCloudflareContext({ async: true })).env as AppBindings;
}
