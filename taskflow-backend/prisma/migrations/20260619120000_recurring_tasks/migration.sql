-- CreateEnum
CREATE TYPE "TaskRecurrence" AS ENUM ('none', 'daily', 'weekly', 'monthly');

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "recurrence" "TaskRecurrence" NOT NULL DEFAULT 'none',
ADD COLUMN "recurrenceKey" TEXT,
ADD COLUMN "recurrenceParentId" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "Task_recurrenceKey_key" ON "Task"("recurrenceKey");
CREATE INDEX "Task_recurrenceParentId_idx" ON "Task"("recurrenceParentId");

-- AddForeignKey
ALTER TABLE "Task"
ADD CONSTRAINT "Task_recurrenceParentId_fkey"
FOREIGN KEY ("recurrenceParentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;
