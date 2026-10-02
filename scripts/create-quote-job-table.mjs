import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";

// Load .env
const envContent = readFileSync(".env", "utf-8");
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];
if (!dbUrl) { console.error("DATABASE_URL not found"); process.exit(1); }

const sql = neon(dbUrl);

await sql`
  CREATE TABLE IF NOT EXISTS "ElectricianQuoteJob" (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quoteId" TEXT,
    "quoteType" TEXT NOT NULL DEFAULT 'Existing Home',
    storeys TEXT NOT NULL DEFAULT 'Single storey',
    underfloor TEXT NOT NULL DEFAULT 'No',
    "roofAccess" TEXT NOT NULL DEFAULT 'Manhole',
    "openFrame" TEXT NOT NULL DEFAULT 'No',
    "extraLabour" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraMaterials" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelOverride" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gpoGroups" JSONB NOT NULL DEFAULT '[]',
    "totalHrs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalIncGst" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ElectricianQuoteJob_pkey" PRIMARY KEY (id),
    CONSTRAINT "ElectricianQuoteJob_quoteId_key" UNIQUE ("quoteId")
  )
`;
console.log("ElectricianQuoteJob table created.");
