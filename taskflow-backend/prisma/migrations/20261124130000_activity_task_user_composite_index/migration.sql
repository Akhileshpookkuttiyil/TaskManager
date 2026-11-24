-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'title_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'description_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'status_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'tags_changed';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Activity_userId_taskId_createdAt_idx" ON "Activity"("userId", "taskId", "createdAt");
