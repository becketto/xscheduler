-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "XApiUsage" (
    "id" SERIAL NOT NULL,
    "monthYear" TEXT NOT NULL,
    "postsUsed" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XApiUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "XApiUsage_monthYear_key" ON "XApiUsage"("monthYear");
