/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloads modules which would otherwise create a
 * new PrismaClient on every reload and exhaust the connection pool. The global
 * variable trick keeps the single instance alive across reloads.
 *
 * Uses @prisma/adapter-pg (standard pg driver) — suitable for Node.js / Vercel
 * serverless functions. The Neon serverless (ws) adapter is only needed for
 * edge runtimes; we're not using edge runtime in this project.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Keep the pool small — Vercel functions are short-lived and Neon's free
    // tier has a connection limit.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
