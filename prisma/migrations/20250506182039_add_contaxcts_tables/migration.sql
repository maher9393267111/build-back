-- CreateTable
CREATE TABLE "ContactSettings" (
    "id" SERIAL NOT NULL,
    "address" TEXT,
    "phones" JSONB,
    "emails" JSONB,
    "showQuestions" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactQuestion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "target" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isEnd" BOOLEAN NOT NULL DEFAULT false,
    "image" JSONB,
    "settingsId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactCustomer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT,
    "type" TEXT NOT NULL DEFAULT 'standard',
    "answers" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactCustomer_email_idx" ON "ContactCustomer"("email");

-- CreateIndex
CREATE INDEX "ContactCustomer_name_idx" ON "ContactCustomer"("name");

-- CreateIndex
CREATE INDEX "ContactCustomer_status_idx" ON "ContactCustomer"("status");

-- AddForeignKey
ALTER TABLE "ContactQuestion" ADD CONSTRAINT "ContactQuestion_settingsId_fkey" FOREIGN KEY ("settingsId") REFERENCES "ContactSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
