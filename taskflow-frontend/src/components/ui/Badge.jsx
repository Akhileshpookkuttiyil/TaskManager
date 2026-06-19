const variants = {
  todo: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
  in_progress: "bg-blue-50 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20",
  done: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20",
  low: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
  medium: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20",
  high: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20",
};

const labels = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const Badge = ({ value }) => (
  <span
    className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
      variants[value] || "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
    }`}
  >
    {labels[value] || value}
  </span>
);
