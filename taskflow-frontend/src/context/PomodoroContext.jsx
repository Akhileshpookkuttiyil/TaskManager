import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { PomodoroContext } from "./pomodoro-context";
import {
  DEFAULT_FOCUS_DURATION,
  DEFAULT_BREAK_DURATION,
  calculateRemainingSeconds,
  loadPomodoroState,
  savePomodoroState,
  playPomodoroChime,
} from "../utils/pomodoro";

export const PomodoroProvider = ({ children }) => {
  // Initialize state from localStorage or defaults
  const [state, setState] = useState(() => {
    const saved = loadPomodoroState();
    const focusDuration = Number(saved?.focusDuration) || DEFAULT_FOCUS_DURATION;
    const breakDuration = Number(saved?.breakDuration) || DEFAULT_BREAK_DURATION;
    const mode = saved?.mode === "break" ? "break" : "focus";
    const status = saved?.status === "running" || saved?.status === "paused" ? saved.status : "idle";
    const targetEndTime = typeof saved?.targetEndTime === "number" ? saved.targetEndTime : null;
    const soundEnabled = saved?.soundEnabled !== undefined ? Boolean(saved.soundEnabled) : true;
    const sessionsCompleted = Number(saved?.sessionsCompleted) || 0;
    const activeTaskId = saved?.activeTaskId || null;
    const activeTaskTitle = saved?.activeTaskTitle || null;
    const lastCompletedSessionId = saved?.lastCompletedSessionId || null;

    let remainingSeconds = mode === "focus" ? focusDuration : breakDuration;

    if (status === "running" && targetEndTime) {
      const computed = calculateRemainingSeconds(targetEndTime, Date.now());
      if (computed > 0) {
        remainingSeconds = computed;
      } else {
        // Target time already elapsed while page was closed
        remainingSeconds = 0;
      }
    } else if (status === "paused" && typeof saved?.remainingSeconds === "number") {
      remainingSeconds = saved.remainingSeconds;
    }

    return {
      mode,
      status,
      focusDuration,
      breakDuration,
      targetEndTime,
      remainingSeconds,
      soundEnabled,
      sessionsCompleted,
      activeTaskId,
      activeTaskTitle,
      lastCompletedSessionId,
    };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastCompletedSessionIdRef = useRef(state.lastCompletedSessionId);
  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
    savePomodoroState(state);
  }, [state]);

  // Handle session completion without duplicate notifications
  const handleSessionComplete = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.status !== "running") return;

    const sessionKey = `${currentState.mode}-${currentState.targetEndTime}`;
    if (lastCompletedSessionIdRef.current === sessionKey) {
      return; // Already processed
    }
    lastCompletedSessionIdRef.current = sessionKey;

    const isFocus = currentState.mode === "focus";
    const nextMode = isFocus ? "break" : "focus";
    const nextDuration = nextMode === "focus" ? currentState.focusDuration : currentState.breakDuration;
    const newSessionsCompleted = isFocus ? currentState.sessionsCompleted + 1 : currentState.sessionsCompleted;

    if (currentState.soundEnabled) {
      playPomodoroChime();
    }

    if (isFocus) {
      toast.success("Focus session completed! Time for a short break.");
    } else {
      toast.success("Break completed! Ready to focus again?");
    }

    setState((prev) => ({
      ...prev,
      mode: nextMode,
      status: "idle",
      targetEndTime: null,
      remainingSeconds: nextDuration,
      sessionsCompleted: newSessionsCompleted,
      lastCompletedSessionId: sessionKey,
    }));
  }, []);

  // Main ticker effect when running
  useEffect(() => {
    if (state.status !== "running" || !state.targetEndTime) return;

    const checkTime = () => {
      const now = Date.now();
      const remaining = calculateRemainingSeconds(state.targetEndTime, now);

      if (remaining <= 0) {
        handleSessionComplete();
      } else {
        setState((prev) => {
          if (prev.status !== "running" || prev.remainingSeconds === remaining) return prev;
          return { ...prev, remainingSeconds: remaining };
        });
      }
    };

    // Immediate check
    checkTime();

    // 500ms ticker for smooth second updates
    const intervalId = setInterval(checkTime, 500);

    // Resync immediately on tab visibility change or window focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkTime();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [state.status, state.targetEndTime, handleSessionComplete]);

  // Sync state across multiple tabs via storage events
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === "taskflow-pomodoro-state" && e.newValue) {
        try {
          const remoteState = JSON.parse(e.newValue);
          if (remoteState && typeof remoteState === "object") {
            setState(remoteState);
            lastCompletedSessionIdRef.current = remoteState.lastCompletedSessionId;
          }
        } catch {
          // Ignore invalid parse
        }
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Timer controls
  const startTimer = useCallback(() => {
    setState((prev) => {
      if (prev.status === "running") return prev;

      const duration = prev.status === "paused" ? prev.remainingSeconds : (prev.mode === "focus" ? prev.focusDuration : prev.breakDuration);
      const targetEndTime = Date.now() + duration * 1000;

      return {
        ...prev,
        status: "running",
        targetEndTime,
        remainingSeconds: duration,
      };
    });
  }, []);

  const pauseTimer = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "running" || !prev.targetEndTime) return prev;

      const remaining = calculateRemainingSeconds(prev.targetEndTime, Date.now());
      return {
        ...prev,
        status: "paused",
        targetEndTime: null,
        remainingSeconds: remaining > 0 ? remaining : 0,
      };
    });
  }, []);

  const resetTimer = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: "idle",
      targetEndTime: null,
      remainingSeconds: prev.mode === "focus" ? prev.focusDuration : prev.breakDuration,
    }));
  }, []);

  const skipTimer = useCallback(() => {
    setState((prev) => {
      const nextMode = prev.mode === "focus" ? "break" : "focus";
      const nextDuration = nextMode === "focus" ? prev.focusDuration : prev.breakDuration;
      return {
        ...prev,
        mode: nextMode,
        status: "idle",
        targetEndTime: null,
        remainingSeconds: nextDuration,
      };
    });
  }, []);

  const setDurations = useCallback((focusMins, breakMins) => {
    const focusDuration = Math.max(1, Number(focusMins) || 25) * 60;
    const breakDuration = Math.max(1, Number(breakMins) || 5) * 60;

    setState((prev) => {
      const isIdle = prev.status === "idle";
      return {
        ...prev,
        focusDuration,
        breakDuration,
        remainingSeconds: isIdle ? (prev.mode === "focus" ? focusDuration : breakDuration) : prev.remainingSeconds,
      };
    });
  }, []);

  const toggleSound = useCallback(() => {
    setState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  }, []);

  const setActiveTask = useCallback((task) => {
    setState((prev) => ({
      ...prev,
      activeTaskId: task?._id || null,
      activeTaskTitle: task?.title || null,
    }));
  }, []);

  const clearActiveTask = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTaskId: null,
      activeTaskTitle: null,
    }));
  }, []);

  const startFocusOnTask = useCallback((task) => {
    if (!task) return;
    setState((prev) => {
      const duration = prev.focusDuration;
      const targetEndTime = Date.now() + duration * 1000;
      return {
        ...prev,
        mode: "focus",
        status: "running",
        targetEndTime,
        remainingSeconds: duration,
        activeTaskId: task._id,
        activeTaskTitle: task.title,
      };
    });
    setIsModalOpen(true);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const totalDuration = state.mode === "focus" ? state.focusDuration : state.breakDuration;
  const percentCompleted = useMemo(() => {
    if (!totalDuration) return 0;
    const elapsed = totalDuration - state.remainingSeconds;
    return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  }, [totalDuration, state.remainingSeconds]);

  const value = useMemo(
    () => ({
      ...state,
      totalDuration,
      percentCompleted,
      isModalOpen,
      startTimer,
      pauseTimer,
      resetTimer,
      skipTimer,
      setDurations,
      toggleSound,
      setActiveTask,
      clearActiveTask,
      startFocusOnTask,
      openModal,
      closeModal,
    }),
    [
      state,
      totalDuration,
      percentCompleted,
      isModalOpen,
      startTimer,
      pauseTimer,
      resetTimer,
      skipTimer,
      setDurations,
      toggleSound,
      setActiveTask,
      clearActiveTask,
      startFocusOnTask,
      openModal,
      closeModal,
    ]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
};
export default PomodoroProvider;
