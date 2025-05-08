/*
  Warnings:

  - You are about to drop the column `answers` on the `ContactCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `showQuestions` on the `ContactSettings` table. All the data in the column will be lost.
  - You are about to drop the `ContactQuestion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ContactQuestionOption` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ContactQuestion" DROP CONSTRAINT "ContactQuestion_settingsId_fkey";

-- DropForeignKey
ALTER TABLE "ContactQuestionOption" DROP CONSTRAINT "ContactQuestionOption_questionId_fkey";

-- AlterTable
ALTER TABLE "ContactCustomer" DROP COLUMN "answers",
ADD COLUMN     "formData" JSONB,
ADD COLUMN     "formId" INTEGER;

-- AlterTable
ALTER TABLE "ContactSettings" DROP COLUMN "showQuestions";

-- DropTable
DROP TABLE "ContactQuestion";

-- DropTable
DROP TABLE "ContactQuestionOption";

-- CreateTable
CREATE TABLE "Form" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "successMessage" TEXT,
    "redirectUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormField" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "placeholder" TEXT,
    "defaultValue" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "validations" JSONB,
    "formId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FormSubmission" (
    "id" SERIAL NOT NULL,
    "formId" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FormSubmission_email_idx" ON "FormSubmission"("email");

-- CreateIndex
CREATE INDEX "FormSubmission_name_idx" ON "FormSubmission"("name");

-- CreateIndex
CREATE INDEX "FormSubmission_status_idx" ON "FormSubmission"("status");

-- CreateIndex
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

-- CreateIndex
CREATE INDEX "ContactCustomer_formId_idx" ON "ContactCustomer"("formId");

-- AddForeignKey
ALTER TABLE "FormField" ADD CONSTRAINT "FormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
