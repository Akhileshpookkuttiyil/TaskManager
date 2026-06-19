-- Add reminder notifications for task reminder dates.
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'task_reminder';
