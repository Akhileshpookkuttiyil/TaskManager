import { Inbox } from "lucide-react";

export const EmptyState = ({
  title = "No tasks yet",
  description = "Create your first task to get started.",
  action,
}) => (
  <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
      <Inbox size={20} />
    </div>
    <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h3>
    <p className="mt-1.5 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
