import React from "react";
import { AlertCircle, RotateCcw, Home, RefreshCw } from "lucide-react";
import { sanitizeErrorDetails } from "../../utils/sanitize";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      lastRetryTimestamp: 0,
      isLooping: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const { message } = sanitizeErrorDetails(error);

    // Safe error logging without sensitive exposure
    if (typeof console !== "undefined" && console.error) {
      console.error(
        `[ErrorBoundary:${this.props.name || "Default"}] Caught error:`,
        message,
        errorInfo?.componentStack ? errorInfo.componentStack.slice(0, 300) : ""
      );
    }

    if (typeof this.props.onError === "function") {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackErr) {
        // Guard against errors inside the onError callback
        console.error("[ErrorBoundary] Error inside onError callback:", callbackErr);
      }
    }
  }

  handleReset = () => {
    const now = Date.now();
    const isRapidRetry = now - this.state.lastRetryTimestamp < 2000;
    const nextRetryCount = isRapidRetry ? this.state.retryCount + 1 : 1;

    // Guard against infinite error loops (> 3 rapid retries within 2 seconds)
    if (nextRetryCount > 3) {
      this.setState({ isLooping: true, lastRetryTimestamp: now });
      return;
    }

    if (typeof this.props.onReset === "function") {
      try {
        this.props.onReset();
      } catch (resetErr) {
        console.error("[ErrorBoundary] Error during onReset callback:", resetErr);
      }
    }

    this.setState({
      hasError: false,
      error: null,
      retryCount: nextRetryCount,
      lastRetryTimestamp: now,
      isLooping: false,
    });
  };

  handleReload = () => {
    if (typeof window !== "undefined" && window.location) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== "undefined" && window.location) {
      window.location.assign("/");
    }
  };

  render() {
    const { hasError, error, isLooping } = this.state;
    const { children, fallback, variant = "section", name } = this.props;

    if (!hasError) {
      return children;
    }

    // Support custom fallback (either a React node or render prop function)
    if (typeof fallback === "function") {
      return fallback({
        error,
        resetErrorBoundary: this.handleReset,
      });
    }

    if (fallback) {
      return fallback;
    }

    const { message } = sanitizeErrorDetails(error);

    // Minimal inline variant
    if (variant === "inline") {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="my-2 flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" aria-hidden="true" />
            <span className="font-medium">Failed to display this item.</span>
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1 font-semibold underline hover:opacity-80 focus-ring"
          >
            <RotateCcw size={11} aria-hidden="true" />
            Try again
          </button>
        </div>
      );
    }

    // Full page variant (App root or Page level)
    if (variant === "page") {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center"
        >
          <div className="card flex max-w-md flex-col items-center p-8 shadow-elevated">
            <div
              className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
              aria-hidden="true"
            >
              <AlertCircle size={28} />
            </div>

            <h2 className="text-lg font-bold text-primary">
              Something went wrong
            </h2>

            <p className="mt-2 text-sm text-secondary">
              {isLooping
                ? "This section is having persistent issues. Please reload the application or return to the dashboard."
                : message && message !== "An unexpected error occurred."
                ? message
                : "An unexpected rendering error occurred. You can try refreshing the component or returning to your dashboard."}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              {!isLooping && (
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="btn-primary text-xs"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Try again
                </button>
              )}

              <button
                type="button"
                onClick={this.handleReload}
                className="btn-secondary text-xs"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Reload page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="btn-secondary text-xs"
              >
                <Home size={14} aria-hidden="true" />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Default section / widget variant
    return (
      <div
        role="alert"
        aria-live="assertive"
        data-testid={name ? `error-boundary-${name}` : "error-boundary-section"}
        className="card flex flex-col items-center justify-center p-6 text-center my-4 border-neutral bg-elevated"
      >
        <div
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          aria-hidden="true"
        >
          <AlertCircle size={18} />
        </div>

        <h3 className="text-sm font-semibold text-primary">
          Unable to display this section
        </h3>

        <p className="mt-1 max-w-sm text-xs text-secondary">
          {isLooping
            ? "Multiple errors occurred. Please refresh the page."
            : "An unexpected error occurred while rendering this component."}
        </p>

        <div className="mt-4 flex items-center gap-2">
          {!isLooping ? (
            <button
              type="button"
              onClick={this.handleReset}
              className="btn-secondary text-xs font-semibold flex items-center gap-1.5 focus-ring"
            >
              <RotateCcw size={13} aria-hidden="true" />
              Try again
            </button>
          ) : (
            <button
              type="button"
              onClick={this.handleReload}
              className="btn-secondary text-xs font-semibold flex items-center gap-1.5 focus-ring"
            >
              <RefreshCw size={13} aria-hidden="true" />
              Reload application
            </button>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
