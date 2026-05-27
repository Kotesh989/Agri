-- Multi-store and farmer OTP support
CREATE TABLE IF NOT EXISTS "stores" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ownerAdminId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ownerName" TEXT NOT NULL,
  "mobileNumber" TEXT,
  "address" TEXT,
  "village" TEXT,
  "taluk" TEXT,
  "district" TEXT,
  "state" TEXT,
  "gstNumber" TEXT,
  "logo" TEXT,
  "subscriptionStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "farmer_store_links" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "farmerId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "customerId" TEXT,
  "lastVisitDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "farmer_store_links_farmerId_storeId_key" UNIQUE ("farmerId", "storeId")
);

CREATE TABLE IF NOT EXISTS "store_settings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "storeId" TEXT NOT NULL UNIQUE,
  "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
  "receiptPrefix" TEXT NOT NULL DEFAULT 'RCP',
  "currencySymbol" TEXT NOT NULL DEFAULT '₹',
  "expiryAlertDays" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS "farmer_auth_otps" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT,
  "identifier" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resendAvailableAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "farmer_auth_otps_identifier_idx" ON "farmer_auth_otps"("identifier");
