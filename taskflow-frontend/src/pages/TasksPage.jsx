import { ArrowDownUp, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskFilters } from "../components/tasks/TaskFilters";
import { TaskModal } from "../components/tasks/TaskModal";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { TaskSkeletonList } from "../components/ui/shared";
import { deleteTask, fetchTasks, setFilters } from "../store/slices/tasksSlice";
import { TASK_VIEWS } from "../utils/constants";

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
  const { items, loading, pagination, filters } = useSelector((state) => state.tasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const focusedTaskId = useMemo(() => new URLSearchParams(location.search).get("focus"), [location.search]);

  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [dispatch, filters]);

  useEffect(() => {
    if (!focusedTaskId) return undefined;

    const element = document.getElementById(`task-${focusedTaskId}`);
    if (!element) return undefined;

    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedTaskId, items]);

  const handleEdit = (task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this task?")) return;

    const result = await dispatch(deleteTask(id));
    if (deleteTask.fulfilled.match(result)) {
      toast.success("Task deleted.");
      dispatch(fetchTasks(filters));
    } else {
      toast.error("Failed to delete task.");
    }
  };

  const toggleSort = () => {
    dispatch(setFilters({ order: filters.order === "desc" ? "asc" : "desc" }));
  };

  const handleViewChange = (view) => {
    if (view === "completed" || view === "archived") {
      dispatch(setFilters({ view: "all", status: view, dueDate: "" }));
      return;
    }

    dispatch(setFilters({ view, status: "", dueDate: "" }));
  };

  const activeView = useMemo(() => {
    if (filters.status === "completed") return "completed";
    if (filters.status === "archived") return "archived";
    return filters.view || "all";
  }, [filters.status, filters.view]);

  const hasFilters = Boolean(filters.search || filters.status || filters.priority || filters.dueDate || filters.view !== "all");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{viewLabels[activeView] || "Tasks"}</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-white">Task workspace</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {pagination?.total ?? 0} {pagination?.total === 1 ? "task" : "tasks"} visible
            </p>
          </div>

          <div className="flex gap-2.5">
            <button type="button" onClick={toggleSort} className="btn-secondary">
              <ArrowDownUp size={15} />
              {filters.order === "desc" ? "Newest" : "Oldest"}
            </button>
            <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
              <Plus size={16} />
              New task
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {TASK_VIEWS.map((view) => (
            <button
              key={view.value}
              type="button"
              onClick={() => handleViewChange(view.value)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeView === view.value
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      <TaskFilters />

      {loading ? (
        <TaskSkeletonList count={4} />
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching tasks" : "No tasks yet"}
          description={
            hasFilters ? "Try changing your filters or search term." : "Create your first task to get started."
          }
          action={
            !hasFilters ? (
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                <Plus size={16} />
                New task
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((task) => (
            <TaskCard key={task._id} task={task} highlighted={focusedTaskId === task._id} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Pagination pagination={pagination} />
      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} onSaved={() => dispatch(fetchTasks(filters))} task={editingTask} />
    </div>
  );
};
