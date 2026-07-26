import { Inbox } from "lucide-react";

export const EmptyState = ({
  title = "No tasks yet",
  description = "Create your first task to get started.",
  action,
}) => (
  <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-elevated text-muted">
      <Inbox size={20} />
    </div>
    <h3 className="text-base font-semibold text-primary">{title}</h3>
    <p className="mt-1.5 max-w-xs text-sm text-secondary">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
