import { ArrowDownUp, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskFilters } from "../components/tasks/TaskFilters";
import { TaskModal } from "../components/tasks/TaskModal";
import { EmptyState } from "../components/ui/EmptyState";
import { Pagination } from "../components/ui/Pagination";
import { TaskSkeletonList } from "../components/ui/shared";
import { deleteTask, fetchTasks, setFilters } from "../store/slices/tasksSlice";

export const TasksPage = () => {
  const dispatch = useDispatch();
  const { items, loading, pagination, filters } = useSelector((state) => state.tasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    dispatch(fetchTasks(filters));
  }, [dispatch, filters]);

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

  const hasFilters = Boolean(filters.search || filters.status || filters.priority);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">All tasks</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {pagination?.total ?? 0} {pagination?.total === 1 ? "task" : "tasks"} total
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
            <TaskCard key={task._id} task={task} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Pagination pagination={pagination} />
      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} task={editingTask} />
    </div>
  );
};
