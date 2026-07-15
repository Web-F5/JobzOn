import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env") });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, ServiceType } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nextRenewal(month: number, day: number): Date {
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), month - 1, day);
  return thisYear > now ? thisYear : new Date(now.getFullYear() + 1, month - 1, day);
}

// ─── Seed data ────────────────────────────────────────────────────────────────

async function main() {
  // Seed file is a no-op in the multi-user build.
  // All data is created per-user at runtime; there is no shared catalogue or
  // client data to pre-populate.
  console.log("Seed: nothing to do (multi-user build).");
}

// Australian fiscal year starts July 1 — INV-2026 means FY2025-26
function getCurrentFiscalYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
