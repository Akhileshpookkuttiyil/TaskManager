import { format } from "date-fns";
import { CalendarDays, PencilLine, Tag, Trash2 } from "lucide-react";
import { Badge } from "../ui/Badge";

export const TaskCard = ({ task, onEdit, onDelete }) => {
  const status = task.status || "pending";
  const isCompleted = status === "completed";
  const isArchived = status === "archived";
  const isOverdue = Boolean(task.isOverdue) || Boolean(task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted && !isArchived);
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const showTime = Boolean(dueDate && (dueDate.getHours() || dueDate.getMinutes()));
  const dueDateLabel = dueDate ? format(dueDate, showTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy") : null;

  return (
    <div className="card p-4 transition-colors hover:border-neutral-300 dark:hover:border-neutral-700 sm:p-4.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`text-sm font-medium text-neutral-900 dark:text-white ${
                isCompleted ? "text-neutral-400 line-through dark:text-neutral-500" : ""
              }`}
            >
              {task.title}
            </h3>
            {isOverdue ? (
              <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                Overdue
              </span>
            ) : null}
          </div>

          {task.description ? (
            <p className="mt-1.5 text-sm leading-6 text-neutral-500 dark:text-neutral-400">{task.description}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge value={status} />
            <Badge value={task.priority} />
            {isOverdue ? <Badge value="overdue" /> : null}
            {task.dueDate ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                  isOverdue
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                    : "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                <CalendarDays size={12} />
                {dueDateLabel}
              </span>
            ) : null}
            {task.reminderDate ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                <CalendarDays size={12} />
                Reminder {format(new Date(task.reminderDate), "MMM d, yyyy h:mm a")}
              </span>
            ) : null}
            {task.tags?.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
              >
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 self-end sm:self-start">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="btn-ghost h-8 w-8 px-0 text-neutral-400"
            aria-label={`Edit task ${task.title}`}
          >
            <PencilLine size={15} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className="btn-ghost h-8 w-8 px-0 text-neutral-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
            aria-label={`Delete task ${task.title}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
