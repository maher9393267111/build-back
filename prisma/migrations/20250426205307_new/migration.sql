-- CreateTable
CREATE TABLE "Accreditation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "image" JSONB,

    CONSTRAINT "Accreditation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderAccreditation" (
    "id" SERIAL NOT NULL,
    "serviceProviderId" INTEGER NOT NULL,
    "accreditationId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expiryDate" TIMESTAMP(3),
    "proofDocument" JSONB,
    "notes" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "customName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderAccreditation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAccreditation_serviceProviderId_accreditationId_key" ON "ProviderAccreditation"("serviceProviderId", "accreditationId");

-- AddForeignKey
ALTER TABLE "ProviderAccreditation" ADD CONSTRAINT "ProviderAccreditation_serviceProviderId_fkey" FOREIGN KEY ("serviceProviderId") REFERENCES "ServiceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderAccreditation" ADD CONSTRAINT "ProviderAccreditation_accreditationId_fkey" FOREIGN KEY ("accreditationId") REFERENCES "Accreditation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
