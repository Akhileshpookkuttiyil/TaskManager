const variants = {
  pending: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
  in_progress: "bg-neutral-900 text-white ring-1 ring-neutral-700 dark:bg-white dark:text-neutral-950 dark:ring-white",
  completed: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700",
  archived: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-500 dark:ring-neutral-800",
  low: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-neutral-400 dark:ring-neutral-800",
  medium: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700",
  high: "bg-red-950/10 text-red-700 ring-1 ring-red-700/20 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-300/20",
  overdue: "bg-red-950/10 text-red-700 ring-1 ring-red-700/20 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-300/20",
  due_soon: "bg-red-950/10 text-red-700 ring-1 ring-red-700/20 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-300/20",
  due_today: "bg-neutral-100 text-neutral-700 ring-1 ring-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700",
  task_deleted: "bg-red-950/10 text-red-700 ring-1 ring-red-700/20 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-300/20",
};

const labels = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  archived: "Archived",
  low: "Low",
  medium: "Medium",
  high: "High",
  overdue: "Overdue",
  due_soon: "Due soon",
  due_today: "Due today",
  task_reminder: "Reminder",
  task_completed: "Task completed",
  streak_milestone: "Streak milestone",
  task_created: "Created",
  task_updated: "Updated",
  priority_changed: "Priority changed",
  due_date_changed: "Due date changed",
  task_restored: "Restored",
  task_deleted: "Deleted",
  none: "No repeat",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export const Badge = ({ value }) => (
  <span
    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
      variants[value] || "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700"
    }`}
  >
    {labels[value] || value}
  </span>
);
