-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "reminderDate" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "archivedAt" TIMESTAMP(3);

-- Rebuild enum with the new lifecycle states.
ALTER TYPE "TaskStatus" RENAME TO "TaskStatus_old";
CREATE TYPE "TaskStatus" AS ENUM ('pending', 'in_progress', 'completed', 'archived');

ALTER TABLE "Task" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Task"
ALTER COLUMN "status" TYPE "TaskStatus"
USING (
  CASE
    WHEN "status"::text = 'todo' THEN 'pending'
    WHEN "status"::text = 'done' THEN 'completed'
    ELSE "status"::text
  END
)::"TaskStatus";
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'pending';

DROP TYPE "TaskStatus_old";

-- Helpful lookup for due-date driven task views.
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");
