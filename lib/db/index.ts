import "server-only";
import { drizzle } from "drizzle-orm/d1";
import { getBindings } from "@/lib/cloudflare";
import * as schema from "./schema";

export function getDb() {
  return drizzle(getBindings().DB, { schema });
}
