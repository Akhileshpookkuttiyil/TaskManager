import { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  X,
  Target,
  Coffee,
  CheckCircle2,
  ChevronDown,
  Unlink,
} from "lucide-react";
import { usePomodoro } from "../../context/pomodoro-context";
import { formatTimerDisplay } from "../../utils/pomodoro";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export const PomodoroModal = () => {
  const {
    mode,
    status,
    focusDuration,
    breakDuration,
    remainingSeconds,
    soundEnabled,
    sessionsCompleted,
    activeTaskId,
    activeTaskTitle,
    isModalOpen,
    percentCompleted,
    startTimer,
    pauseTimer,
    resetTimer,
    skipTimer,
    setDurations,
    toggleSound,
    setActiveTask,
    clearActiveTask,
    closeModal,
  } = usePomodoro();

  const { items: tasks } = useSelector((state) => state.tasks);
  const [showSettings, setShowSettings] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);

  const containerRef = useFocusTrap(isModalOpen, closeModal);

  // Available tasks to associate (incomplete tasks)
  const availableTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== "completed" && t.status !== "archived");
  }, [tasks]);

  if (!isModalOpen) return null;

  const isFocus = mode === "focus";
  const isRunning = status === "running";
  const formattedTime = formatTimerDisplay(remainingSeconds);

  // SVG Progress Ring calculations
  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentCompleted / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-950/60 backdrop-blur-[2px] transition-opacity"
        onClick={closeModal}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Pomodoro Focus Timer"
        tabIndex="-1"
        className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-neutral bg-surface shadow-elevated animate-in fade-in zoom-in-95 duration-150 focus:outline-none"
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-subtle px-5">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isFocus
                  ? "bg-[var(--text-primary)] text-[var(--bg-app)]"
                  : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isFocus ? <Target size={13} /> : <Coffee size={13} />}
              <span>{isFocus ? "Focus Session" : "Short Break"}</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleSound}
              className="btn-ghost h-8 w-8 p-0 text-muted hover:text-primary"
              title={soundEnabled ? "Mute completion chime" : "Enable completion chime"}
              aria-label={soundEnabled ? "Mute chime" : "Enable chime"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((prev) => !prev)}
              className={`btn-ghost h-8 w-8 p-0 ${showSettings ? "text-primary" : "text-muted hover:text-primary"}`}
              title="Timer durations"
              aria-label="Timer settings"
            >
              <Settings size={16} />
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="btn-ghost h-8 w-8 p-0 text-muted hover:text-primary"
              aria-label="Close timer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex flex-col items-center p-6 space-y-6">
          {/* Circular Countdown Gauge */}
          <div className="relative flex items-center justify-center">
            <svg className="h-56 w-56 -rotate-90 transform" viewBox="0 0 200 200">
              {/* Background track circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className="stroke-neutral-200 dark:stroke-neutral-800"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress active circle */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                className={`transition-all duration-300 ease-linear ${
                  isFocus ? "stroke-[var(--text-primary)]" : "stroke-emerald-500"
                }`}
                strokeWidth="8"
                strokeLinecap="round"
                fill="none"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                }}
              />
            </svg>

            {/* Inner text countdown */}
            <div className="absolute flex flex-col items-center text-center">
              <span className="font-mono text-5xl font-extrabold tracking-tight text-primary">
                {formattedTime}
              </span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {isRunning ? (isFocus ? "Focusing..." : "Resting...") : status === "paused" ? "Paused" : "Ready"}
              </span>
            </div>
          </div>

          {/* Associated Task Section */}
          <div className="w-full">
            {activeTaskId ? (
              <div className="flex items-center justify-between rounded-xl border border-subtle bg-elevated px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 size={15} className="text-secondary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Active Task</p>
                    <p className="truncate text-xs font-bold text-primary">{activeTaskTitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearActiveTask}
                  className="btn-ghost h-7 w-7 p-0 text-muted hover:text-red-500 shrink-0"
                  title="Unlink task from session"
                  aria-label="Unlink task"
                >
                  <Unlink size={13} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTaskPicker((prev) => !prev)}
                  className="w-full flex items-center justify-between rounded-xl border border-dashed border-subtle px-3.5 py-2 text-xs text-muted hover:border-strong hover:text-primary transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Target size={13} />
                    <span>Attach a task to this session</span>
                  </span>
                  <ChevronDown size={13} className={showTaskPicker ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>

                {showTaskPicker && (
                  <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto rounded-xl border border-neutral bg-elevated py-1 shadow-lg z-20">
                    {availableTasks.length > 0 ? (
                      availableTasks.slice(0, 8).map((t) => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => {
                            setActiveTask(t);
                            setShowTaskPicker(false);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs text-secondary hover:bg-hover hover:text-primary truncate transition-colors flex items-center justify-between"
                        >
                          <span className="truncate">{t.title}</span>
                          <span className="text-[10px] text-muted capitalize shrink-0 ml-2">{t.priority}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3.5 py-2 text-xs text-muted">No pending tasks found</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Settings Section (Foldable) */}
          {showSettings && (
            <div className="w-full rounded-xl border border-subtle bg-elevated p-3.5 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Focus Duration</span>
                <div className="flex gap-1.5">
                  {[15, 25, 45, 50].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurations(mins, breakDuration / 60)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        focusDuration === mins * 60
                          ? "bg-[var(--text-primary)] text-[var(--bg-app)]"
                          : "bg-surface border border-subtle text-secondary hover:text-primary"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">Break Duration</span>
                <div className="flex gap-1.5">
                  {[3, 5, 10, 15].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setDurations(focusDuration / 60, mins)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        breakDuration === mins * 60
                          ? "bg-[var(--text-primary)] text-[var(--bg-app)]"
                          : "bg-surface border border-subtle text-secondary hover:text-primary"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Controls Bar */}
          <div className="flex items-center justify-center gap-4 pt-1">
            {/* Reset Button */}
            <button
              type="button"
              onClick={resetTimer}
              className="btn-ghost h-11 w-11 rounded-full p-0 text-muted hover:text-primary flex items-center justify-center"
              title="Reset session"
              aria-label="Reset timer"
            >
              <RotateCcw size={17} />
            </button>

            {/* Play / Pause Main Action */}
            <button
              type="button"
              onClick={isRunning ? pauseTimer : startTimer}
              className="btn-primary h-12 px-6 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm"
              aria-label={isRunning ? "Pause focus timer" : "Start focus timer"}
            >
              {isRunning ? (
                <>
                  <Pause size={17} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={17} fill="currentColor" />
                  <span>{status === "paused" ? "Resume" : "Start"}</span>
                </>
              )}
            </button>

            {/* Skip Button */}
            <button
              type="button"
              onClick={skipTimer}
              className="btn-ghost h-11 w-11 rounded-full p-0 text-muted hover:text-primary flex items-center justify-center"
              title={isFocus ? "Skip to break" : "Skip to focus"}
              aria-label={isFocus ? "Skip to break" : "Skip to focus"}
            >
              <SkipForward size={17} />
            </button>
          </div>

          {/* Session Statistics Footer */}
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted">
            <span className="flex h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
            <span>
              {sessionsCompleted} focus session{sessionsCompleted === 1 ? "" : "s"} completed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PomodoroModal;
