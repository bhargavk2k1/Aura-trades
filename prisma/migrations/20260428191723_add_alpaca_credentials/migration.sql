-- CreateTable
CREATE TABLE "AlpacaCredentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paperKey" TEXT NOT NULL DEFAULT '',
    "paperSecret" TEXT NOT NULL DEFAULT '',
    "liveKey" TEXT NOT NULL DEFAULT '',
    "liveSecret" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlpacaCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlpacaCredentials_userId_key" ON "AlpacaCredentials"("userId");

-- AddForeignKey
ALTER TABLE "AlpacaCredentials" ADD CONSTRAINT "AlpacaCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
