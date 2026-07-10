export const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>
  ) : null;

export const TaskSkeletonList = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="card p-4.5 space-y-3.5 relative overflow-hidden skeleton-shimmer">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4.5 w-2/5 skeleton" />
            <div className="h-3.5 w-4/5 skeleton" />
          </div>
          <div className="flex gap-1.5 shrink-0">
            <div className="h-8 w-8 rounded-lg skeleton" />
            <div className="h-8 w-8 rounded-lg skeleton" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-5 w-14 rounded-md skeleton" />
          <div className="h-5 w-16 rounded-md skeleton" />
          <div className="h-5 w-24 rounded-md skeleton" />
        </div>
      </div>
    ))}
  </div>
);
