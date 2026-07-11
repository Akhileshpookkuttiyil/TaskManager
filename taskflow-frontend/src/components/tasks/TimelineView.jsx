import { useMemo } from "react";
import { Clock, Calendar, AlertCircle, CalendarDays, Inbox } from "lucide-react";
import { parseDateTimeValue } from "../../utils/dates";
import { TaskCard } from "./TaskCard";

export const TimelineView = ({ tasks = [], onEdit, onDelete, onComplete }) => {
  
  // Group tasks chronologically
  const timelineGroups = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const groups = {
      overdue: { title: "Overdue", icon: AlertCircle, color: "text-red-700 dark:text-red-300", bg: "bg-red-950/10 dark:bg-red-950/20", tasks: [] },
      today: { title: "Today", icon: Clock, color: "text-neutral-950 dark:text-white", bg: "bg-neutral-100 dark:bg-neutral-800", tasks: [] },
      tomorrow: { title: "Tomorrow", icon: Calendar, color: "text-neutral-700 dark:text-neutral-200", bg: "bg-neutral-100 dark:bg-neutral-800", tasks: [] },
      thisWeek: { title: "This Week", icon: CalendarDays, color: "text-neutral-600 dark:text-neutral-300", bg: "bg-neutral-100 dark:bg-neutral-800", tasks: [] },
      later: { title: "Later", icon: CalendarDays, color: "text-neutral-500", bg: "bg-neutral-500/10", tasks: [] },
      noDate: { title: "No Date", icon: Inbox, color: "text-neutral-400", bg: "bg-neutral-400/10", tasks: [] },
    };

    tasks.forEach((task) => {
      const isCompleted = task.status === "completed";
      const isArchived = task.status === "archived";

      if (!task.dueDate) {
        groups.noDate.tasks.push(task);
        return;
      }

      const due = parseDateTimeValue(task.dueDate);
      if (!due) {
        groups.noDate.tasks.push(task);
        return;
      }

      if (due < todayStart && !isCompleted && !isArchived) {
        groups.overdue.tasks.push(task);
      } else if (due >= todayStart && due <= todayEnd) {
        groups.today.tasks.push(task);
      } else if (due >= tomorrowStart && due <= tomorrowEnd) {
        groups.tomorrow.tasks.push(task);
      } else if (due > tomorrowEnd && due <= weekEnd) {
        groups.thisWeek.tasks.push(task);
      } else {
        groups.later.tasks.push(task);
      }
    });

    return groups;
  }, [tasks]);

  const groupKeys = ["overdue", "today", "tomorrow", "thisWeek", "later", "noDate"];
  const hasAnyTasks = tasks.length > 0;

  if (!hasAnyTasks) {
    return (
      <div className="py-12 text-center text-sm text-neutral-500 dark:text-neutral-400">
        No tasks scheduled yet. Create a task with a due date to build your timeline.
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pl-4 before:absolute before:left-7.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-100 dark:before:bg-neutral-900">
      {groupKeys.map((key) => {
        const group = timelineGroups[key];
        if (group.tasks.length === 0) return null;
        
        const Icon = group.icon;

        return (
          <div key={key} className="relative space-y-3.5">
            {/* Timeline anchor head */}
            <div className="flex items-center gap-3 select-none">
              <span className={`absolute -left-5.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${group.bg} ${group.color}`}>
                  <Icon size={12} strokeWidth={2.5} />
                </span>
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                {group.title}
              </h4>
              <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 tabular-nums">
                {group.tasks.length}
              </span>
            </div>

            {/* List of Tasks under this timeline category */}
            <div className="space-y-2.5 pl-4 sm:pl-6">
              {group.tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onComplete={onComplete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default TimelineView;
