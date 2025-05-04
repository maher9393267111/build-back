-- AlterTable
ALTER TABLE "Blog" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "metaDescription" TEXT,
ADD COLUMN     "metaKeywords" TEXT,
ADD COLUMN     "metaTitle" TEXT,
ADD COLUMN     "ogImage" JSONB,
ADD COLUMN     "robots" TEXT,
ADD COLUMN     "structuredData" JSONB;
