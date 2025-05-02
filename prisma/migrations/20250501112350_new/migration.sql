-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "canonicalUrl" TEXT,
ADD COLUMN     "isMainPage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "robots" TEXT,
ADD COLUMN     "structuredData" JSONB;

-- CreateIndex
CREATE INDEX "Page_isMainPage_idx" ON "Page"("isMainPage");
