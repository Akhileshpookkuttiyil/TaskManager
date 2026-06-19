import { format, isSameDay, isSameMonth, isToday, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays } from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { TaskModal } from "../components/tasks/TaskModal";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { fetchTasks } from "../store/slices/tasksSlice";

const weekStartsOn = 1;

const dayKey = (date) => format(date, "yyyy-MM-dd");

export const CalendarPage = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.tasks);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchTasks({ limit: 50, sortBy: "dueDate", order: "asc" }));
  }, [dispatch]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn });

  const calendarDays = useMemo(() => {
    const days = [];
    let cursor = gridStart;

    while (cursor <= gridEnd) {
      days.push(cursor);
      cursor = addDays(cursor, 1);
    }

    return days;
  }, [gridEnd, gridStart]);

  const taskGroups = useMemo(() => {
    const map = new Map();

    items.forEach((task) => {
      if (!task.dueDate) return;
      const key = dayKey(parseISO(task.dueDate));
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });

    return map;
  }, [items]);

  const selectedTasks = taskGroups.get(dayKey(selectedDate)) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-eyebrow">Calendar</p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">Schedule at a glance</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Track due dates without leaving the app shell.
          </p>
        </div>

        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} />
          Add task
        </button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <div className="card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                {format(currentMonth, "MMMM yyyy")}
              </h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Month view</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth((value) => addDays(startOfMonth(value), -1))}
                className="btn-secondary h-9 w-9 px-0"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth(new Date())}
                className="btn-secondary h-9 px-3 text-sm"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setCurrentMonth((value) => addDays(endOfMonth(value), 1))}
                className="btn-secondary h-9 w-9 px-0"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <span key={label} className="py-2">
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const key = dayKey(day);
              const tasksForDay = taskGroups.get(key) || [];
              const selected = isSameDay(day, selectedDate);
              const current = isSameMonth(day, currentMonth);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={`min-h-24 rounded-xl border p-2 text-left transition-colors ${
                    selected
                      ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                      : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
                  } ${current ? "" : "opacity-40"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-sm font-medium ${selected ? "text-inherit" : "text-neutral-900 dark:text-white"}`}>
                      {format(day, "d")}
                    </span>
                    {isToday(day) ? (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${selected ? "bg-white/15 text-white" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"}`}>
                        Today
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {tasksForDay.slice(0, 3).map((task) => (
                      <div
                        key={task._id}
                        className={`truncate rounded-md px-2 py-1 text-[11px] font-medium ${
                          selected
                            ? "bg-white/12 text-white"
                            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                        }`}
                      >
                        {task.title}
                      </div>
                    ))}
                    {tasksForDay.length > 3 ? (
                      <div className={`text-[11px] ${selected ? "text-white/80" : "text-neutral-400 dark:text-neutral-500"}`}>
                        +{tasksForDay.length - 3} more
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Selected day</p>
                <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">
                  {format(selectedDate, "EEEE, MMMM d")}
                </h3>
              </div>
              <CalendarDays size={18} className="text-neutral-400" />
            </div>

            <div className="mt-4 space-y-2.5">
              {loading ? (
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <Spinner size="sm" />
                  Loading tasks
                </div>
              ) : selectedTasks.length === 0 ? (
                <EmptyState
                  title="No tasks on this date"
                  description="Tasks with due dates will appear here."
                  action={
                    <button type="button" onClick={() => setModalOpen(true)} className="btn-secondary">
                      Add task
                    </button>
                  }
                />
              ) : (
                selectedTasks.map((task) => (
                  <div key={task._id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">{task.title}</p>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {task.priority} priority
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                        <Clock3 size={11} />
                        {task.dueDate ? format(parseISO(task.dueDate), "p") : "Due"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </section>

      <TaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
