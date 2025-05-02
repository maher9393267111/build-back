/*
  Warnings:

  - You are about to drop the `Accreditation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Album` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AlbumItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CategoryQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Job` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProviderAccreditation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestionFlow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuestionOption` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceProvider` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceProviderCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceProviderSkill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceProviderSubCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceSubCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Skill` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Album" DROP CONSTRAINT "Album_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "AlbumItem" DROP CONSTRAINT "AlbumItem_albumId_fkey";

-- DropForeignKey
ALTER TABLE "CategoryQuestion" DROP CONSTRAINT "CategoryQuestion_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderAccreditation" DROP CONSTRAINT "ProviderAccreditation_accreditationId_fkey";

-- DropForeignKey
ALTER TABLE "ProviderAccreditation" DROP CONSTRAINT "ProviderAccreditation_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionFlow" DROP CONSTRAINT "QuestionFlow_nextQuestionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionFlow" DROP CONSTRAINT "QuestionFlow_sourceOptionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionOption" DROP CONSTRAINT "QuestionOption_questionId_fkey";

-- DropForeignKey
ALTER TABLE "QuestionOption" DROP CONSTRAINT "QuestionOption_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProvider" DROP CONSTRAINT "ServiceProvider_userId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProviderCategory" DROP CONSTRAINT "ServiceProviderCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProviderCategory" DROP CONSTRAINT "ServiceProviderCategory_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProviderSkill" DROP CONSTRAINT "ServiceProviderSkill_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProviderSkill" DROP CONSTRAINT "ServiceProviderSkill_skillId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProviderSubCategory" DROP CONSTRAINT "ServiceProviderSubCategory_serviceProviderId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceProviderSubCategory" DROP CONSTRAINT "ServiceProviderSubCategory_subCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceSubCategory" DROP CONSTRAINT "ServiceSubCategory_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceSubCategory" DROP CONSTRAINT "ServiceSubCategory_parentSubCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "Skill" DROP CONSTRAINT "Skill_categoryId_fkey";

-- DropTable
DROP TABLE "Accreditation";

-- DropTable
DROP TABLE "Album";

-- DropTable
DROP TABLE "AlbumItem";

-- DropTable
DROP TABLE "CategoryQuestion";

-- DropTable
DROP TABLE "Job";

-- DropTable
DROP TABLE "ProviderAccreditation";

-- DropTable
DROP TABLE "QuestionFlow";

-- DropTable
DROP TABLE "QuestionOption";

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "ServiceCategory";

-- DropTable
DROP TABLE "ServiceProvider";

-- DropTable
DROP TABLE "ServiceProviderCategory";

-- DropTable
DROP TABLE "ServiceProviderSkill";

-- DropTable
DROP TABLE "ServiceProviderSubCategory";

-- DropTable
DROP TABLE "ServiceSubCategory";

-- DropTable
DROP TABLE "Skill";

-- CreateTable
CREATE TABLE "Page" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" INTEGER NOT NULL,
    "metaTitle" TEXT,
    "metaKeywords" TEXT,
    "ogImage" JSONB,
    "featuredImage" JSONB,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pageId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlockTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_slug_idx" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "Page_status_idx" ON "Page"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BlockTemplate_name_key" ON "BlockTemplate"("name");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
