/*
  Warnings:

  - Added the required column `foodId` to the `SaleTemp` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `SaleTemp` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SaleTemp" ADD COLUMN     "foodId" INTEGER NOT NULL,
ADD COLUMN     "qty" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "SaleTemp" ADD CONSTRAINT "SaleTemp_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
