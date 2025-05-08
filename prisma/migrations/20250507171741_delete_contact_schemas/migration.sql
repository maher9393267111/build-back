/*
  Warnings:

  - You are about to drop the column `Test` on the `SiteSettings` table. All the data in the column will be lost.
  - You are about to drop the `ContactCustomer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContactSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Form` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FormSubmission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FormField" DROP CONSTRAINT "FormField_formId_fkey";

-- DropForeignKey
ALTER TABLE "FormSubmission" DROP CONSTRAINT "FormSubmission_formId_fkey";

-- AlterTable
ALTER TABLE "SiteSettings" DROP COLUMN "Test";

-- DropTable
DROP TABLE "ContactCustomer";

-- DropTable
DROP TABLE "ContactSettings";

-- DropTable
DROP TABLE "Form";

-- DropTable
DROP TABLE "FormField";

-- DropTable
DROP TABLE "FormSubmission";
