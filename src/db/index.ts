import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set in environment variables");
}

neonConfig.poolQueryViaFetch = true;

const globalForDb = globalThis as unknown as {
  neonPool?: Pool;
};

const pool =
  globalForDb.neonPool ?? new Pool({ connectionString });

if (process.env.NODE_ENV !== "production") {
  globalForDb.neonPool = pool;
}

export const db = drizzle(pool, { schema });
