-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT,
    "ogImage" JSONB,
    "logo" JSONB,
    "footerLogo" JSONB,
    "primaryColor" TEXT NOT NULL DEFAULT '#2563eb',
    "footerText" TEXT,
    "footerLinks" JSONB,
    "socialLinks" JSONB,
    "scripts" JSONB,
    "navTitles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
