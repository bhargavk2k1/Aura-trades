-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "paperBalance" DOUBLE PRECISION NOT NULL DEFAULT 100000;

-- CreateTable
CREATE TABLE "PaperTransaction" (
    "id" TEXT NOT NULL,
    "prefId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balanceAfter" DOUBLE PRECISION NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaperTransaction_prefId_idx" ON "PaperTransaction"("prefId");

-- AddForeignKey
ALTER TABLE "PaperTransaction" ADD CONSTRAINT "PaperTransaction_prefId_fkey" FOREIGN KEY ("prefId") REFERENCES "UserPreferences"("id") ON DELETE CASCADE ON UPDATE CASCADE;
