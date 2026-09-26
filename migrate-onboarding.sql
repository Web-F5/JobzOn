ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "trade" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "BusinessSettings" ADD COLUMN IF NOT EXISTS "onboardingComplete" BOOLEAN NOT NULL DEFAULT false;

UPDATE "BusinessSettings" SET "onboardingComplete" = true WHERE "businessName" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "ElectricianSettings" (
  "id"                   TEXT NOT NULL,
  "labourSellRate"       DOUBLE PRECISION NOT NULL DEFAULT 170,
  "labourCostRate"       DOUBLE PRECISION NOT NULL DEFAULT 65,
  "overheadAllowance"    DOUBLE PRECISION NOT NULL DEFAULT 0.1,
  "contingencyAllowance" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "minimumJobCharge"     DOUBLE PRECISION NOT NULL DEFAULT 500,
  "travelCallout"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "quoteRounding"        INTEGER NOT NULL DEFAULT 10,
  "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ElectricianSettings_pkey" PRIMARY KEY ("id")
);
