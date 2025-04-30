/*
  Warnings:

  - You are about to drop the column `level` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `BillSale` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillSaleDetail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Food` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FoodSize` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FoodType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Organization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleTemp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SaleTempDetail` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Taste` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SERVICE_PROVIDER', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('NEW', 'INTERESTED', 'COMPLETED', 'CANCELLED', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "BillSale" DROP CONSTRAINT "BillSale_userId_fkey";

-- DropForeignKey
ALTER TABLE "BillSaleDetail" DROP CONSTRAINT "BillSaleDetail_billSaleId_fkey";

-- DropForeignKey
ALTER TABLE "BillSaleDetail" DROP CONSTRAINT "BillSaleDetail_foodId_fkey";

-- DropForeignKey
ALTER TABLE "BillSaleDetail" DROP CONSTRAINT "BillSaleDetail_foodSizeId_fkey";

-- DropForeignKey
ALTER TABLE "BillSaleDetail" DROP CONSTRAINT "BillSaleDetail_tasteId_fkey";

-- DropForeignKey
ALTER TABLE "Food" DROP CONSTRAINT "Food_foodTypeId_fkey";

-- DropForeignKey
ALTER TABLE "FoodSize" DROP CONSTRAINT "FoodSize_foodTypeId_fkey";

-- DropForeignKey
ALTER TABLE "SaleTemp" DROP CONSTRAINT "SaleTemp_foodId_fkey";

-- DropForeignKey
ALTER TABLE "SaleTempDetail" DROP CONSTRAINT "SaleTempDetail_foodId_fkey";

-- DropForeignKey
ALTER TABLE "SaleTempDetail" DROP CONSTRAINT "SaleTempDetail_foodSizeId_fkey";

-- DropForeignKey
ALTER TABLE "SaleTempDetail" DROP CONSTRAINT "SaleTempDetail_saleTempId_fkey";

-- DropForeignKey
ALTER TABLE "SaleTempDetail" DROP CONSTRAINT "SaleTempDetail_tasteId_fkey";

-- DropForeignKey
ALTER TABLE "Taste" DROP CONSTRAINT "Taste_foodTypeId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "level",
DROP COLUMN "username",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "profileImage" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'active';

-- DropTable
DROP TABLE "BillSale";

-- DropTable
DROP TABLE "BillSaleDetail";

-- DropTable
DROP TABLE "Food";

-- DropTable
DROP TABLE "FoodSize";

-- DropTable
DROP TABLE "FoodType";

-- DropTable
DROP TABLE "Organization";

-- DropTable
DROP TABLE "SaleTemp";

-- DropTable
DROP TABLE "SaleTempDetail";

-- DropTable
DROP TABLE "Taste";

-- CreateTable
CREATE TABLE "ServiceProvider" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "businessName" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "postcode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "website" TEXT,
    "foundedYear" INTEGER,
    "employeeCount" INTEGER DEFAULT 1,
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "averageRating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "coverImage" TEXT,
    "gallery" TEXT,
    "businessHours" TEXT,

    CONSTRAINT "ServiceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProviderCategory" (
    "id" SERIAL NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "ServiceProviderCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProviderSkill" (
    "id" SERIAL NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "ServiceProviderSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "serviceProviderId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'NEW',
    "postcode" TEXT NOT NULL,
    "address" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProvider_userId_key" ON "ServiceProvider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCategory_name_key" ON "ServiceCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderCategory_serviceProviderId_categoryId_key" ON "ServiceProviderCategory"("serviceProviderId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderSkill_serviceProviderId_skillId_key" ON "ServiceProviderSkill"("serviceProviderId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_jobId_key" ON "Review"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "ServiceProvider" ADD CONSTRAINT "ServiceProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProviderCategory" ADD CONSTRAINT "ServiceProviderCategory_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProviderCategory" ADD CONSTRAINT "ServiceProviderCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProviderSkill" ADD CONSTRAINT "ServiceProviderSkill_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProviderSkill" ADD CONSTRAINT "ServiceProviderSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
