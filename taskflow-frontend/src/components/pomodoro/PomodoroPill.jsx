import { Timer, Coffee } from "lucide-react";
import { usePomodoro } from "../../context/pomodoro-context";
import { formatTimerDisplay } from "../../utils/pomodoro";

export const PomodoroPill = () => {
  const { mode, status, remainingSeconds, openModal } = usePomodoro();

  const isRunning = status === "running";
  const isPaused = status === "paused";
  const isFocus = mode === "focus";
  const formattedTime = formatTimerDisplay(remainingSeconds);

  return (
    <button
      type="button"
      onClick={openModal}
      className={`group flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-all duration-150 ${
        isRunning
          ? isFocus
            ? "bg-[var(--text-primary)] text-[var(--bg-app)] shadow-sm"
            : "bg-emerald-600 text-white shadow-sm"
          : isPaused
          ? "border border-strong bg-elevated text-primary animate-pulse"
          : "border border-subtle bg-app text-muted hover:border-strong hover:text-primary"
      }`}
      aria-label={`Pomodoro timer: ${formattedTime} remaining in ${isFocus ? "focus" : "break"} mode`}
      title="Open Focus Timer"
    >
      {isFocus ? (
        <Timer size={14} className={isRunning ? "animate-spin-slow" : ""} />
      ) : (
        <Coffee size={14} />
      )}
      <span className="font-mono tabular-nums">{formattedTime}</span>
      {isRunning && (
        <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping" />
      )}
    </button>
  );
};
export default PomodoroPill;
