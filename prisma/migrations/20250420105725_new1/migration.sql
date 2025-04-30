/*
  Warnings:

  - A unique constraint covering the columns `[sourceOptionId]` on the table `QuestionFlow` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "QuestionFlow_sourceOptionId_key" ON "QuestionFlow"("sourceOptionId");
