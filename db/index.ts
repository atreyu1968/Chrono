import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isNeonUrl = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon.cloud');

let pool: any;
let db: any;

async function initDatabase() {
  if (isNeonUrl) {
    const { Pool: NeonPool, neonConfig } = await import('@neondatabase/serverless');
    const ws = (await import('ws')).default;
    neonConfig.webSocketConstructor = ws;
    pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
    const { drizzle: neonDrizzle } = await import('drizzle-orm/neon-serverless');
    db = neonDrizzle({ client: pool, schema });
  } else {
    const pg = await import('pg');
    pool = new pg.default.Pool({ connectionString: process.env.DATABASE_URL });
    const { drizzle: pgDrizzle } = await import('drizzle-orm/node-postgres');
    db = pgDrizzle({ client: pool, schema });
  }
}

const dbReady = initDatabase();

export { pool, db, dbReady };
