import { ArrowDownUp, Plus, LayoutGrid, Kanban as KanbanIcon, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskFilters } from "../components/tasks/TaskFilters";
import { TaskDetailDrawer } from "../components/tasks/TaskDetailDrawer";
import { KanbanView } from "../components/tasks/KanbanView";
import { TimelineView } from "../components/tasks/TimelineView";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { TaskSkeletonList } from "../components/ui/shared";
import { deleteTask, fetchTasks, setFilters, updateTask } from "../store/slices/tasksSlice";
import { TASK_VIEWS } from "../utils/constants";
import { parseDateTimeValue } from "../utils/dates";

// Big Calendar integrations
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addMinutes, endOfDay } from "date-fns";
import "react-big-calendar/lib/css/react-big-calendar.css";

const weekStartsOn = 1;
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn }),
  getDay,
  locales: {},
});

const statusColors = {
  pending: "#d97706",
  in_progress: "#2563eb",
  completed: "#059669",
  archived: "#737373",
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

const viewLabels = {
  my_day: "My Day",
  upcoming: "Upcoming",
  all: "All Tasks",
  completed: "Completed",
  archived: "Archived",
};

export const TasksPage = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { items, loading, pagination, filters } = useSelector((state) => state.tasks);
  
  const queryViewMode = useMemo(() => new URLSearchParams(location.search).get("viewMode"), [location.search]);

  // View mode switcher: list | kanban | calendar | timeline
  const [viewMode, setViewMode] = useState(() => {
    if (queryViewMode && ["list", "kanban", "calendar", "timeline"].includes(queryViewMode)) {
      return queryViewMode;
    }
    return localStorage.getItem("taskflow-tasks-viewmode") || "list";
  });

  // Sync viewMode when query parameters update (e.g. navigation clicks)
  useEffect(() => {
    if (queryViewMode && ["list", "kanban", "calendar", "timeline"].includes(queryViewMode)) {
      requestAnimationFrame(() => {
        setViewMode(queryViewMode);
      });
    }
  }, [queryViewMode]);

  // Sync Redux filters with URL query parameters for view and labels
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const urlView = searchParams.get("view");
  const urlLabel = searchParams.get("label");

  // Sync view filter with URL query parameter
  useEffect(() => {
    const activeViewParam = urlView || "all";
    if (activeViewParam === "completed" || activeViewParam === "archived") {
      if (filters.status !== activeViewParam || filters.view !== "all") {
        dispatch(setFilters({ view: "all", status: activeViewParam }));
      }
    } else {
      if (filters.view !== activeViewParam) {
        dispatch(setFilters({ view: activeViewParam, status: "", priority: "", dueDate: "", search: "" }));
      }
    }
  }, [urlView, dispatch, filters.view, filters.status]);

  // Sync tag search filter with URL label query parameter
  useEffect(() => {
    if (urlLabel && filters.search !== urlLabel) {
      dispatch(setFilters({ search: urlLabel }));
    }
  }, [urlLabel, dispatch, filters.search]);

  // Drawer states (creation & edit consolidated)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Bulk select states
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loadingBulk, setLoadingBulk] = useState(false);

  // Client-side deferred undo-delete state
  const [pendingDeleteIds, setPendingDeleteIds] = useState([]);
  const deleteTimeoutsRef = useRef({});

  const focusedTaskId = useMemo(() => new URLSearchParams(location.search).get("focus"), [location.search]);
  const isNewParam = useMemo(() => new URLSearchParams(location.search).get("new"), [location.search]);

  // Clean up timeouts on unmount
  useEffect(() => {
    const currentTimeouts = deleteTimeoutsRef.current;
    return () => {
      Object.values(currentTimeouts).forEach((item) => {
        clearTimeout(item.timeoutId);
      });
    };
  }, []);

  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [dispatch, filters]);

  // Open details drawer if URL focus parameter changes
  useEffect(() => {
    let frameId;
    if (focusedTaskId && items.length > 0) {
      const task = items.find((t) => t._id === focusedTaskId);
      if (task) {
        frameId = requestAnimationFrame(() => {
          setEditingTask(task);
          setDrawerOpen(true);
        });
      }
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [focusedTaskId, items]);

  // Catch Dashboard navigate("tasks?new=true") and open blank drawer
  useEffect(() => {
    if (isNewParam === "true") {
      requestAnimationFrame(() => {
        setEditingTask(null);
        setDrawerOpen(true);
      });
      
      // Clean query parameter
      const url = new URL(window.location);
      url.searchParams.delete("new");
      window.history.replaceState({}, "", url);
    }
  }, [isNewParam]);

  // Filter tasks locally that are not pending client-side deletion
  const visibleTasks = useMemo(() => {
    return items.filter((task) => !pendingDeleteIds.includes(task._id));
  }, [items, pendingDeleteIds]);

  const handleEdit = (task) => {
    setEditingTask(task);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingTask(null);
    // Clear focus parameter
    const url = new URL(window.location);
    url.searchParams.delete("focus");
    window.history.replaceState({}, "", url);
  };

  // Client-side Undo Deletion Flow
  const handleDelete = (id) => {
    if (pendingDeleteIds.includes(id)) return;

    // Add to local hidden list
    setPendingDeleteIds((prev) => [...prev, id]);

    const handleUndoDelete = (taskId) => {
      const item = deleteTimeoutsRef.current[taskId];
      if (item) {
        clearTimeout(item.timeoutId);
        delete deleteTimeoutsRef.current[taskId];
        setPendingDeleteIds((prev) => prev.filter((pid) => pid !== taskId));
        toast.success("Deletion cancelled.");
      }
    };

    const timeoutId = setTimeout(async () => {
      const result = await dispatch(deleteTask(id));
      if (deleteTask.fulfilled.match(result)) {
        dispatch(fetchTasks(filters));
      } else {
        toast.error("Failed to delete task.");
        // Put back in layout
        setPendingDeleteIds((prev) => prev.filter((pid) => pid !== id));
      }
      delete deleteTimeoutsRef.current[id];
    }, 4000);

    const toastId = toast((t) => (
      <div className="flex items-center justify-between gap-3 text-xs font-semibold py-1">
        <span>Task deleted.</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            handleUndoDelete(id);
          }}
          className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider hover:underline focus:outline-none"
        >
          Undo
        </button>
      </div>
    ), { duration: 4000 });

    deleteTimeoutsRef.current[id] = { timeoutId, toastId };
  };

  const handleComplete = async (task) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    const result = await dispatch(updateTask({ id: task._id, data: { ...task, status: nextStatus } }));
    if (updateTask.fulfilled.match(result)) {
      toast.success(nextStatus === "completed" ? "Task completed." : "Task marked pending.");
      dispatch(fetchTasks(filters));
    } else {
      toast.error("Failed to update task.");
    }
  };

  const toggleSort = () => {
    dispatch(setFilters({ order: filters.order === "desc" ? "asc" : "desc" }));
  };

  const handleViewChange = (view) => {
    navigate(`/tasks?view=${view}`);
  };

  const handleSelectCard = (taskId) => {
    setSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkComplete = async () => {
    setLoadingBulk(true);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const task = items.find((t) => t._id === id);
          return dispatch(updateTask({ id, data: { ...task, status: "completed" } }));
        })
      );
      toast.success(`Completed ${selectedIds.length} tasks.`);
      setSelectedIds([]);
      setIsSelectMode(false);
      dispatch(fetchTasks({ ...filters, force: true }));
    } catch {
      toast.error("Failed to complete some tasks.");
    } finally {
      setLoadingBulk(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected tasks?`)) return;
    setLoadingBulk(true);
    try {
      await Promise.all(selectedIds.map((id) => dispatch(deleteTask(id))));
      toast.success(`Deleted ${selectedIds.length} tasks.`);
      setSelectedIds([]);
      setIsSelectMode(false);
      dispatch(fetchTasks({ ...filters, force: true }));
    } catch {
      toast.error("Failed to delete some tasks.");
    } finally {
      setLoadingBulk(false);
    }
  };

  const handleChangeViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("taskflow-tasks-viewmode", mode);
  };

  const calendarEvents = useMemo(() => {
    return visibleTasks
      .filter((task) => task.dueDate)
      .map((task) => {
        const dueDate = parseDateTimeValue(task.dueDate);
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
      .filter(Boolean);
  }, [visibleTasks]);

  const activeView = useMemo(() => {
    if (filters.status === "completed") return "completed";
    if (filters.status === "archived") return "archived";
    return filters.view || "all";
  }, [filters.status, filters.view]);

  const hasFilters = Boolean(filters.search || filters.status || filters.priority || filters.dueDate);

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-4">
        {/* Title Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {viewLabels[activeView] || "Tasks"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">Workspace Tasks</h2>
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              {pagination?.total ?? 0} {pagination?.total === 1 ? "task" : "tasks"} visible
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
              }}
              className={`btn-secondary w-full sm:w-auto text-xs py-1.5 px-3 font-semibold ${isSelectMode ? "bg-neutral-100 border-neutral-300 dark:bg-neutral-800" : ""}`}
            >
              {isSelectMode ? "Cancel Select" : "Bulk Action"}
            </button>
            <button type="button" onClick={toggleSort} className="btn-secondary w-full sm:w-auto text-xs py-1.5 px-3 font-semibold">
              <ArrowDownUp size={14} />
              {filters.order === "desc" ? "Newest" : "Oldest"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setDrawerOpen(true);
              }}
              className="btn-primary w-full sm:w-auto text-xs py-1.5 px-3 font-semibold"
            >
              <Plus size={15} strokeWidth={2.5} />
              New task
            </button>
          </div>
        </div>

        {/* View Mode Switcher and Filters Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Segment View Tabs */}
          <div className="flex gap-1 overflow-x-auto rounded-lg border border-neutral-200/80 p-0.5 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-900/40 w-fit">
            {[
              { id: "list", label: "List", icon: LayoutGrid },
              { id: "kanban", label: "Board", icon: KanbanIcon },
              { id: "calendar", label: "Calendar", icon: CalendarIcon },
              { id: "timeline", label: "Timeline", icon: Clock },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.id}
                  onClick={() => handleChangeViewMode(option.id)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    viewMode === option.id
                      ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-950 dark:text-white"
                      : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                  }`}
                >
                  <Icon size={12.5} />
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Quick Filter views list */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TASK_VIEWS.map((view) => (
              <button
                key={view.value}
                type="button"
                onClick={() => handleViewChange(view.value)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 ${
                  activeView === view.value
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <TaskFilters />

      {loading ? (
        <TaskSkeletonList count={4} />
      ) : visibleTasks.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching tasks" : "You're all caught up!"}
          description={
            hasFilters ? "Try changing your filters or search term." : "Create your first task to get started."
          }
          action={
            !hasFilters ? (
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setDrawerOpen(true);
                }}
                className="btn-primary"
              >
                <Plus size={15} />
                New task
              </button>
            ) : null
          }
        />
      ) : (
        /* Workspace Content Views */
        <div className="mt-4">
          {viewMode === "list" && (
            <div className="space-y-3">
              {visibleTasks.map((task) => (
                <div key={task._id} className="flex items-center gap-3">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(task._id)}
                      onChange={() => handleSelectCard(task._id)}
                      className="rounded border-neutral-300 text-brand-600 focus:ring-brand-500 h-4.5 w-4.5 dark:border-neutral-700"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <TaskCard
                      task={task}
                      highlighted={focusedTaskId === task._id}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onComplete={handleComplete}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "kanban" && (
            <KanbanView
              tasks={visibleTasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          )}

          {viewMode === "calendar" && (
            <div className="calendar-shell mt-2">
              <BigCalendar
                localizer={localizer}
                events={calendarEvents}
                defaultView="month"
                views={["month", "week"]}
                selectable
                popup
                toolbar={true}
                eventPropGetter={getEventStyle}
                onSelectEvent={(event) => handleEdit(event.resource)}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                style={{ height: 520 }}
              />
            </div>
          )}

          {viewMode === "timeline" && (
            <TimelineView
              tasks={visibleTasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onComplete={handleComplete}
            />
          )}
        </div>
      )}

      {viewMode === "list" && <Pagination pagination={pagination} />}

      {/* Floating Bulk Actions bar */}
      {isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-4 rounded-xl bg-neutral-900 px-4 py-3 shadow-2xl dark:bg-white text-white dark:text-neutral-900 border border-neutral-800 dark:border-neutral-100 min-w-[280px] sm:min-w-[360px] animate-in slide-in-from-bottom duration-150">
          <span className="text-xs font-bold tabular-nums">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkComplete}
              disabled={loadingBulk}
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white px-2.5 py-1.5 text-xs font-semibold dark:bg-neutral-100 dark:hover:bg-neutral-200 dark:text-neutral-900 disabled:opacity-50"
            >
              Complete
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={loadingBulk}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Professional Slide-over Details Drawer */}
      <TaskDetailDrawer
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        task={editingTask}
        onSaved={() => dispatch(fetchTasks(filters))}
      />
    </div>
  );
};
export default TasksPage;
