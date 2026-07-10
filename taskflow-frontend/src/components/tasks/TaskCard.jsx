import { Tag, Trash2, Clock, Repeat } from "lucide-react";
import { formatDateTimeValue, parseDateTimeValue } from "../../utils/dates";

export const TaskCard = ({ task, onEdit, onDelete, onComplete, highlighted = false }) => {
  const status = task.status || "pending";
  const isCompleted = status === "completed";
  const isArchived = status === "archived";
  const dueDate = parseDateTimeValue(task.dueDate);
  const isOverdue = Boolean(task.isOverdue) || Boolean(dueDate && dueDate < new Date() && !isCompleted && !isArchived);
  
  const showTime = Boolean(dueDate && (dueDate.getHours() || dueDate.getMinutes()));
  const dueDateLabel = dueDate ? formatDateTimeValue(dueDate, showTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy") : null;

  // Priority indicator colors
  const priorityColors = {
    high: "bg-rose-500 shadow-sm shadow-rose-500/20",
    medium: "bg-amber-500 shadow-sm shadow-amber-500/20",
    low: "bg-neutral-400 dark:bg-neutral-600",
  };

  return (
    <div
      id={`task-${task._id}`}
      onClick={() => onEdit(task)}
      className={`card cursor-pointer p-4 hover:shadow-md transition-all duration-200 group border-l-4 ${
        highlighted ? "border-brand-500 ring-2 ring-brand-100 dark:ring-brand-500/10" : ""
      } ${
        task.priority === "high" ? "border-l-rose-500" :
        task.priority === "medium" ? "border-l-amber-500" :
        "border-l-neutral-300 dark:border-l-neutral-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* Title and Badges */}
          <div className="flex items-start gap-2.5">
            {/* Quick check circle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onComplete) {
                  onComplete(task);
                }
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center -m-3.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-full"
              aria-label={isCompleted ? "Mark task incomplete" : "Mark task complete"}
            >
              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
                isCompleted
                  ? "bg-brand-600 border-brand-600 text-white dark:bg-brand-500 dark:border-brand-500"
                  : "border-neutral-300 bg-white hover:border-brand-500 dark:border-neutral-700 dark:bg-neutral-900"
              }`}>
                {isCompleted && <span className="text-[10px] font-bold">✓</span>}
              </span>
            </button>

            <div className="min-w-0">
              <h3
                className={`text-sm font-semibold text-neutral-900 dark:text-white leading-5 truncate ${
                  isCompleted ? "text-neutral-400 line-through dark:text-neutral-500" : ""
                }`}
              >
                {task.title}
              </h3>
              
              {task.description && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-1 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {/* Priority dot */}
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-50 border border-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-600 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-400">
              <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[task.priority] || priorityColors.low}`} />
              {task.priority}
            </span>

            {/* Recurrence Repeat */}
            {task.recurrence && task.recurrence !== "none" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-50 border border-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-400">
                <Repeat size={11} />
                {task.recurrence}
              </span>
            )}

            {/* Overdue Badge / Due Date */}
            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  isOverdue
                    ? "bg-rose-50 border border-rose-100 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/30 dark:text-rose-400"
                    : "bg-neutral-50 border border-neutral-100 text-neutral-500 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-400"
                }`}
              >
                <Clock size={11} />
                {dueDateLabel}
              </span>
            )}

            {/* Reminder Date */}
            {task.reminderDate && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-100 text-amber-700 dark:bg-amber-950/10 dark:border-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[10px] font-semibold">
                <Clock size={11} className="text-amber-500" />
                Alert
              </span>
            )}

            {/* Standard label tags */}
            {task.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-50 border border-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-500 dark:bg-neutral-900/50 dark:border-neutral-800 dark:text-neutral-400"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Action button trigger */}
        <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 self-center">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) {
                onDelete(task._id);
              }
            }}
            className="btn-ghost h-11 w-11 -m-1.5 p-0 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 flex items-center justify-center rounded-full"
            aria-label={`Delete task ${task.title}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default TaskCard;
