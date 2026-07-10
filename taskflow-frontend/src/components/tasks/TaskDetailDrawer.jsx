import { useEffect, useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  CheckSquare,
  ExternalLink,
  History,
} from "lucide-react";
import { createTask, updateTask } from "../../store/slices/tasksSlice";
import { formatDateTimeValue, toDateTimeLocalValue, toIsoDateTimeString } from "../../utils/dates";
import { parseMarkdown } from "../../utils/markdown";
import toast from "react-hot-toast";

export const TaskDetailDrawer = ({ isOpen, onClose, task, onSaved }) => {
  const dispatch = useDispatch();
  const { items: activities } = useSelector((state) => state.activity);

  const isCreateMode = !task;

  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("pending");
  const [priority, setPriority] = useState("medium");
  const [recurrence, setRecurrence] = useState("none");
  const [dueDate, setDueDate] = useState("");
  const [reminderDate, setReminderDate] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync state on task change or create mode open
  useEffect(() => {
    let frameId;
    if (isOpen) {
      frameId = requestAnimationFrame(() => {
        if (task) {
          // Edit Mode
          setTitle(task.title || "");
          setDescription(task.description || "");
          setStatus(task.status || "pending");
          setPriority(task.priority || "medium");
          setRecurrence(task.recurrence || "none");
          setDueDate(toDateTimeLocalValue(task.dueDate));
          setReminderDate(toDateTimeLocalValue(task.reminderDate));
          setTags(task.tags?.join(", ") || "");
        } else {
          // Create Mode: Read defaults from settings
          const defaultPriority = localStorage.getItem("taskflow-settings-default-priority") || "medium";
          const defaultOffsetHours = parseInt(localStorage.getItem("taskflow-settings-default-offset-hours") || "24", 10);
          
          let initialDueDate = "";
          if (defaultOffsetHours > 0) {
            const now = new Date();
            now.setHours(now.getHours() + defaultOffsetHours);
            initialDueDate = toDateTimeLocalValue(now.toISOString());
          } else if (defaultOffsetHours === 0) {
            const endOfToday = new Date();
            endOfToday.setHours(17, 0, 0, 0); // 5:00 PM today
            initialDueDate = toDateTimeLocalValue(endOfToday.toISOString());
          }

          setTitle("");
          setDescription("");
          setStatus("pending");
          setPriority(defaultPriority);
          setRecurrence("none");
          setDueDate(initialDueDate);
          setReminderDate("");
          setTags("");
        }
      });
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [task, isOpen]);

  // Close drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Focus trapping within the drawer when open
  useEffect(() => {
    if (!isOpen) return;

    const drawerElement = document.getElementById("task-detail-drawer");
    if (!drawerElement) return;

    // Find all focusable items inside the drawer
    const focusableElements = drawerElement.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleTabKey);
    return () => window.removeEventListener("keydown", handleTabKey);
  }, [isOpen]);

  // Filter activities related to this task
  const taskActivities = useMemo(() => {
    if (!task) return [];
    return activities.filter((act) => act.taskId === task._id || act.message?.includes(task.title));
  }, [activities, task]);

  // Handle direct updates in Edit Mode, or update local states in Create Mode
  const handleFieldChange = async (name, value) => {
    if (name === "title") {
      setTitle(value);
    } else if (name === "status") {
      setStatus(value);
    } else if (name === "priority") {
      setPriority(value);
    } else if (name === "recurrence") {
      setRecurrence(value);
    } else if (name === "dueDate") {
      setDueDate(value);
    } else if (name === "reminderDate") {
      setReminderDate(value);
    } else if (name === "tags") {
      setTags(value);
    }

    // Only dispatch update to database if we are in EDIT mode
    if (!isCreateMode && task) {
      let payload = {
        title: name === "title" ? value : title,
        description,
        status: name === "status" ? value : status,
        priority: name === "priority" ? value : priority,
        recurrence: name === "recurrence" ? value : recurrence,
        dueDate: name === "dueDate" ? toIsoDateTimeString(value) : toIsoDateTimeString(dueDate),
        reminderDate: name === "reminderDate" ? toIsoDateTimeString(value) : toIsoDateTimeString(reminderDate),
        tags: name === "tags"
          ? (value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [])
          : (tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : []),
      };

      const result = await dispatch(updateTask({ id: task._id, data: payload }));
      if (updateTask.fulfilled.match(result)) {
        if (onSaved) onSaved();
      }
    }
  };

  // Save description in edit mode
  const handleSaveDescription = async () => {
    setIsEditingDescription(false);
    if (!isCreateMode && task) {
      const result = await dispatch(
        updateTask({
          id: task._id,
          data: {
            title,
            description: description.trim(),
            status,
            priority,
            recurrence,
            dueDate: toIsoDateTimeString(dueDate),
            reminderDate: toIsoDateTimeString(reminderDate),
            tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          },
        })
      );
      if (updateTask.fulfilled.match(result)) {
        toast.success("Description updated.");
        if (onSaved) onSaved();
      }
    }
  };

  // Handle task creation
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Task title is required.");
      return;
    }

    setLoading(true);
    const payload = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      recurrence,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dueDate: toIsoDateTimeString(dueDate),
      reminderDate: toIsoDateTimeString(reminderDate),
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    const result = await dispatch(createTask(payload));
    setLoading(false);

    if (createTask.fulfilled.match(result)) {
      toast.success("Task created.");
      if (onSaved) await onSaved();
      onClose();
    } else {
      toast.error(result.payload || "Failed to create task.");
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (isCreateMode) return;
    const url = `${window.location.origin}/tasks?focus=${task._id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Drawer overlay */}
      <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[1px] transition-opacity" onClick={onClose} />

      {/* Drawer Container */}
      <div id="task-detail-drawer" className="relative z-10 flex h-full w-full flex-col bg-white shadow-2xl dark:bg-neutral-950 sm:w-[500px] animate-in slide-in-from-right duration-250">
        
        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-5 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-brand-500" size={18} />
            <span className="text-sm font-bold text-neutral-900 dark:text-white">
              {isCreateMode ? "New Task" : "Task Details"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {!isCreateMode && (
              <button
                onClick={handleCopyLink}
                className="btn-ghost h-8 w-8 p-0"
                title="Copy task link"
              >
                <ExternalLink size={15} />
              </button>
            )}
            <button
              onClick={onClose}
              className="btn-ghost h-8 w-8 p-0 text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
              aria-label="Close drawer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable details form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          
          {/* Task Title */}
          <div>
            <label htmlFor="drawer-title" className="sr-only">Task Title</label>
            <input
              id="drawer-title"
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={(e) => handleFieldChange("title", e.target.value)}
              className="w-full bg-transparent text-lg font-bold border-0 border-b border-transparent hover:border-neutral-200 focus:border-brand-500 focus:outline-none dark:text-white dark:hover:border-neutral-800 dark:focus:border-brand-400 py-1"
              autoFocus={isCreateMode}
            />
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 p-4">
            <div>
              <label htmlFor="drawer-status" className="label">Status</label>
              <select
                id="drawer-status"
                value={status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                className="input py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label htmlFor="drawer-priority" className="label">Priority</label>
              <select
                id="drawer-priority"
                value={priority}
                onChange={(e) => handleFieldChange("priority", e.target.value)}
                className="input py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label htmlFor="drawer-recurrence" className="label">Recurrence</label>
              <select
                id="drawer-recurrence"
                value={recurrence}
                onChange={(e) => handleFieldChange("recurrence", e.target.value)}
                className="input py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label htmlFor="drawer-tags" className="label">Labels / Tags</label>
              <input
                id="drawer-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onBlur={(e) => handleFieldChange("tags", e.target.value)}
                placeholder="design, review"
                className="input py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="drawer-due-date" className="label">Due Date</label>
              <input
                id="drawer-due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                className="input py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label htmlFor="drawer-reminder" className="label">Reminder</label>
              <input
                id="drawer-reminder"
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => handleFieldChange("reminderDate", e.target.value)}
                className="input py-1.5 text-xs focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2 border-b border-neutral-100 pb-5 dark:border-neutral-900">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Description
            </h4>
            {isEditingDescription || isCreateMode ? (
              <div className="space-y-2">
                <label htmlFor="drawer-description" className="sr-only">Task Description</label>
                <textarea
                  id="drawer-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  className="input resize-none text-sm focus:ring-2 focus:ring-brand-500"
                  placeholder="Add details using markdown..."
                />
                {!isCreateMode && (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingDescription(false)}
                      className="btn-ghost py-1 px-3 text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveDescription}
                      className="btn-primary py-1 px-3 text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group/desc">
                <div
                  onClick={() => setIsEditingDescription(true)}
                  className="min-h-16 rounded-lg border border-transparent p-2 pr-10 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900/40 cursor-pointer prose prose-sm dark:prose-invert hover:border-neutral-200 dark:hover:border-neutral-800"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(description) || "<em>Click to add details...</em>" }}
                />
                <span className="absolute right-2 top-2 text-neutral-400 opacity-0 group-hover/desc:opacity-100 transition-opacity pointer-events-none text-xs flex items-center gap-1 font-semibold dark:text-neutral-500">
                  ✎ edit
                </span>
              </div>
            )}
          </div>

          {/* Audit History Timeline section */}
          {!isCreateMode && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 flex items-center gap-1.5">
                <History size={14} />
                Audit History Log
              </h4>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto text-[11px]">
                {taskActivities.map((act) => (
                  <div key={act._id} className="flex items-start justify-between gap-4 p-1">
                    <p className="text-neutral-600 dark:text-neutral-400">{act.message}</p>
                    <span className="text-[10px] text-neutral-400 shrink-0">
                      {formatDateTimeValue(act.createdAt, "MM/dd h:mm a")}
                    </span>
                  </div>
                ))}
                {taskActivities.length === 0 && (
                  <p className="text-neutral-400 dark:text-neutral-600 text-center py-3">No changes recorded yet.</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Create Mode Footer Buttons */}
        {isCreateMode && (
          <div className="flex items-center justify-end gap-2.5 border-t border-neutral-200/80 px-5 py-4 dark:border-neutral-800 shrink-0 bg-neutral-50/50 dark:bg-neutral-900/30">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs py-1.5 px-3.5 font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreateTask}
              disabled={loading}
              className="btn-primary text-xs py-1.5 px-3.5 font-semibold min-w-[100px]"
            >
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
export default TaskDetailDrawer;
