/*
  Warnings:

  - You are about to drop the column `image` on the `ContactQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `isEnd` on the `ContactQuestion` table. All the data in the column will be lost.
  - You are about to drop the column `target` on the `ContactQuestion` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ContactQuestion" DROP COLUMN "image",
DROP COLUMN "isEnd",
DROP COLUMN "target";

-- CreateTable
CREATE TABLE "ContactQuestionOption" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "image" JSONB,
    "target" TEXT,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "questionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactQuestionOption_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ContactQuestionOption" ADD CONSTRAINT "ContactQuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "ContactQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
