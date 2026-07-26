import { useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  Award,
  Calendar,
  Check,
  CheckCircle2,
  Flame,
  Plus,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { fetchStats, fetchTasks, updateTask } from "../store/slices/tasksSlice";
import { fetchRecentActivities } from "../store/slices/activitySlice";
import {
  calculateStreak,
  calculateWeeklyProgress,
  calculateCompletionRate,
  calculateProductivityScore,
  getOverdueCount,
} from "../utils/analytics";
import { formatDateTimeValue } from "../utils/dates";
import { StatCard } from "../components/ui/StatCard";
import { TaskSkeletonList } from "../components/ui/shared";
import toast from "react-hot-toast";

export const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { items: tasks, loading: tasksLoading, stats } = useSelector((state) => state.tasks);
  const { items: activities, loading: activityLoading } = useSelector((state) => state.activity);

  useEffect(() => {
    dispatch(fetchStats({ force: true }));
    dispatch(fetchTasks({ limit: 50, force: true }));
    dispatch(fetchRecentActivities({ limit: 5 }));
  }, [dispatch]);

  const handleCompleteTask = async (task) => {
    const result = await dispatch(
      updateTask({
        id: task._id,
        data: { ...task, status: "completed" },
      })
    );
    if (updateTask.fulfilled.match(result)) {
      toast.success("Task completed!");
      dispatch(fetchStats({ force: true }));
      dispatch(fetchTasks({ limit: 50, force: true }));
      dispatch(fetchRecentActivities({ limit: 5 }));
    } else {
      toast.error("Failed to complete task.");
    }
  };

  // Centralized calculations
  const metrics = useMemo(() => {
    const total = stats?.total ?? 0;
    const completed = stats?.completed ?? stats?.done ?? 0;
    const pending = stats?.pending ?? stats?.todo ?? 0;
    const dueTodayCount = stats?.dueToday ?? 0;

    const completionRate = calculateCompletionRate(completed, total);
    const streaks = calculateStreak(tasks);
    const weekly = calculateWeeklyProgress(tasks, 7);
    const overdueCount = getOverdueCount(tasks);
    const productivityScore = calculateProductivityScore(
      { total, completed, overdue: overdueCount },
      streaks
    );

    return {
      total,
      completed,
      pending,
      dueTodayCount,
      completionRate,
      streaks,
      weekly,
      overdueCount,
      productivityScore,
    };
  }, [tasks, stats]);

  // Today's Focus: The most urgent high-priority task due today
  const todaysFocus = useMemo(() => {
    const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
    const todayStr = new Date().toISOString().split("T")[0];
    const priorityWeight = { high: 3, medium: 2, low: 1 };

    return pending
      .filter((t) => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate).toISOString().split("T")[0] === todayStr;
      })
      .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || new Date(a.dueDate) - new Date(b.dueDate))[0] || null;
  }, [tasks]);

  // Today's schedule tasks
  const todaysSchedule = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    return tasks
      .filter((t) => {
        if (!t.dueDate || t.status === "completed" || t.status === "archived") return false;
        return new Date(t.dueDate).toISOString().split("T")[0] === todayStr;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [tasks]);

  // Upcoming tasks in the next 7 days
  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const next7Days = new Date();
    next7Days.setDate(today.getDate() + 7);

    return tasks
      .filter((t) => {
        if (!t.dueDate || t.status === "completed" || t.status === "archived") return false;
        const due = new Date(t.dueDate);
        return due > today && due <= next7Days;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 4);
  }, [tasks]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Banner Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">
            {greeting}, {user?.name?.split(" ")[0] || "there"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Welcome back. Let's see what needs to be done.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link to="/tasks" className="btn-secondary text-xs py-1.5 px-3">
            Open Workspace
          </Link>
          <button
            type="button"
            onClick={() => navigate("/tasks?new=true")}
            className="btn-primary text-xs py-1.5 px-3"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Task
          </button>
        </div>
      </div>

      {/* Overview StatCards */}
      <section className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total tasks" value={metrics.total} color="neutral" />
        <StatCard label="Completed" value={metrics.completed} color="green" />
        <StatCard label="Pending" value={metrics.pending} color="amber" />
        <StatCard label="Due today" value={metrics.dueTodayCount} color="blue" />
        <StatCard label="Overdue" value={metrics.overdueCount} color="rose" />
      </section>

      {/* Main Grid Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Overdue alert banner */}
          {metrics.overdueCount > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-red-700/20 bg-red-950/10 p-4 dark:border-red-300/20 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-red-700 dark:text-red-300" size={18} />
                <div>
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-200">
                    You have {metrics.overdueCount} overdue {metrics.overdueCount === 1 ? "task" : "tasks"}
                  </h4>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Reschedule them to keep your agenda on track.
                  </p>
                </div>
              </div>
              <Link to="/tasks?view=upcoming&status=pending" className="text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-1 hover:underline">
                View All <ArrowRight size={12} />
              </Link>
            </div>
          )}

          {/* Today's Focus Card */}
          <div className="card p-6">
            <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 text-[10px] font-semibold text-secondary uppercase tracking-wider">
              <Zap size={10} />
              Today's Focus
            </span>
            {todaysFocus ? (
              <div className="mt-4 flex flex-col justify-between sm:flex-row sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-bold text-primary">
                    {todaysFocus.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted max-w-xl">
                    {todaysFocus.description || "No description provided."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCompleteTask(todaysFocus)}
                  className="btn-primary shrink-0 self-start sm:self-auto"
                >
                  Complete Task
                </button>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-xs font-medium text-secondary">
                  No high-priority tasks scheduled for today.
                </p>
                <p className="text-[11px] text-muted mt-0.5">Keep it up, or check other lists!</p>
              </div>
            )}
          </div>

          {/* Today's Schedule List */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-primary mb-4">Today's Schedule</h3>
            <div className="space-y-2">
              {tasksLoading ? (
                <TaskSkeletonList count={2} />
              ) : todaysSchedule.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  No work scheduled for today.
                </div>
              ) : (
                todaysSchedule.map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-hover border border-transparent hover:border-subtle transition-all duration-150">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="h-4.5 w-4.5 rounded-md border border-neutral flex items-center justify-center text-transparent hover:text-primary hover:border-strong transition-colors"
                      >
                        <Check size={11} strokeWidth={3} />
                      </button>
                      <Link to={`/tasks?focus=${task._id}`} className="text-sm font-medium text-primary truncate hover:underline">
                        {task.title}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-semibold text-muted">
                        {formatDateTimeValue(task.dueDate, "h:mm a")}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Schedule list */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-primary mb-4">Upcoming Schedule</h3>
            <div className="space-y-2">
              {tasksLoading ? (
                <TaskSkeletonList count={3} />
              ) : upcomingTasks.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  No upcoming tasks scheduled for the next 7 days.
                </div>
              ) : (
                upcomingTasks.map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-hover transition-all duration-150">
                    <div className="min-w-0">
                      <Link to={`/tasks?focus=${task._id}`} className="text-sm font-medium text-primary truncate hover:underline">
                        {task.title}
                      </Link>
                      <p className="text-[10px] text-muted mt-0.5">
                        Due {formatDateTimeValue(task.dueDate, "EEEE, MMM d")}
                      </p>
                    </div>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold capitalize ${
                      task.priority === "high" ? "bg-red-950/10 text-red-700 dark:bg-red-950/20 dark:text-red-300" :
                      task.priority === "medium" ? "bg-elevated text-secondary" :
                      "bg-elevated text-muted"
                    }`}>
                      {task.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Performance Summary */}
        <div className="space-y-6">
          {/* Productivity Stats card */}
          <div className="card p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                <Award size={16} className="text-muted" />
                Productivity Performance
              </h3>
              <p className="text-[11px] text-muted mt-0.5">Goal and completion metrics</p>
            </div>

            {/* Productivity Score Indicator */}
            <div className="rounded-xl border border-neutral p-4 text-center">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                Productivity Score
              </p>
              <h4 className="text-4xl font-extrabold text-primary mt-1 tabular-nums">
                {metrics.productivityScore}%
              </h4>
              <div className="mt-3 flex items-center justify-center gap-1 text-xs text-secondary">
                <TrendingUp size={14} className="text-secondary" />
                <span>Steady focus this week</span>
              </div>
            </div>

            {/* Streak Metrics */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-neutral p-3 flex flex-col items-center">
                <Flame size={18} className="text-muted" />
                <p className="text-[10px] font-semibold text-muted mt-1 uppercase">Current Streak</p>
                <p className="text-lg font-bold text-primary mt-0.5 tabular-nums">
                  {metrics.streaks.current} {metrics.streaks.current === 1 ? "day" : "days"}
                </p>
              </div>
              <div className="rounded-xl border border-neutral p-3 flex flex-col items-center">
                <Award size={18} className="text-muted" />
                <p className="text-[10px] font-semibold text-muted mt-1 uppercase">Best Streak</p>
                <p className="text-lg font-bold text-primary mt-0.5 tabular-nums">
                  {metrics.streaks.best} {metrics.streaks.best === 1 ? "day" : "days"}
                </p>
              </div>
            </div>

            {/* Completion Rate progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-secondary">
                <span>Completion Rate</span>
                <span>{metrics.completionRate}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-elevated">
                <div
                  className="h-1.5 rounded-full bg-[var(--text-primary)] transition-all duration-500"
                  style={{ width: `${metrics.completionRate}%` }}
                />
              </div>
            </div>

            {/* Weekly Target Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-secondary">
                <span>Weekly Goal ({metrics.weekly.completedThisWeek}/7)</span>
                <span>{metrics.weekly.progressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-elevated">
                <div
                  className="h-1.5 rounded-full bg-[var(--text-primary)] transition-all duration-500"
                  style={{ width: `${metrics.weekly.progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-primary mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/tasks"
                className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral p-3 hover:bg-hover text-center transition-colors duration-150"
              >
                <CheckCircle2 size={16} className="text-muted" />
                <span className="text-[11px] font-semibold text-secondary">Workspace</span>
              </Link>
              <Link
                to="/tasks?viewMode=calendar"
                className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral p-3 hover:bg-hover text-center transition-colors duration-150"
              >
                <Calendar size={16} className="text-muted" />
                <span className="text-[11px] font-semibold text-secondary">Planner</span>
              </Link>
            </div>
          </div>

          {/* Activity Feed timeline */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-primary mb-4">Workspace Activity</h3>
            <div className="space-y-4 relative pl-3 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-0.5 before:bg-elevated">
              {activityLoading ? (
                <div className="space-y-2 py-4">
                  <div className="h-4 w-4/5 skeleton" />
                  <div className="h-4 w-3/5 skeleton" />
                </div>
              ) : activities.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted">
                  No activity logged yet.
                </div>
              ) : (
                activities.slice(0, 4).map((activity) => (
                  <div key={activity._id} className="relative text-xs">
                    <span className="absolute -left-[16.5px] top-1 h-2 w-2 rounded-full border border-app bg-muted" />
                    <p className="font-semibold text-primary">
                      {activity.message}
                    </p>
                    <span className="text-[10px] text-muted">
                      {activity.createdAt ? formatDateTimeValue(activity.createdAt, "MMM d, h:mm a") : "recently"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
