-- Better Auth 1.7: accounts are keyed by (issuer, accountId).
-- See https://better-auth.com/docs/guides/1-7-upgrade-guide#account-identity-is-scoped-by-issuer

-- Add nullable, backfill, then lock down.
ALTER TABLE "Account" ADD COLUMN "issuer" TEXT;

UPDATE "Account"
SET "issuer" = CASE
  WHEN "providerId" = 'credential' THEN 'local:credential'
  WHEN "providerId" = 'google' THEN 'https://accounts.google.com'
  ELSE 'local:oauth:' || "providerId"
END
WHERE "issuer" IS NULL;

ALTER TABLE "Account" ALTER COLUMN "issuer" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Account_issuer_accountId_key" ON "Account"("issuer", "accountId");
