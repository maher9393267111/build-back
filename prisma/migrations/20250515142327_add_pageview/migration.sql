-- CreateTable
CREATE TABLE "PageActivity" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER,
    "pageName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageActivity_pageId_idx" ON "PageActivity"("pageId");

-- CreateIndex
CREATE INDEX "PageActivity_timestamp_idx" ON "PageActivity"("timestamp");

-- CreateIndex
CREATE INDEX "PageActivity_action_idx" ON "PageActivity"("action");
