-- Supplier price list tables
CREATE TABLE IF NOT EXISTS "SupplierPriceList" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "supplierName" TEXT NOT NULL,
  "itemCount"    INTEGER NOT NULL DEFAULT 0,
  "importedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "supplierName")
);

CREATE TABLE IF NOT EXISTS "SupplierProduct" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "priceListId"      TEXT NOT NULL,
  "partNumber"       TEXT NOT NULL,
  "manufacturerCode" TEXT,
  "manufacturer"     TEXT,
  "description"      TEXT NOT NULL,
  "unit"             TEXT,
  "tradePrice"       DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sellPrice"        DOUBLE PRECISION NOT NULL DEFAULT 0,
  "barcode"          TEXT,
  "category"         TEXT,
  "subCategory1"     TEXT,
  "subCategory2"     TEXT,
  FOREIGN KEY ("priceListId") REFERENCES "SupplierPriceList"("id") ON DELETE CASCADE,
  UNIQUE ("priceListId", "partNumber")
);
