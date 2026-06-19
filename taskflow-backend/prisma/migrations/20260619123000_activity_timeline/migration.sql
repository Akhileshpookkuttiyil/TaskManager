-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM (
  'task_created',
  'task_updated',
  'priority_changed',
  'task_completed',
  'task_archived'
);

-- CreateTable
CREATE TABLE "Activity" (
  "id" UUID NOT NULL,
  "type" "ActivityType" NOT NULL,
  "message" TEXT NOT NULL,
  "taskId" UUID,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_userId_createdAt_idx" ON "Activity"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Activity"
ADD CONSTRAINT "Activity_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
