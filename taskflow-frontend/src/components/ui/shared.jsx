import { AlertCircle } from "lucide-react";

export const FieldError = ({ message, id }) =>
  message ? (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
    >
      <AlertCircle size={13} className="shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  ) : null;

export const TaskSkeletonList = ({ count = 3 }) => (
  <div className="space-y-3" role="status" aria-label="Loading tasks">
    <span className="sr-only">Loading tasks...</span>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4 space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-1/3 rounded-md bg-elevated" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-elevated" />
            <div className="h-8 w-8 rounded-lg bg-elevated" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-5 w-14 rounded-md bg-elevated" />
          <div className="h-5 w-16 rounded-md bg-elevated" />
          <div className="h-5 w-24 rounded-md bg-elevated" />
        </div>
      </div>
    ))}
  </div>
);
