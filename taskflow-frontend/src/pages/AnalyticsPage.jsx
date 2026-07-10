import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  TrendingUp,
  Flame,
  Printer,
} from "lucide-react";
import { fetchTasks, fetchStats } from "../store/slices/tasksSlice";
import {
  calculateStreak,
  calculateWeeklyProgress,
  calculateCompletionRate,
  calculateProductivityScore,
  getOverdueCount,
} from "../utils/analytics";

export const AnalyticsPage = () => {
  const dispatch = useDispatch();
  const { items: tasks, stats } = useSelector((state) => state.tasks);

  useEffect(() => {
    dispatch(fetchStats({ force: true }));
    dispatch(fetchTasks({ limit: 100, force: true }));
  }, [dispatch]);

  // Central Math engine calculations
  const metrics = useMemo(() => {
    const total = stats?.total ?? 0;
    const completed = stats?.completed ?? stats?.done ?? 0;
    const pending = stats?.pending ?? stats?.todo ?? 0;

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
      completionRate,
      streaks,
      weekly,
      overdueCount,
      productivityScore,
    };
  }, [tasks, stats]);

  // Chart 1: Priority Distribution calculations (Donut Chart)
  const priorityDistribution = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    tasks.forEach((t) => {
      if (counts[t.priority] !== undefined) {
        counts[t.priority]++;
      }
    });

    const total = counts.high + counts.medium + counts.low || 1;
    return {
      high: { count: counts.high, percent: Math.round((counts.high / total) * 100) },
      medium: { count: counts.medium, percent: Math.round((counts.medium / total) * 100) },
      low: { count: counts.low, percent: Math.round((counts.low / total) * 100) },
    };
  }, [tasks]);

  // Chart 2: Daily Completion count for last 7 days (Bar Chart)
  const last7DaysData = useMemo(() => {
    const days = [];
    const now = new Date();
    
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push({
        dateStr: d.toISOString().split("T")[0],
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        completed: 0,
        created: 0,
      });
    }

    tasks.forEach((task) => {
      const isCompleted = task.status === "completed";
      if (isCompleted && task.updatedAt) {
        const completedDay = task.updatedAt.split("T")[0];
        const match = days.find((day) => day.dateStr === completedDay);
        if (match) match.completed++;
      }
      if (task.createdAt) {
        const createdDay = task.createdAt.split("T")[0];
        const match = days.find((day) => day.dateStr === createdDay);
        if (match) match.created++;
      }
    });

    return days;
  }, [tasks]);

  // Chart 3: Heatmap calendar grid of the last 30 days
  const last30DaysHeatmap = useMemo(() => {
    const cells = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      cells.push({
        dateStr: d.toISOString().split("T")[0],
        dayNum: d.getDate(),
        completed: 0,
      });
    }

    tasks.forEach((task) => {
      if (task.status === "completed" && task.updatedAt) {
        const dateStr = task.updatedAt.split("T")[0];
        const match = cells.find((c) => c.dateStr === dateStr);
        if (match) match.completed++;
      }
    });

    return cells;
  }, [tasks]);

  const handlePrint = () => {
    window.print();
  };

  const getHeatmapColor = (count) => {
    if (count === 0) return "bg-neutral-100 dark:bg-neutral-800";
    if (count <= 2) return "bg-emerald-200 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400";
    if (count <= 4) return "bg-emerald-400 dark:bg-emerald-700/60 text-white";
    return "bg-emerald-600 dark:bg-emerald-500 text-white";
  };

  return (
    <div className="space-y-6 print:p-0">
      
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Performance Engine
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Workspace Analytics
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Insights on streaks, priorities, and workflow completion.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="btn-secondary text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Printer size={14} />
          Print Summary
        </button>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-3xl font-bold text-neutral-950">TaskFlow Workspace Report</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Key Metric Indicators Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="card p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Productivity Score
          </span>
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1.5">
            {metrics.productivityScore}%
          </h3>
          <p className="text-[10px] text-neutral-500 mt-1 flex items-center gap-1">
            <TrendingUp size={11} className="text-emerald-500" /> Focus index target
          </p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Completion Rate
          </span>
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1.5">
            {metrics.completionRate}%
          </h3>
          <p className="text-[10px] text-neutral-500 mt-1">
            {metrics.completed} of {metrics.total} done
          </p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Consective Streaks
          </span>
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1.5 flex items-center gap-1">
            <Flame size={22} className="text-amber-500 fill-amber-500" />
            {metrics.streaks.current}d
          </h3>
          <p className="text-[10px] text-neutral-500 mt-1">
            Best streak: {metrics.streaks.best} days
          </p>
        </div>

        <div className="card p-4 flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Weekly Goals Target
          </span>
          <h3 className="text-3xl font-extrabold text-neutral-900 dark:text-white mt-1.5">
            {metrics.weekly.completedThisWeek}/7
          </h3>
          <p className="text-[10px] text-neutral-500 mt-1">
            {metrics.weekly.progressPercent}% of target achieved
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Weekly Completion Bar Chart */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-6">
            Weekly Completed vs Created
          </h3>
          <div className="h-64 flex items-end justify-between gap-2.5 pt-4">
            {last7DaysData.map((day) => {
              const maxVal = Math.max(...last7DaysData.flatMap((d) => [d.completed, d.created]), 1);
              const compPercent = (day.completed / maxVal) * 100;
              const creatPercent = (day.created / maxVal) * 100;

              return (
                <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full flex items-end justify-center gap-1 h-44 relative">
                    
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-10 shrink-0 pointer-events-none">
                      Done: {day.completed} / Add: {day.created}
                    </div>

                    {/* Created Bar */}
                    <div
                      className="w-2.5 rounded-t bg-neutral-200 dark:bg-neutral-800 transition-all duration-500"
                      style={{ height: `${creatPercent}%` }}
                    />
                    
                    {/* Completed Bar */}
                    <div
                      className="w-2.5 rounded-t bg-brand-600 dark:bg-brand-400 transition-all duration-500"
                      style={{ height: `${compPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 items-center justify-center mt-4 border-t pt-3 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-neutral-200 dark:bg-neutral-800" />
              <span>Created</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-brand-600 dark:bg-brand-400" />
              <span>Completed</span>
            </div>
          </div>
        </div>

        {/* Priority Donut Chart */}
        <div className="card p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-6">
              Priority Tasks Share
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
            {/* Custom SVG Donut */}
            <div className="relative h-44 w-44 flex items-center justify-center shrink-0">
              <svg className="absolute -rotate-90 h-44 w-44">
                {/* Circumference: 2 * PI * r = 2 * 3.1415 * 60 = 377 */}
                <circle
                  cx="88"
                  cy="88"
                  r="60"
                  className="stroke-neutral-100 dark:stroke-neutral-900"
                  strokeWidth="12"
                  fill="transparent"
                />
                
                {/* Low priority slice */}
                <circle
                  cx="88"
                  cy="88"
                  r="60"
                  className="stroke-neutral-400 dark:stroke-neutral-600"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * priorityDistribution.low.percent) / 100}
                />
                
                {/* Medium priority slice (rotated by low percent) */}
                <circle
                  cx="88"
                  cy="88"
                  r="60"
                  className="stroke-amber-500"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * priorityDistribution.medium.percent) / 100}
                  transform={`rotate(${(360 * priorityDistribution.low.percent) / 100} 88 88)`}
                />

                {/* High priority slice */}
                <circle
                  cx="88"
                  cy="88"
                  r="60"
                  className="stroke-rose-500"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={377}
                  strokeDashoffset={377 - (377 * priorityDistribution.high.percent) / 100}
                  transform={`rotate(${(360 * (priorityDistribution.low.percent + priorityDistribution.medium.percent)) / 100} 88 88)`}
                />
              </svg>

              <div className="text-center">
                <h4 className="text-2xl font-black text-neutral-900 dark:text-white">
                  {metrics.total}
                </h4>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                  Tasks
                </p>
              </div>
            </div>

            {/* Chart Legend */}
            <div className="space-y-3.5 min-w-[120px]">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-neutral-600 dark:text-neutral-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>High</span>
                </div>
                <span className="font-bold text-neutral-800 dark:text-white tabular-nums">
                  {priorityDistribution.high.percent}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-neutral-600 dark:text-neutral-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span>Medium</span>
                </div>
                <span className="font-bold text-neutral-800 dark:text-white tabular-nums">
                  {priorityDistribution.medium.percent}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-medium text-neutral-600 dark:text-neutral-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                  <span>Low</span>
                </div>
                <span className="font-bold text-neutral-800 dark:text-white tabular-nums">
                  {priorityDistribution.low.percent}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Month Heatmap Calendar Grid */}
      <div className="card p-5">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
            Task Completion Activity
          </h3>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
            Completed tasks mapping during the last 30 days
          </p>
        </div>

        {/* Heatmap Squares Grid */}
        <div className="flex flex-wrap gap-2 pt-2">
          {last30DaysHeatmap.map((cell) => (
            <div
              key={cell.dateStr}
              className={`h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold transition-all relative group cursor-default select-none ${getHeatmapColor(
                cell.completed
              )}`}
            >
              {cell.dayNum}
              
              {/* Tooltip */}
              <div className="absolute -top-8 bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                {cell.completed} done on {cell.dateStr}
              </div>
            </div>
          ))}
        </div>

        {/* Grid key scale */}
        <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-neutral-500">
          <span>Less</span>
          <span className="h-3 w-3 rounded-sm bg-neutral-100 dark:bg-neutral-800" />
          <span className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-950/40" />
          <span className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-700/60" />
          <span className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
          <span>More</span>
        </div>
      </div>

    </div>
  );
};
export default AnalyticsPage;
