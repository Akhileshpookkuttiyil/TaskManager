export const DEFAULT_FOCUS_DURATION = 25 * 60; // 1500 seconds (25 minutes)
export const DEFAULT_BREAK_DURATION = 5 * 60;  // 300 seconds (5 minutes)

export const POMODORO_STORAGE_KEY = "taskflow-pomodoro-state";

/**
 * Calculates remaining seconds from targetEndTime.
 * Returns 0 if targetEndTime has passed or is invalid.
 */
export const calculateRemainingSeconds = (targetEndTime, now = Date.now()) => {
  if (!targetEndTime || typeof targetEndTime !== "number") return 0;
  const diffMs = targetEndTime - now;
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 1000);
};

/**
 * Formats seconds into MM:SS string (e.g., 1500 -> "25:00", 65 -> "01:05").
 */
export const formatTimerDisplay = (seconds = 0) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

/**
 * Safe local storage load with validation.
 */
export const loadPomodoroState = () => {
  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

/**
 * Safe local storage save.
 */
export const savePomodoroState = (state) => {
  try {
    localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Graceful ignore in private browsing or quota limits
  }
};

/**
 * Audio chime using Web Audio API synthesis.
 * Uses two harmonious sine tones (E5 -> G#5) for a calm, professional chime.
 */
export const playPomodoroChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // First tone (E5: 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Second tone (G#5: 830.61 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(830.61, now + 0.18);
    gain2.gain.setValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.9);
  } catch {
    // Ignored if browser restricts audio context
  }
};
