import { AlertCircle, RotateCcw } from "lucide-react";

export const ErrorState = ({
  title = "Something went wrong",
  message = "Failed to load data. Please check your connection and try again.",
  onRetry,
}) => (
  <div
    role="alert"
    aria-live="assertive"
    className="card flex flex-col items-center justify-center px-6 py-12 text-center border-neutral bg-elevated"
  >
    <div
      className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-950/20 text-red-600 dark:text-red-400 border border-red-800/30"
      aria-hidden="true"
    >
      <AlertCircle size={20} />
    </div>
    <h3 className="text-base font-semibold text-primary">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm text-secondary">{message}</p>
    {onRetry ? (
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 btn-secondary text-xs font-semibold flex items-center gap-1.5 focus-ring"
      >
        <RotateCcw size={13} aria-hidden="true" />
        Retry
      </button>
    ) : null}
  </div>
);

export default ErrorState;
