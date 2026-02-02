import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema";

function createDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  // Use Neon serverless driver in production (Vercel), local postgres otherwise
  if (process.env.VERCEL || databaseUrl.includes("neon")) {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  }
  const client = postgres(databaseUrl);
  return drizzlePg(client, { schema });
}

let _db: ReturnType<typeof createDb>;
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop) {
    if (!_db) _db = createDb();
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});
