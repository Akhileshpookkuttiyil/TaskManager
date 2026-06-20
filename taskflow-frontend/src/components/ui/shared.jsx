export const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>
  ) : null;

export const TaskSkeletonList = ({ count = 3 }) => (
  <div className="space-y-2.5">
    {Array.from({ length: count }, (_, i) => (
      <div key={i} className="card h-[88px] animate-pulse bg-neutral-100 dark:bg-neutral-900" />
    ))}
  </div>
);
