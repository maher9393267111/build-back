/*
  Warnings:

  - The `coverImage` column on the `ServiceProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `gallery` column on the `ServiceProvider` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `profileImage` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "ServiceProvider" ADD COLUMN     "address2" TEXT,
ADD COLUMN     "address3" TEXT,
ADD COLUMN     "businessPhone" TEXT,
ADD COLUMN     "businessType" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'UK',
ADD COLUMN     "state" TEXT,
ALTER COLUMN "address" DROP NOT NULL,
DROP COLUMN "coverImage",
ADD COLUMN     "coverImage" JSONB,
DROP COLUMN "gallery",
ADD COLUMN     "gallery" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationCode" TEXT,
ADD COLUMN     "verificationExpiry" TIMESTAMP(3),
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
DROP COLUMN "profileImage",
ADD COLUMN     "profileImage" JSONB;
