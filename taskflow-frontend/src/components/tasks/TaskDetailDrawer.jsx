import { useEffect, useState, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  X,
  CheckSquare,
  ExternalLink,
  History,
  Pencil,
  Copy,
  FileText,
  ChevronDown,
  Timer,
  Loader2,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  ListTree,
  Check,
} from "lucide-react";
import { createTask, updateTask, updateParentProgress } from "../../store/slices/tasksSlice";
import { tasksApi } from "../../api/tasks.api";
import { activitiesApi } from "../../api/activities.api";
import { formatDateTimeValue, toDateTimeLocalValue, toIsoDateTimeString } from "../../utils/dates";
import { parseMarkdown, toggleChecklistItem } from "../../utils/markdown";
import { TASK_TEMPLATES } from "../../utils/templates";
import { usePomodoro } from "../../context/pomodoro-context";
import toast from "react-hot-toast";

export const TaskDetailDrawer = ({ isOpen, onClose, task, onSaved, onDuplicate }) => {
  const dispatch = useDispatch();
  const { startFocusOnTask } = usePomodoro();

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
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // Dedicated task activity history state
  const [taskActivities, setTaskActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState(null);
  const activeActivitiesRequestIdRef = useRef(0);

  // Dedicated task subtasks state
  const [subtasks, setSubtasks] = useState([]);
  const [subtasksLoading, setSubtasksLoading] = useState(false);
  const [subtasksError, setSubtasksError] = useState(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [deletingSubtaskId, setDeletingSubtaskId] = useState(null);
  const activeSubtasksRequestIdRef = useRef(0);

  const lastTaskIdRef = useRef(null);
  const descriptionRef = useRef(description);
  const saveTimeoutRef = useRef(null);

  // Keep descriptionRef in sync with description state
  useEffect(() => {
    descriptionRef.current = description;
  }, [description]);

  // Sync state on task change or create mode open
  useEffect(() => {
    let frameId;
    if (isOpen) {
      const activeId = task?._id || "create-mode";
      // Only re-sync form state from task props if opening or switching to a different task
      if (lastTaskIdRef.current !== activeId) {
        lastTaskIdRef.current = activeId;
        frameId = requestAnimationFrame(() => {
          setShowTemplateMenu(false);
          if (task) {
            // Edit Mode
            setTitle(task.title || "");
            setDescription(task.description || "");
            descriptionRef.current = task.description || "";
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
            descriptionRef.current = "";
            setStatus("pending");
            setPriority(defaultPriority);
            setRecurrence("none");
            setDueDate(initialDueDate);
            setReminderDate("");
            setTags("");
          }
        });
      }
    } else {
      lastTaskIdRef.current = null;
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [task, isOpen]);

  // Flush any pending debounced checklist save immediately
  const flushPendingSave = useCallback(() => {
    if (saveTimeoutRef.current && !isCreateMode && task) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
      dispatch(
        updateTask({
          id: task._id,
          data: {
            title,
            description: descriptionRef.current,
            status,
            priority,
            recurrence,
            dueDate: toIsoDateTimeString(dueDate),
            reminderDate: toIsoDateTimeString(reminderDate),
            tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
          },
        })
      );
    }
  }, [dispatch, isCreateMode, task, title, status, priority, recurrence, dueDate, reminderDate, tags]);

  // Clean wrapper for closing drawer that flushes pending saves
  const handleClose = useCallback(() => {
    flushPendingSave();
    setShowTemplateMenu(false);
    onClose();
  }, [flushPendingSave, onClose]);

  // Close drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  // Cleanup pending save timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  // Fetch task-specific activities from backend API
  const fetchTaskActivities = useCallback(async (taskId) => {
    if (!taskId) {
      setTaskActivities([]);
      setActivitiesLoading(false);
      setActivitiesError(null);
      return;
    }

    const currentReqId = ++activeActivitiesRequestIdRef.current;
    setActivitiesLoading(true);
    setActivitiesError(null);

    try {
      const res = await activitiesApi.getTaskActivities(taskId, { all: true });
      if (currentReqId === activeActivitiesRequestIdRef.current) {
        setTaskActivities(res.data?.data?.activities || []);
        setActivitiesLoading(false);
      }
    } catch (err) {
      if (currentReqId === activeActivitiesRequestIdRef.current) {
        setActivitiesError(err.response?.data?.message || "Failed to load activity history.");
        setActivitiesLoading(false);
      }
    }
  }, []);

  // Fetch task-specific subtasks from backend API
  const fetchSubtasks = useCallback(async (taskId) => {
    if (!taskId) {
      setSubtasks([]);
      setSubtasksLoading(false);
      setSubtasksError(null);
      return;
    }

    const currentReqId = ++activeSubtasksRequestIdRef.current;
    setSubtasksLoading(true);
    setSubtasksError(null);

    try {
      const res = await tasksApi.getSubtasks(taskId);
      if (currentReqId === activeSubtasksRequestIdRef.current) {
        const fetchedSubtasks = res.data?.data?.subtasks || [];
        const progress = res.data?.data?.progress || null;
        setSubtasks(fetchedSubtasks);
        setSubtasksLoading(false);
        dispatch(updateParentProgress({ parentId: taskId, progress }));
      }
    } catch (err) {
      if (currentReqId === activeSubtasksRequestIdRef.current) {
        setSubtasksError(err.response?.data?.message || "Failed to load subtasks.");
        setSubtasksLoading(false);
      }
    }
  }, [dispatch]);

  // Subtask handlers
  const handleCreateSubtask = async (e) => {
    e?.preventDefault();
    if (!newSubtaskTitle.trim() || !task?._id || addingSubtask) return;

    setAddingSubtask(true);
    try {
      const res = await tasksApi.createSubtask(task._id, { title: newSubtaskTitle.trim() });
      const { subtask, progress } = res.data.data;
      setSubtasks((prev) => [...prev, subtask]);
      setNewSubtaskTitle("");
      dispatch(updateParentProgress({ parentId: task._id, progress }));
      fetchTaskActivities(task._id);
      toast.success("Subtask added.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add subtask.");
    } finally {
      setAddingSubtask(false);
    }
  };

  const handleToggleSubtask = async (subtask) => {
    if (!task?._id) return;
    const nextStatus = subtask.status === "completed" ? "pending" : "completed";
    try {
      const res = await tasksApi.updateSubtask(task._id, subtask._id, { status: nextStatus });
      const { subtask: updated, progress } = res.data.data;
      setSubtasks((prev) => prev.map((s) => (s._id === subtask._id ? updated : s)));
      dispatch(updateParentProgress({ parentId: task._id, progress }));
      fetchTaskActivities(task._id);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update subtask.");
    }
  };

  const handleSaveSubtaskTitle = async (subtaskId) => {
    if (!task?._id || !editingSubtaskTitle.trim()) {
      setEditingSubtaskId(null);
      return;
    }
    try {
      const res = await tasksApi.updateSubtask(task._id, subtaskId, { title: editingSubtaskTitle.trim() });
      const { subtask: updated, progress } = res.data.data;
      setSubtasks((prev) => prev.map((s) => (s._id === subtaskId ? updated : s)));
      dispatch(updateParentProgress({ parentId: task._id, progress }));
      fetchTaskActivities(task._id);
      setEditingSubtaskId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update subtask title.");
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!task?._id) return;
    try {
      const res = await tasksApi.deleteSubtask(task._id, subtaskId);
      const { progress } = res.data.data;
      setSubtasks((prev) => prev.filter((s) => s._id !== subtaskId));
      dispatch(updateParentProgress({ parentId: task._id, progress }));
      fetchTaskActivities(task._id);
      setDeletingSubtaskId(null);
      toast.success("Subtask deleted.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete subtask.");
    }
  };

  // Fetch task-specific activities and subtasks when drawer opens or selected task changes
  useEffect(() => {
    let frameId;
    if (isOpen && task?._id) {
      frameId = requestAnimationFrame(() => {
        fetchTaskActivities(task._id);
        fetchSubtasks(task._id);
      });
    } else {
      frameId = requestAnimationFrame(() => {
        setTaskActivities([]);
        setActivitiesLoading(false);
        setActivitiesError(null);
        setSubtasks([]);
        setSubtasksLoading(false);
        setSubtasksError(null);
        setNewSubtaskTitle("");
        setEditingSubtaskId(null);
        setDeletingSubtaskId(null);
      });
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isOpen, task?._id, fetchTaskActivities, fetchSubtasks]);

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
        fetchTaskActivities(task._id);
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
        fetchTaskActivities(task._id);
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

  // Handle direct checklist item toggle in view mode with debounced server sync
  const handleToggleChecklist = (index) => {
    const prevDesc = descriptionRef.current;
    const updatedDesc = toggleChecklistItem(prevDesc, index);
    descriptionRef.current = updatedDesc;
    setDescription(updatedDesc);

    if (!isCreateMode && task) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        saveTimeoutRef.current = null;
        const result = await dispatch(
          updateTask({
            id: task._id,
            data: {
              title,
              description: descriptionRef.current,
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
          if (onSaved) onSaved();
          fetchTaskActivities(task._id);
        } else {
          // Revert on failure
          descriptionRef.current = prevDesc;
          setDescription(prevDesc);
          toast.error("Failed to update checklist item.");
        }
      }, 200);
    }
  };

  // Copy shareable link
  const handleCopyLink = () => {
    if (isCreateMode || !task) return;
    const url = `${window.location.origin}/tasks?focus=${task._id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const activeSubtasks = subtasks.filter((s) => s.status !== "archived");
  const totalSubtasks = activeSubtasks.length;
  const completedSubtasks = activeSubtasks.filter((s) => s.status === "completed").length;
  const subtasksPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Drawer overlay */}
      <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-[1px] transition-opacity" onClick={handleClose} />

      {/* Drawer Container */}
      <div id="task-detail-drawer" className="relative z-10 flex h-full w-full flex-col bg-app sm:w-[500px] animate-in slide-in-from-right duration-250" style={{ boxShadow: "var(--shadow-elevated)" }}>

        {/* Drawer Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral px-5 shrink-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="text-muted" size={18} />
            <span className="text-sm font-bold text-primary">
              {isCreateMode ? "New Task" : "Task Details"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isCreateMode && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplateMenu((prev) => !prev)}
                  className="btn-ghost h-8 px-2 text-xs font-semibold flex items-center gap-1.5 border border-subtle rounded-md hover:border-strong"
                  title="Load a template"
                  aria-haspopup="menu"
                  aria-expanded={showTemplateMenu}
                >
                  <FileText size={13} />
                  <span>Templates</span>
                  <ChevronDown size={11} className={showTemplateMenu ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {showTemplateMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowTemplateMenu(false)}
                      aria-hidden="true"
                    />
                    <div
                      role="menu"
                      className="absolute right-0 mt-1.5 w-60 rounded-xl border border-neutral bg-elevated py-1.5 shadow-xl z-20"
                    >
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                        Predefined Templates
                      </div>
                      {TASK_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setTitle(tmpl.title);
                            setDescription(tmpl.description);
                            descriptionRef.current = tmpl.description;
                            setPriority(tmpl.priority);
                            setTags(tmpl.tags.join(", "));
                            setShowTemplateMenu(false);
                            toast.success(`Loaded "${tmpl.name}" template.`);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-secondary hover:bg-hover hover:text-primary transition-colors flex items-center justify-between group"
                        >
                          <span className="font-medium group-hover:text-primary">{tmpl.name}</span>
                          <span className="text-[10px] text-muted capitalize bg-app px-1.5 py-0.5 rounded border border-subtle">
                            {tmpl.priority}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {!isCreateMode && (
              <>
                {onDuplicate && (
                  <button
                    onClick={() =>
                      onDuplicate({
                        ...task,
                        title,
                        description: descriptionRef.current,
                        status,
                        priority,
                        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
                      })
                    }
                    className="btn-ghost h-8 w-8 p-0"
                    title="Duplicate task"
                    aria-label="Duplicate task"
                  >
                    <Copy size={15} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startFocusOnTask(task)}
                  className="btn-ghost h-8 w-8 p-0"
                  title="Start Focus Session on this task"
                  aria-label="Start Focus Session on this task"
                >
                  <Timer size={15} />
                </button>
                <button
                  onClick={handleCopyLink}
                  className="btn-ghost h-8 w-8 p-0"
                  title="Copy task link"
                  aria-label="Copy task link"
                >
                  <ExternalLink size={15} />
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              className="btn-ghost h-8 w-8 p-0 text-muted hover:text-primary"
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
              className="w-full bg-transparent text-lg font-bold border-0 border-b border-transparent hover:border-neutral focus:border-strong focus:outline-none text-primary py-1"
              autoFocus={isCreateMode}
            />
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-neutral p-4">
            <div>
              <label htmlFor="drawer-status" className="label">Status</label>
              <select
                id="drawer-status"
                value={status}
                onChange={(e) => handleFieldChange("status", e.target.value)}
                className="input py-1.5 text-xs"
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
                className="input py-1.5 text-xs"
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
                className="input py-1.5 text-xs"
              >
                <option value="none">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
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
                className="input py-1.5 text-xs"
              />
            </div>

            <div>
              <label htmlFor="drawer-due-date" className="label">Due Date</label>
              <input
                id="drawer-due-date"
                type="datetime-local"
                value={dueDate}
                onChange={(e) => handleFieldChange("dueDate", e.target.value)}
                className="input py-1.5 text-xs"
              />
            </div>

            <div>
              <label htmlFor="drawer-reminder" className="label">Reminder</label>
              <input
                id="drawer-reminder"
                type="datetime-local"
                value={reminderDate}
                onChange={(e) => handleFieldChange("reminderDate", e.target.value)}
                className="input py-1.5 text-xs"
              />
            </div>
          </div>

          {/* Description Section */}
          <div className="space-y-2 border-b border-neutral pb-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
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
                  className="input resize-none text-sm"
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
                  onClick={(e) => {
                    const checkbox = e.target.closest("input[data-checklist-index]");
                    if (checkbox) {
                      e.stopPropagation();
                      const index = parseInt(checkbox.getAttribute("data-checklist-index"), 10);
                      if (!isNaN(index)) {
                        handleToggleChecklist(index);
                      }
                      return;
                    }
                    if (e.target.closest("a")) return;
                    setIsEditingDescription(true);
                  }}
                  className="min-h-16 rounded-lg border border-transparent p-2 pr-10 text-sm text-secondary hover:bg-hover hover:border-neutral cursor-pointer prose prose-sm dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(description) || "<em>Click to add details...</em>" }}
                />
                <span className="absolute right-2 top-2 text-muted opacity-0 group-hover/desc:opacity-100 transition-opacity pointer-events-none text-xs flex items-center gap-1 font-semibold">
                  <Pencil size={11} />
                  edit
                </span>
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          {!isCreateMode && (
            <div className="space-y-3 pt-1 border-t border-subtle">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <ListTree size={14} />
                    Subtasks
                  </h4>
                  {totalSubtasks > 0 && (
                    <span className="text-[11px] font-semibold text-secondary">
                      {completedSubtasks}/{totalSubtasks} ({subtasksPercent}%)
                    </span>
                  )}
                </div>
                {task && (
                  <button
                    type="button"
                    onClick={() => fetchSubtasks(task._id)}
                    disabled={subtasksLoading}
                    className="btn-ghost h-6 w-6 p-0 text-muted hover:text-primary rounded"
                    title="Refresh subtasks"
                    aria-label="Refresh subtasks"
                  >
                    <RefreshCw size={12} className={subtasksLoading ? "animate-spin" : ""} />
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {totalSubtasks > 0 && (
                <div className="h-1.5 w-full bg-hover rounded-full overflow-hidden border border-subtle">
                  <div
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${subtasksPercent}%` }}
                  />
                </div>
              )}

              {/* Add Subtask Input Form */}
              <form onSubmit={handleCreateSubtask} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a subtask..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  disabled={addingSubtask}
                  className="flex-1 bg-hover border border-subtle rounded-md px-3 py-1.5 text-xs text-primary placeholder:text-muted focus:border-strong focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingSubtask || !newSubtaskTitle.trim()}
                  className="btn-ghost h-7 px-2.5 text-xs font-semibold flex items-center gap-1 border border-subtle rounded-md hover:border-strong disabled:opacity-40"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </form>

              {/* Loading State */}
              {subtasksLoading && (
                <div className="flex items-center justify-center py-4 text-xs text-muted">
                  <Loader2 size={15} className="animate-spin mr-2" />
                  <span>Loading subtasks...</span>
                </div>
              )}

              {/* Error State */}
              {!subtasksLoading && subtasksError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <AlertCircle size={13} className="shrink-0" />
                    <span className="truncate">{subtasksError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchSubtasks(task._id)}
                    className="btn-ghost h-6 px-2 text-[10px] font-semibold text-primary hover:underline shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!subtasksLoading && !subtasksError && subtasks.length === 0 && (
                <p className="text-muted text-center py-3 text-xs italic">
                  No subtasks yet. Add smaller steps to break down this task.
                </p>
              )}

              {/* Populated Subtask List */}
              {!subtasksLoading && !subtasksError && subtasks.length > 0 && (
                <div className="space-y-1.5 mt-1 max-h-60 overflow-y-auto pr-1">
                  {subtasks.map((st) => {
                    const isDone = st.status === "completed";
                    const isEditing = editingSubtaskId === st._id;
                    const isConfirmingDelete = deletingSubtaskId === st._id;

                    return (
                      <div
                        key={st._id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-hover/50 border border-subtle hover:border-neutral transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Completion Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleSubtask(st)}
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                              isDone
                                ? "border-primary bg-primary text-secondary"
                                : "border-strong bg-transparent hover:border-primary"
                            }`}
                            aria-label={isDone ? "Mark subtask incomplete" : "Mark subtask complete"}
                          >
                            {isDone && <Check size={11} strokeWidth={3} />}
                          </button>

                          {/* Inline Edit or Text */}
                          {isEditing ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSaveSubtaskTitle(st._id);
                              }}
                              className="flex-1 min-w-0"
                            >
                              <input
                                type="text"
                                value={editingSubtaskTitle}
                                onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                                onBlur={() => handleSaveSubtaskTitle(st._id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setEditingSubtaskId(null);
                                }}
                                autoFocus
                                className="w-full bg-app border border-strong rounded px-2 py-0.5 text-xs text-primary focus:outline-none"
                              />
                            </form>
                          ) : (
                            <span
                              onClick={() => {
                                setEditingSubtaskId(st._id);
                                setEditingSubtaskTitle(st.title);
                              }}
                              className={`text-xs truncate cursor-pointer hover:underline ${
                                isDone ? "line-through text-muted" : "text-primary"
                              }`}
                              title="Click to edit subtask title"
                            >
                              {st.title}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 text-[10px]">
                              <button
                                type="button"
                                onClick={() => handleDeleteSubtask(st._id)}
                                className="btn-ghost h-5 px-1.5 text-red-600 dark:text-red-400 font-bold hover:underline"
                              >
                                Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSubtaskId(null)}
                                className="btn-ghost h-5 px-1 text-muted hover:text-primary"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubtaskId(st._id);
                                  setEditingSubtaskTitle(st.title);
                                }}
                                className="btn-ghost h-6 w-6 p-0 text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                title="Edit subtask"
                                aria-label="Edit subtask"
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingSubtaskId(st._id)}
                                className="btn-ghost h-6 w-6 p-0 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                title="Delete subtask"
                                aria-label="Delete subtask"
                              >
                                <Trash2 size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Audit History Timeline section */}
          {!isCreateMode && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <History size={14} />
                  Audit History Log
                </h4>
                {task && (
                  <button
                    type="button"
                    onClick={() => fetchTaskActivities(task._id)}
                    disabled={activitiesLoading}
                    className="btn-ghost h-6 w-6 p-0 text-muted hover:text-primary rounded"
                    title="Refresh activity history"
                    aria-label="Refresh activity history"
                  >
                    <RefreshCw size={12} className={activitiesLoading ? "animate-spin" : ""} />
                  </button>
                )}
              </div>

              {/* Loading State */}
              {activitiesLoading && (
                <div className="flex items-center justify-center py-6 text-xs text-muted">
                  <Loader2 size={15} className="animate-spin mr-2" />
                  <span>Loading activity history...</span>
                </div>
              )}

              {/* Error State */}
              {!activitiesLoading && activitiesError && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                    <AlertCircle size={13} className="shrink-0" />
                    <span className="truncate">{activitiesError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchTaskActivities(task._id)}
                    className="btn-ghost h-6 px-2 text-[10px] font-semibold text-primary hover:underline shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Empty State */}
              {!activitiesLoading && !activitiesError && taskActivities.length === 0 && (
                <p className="text-muted text-center py-4 text-xs">No activity recorded for this task yet.</p>
              )}

              {/* Populated List */}
              {!activitiesLoading && !activitiesError && taskActivities.length > 0 && (
                <div className="space-y-1.5 mt-2 max-h-56 overflow-y-auto pr-1">
                  {taskActivities.map((act) => (
                    <div
                      key={act._id}
                      className="flex items-start justify-between gap-3 p-2 rounded-lg bg-elevated border border-subtle text-xs transition-colors hover:border-neutral"
                    >
                      <p className="text-secondary leading-snug flex-1 font-medium">{act.message}</p>
                      <span className="text-[10px] text-muted shrink-0 tabular-nums pt-0.5">
                        {formatDateTimeValue(act.createdAt, "MMM d, h:mm a")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Create Mode Footer Buttons */}
        {isCreateMode && (
          <div className="flex items-center justify-end gap-2.5 border-t border-neutral px-5 py-4 shrink-0 bg-elevated">
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
