-- Better Auth 1.7.3+ reverts the 1.7.0–1.7.2 `issuer` requirement: accounts are
-- keyed by (providerId, accountId) again and the account schema matches 1.6.
-- New rows no longer write `issuer`, so the NOT NULL column from
-- 20260903000000_account_issuer rejects every sign-up and account link.
-- See https://www.better-auth.com/docs/guides/1-7-upgrade-guide (the `issuer` column).
--
-- Drop the index before the column. No data is lost that Better Auth reads.

-- DropIndex
DROP INDEX IF EXISTS "Account_issuer_accountId_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN IF EXISTS "issuer";
