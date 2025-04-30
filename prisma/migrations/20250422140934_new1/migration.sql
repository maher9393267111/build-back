-- AlterTable
ALTER TABLE "QuestionOption" ADD COLUMN     "subCategoryId" INTEGER;

-- CreateTable
CREATE TABLE "ServiceSubCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "categoryId" INTEGER NOT NULL,
    "parentSubCategoryId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceProviderSubCategory" (
    "id" SERIAL NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "subCategoryId" INTEGER NOT NULL,

    CONSTRAINT "ServiceProviderSubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceSubCategory_categoryId_name_key" ON "ServiceSubCategory"("categoryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProviderSubCategory_serviceProviderId_subCategoryId_key" ON "ServiceProviderSubCategory"("serviceProviderId", "subCategoryId");

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSubCategory" ADD CONSTRAINT "ServiceSubCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSubCategory" ADD CONSTRAINT "ServiceSubCategory_parentSubCategoryId_fkey" FOREIGN KEY ("parentSubCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProviderSubCategory" ADD CONSTRAINT "ServiceProviderSubCategory_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceProviderSubCategory" ADD CONSTRAINT "ServiceProviderSubCategory_subCategoryId_fkey" FOREIGN KEY ("subCategoryId") REFERENCES "ServiceSubCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
