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
      overdue: { title: "Overdue", icon: AlertCircle, color: "text-red-600", bg: "bg-red-500/10", tasks: [] },
      today: { title: "Today", icon: Clock, color: "text-primary", bg: "bg-elevated", tasks: [] },
      tomorrow: { title: "Tomorrow", icon: Calendar, color: "text-secondary", bg: "bg-elevated", tasks: [] },
      thisWeek: { title: "This Week", icon: CalendarDays, color: "text-secondary", bg: "bg-elevated", tasks: [] },
      later: { title: "Later", icon: CalendarDays, color: "text-muted", bg: "bg-elevated", tasks: [] },
      noDate: { title: "No Date", icon: Inbox, color: "text-muted", bg: "bg-elevated", tasks: [] },
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
      <div className="py-12 text-center text-sm text-muted">
        No tasks scheduled yet. Create a task with a due date to build your timeline.
      </div>
    );
  }

  return (
    <div className="space-y-6 relative pl-4 before:absolute before:left-7.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral">
      {groupKeys.map((key) => {
        const group = timelineGroups[key];
        if (group.tasks.length === 0) return null;
        
        const Icon = group.icon;

        return (
          <div key={key} className="relative space-y-3.5">
            {/* Timeline anchor head */}
            <div className="flex items-center gap-3 select-none">
              <span className={`absolute -left-5.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-subtle bg-app`}>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full ${group.bg} ${group.color}`}>
                  <Icon size={12} strokeWidth={2.5} />
                </span>
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                {group.title}
              </h4>
              <span className="rounded bg-elevated border border-subtle px-1.5 py-0.5 text-[10px] font-bold text-secondary tabular-nums">
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
