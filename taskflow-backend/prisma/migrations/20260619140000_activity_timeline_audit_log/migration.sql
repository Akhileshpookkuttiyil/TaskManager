-- Extend activity history with explicit audit-log events.
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'due_date_changed';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'task_restored';
ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'task_deleted';
