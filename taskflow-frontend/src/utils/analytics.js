import { differenceInCalendarDays, format, startOfDay, subDays } from "date-fns";
import { parseDateTimeValue } from "./dates";

/**
 * Calculates current and best completion streaks for a list of tasks.
 * @param {Array} tasks - List of tasks.
 * @returns {Object} { current, best } streak counts.
 */
export const calculateStreak = (tasks = []) => {
  if (!tasks || tasks.length === 0) {
    return { current: 0, best: 0 };
  }

  const completionDays = [
    ...new Set(
      tasks
        .map((task) => parseDateTimeValue(task.completedAt))
        .filter(Boolean)
        .map((date) => format(startOfDay(date), "yyyy-MM-dd"))
    ),
  ].sort((a, b) => new Date(b) - new Date(a)); // Sort descending for current streak calculation

  const completionSet = new Set(completionDays);

  let current = 0;
  let cursor = startOfDay(new Date());

  // Check if completed today. If not, check if completed yesterday to keep streak active.
  const todayStr = format(cursor, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(cursor, 1), "yyyy-MM-dd");

  if (completionSet.has(todayStr)) {
    while (completionSet.has(format(cursor, "yyyy-MM-dd"))) {
      current += 1;
      cursor = subDays(cursor, 1);
    }
  } else if (completionSet.has(yesterdayStr)) {
    cursor = subDays(cursor, 1);
    while (completionSet.has(format(cursor, "yyyy-MM-dd"))) {
      current += 1;
      cursor = subDays(cursor, 1);
    }
  }

  let best = 0;
  let run = 0;
  let previousDate = null;

  // Sort ascending for best streak calculation
  [...completionDays]
    .map((value) => new Date(`${value}T00:00:00`))
    .sort((a, b) => a - b)
    .forEach((date) => {
      if (previousDate && differenceInCalendarDays(date, previousDate) === 1) {
        run += 1;
      } else {
        run = 1;
      }
      best = Math.max(best, run);
      previousDate = date;
    });

  return { current, best: Math.max(best, current) };
};

/**
 * Calculates completion rate percentage.
 * @param {number} completed - Completed count.
 * @param {number} total - Total count.
 * @returns {number} Percentage (0-100).
 */
export const calculateCompletionRate = (completed = 0, total = 0) => {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};

/**
 * Calculates completion counts in the last 7 days and weekly target progress.
 * @param {Array} tasks - List of tasks.
 * @param {number} goalCount - Weekly goal target.
 * @returns {Object} { completedThisWeek, progressPercent }
 */
export const calculateWeeklyProgress = (tasks = [], goalCount = 7) => {
  const weekStart = subDays(startOfDay(new Date()), 6);
  const completedThisWeek = tasks.filter(
    (task) => task.completedAt && parseDateTimeValue(task.completedAt) >= weekStart
  ).length;

  const progressPercent = Math.min(100, Math.round((completedThisWeek / goalCount) * 100));

  return { completedThisWeek, progressPercent };
};

/**
 * Gets count of active tasks that are past their due date.
 * @param {Array} tasks - List of tasks.
 * @returns {number} Count of overdue tasks.
 */
export const getOverdueCount = (tasks = []) => {
  const now = new Date();
  return tasks.filter(
    (task) =>
      task.dueDate &&
      parseDateTimeValue(task.dueDate) < now &&
      task.status !== "completed" &&
      task.status !== "archived"
  ).length;
};

/**
 * Calculates task distributions for priority, status, and tags.
 * @param {Array} tasks - List of tasks.
 * @returns {Object} Distribution counts and sets.
 */
export const calculateTaskDistribution = (tasks = []) => {
  const distributions = {
    priority: { low: 0, medium: 0, high: 0 },
    status: { pending: 0, in_progress: 0, completed: 0, archived: 0 },
    tags: {},
  };

  tasks.forEach((task) => {
    // Status
    if (distributions.status[task.status] !== undefined) {
      distributions.status[task.status] += 1;
    }

    // Priority
    if (distributions.priority[task.priority] !== undefined) {
      distributions.priority[task.priority] += 1;
    }

    // Tags
    if (task.tags && Array.isArray(task.tags)) {
      task.tags.forEach((tag) => {
        distributions.tags[tag] = (distributions.tags[tag] || 0) + 1;
      });
    }
  });

  return distributions;
};

/**
 * Calculates a premium productivity index score (0-100).
 * Based on completion rates, streaks, and prioritizing high/medium tasks.
 * @param {Object} stats - Central stats object.
 * @param {Object} streaks - Streak metrics.
 * @returns {number} Productivity score.
 */
export const calculateProductivityScore = (stats = {}, streaks = { current: 0 }) => {
  const total = stats.total || 0;
  const completed = stats.completed || stats.done || 0;
  if (total === 0) return 0;

  const rateWeight = 0.6; // Completion rate is 60% of the score
  const streakWeight = 0.2; // Streaks are 20% of the score
  const backlogWeight = 0.2; // Managing overdue backlog is 20% of the score

  const rateScore = (completed / total) * 100;
  const streakScore = Math.min(100, streaks.current * 10); // 10 consecutive days = 100% on streak score
  const overduePenalty = stats.overdue ? Math.max(0, 100 - stats.overdue * 15) : 100; // Overdue tasks reduce backlog score

  const score = rateScore * rateWeight + streakScore * streakWeight + overduePenalty * backlogWeight;
  return Math.round(Math.min(100, Math.max(0, score)));
};
