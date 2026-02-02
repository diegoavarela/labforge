import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { neon } from "@neondatabase/serverless";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL!;

function createDb() {
  // Use Neon serverless driver in production (Vercel), local postgres otherwise
  if (process.env.VERCEL || databaseUrl.includes("neon")) {
    const sql = neon(databaseUrl);
    return drizzle(sql, { schema });
  }
  const client = postgres(databaseUrl);
  return drizzlePg(client, { schema });
}

export const db = createDb();
