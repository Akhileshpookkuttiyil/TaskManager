import { memo, useMemo } from "react";
import { Check, Tag, Trash2, Clock, Repeat, CheckSquare, Copy, Lock } from "lucide-react";
import { formatDateTimeValue, parseDateTimeValue } from "../../utils/dates";
import { extractChecklistProgress } from "../../utils/markdown";

export const TaskCard = memo(({ task, onEdit, onDelete, onComplete, onDuplicate, highlighted = false }) => {
  const status = task.status || "pending";
  const isCompleted = status === "completed";
  const isArchived = status === "archived";
  const dueDate = parseDateTimeValue(task.dueDate);
  const isOverdue = Boolean(task.isOverdue) || Boolean(dueDate && dueDate < new Date() && !isCompleted && !isArchived);

  const showTime = Boolean(dueDate && (dueDate.getHours() || dueDate.getMinutes()));
  const dueDateLabel = dueDate ? formatDateTimeValue(dueDate, showTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy") : null;

  const checklist = useMemo(() => extractChecklistProgress(task.description), [task.description]);

  const priorityColors = {
    high: "bg-red-400",
    medium: "bg-neutral-300 dark:bg-neutral-500",
    low: "bg-neutral-500 dark:bg-neutral-700",
  };

  return (
    <div
      id={`task-${task._id}`}
      onClick={() => onEdit(task)}
      className={`card cursor-pointer p-4 transition-colors duration-150 group border-l-4 hover:border-strong ${
        highlighted ? "ring-2 ring-[var(--text-primary)]/20" : ""
      } ${
        task.priority === "high" ? "border-l-red-400" :
        task.priority === "medium" ? "border-l-neutral-400" :
        "border-l-neutral-300 dark:border-l-neutral-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onComplete) {
                  onComplete(task);
                }
              }}
              className="flex h-11 w-11 shrink-0 items-center justify-center -m-3.5 focus-ring rounded-full"
              aria-label={
                isCompleted
                  ? "Mark task incomplete"
                  : task.isBlocked
                  ? "Cannot complete: blocked by incomplete prerequisites"
                  : "Mark task complete"
              }
              title={task.isBlocked && !isCompleted ? "Blocked by incomplete prerequisites" : undefined}
            >
              <span className={`flex h-4.5 w-4.5 items-center justify-center rounded transition-colors ${
                isCompleted
                  ? "bg-[var(--text-primary)] text-[var(--bg-app)] border border-[var(--text-primary)]"
                  : "border border-strong bg-app hover:border-[var(--text-primary)]"
              }`}>
                {isCompleted && <Check size={11} strokeWidth={3} />}
              </span>
            </button>

            <div className="min-w-0">
              <h3
                className={`text-sm font-semibold text-primary leading-5 truncate ${
                  isCompleted ? "text-muted line-through" : ""
                }`}
              >
                {task.title}
              </h3>

              {task.description && (
                <p className="mt-1 text-xs text-muted line-clamp-1 leading-relaxed">
                  {task.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-elevated border border-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-secondary">
              <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[task.priority] || priorityColors.low}`} />
              {task.priority}
            </span>

            {task.recurrence && task.recurrence !== "none" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-elevated border border-subtle px-2 py-0.5 text-[10px] font-semibold text-muted">
                <Repeat size={11} />
                {task.recurrence}
              </span>
            )}

            {task.dueDate && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  isOverdue
                    ? "bg-red-950/10 border border-red-700/20 text-red-700 dark:bg-red-950/20 dark:border-red-300/20 dark:text-red-300"
                    : "bg-elevated border border-subtle text-muted"
                }`}
              >
                <Clock size={11} />
                {dueDateLabel}
              </span>
            )}

            {task.reminderDate && (
              <span className="inline-flex items-center gap-1 rounded-md bg-elevated border border-subtle text-secondary px-2 py-0.5 text-[10px] font-semibold">
                <Clock size={11} />
                Alert
              </span>
            )}

            {task.isBlocked && !isCompleted && !isArchived && (
              <span
                data-testid="blocked-badge"
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                title="Blocked by incomplete prerequisites"
              >
                <Lock size={10} />
                <span>Blocked</span>
              </span>
            )}

            {task.subtasksCount > 0 ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                  task.completedSubtasksCount === task.subtasksCount
                    ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
                    : "bg-elevated border-subtle text-secondary"
                }`}
                title={`${task.completedSubtasksCount} of ${task.subtasksCount} subtasks completed`}
              >
                <CheckSquare size={10} />
                <span>{task.completedSubtasksCount}/{task.subtasksCount}</span>
              </span>
            ) : checklist.total > 0 ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                  checklist.completed === checklist.total
                    ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-300"
                    : "bg-elevated border-subtle text-secondary"
                }`}
                title={`${checklist.completed} of ${checklist.total} subtasks completed`}
              >
                <CheckSquare size={10} />
                <span>{checklist.completed}/{checklist.total}</span>
              </span>
            ) : null}

            {task.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-elevated border border-subtle px-2 py-0.5 text-[10px] font-semibold text-muted"
              >
                <Tag size={10} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1.5 self-center">
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(task);
              }}
              className="btn-ghost h-9 w-9 p-0 text-muted hover:text-primary flex items-center justify-center rounded-full"
              aria-label={`Duplicate task ${task.title}`}
              title="Duplicate task"
            >
              <Copy size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) {
                onDelete(task._id);
              }
            }}
            className="btn-ghost h-9 w-9 p-0 text-muted hover:text-red-600 dark:hover:text-red-300 flex items-center justify-center rounded-full"
            aria-label={`Delete task ${task.title}`}
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
});
export default TaskCard;
