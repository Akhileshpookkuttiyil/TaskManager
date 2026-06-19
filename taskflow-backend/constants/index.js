const TASK_STATUS = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

const TASK_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
};

const TASK_RECURRENCE = {
  NONE: "none",
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

const LEGACY_TASK_STATUS = {
  TODO: TASK_STATUS.PENDING,
  DONE: TASK_STATUS.COMPLETED,
};

const NOTIFICATION_TYPE = {
  DUE_SOON: "due_soon",
  DUE_TODAY: "due_today",
  OVERDUE: "overdue",
  TASK_COMPLETED: "task_completed",
  RECURRING_TASK_GENERATED: "recurring_task_generated",
  STREAK_MILESTONE: "streak_milestone",
};

const ACTIVITY_TYPE = {
  TASK_CREATED: "task_created",
  TASK_UPDATED: "task_updated",
  PRIORITY_CHANGED: "priority_changed",
  DUE_DATE_CHANGED: "due_date_changed",
  TASK_COMPLETED: "task_completed",
  TASK_ARCHIVED: "task_archived",
  TASK_RESTORED: "task_restored",
  TASK_DELETED: "task_deleted",
};

const JWT_EXPIRY = "7d";

module.exports = {
  TASK_STATUS,
  TASK_PRIORITY,
  TASK_RECURRENCE,
  LEGACY_TASK_STATUS,
  NOTIFICATION_TYPE,
  ACTIVITY_TYPE,
  JWT_EXPIRY,
};
