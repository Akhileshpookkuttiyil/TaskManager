-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'subtask_created';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'subtask_completed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'subtask_reopened';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'subtask_updated';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'subtask_deleted';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "parentId" UUID;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Task_userId_parentId_idx" ON "Task"("userId", "parentId");
CREATE INDEX IF NOT EXISTS "Task_parentId_idx" ON "Task"("parentId");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_parentId_fkey'
  ) THEN
    ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
