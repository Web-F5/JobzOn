// Makes quote, invoice and job numbers unique per user instead of across all users.
//
// Numbers are issued per user (every user starts at 001), so a global unique
// index made the second user's first quote/invoice/job fail.
//
// Safe to run more than once. Run with: node scripts/per-user-number-uniqueness.mjs
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load .env
const envContent = readFileSync(".env", "utf-8");
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];
if (!dbUrl) { console.error("DATABASE_URL not found"); process.exit(1); }

const sql = neon(dbUrl);

await sql.transaction([
  // Job gets an owner, filled in from its quote
  sql`ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "userId" TEXT`,
  sql`UPDATE "Job" j SET "userId" = q."userId" FROM "Quote" q WHERE q.id = j."quoteId" AND j."userId" IS NULL`,

  // Global unique indexes -> per-user unique indexes
  sql`DROP INDEX IF EXISTS "Quote_quoteNumber_key"`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "Quote_userId_quoteNumber_key" ON "Quote"("userId", "quoteNumber")`,

  sql`DROP INDEX IF EXISTS "Invoice_invoiceNumber_key"`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber")`,

  sql`DROP INDEX IF EXISTS "Job_jobNumber_key"`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "Job_userId_jobNumber_key" ON "Job"("userId", "jobNumber")`,

  sql`DROP INDEX IF EXISTS "ElectricianQuoteJob_quoteNumber_key"`,
  sql`CREATE UNIQUE INDEX IF NOT EXISTS "ElectricianQuoteJob_userId_quoteNumber_key" ON "ElectricianQuoteJob"("userId", "quoteNumber")`,
]);

const [{ n }] = await sql`SELECT count(*)::int AS n FROM "Job" WHERE "userId" IS NULL`;
console.log(`Done. Jobs without an owner: ${n}`);
