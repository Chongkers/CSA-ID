import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/d1";
import { Miniflare } from "miniflare";
import * as schema from "@/lib/db/schema";

export async function createTestDb() {
  const mf = new Miniflare({
    workers: [
      {
        modules: true,
        script: "export default { fetch() { return new Response('ok') } }",
        d1Databases: { DB: "test-db" },
      },
    ],
  });
  const d1 = await mf.getD1Database("DB");
  const dir = join(process.cwd(), "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const statements = readFileSync(join(dir, file), "utf8").split("--> statement-breakpoint");
    for (const statement of statements) await d1.prepare(statement).run();
  }
  return { db: drizzle(d1, { schema }), d1, dispose: () => mf.dispose() };
}
