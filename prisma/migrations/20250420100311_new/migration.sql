-- CreateTable
CREATE TABLE "CategoryQuestion" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "optionText" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionFlow" (
    "id" SERIAL NOT NULL,
    "sourceOptionId" INTEGER NOT NULL,
    "nextQuestionId" INTEGER,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionFlow_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CategoryQuestion" ADD CONSTRAINT "CategoryQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "CategoryQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFlow" ADD CONSTRAINT "QuestionFlow_sourceOptionId_fkey" FOREIGN KEY ("sourceOptionId") REFERENCES "QuestionOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionFlow" ADD CONSTRAINT "QuestionFlow_nextQuestionId_fkey" FOREIGN KEY ("nextQuestionId") REFERENCES "CategoryQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
