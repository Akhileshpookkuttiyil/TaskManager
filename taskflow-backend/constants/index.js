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

const JWT_EXPIRY = "7d";

module.exports = { TASK_STATUS, TASK_PRIORITY, LEGACY_TASK_STATUS, NOTIFICATION_TYPE, JWT_EXPIRY };
