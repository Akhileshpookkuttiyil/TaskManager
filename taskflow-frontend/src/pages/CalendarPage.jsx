import "react-big-calendar/lib/css/react-big-calendar.css";
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  endOfDay,
  format,
  formatDistanceToNow,
  getDay,
  isSameDay,
  parse,
  startOfWeek,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock3, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { useDispatch, useSelector } from "react-redux";
import { TaskModal } from "../components/tasks/TaskModal";
import { Badge } from "../components/ui/Badge";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { fetchTasks } from "../store/slices/tasksSlice";

const weekStartsOn = 1;
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn }),
  getDay,
  locales: {},
});

const viewLabels = {
  month: "Month view",
  week: "Week view",
};

const statusColors = {
  pending: "#d97706",
  in_progress: "#2563eb",
  completed: "#059669",
  archived: "#737373",
};

const normalizeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getEventStyle = (event) => {
  const status = event.resource?.status || "pending";
  const overdue = event.resource?.isOverdue;
  const backgroundColor = overdue ? "#e11d48" : statusColors[status] || "#6b7280";

  return {
    style: {
      backgroundColor,
      borderRadius: "8px",
      border: "0",
      color: "#ffffff",
      opacity: status === "archived" ? 0.72 : 1,
      display: "block",
    },
  };
};

const TaskListItem = ({ task, onEdit }) => {
  const dueDate = normalizeDate(task.dueDate);

  return (
    <button
      type="button"
      onClick={() => onEdit(task)}
      className="w-full rounded-xl border border-neutral-200 p-3 text-left transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">{task.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge value={task.status} />
            <Badge value={task.priority} />
          </div>
        </div>
        {dueDate ? (
          <div className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <Clock3 size={11} />
            {format(dueDate, "p")}
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
        {dueDate ? `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}` : "No due date"}
      </p>
    </button>
  );
};

export const CalendarPage = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.tasks);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    dispatch(fetchTasks({ limit: 50, sortBy: "dueDate", order: "asc" }));
  }, [dispatch]);

  const refreshCalendar = () => {
    dispatch(fetchTasks({ limit: 50, sortBy: "dueDate", order: "asc" }));
  };

  const events = useMemo(
    () =>
      items
        .filter((task) => task.dueDate)
        .map((task) => {
          const dueDate = normalizeDate(task.dueDate);
          if (!dueDate) return null;

          const hasTime = dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0;

          return {
            id: task._id,
            title: task.title,
            start: dueDate,
            end: hasTime ? addMinutes(dueDate, 30) : endOfDay(dueDate),
            allDay: !hasTime,
            resource: task,
          };
        })
        .filter(Boolean),
    [items]
  );

  const selectedDayTasks = useMemo(
    () =>
      items
        .filter((task) => task.dueDate && isSameDay(normalizeDate(task.dueDate), selectedDate))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [items, selectedDate]
  );

  const upcomingTasks = useMemo(() => {
    const today = new Date();
    const nextWeek = addDays(today, 7);

    return items
      .filter((task) => {
        const dueDate = normalizeDate(task.dueDate);
        return dueDate && dueDate >= today && dueDate <= nextWeek && task.status !== "archived";
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6);
  }, [items]);

  const rangeLabel =
    view === "week"
      ? `${format(startOfWeek(calendarDate, { weekStartsOn }), "MMM d")} - ${format(addDays(startOfWeek(calendarDate, { weekStartsOn }), 6), "MMM d, yyyy")}`
      : format(calendarDate, "MMMM yyyy");

  const goToPrevious = () => {
    const nextDate = view === "week" ? addWeeks(calendarDate, -1) : addMonths(calendarDate, -1);
    setCalendarDate(nextDate);
  };

  const goToNext = () => {
    const nextDate = view === "week" ? addWeeks(calendarDate, 1) : addMonths(calendarDate, 1);
    setCalendarDate(nextDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCalendarDate(today);
    setSelectedDate(today);
  };

  const handleSelectTask = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSlotSelect = ({ start }) => {
    setSelectedDate(start);
  };

  const handleEventSelect = (event) => {
    setSelectedDate(event.start);
    handleSelectTask(event.resource);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-eyebrow">Calendar</p>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">Schedule at a glance</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Track due dates and plan upcoming work in one place.
          </p>
        </div>

        <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} />
          Add task
        </button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-4">
          <div className="card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{rangeLabel}</h3>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{viewLabels[view]}</p>
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={goToPrevious} className="btn-secondary h-9 w-9 px-0" aria-label="Previous range">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={goToToday} className="btn-secondary h-9 px-3 text-sm">
                  Today
                </button>
                <button type="button" onClick={goToNext} className="btn-secondary h-9 w-9 px-0" aria-label="Next range">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { value: "month", label: "Month" },
                { value: "week", label: "Week" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setView(option.value)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    view === option.value
                      ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="calendar-shell mt-4">
              <BigCalendar
                localizer={localizer}
                events={events}
                date={calendarDate}
                view={view}
                views={["month", "week"]}
                onNavigate={(nextDate) => setCalendarDate(nextDate)}
                onView={(nextView) => setView(nextView)}
                selectable
                popup
                toolbar={false}
                eventPropGetter={getEventStyle}
                onSelectSlot={handleSlotSelect}
                onSelectEvent={handleEventSelect}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
              />
            </div>
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
              <CalendarIcon size={18} className="text-neutral-400" />
            </div>

            <div className="mt-4 space-y-2.5">
              {loading ? (
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <Spinner size="sm" />
                  Loading tasks
                </div>
              ) : selectedDayTasks.length === 0 ? (
                <EmptyState
                  title="No tasks on this date"
                  description="Click a day with tasks or create a new one."
                  action={
                    <button type="button" onClick={() => setModalOpen(true)} className="btn-secondary">
                      Add task
                    </button>
                  }
                />
              ) : (
                selectedDayTasks.map((task) => <TaskListItem key={task._id} task={task} onEdit={handleSelectTask} />)
              )}
            </div>
          </div>

          <div className="card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-eyebrow">Upcoming tasks</p>
                <h3 className="mt-1 text-base font-semibold text-neutral-900 dark:text-white">Next 7 days</h3>
              </div>
              <Clock3 size={18} className="text-neutral-400" />
            </div>

            <div className="mt-4 space-y-2.5">
              {loading ? (
                <div className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-3 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <Spinner size="sm" />
                  Loading upcoming tasks
                </div>
              ) : upcomingTasks.length === 0 ? (
                <EmptyState
                  title="Nothing upcoming"
                  description="Tasks due soon will appear here."
                  action={
                    <button type="button" onClick={() => setModalOpen(true)} className="btn-secondary">
                      Add task
                    </button>
                  }
                />
              ) : (
                upcomingTasks.map((task) => <TaskListItem key={task._id} task={task} onEdit={handleSelectTask} />)
              )}
            </div>
          </div>
        </aside>
      </section>

      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSaved={refreshCalendar}
        task={editingTask}
      />
    </div>
  );
};
