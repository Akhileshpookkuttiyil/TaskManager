import { differenceInCalendarDays, format, formatDistanceToNow, startOfDay, subDays } from "date-fns";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskModal } from "../components/tasks/TaskModal";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { StatCard } from "../components/ui/StatCard";
import { TaskSkeletonList } from "../components/ui/shared";
import { deleteTask, fetchStats, fetchTasks } from "../store/slices/tasksSlice";

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

const ActivityRow = ({ task }) => {
  const activityTime = task.updatedAt || task.completedAt || task.archivedAt || task.createdAt;

  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{task.title}</p>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          {activityTime ? `Updated ${formatDistanceToNow(new Date(activityTime), { addSuffix: true })}` : "Recently updated"}
        </p>
      </div>
      <Badge value={task.status} />
    </div>
  );
};

export const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, stats, loading } = useSelector((state) => state.tasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    dispatch(fetchStats());
    dispatch(fetchTasks({ limit: 6, sortBy: "updatedAt", order: "desc" }));
  }, [dispatch]);

  const refreshDashboard = () => {
    dispatch(fetchStats());
    dispatch(fetchTasks({ limit: 6, sortBy: "updatedAt", order: "desc" }));
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;

    const result = await dispatch(deleteTask(id));
    if (deleteTask.fulfilled.match(result)) {
      toast.success("Task deleted.");
      refreshDashboard();
    } else {
      toast.error("Failed to delete task.");
    }
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

  const recentActivity = items.slice(0, 5);

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
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Recent activity</h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Latest task updates and status changes.</p>
            </div>
            <Link
              to="/tasks"
              className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Open tasks
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <TaskSkeletonList count={3} />
            ) : recentActivity.length === 0 ? (
              <EmptyState
                title="No activity yet"
                description="Create a task to start building your productivity history."
                action={
                  <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                    <Plus size={16} />
                    New task
                  </button>
                }
              />
            ) : (
              recentActivity.map((task) => <ActivityRow key={task._id} task={task} />)
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Recent tasks</h3>
          <Link
            to="/tasks"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            See all
          </Link>
        </div>

        {loading ? (
          <TaskSkeletonList />
        ) : recentActivity.length === 0 ? (
          <EmptyState
            action={
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                <Plus size={16} />
                New task
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {recentActivity.map((task) => (
              <TaskCard key={task._id} task={task} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} onSaved={refreshDashboard} task={editingTask} />
    </div>
  );
};
