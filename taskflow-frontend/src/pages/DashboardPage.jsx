import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { TaskCard } from "../components/tasks/TaskCard";
import { TaskModal } from "../components/tasks/TaskModal";
import { EmptyState } from "../components/ui/EmptyState";
import { StatCard } from "../components/ui/StatCard";
import { TaskSkeletonList } from "../components/ui/shared";
import { deleteTask, fetchStats, fetchTasks } from "../store/slices/tasksSlice";

export const DashboardPage = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items, stats, loading } = useSelector((state) => state.tasks);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    dispatch(fetchStats());
    dispatch(fetchTasks({ limit: 5, sortBy: "createdAt", order: "desc" }));
  }, [dispatch]);

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
    if (deleteTask.fulfilled.match(result)) toast.success("Task deleted.");
    else toast.error("Failed to delete task.");
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
            {greeting}, {user?.name?.split(" ")[0] || "there"}
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Here&apos;s what&apos;s on your plate.
          </p>
        </div>

        <div className="flex gap-2.5">
          <Link to="/tasks" className="btn-secondary">
            View all tasks
          </Link>
          <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
            <Plus size={16} />
            New task
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="To do" value={stats?.todo} />
        <StatCard label="In progress" value={stats?.in_progress} color="blue" />
        <StatCard label="Done" value={stats?.done} color="green" />
      </section>

      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Recent tasks</h3>
          <Link
            to="/tasks"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            See all
          </Link>
        </div>

        {loading ? (
          <TaskSkeletonList />
        ) : items.length === 0 ? (
          <EmptyState
            action={
              <button type="button" onClick={() => setModalOpen(true)} className="btn-primary">
                <Plus size={16} />
                New task
              </button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {items.map((task) => (
              <TaskCard key={task._id} task={task} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      <TaskModal isOpen={modalOpen} onClose={handleCloseModal} task={editingTask} />
    </div>
  );
};
