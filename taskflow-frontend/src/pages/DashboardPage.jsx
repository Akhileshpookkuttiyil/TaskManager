import { differenceInCalendarDays, format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { TaskModal } from "../components/tasks/TaskModal";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { StatCard } from "../components/ui/StatCard";
import { TaskSkeletonList } from "../components/ui/shared";
import { fetchRecentActivities } from "../store/slices/activitySlice";
import { fetchStats, fetchTasks } from "../store/slices/tasksSlice";

const metricTone = {
  total: "neutral",
  completed: "green",
  pending: "amber",
  overdue: "rose",
  dueToday: "blue",
};

const getStreakMetrics = (tasks) => {
  const completionDays = [...new Set(tasks.filter((task) => task.completedAt).map((task) => format(startOfDay(new Date(task.completedAt)), "yyyy-MM-dd")))];
  const completionSet = new Set(completionDays);

  let current = 0;
  let cursor = startOfDay(new Date());

  while (completionSet.has(format(cursor, "yyyy-MM-dd"))) {
    current += 1;
    cursor = subDays(cursor, 1);
  }

  let best = 0;
  let run = 0;
  let previousDate = null;

  completionDays
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

  return { current, best };
};

const loadDashboardData = (dispatch) => {
  dispatch(fetchStats());
  dispatch(fetchTasks({ limit: 6, sortBy: "updatedAt", order: "desc" }));
  dispatch(fetchRecentActivities({ limit: 5 }));
};

const ActivityRow = ({ activity }) => {
  const activityTime = activity.createdAt;
  const message = activity.message || "Task activity";
  const messageNode = activity.taskId ? (
    <Link
      to={`/tasks?focus=${activity.taskId}`}
      className="truncate text-sm font-medium text-neutral-900 transition-colors hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-300"
    >
      {message}
    </Link>
  ) : (
    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{message}</p>
  );

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="min-w-0">
        {messageNode}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <span>{activityTime ? formatDistanceToNow(new Date(activityTime), { addSuffix: true }) : "Recently"}</span>
          {!activity.taskId ? <span className="rounded-full bg-neutral-100 px-2 py-0.5 dark:bg-neutral-800">Task removed</span> : null}
        </div>
      </div>
      <Badge value={activity.type} />
    </div>
  );
};

export const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, stats } = useSelector((state) => state.tasks);
  const { items: activities, loading: activityLoading } = useSelector((state) => state.activity);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData(dispatch);
  }, [dispatch]);

  const refreshDashboard = () => {
    loadDashboardData(dispatch);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const metrics = useMemo(() => {
    const total = stats?.total ?? 0;
    const completed = stats?.completed ?? stats?.done ?? 0;
    const pending = stats?.pending ?? stats?.todo ?? 0;
    const overdue = stats?.overdue ?? 0;
    const dueToday = stats?.dueToday ?? 0;
    const completionRate = total ? Math.round((completed / total) * 100) : 0;
    const weekStart = subDays(startOfDay(new Date()), 6);
    const completedThisWeek = items.filter((task) => task.completedAt && new Date(task.completedAt) >= weekStart).length;
    const weeklyProgress = Math.min(100, Math.round((completedThisWeek / 7) * 100));
    const streaks = getStreakMetrics(items);

    return {
      total,
      completed,
      pending,
      overdue,
      dueToday,
      completionRate,
      completedThisWeek,
      weeklyProgress,
      streaks,
    };
  }, [items, stats]);

  const recentActivity = useMemo(
    () =>
      [...activities]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5),
    [activities]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {greeting}, {user?.name?.split(" ")[0] || "there"}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Here&apos;s a snapshot of your day.</p>
        </div>

        <div className="flex gap-2.5">
          <Link to="/tasks" className="btn-secondary">
            View all tasks
          </Link>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} />
            New task
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total tasks" value={metrics.total} />
        <StatCard label="Completed" value={metrics.completed} color={metricTone.completed} />
        <StatCard label="Pending" value={metrics.pending} color={metricTone.pending} />
        <StatCard label="Overdue" value={metrics.overdue} color={metricTone.overdue} />
        <StatCard label="Due today" value={metrics.dueToday} color={metricTone.dueToday} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card p-5">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Completion rate</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
              {metrics.completionRate}%
            </p>
            <div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-2 rounded-full bg-neutral-900 dark:bg-white"
                style={{ width: `${metrics.completionRate}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              {metrics.completed} of {metrics.total || 0} tasks completed.
            </p>
          </div>

          <div className="card p-5">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Weekly progress</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <p className="text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">
                {metrics.completedThisWeek}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">tasks completed in 7 days</p>
            </div>
            <div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-2 rounded-full bg-brand-600 dark:bg-brand-400" style={{ width: `${metrics.weeklyProgress}%` }} />
            </div>
            <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
              Steady progress keeps momentum visible without noisy charts.
            </p>
          </div>

          <div className="card p-5 sm:col-span-2">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">Productivity streaks</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Current streak</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">{metrics.streaks.current}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">consecutive completion days</p>
              </div>
              <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">Best streak</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-neutral-900 dark:text-white">{metrics.streaks.best}</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">best run so far</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Activity timeline</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">A persistent audit trail of task changes in your workspace.</p>
            </div>
            <Link
              to="/tasks"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Open tasks
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {activityLoading ? (
              <TaskSkeletonList count={3} />
            ) : recentActivity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Task events will appear here after you start creating, editing, completing, archiving, restoring, or deleting work."
                action={
                  <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                    <Plus size={16} />
                    New task
                  </button>
                }
              />
            ) : (
              recentActivity.map((activity) => <ActivityRow key={activity._id} activity={activity} />)
            )}
          </div>
        </div>
      </section>

      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} onSaved={refreshDashboard} />
    </div>
  );
};
