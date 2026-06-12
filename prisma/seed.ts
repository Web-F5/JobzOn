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
  console.log("Seeding Jobzon...");

  // Service catalogue — default pricing (ex-GST AUD)
  const catalogue = await Promise.all([
    prisma.serviceCatalogueItem.upsert({
      where: { name: "Domain .com.au" },
      update: {},
      create: { name: "Domain .com.au", type: ServiceType.DOMAIN, amountExGst: 25.00 },
    }),
    prisma.serviceCatalogueItem.upsert({
      where: { name: "Domain .com" },
      update: {},
      create: { name: "Domain .com", type: ServiceType.DOMAIN, amountExGst: 20.00 },
    }),
    prisma.serviceCatalogueItem.upsert({
      where: { name: "Shared Hosting" },
      update: {},
      create: { name: "Shared Hosting", type: ServiceType.HOSTING, amountExGst: 120.00, description: "Annual shared hosting — Syrahost/Dreamscape reseller" },
    }),
    prisma.serviceCatalogueItem.upsert({
      where: { name: "SSL Certificate" },
      update: {},
      create: { name: "SSL Certificate", type: ServiceType.SSL, amountExGst: 45.00 },
    }),
  ]);
  console.log(`  ✓ ${catalogue.length} catalogue items`);

  // ─── Clients + Services ────────────────────────────────────────────────────
  // Renewal dates and pricing below are placeholders — update before going live.

  const clients = [
    {
      name: "Horse Hay",
      email: "accounts@horsehay.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "horsehay.com.au domain renewal",   renewalDate: nextRenewal(3, 15),  amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "horsehay.com.au shared hosting",   renewalDate: nextRenewal(3, 15),  amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "horsehay.com.au SSL certificate",  renewalDate: nextRenewal(3, 15),  amountExGst: 45.00 },
      ],
    },
    {
      name: "LKF Contracting",
      email: "accounts@lkfcontracting.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "lkfcontracting.com.au domain renewal",  renewalDate: nextRenewal(5, 1),   amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "lkfcontracting.com.au shared hosting",  renewalDate: nextRenewal(5, 1),   amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "lkfcontracting.com.au SSL certificate", renewalDate: nextRenewal(5, 1),   amountExGst: 45.00 },
      ],
    },
    {
      name: "Outright Electrical",
      email: "accounts@outrightelectrical.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "outrightelectrical.com.au domain renewal",  renewalDate: nextRenewal(7, 20),  amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "outrightelectrical.com.au shared hosting",  renewalDate: nextRenewal(7, 20),  amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "outrightelectrical.com.au SSL certificate", renewalDate: nextRenewal(7, 20),  amountExGst: 45.00 },
      ],
    },
    {
      name: "Valley Feeds & General",
      email: "accounts@valleyfeedsgeneral.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "valleyfeedsgeneral.com.au domain renewal",  renewalDate: nextRenewal(9, 10),  amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "valleyfeedsgeneral.com.au shared hosting",  renewalDate: nextRenewal(9, 10),  amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "valleyfeedsgeneral.com.au SSL certificate", renewalDate: nextRenewal(9, 10),  amountExGst: 45.00 },
      ],
    },
    {
      name: "Chuck E Electrical",
      email: "accounts@chuckeelectrical.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "chuckeelectrical.com.au domain renewal",  renewalDate: nextRenewal(11, 5),  amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "chuckeelectrical.com.au shared hosting",  renewalDate: nextRenewal(11, 5),  amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "chuckeelectrical.com.au SSL certificate", renewalDate: nextRenewal(11, 5),  amountExGst: 45.00 },
      ],
    },
    {
      name: "Australian Trenching and Excavations",
      email: "accounts@australiantrenching.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "australiantrenching.com.au domain renewal",  renewalDate: nextRenewal(1, 25),  amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "australiantrenching.com.au shared hosting",  renewalDate: nextRenewal(1, 25),  amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "australiantrenching.com.au SSL certificate", renewalDate: nextRenewal(1, 25),  amountExGst: 45.00 },
      ],
    },
    {
      name: "Let's Get Trowled",
      email: "accounts@letsgettrowled.com.au",
      services: [
        { type: ServiceType.DOMAIN,  description: "letsgettrowled.com.au domain renewal",  renewalDate: nextRenewal(6, 1),  amountExGst: 25.00 },
        { type: ServiceType.HOSTING, description: "letsgettrowled.com.au shared hosting",  renewalDate: nextRenewal(6, 1),  amountExGst: 120.00 },
        { type: ServiceType.SSL,     description: "letsgettrowled.com.au SSL certificate", renewalDate: nextRenewal(6, 1),  amountExGst: 45.00 },
      ],
    },
  ];

  for (const c of clients) {
    const client = await prisma.client.upsert({
      where: { email: c.email },
      update: { name: c.name },
      create: { name: c.name, email: c.email },
    });

    for (const s of c.services) {
      const existing = await prisma.service.findFirst({
        where: { clientId: client.id, type: s.type },
      });
      if (!existing) {
        await prisma.service.create({
          data: {
            clientId: client.id,
            type: s.type,
            description: s.description,
            renewalDate: s.renewalDate,
            amountExGst: s.amountExGst,
          },
        });
      }
    }

    console.log(`  ✓ ${c.name} (${c.services.length} services)`);
  }

  // Sequence counters for current fiscal year
  const fiscalYear = getCurrentFiscalYear();
  await Promise.all([
    prisma.sequenceCounter.upsert({ where: { id: `INV-${fiscalYear}` }, update: {}, create: { id: `INV-${fiscalYear}`, currentValue: 0 } }),
    prisma.sequenceCounter.upsert({ where: { id: `QUO-${fiscalYear}` }, update: {}, create: { id: `QUO-${fiscalYear}`, currentValue: 0 } }),
    prisma.sequenceCounter.upsert({ where: { id: `JOB-${fiscalYear}` }, update: {}, create: { id: `JOB-${fiscalYear}`, currentValue: 0 } }),
  ]);
  console.log(`  ✓ Sequence counters for FY${fiscalYear}`);

  console.log("Seed complete.");
}

// Australian fiscal year starts July 1 — INV-2026 means FY2025-26
function getCurrentFiscalYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
