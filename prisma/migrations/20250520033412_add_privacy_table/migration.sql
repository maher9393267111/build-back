-- CreateTable
CREATE TABLE "PrivacyPolicy" (
    "id" SERIAL NOT NULL,
    "seoTitle" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "heroSubTitle" TEXT,
    "heroImage" JSONB,

    CONSTRAINT "PrivacyPolicy_pkey" PRIMARY KEY ("id")
);
