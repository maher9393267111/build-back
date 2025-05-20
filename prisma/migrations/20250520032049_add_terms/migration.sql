-- CreateTable
CREATE TABLE "TermsAndConditions" (
    "id" SERIAL NOT NULL,
    "seoTitle" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "heroSubTitle" TEXT,
    "heroImage" JSONB,

    CONSTRAINT "TermsAndConditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CookiePolicy" (
    "id" SERIAL NOT NULL,
    "seoTitle" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "heroSubTitle" TEXT,
    "heroImage" JSONB,

    CONSTRAINT "CookiePolicy_pkey" PRIMARY KEY ("id")
);
