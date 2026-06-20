import { useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { createTask, updateTask } from "../../store/slices/tasksSlice";
import { parseDateTimeValue, toDateTimeLocalValue, toIsoDateTimeString } from "../../utils/dates";
import { TASK_PRIORITY, TASK_RECURRENCE, TASK_STATUS } from "../../utils/constants";
import { Modal } from "../ui/Modal";
import { Spinner } from "../ui/Spinner";
import { FieldError } from "../ui/shared";

const defaultForm = {
  title: "",
  description: "",
  status: "pending",
  priority: "medium",
  recurrence: "none",
  dueDate: "",
  reminderDate: "",
  tags: "",
};

export const TaskModal = ({ isOpen, onClose, task, onSaved }) => {
  const isEditing = Boolean(task);
  const initialForm = task
    ? {
        title: task.title || "",
        description: task.description || "",
        status: task.status || "pending",
        priority: task.priority || "medium",
        recurrence: task.recurrence || "none",
        dueDate: toDateTimeLocalValue(task.dueDate),
        reminderDate: toDateTimeLocalValue(task.reminderDate),
        tags: task.tags?.join(", ") || "",
      }
    : defaultForm;

  const formKey = task?._id || (isOpen ? "new-open" : "new-closed");

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit task" : "New task"}
      description={isEditing ? "Update the details below." : "Add a new task to your list."}
    >
      <TaskForm
        key={formKey}
        initialForm={initialForm}
        isEditing={isEditing}
        onClose={onClose}
        onSaved={onSaved}
        taskId={task?._id}
      />
    </Modal>
  );
};

const TaskForm = ({ initialForm, isEditing, onClose, onSaved, taskId }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.title.trim()) nextErrors.title = "Title is required.";
    if (form.title.trim().length > 120) nextErrors.title = "Use 120 characters or fewer.";
    if (form.description.trim().length > 500) nextErrors.description = "Use 500 characters or fewer.";
    if (form.tags.length > 120) nextErrors.tags = "Keep tags shorter.";
    const dueDate = parseDateTimeValue(form.dueDate);
    const reminderDate = parseDateTimeValue(form.reminderDate);

    if (dueDate && reminderDate && reminderDate > dueDate) {
      nextErrors.reminderDate = "Reminder should be before the due date.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) {
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);

    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      recurrence: form.recurrence,
      dueDate: toIsoDateTimeString(form.dueDate),
      reminderDate: toIsoDateTimeString(form.reminderDate),
      tags: form.tags
        ? form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    };

    const action = isEditing ? dispatch(updateTask({ id: taskId, data: payload })) : dispatch(createTask(payload));
    const result = await action;
    setLoading(false);

    if ((isEditing ? updateTask : createTask).fulfilled.match(result)) {
      try {
        if (onSaved) {
          await onSaved();
        }
      } catch (error) {
        console.error("Task save refresh failed", error);
      } finally {
        toast.success(isEditing ? "Task updated." : "Task created.");
        onClose();
      }
    } else {
      toast.error(result.payload || "Something went wrong.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="task-title" className="label">
          Title
        </label>
        <input
          id="task-title"
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="What needs to be done?"
          className={`input ${errors.title ? "input-error" : ""}`}
          autoFocus
        />
        <FieldError message={errors.title} />
      </div>

      <div>
        <label htmlFor="task-description" className="label">
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Add details"
          rows={3}
          className={`input resize-none ${errors.description ? "input-error" : ""}`}
        />
        <div className="mt-1 flex items-center justify-between gap-4">
          <FieldError message={errors.description} />
          <p className="ml-auto text-xs text-neutral-400">{form.description.length}/500</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-status" className="label">
            Status
          </label>
          <select id="task-status" name="status" value={form.status} onChange={handleChange} className="input">
            {TASK_STATUS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="task-priority" className="label">
            Priority
          </label>
          <select id="task-priority" name="priority" value={form.priority} onChange={handleChange} className="input">
            {TASK_PRIORITY.map((priority) => (
              <option key={priority.value} value={priority.value}>
                {priority.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="task-recurrence" className="label">
          Recurrence
        </label>
        <select id="task-recurrence" name="recurrence" value={form.recurrence} onChange={handleChange} className="input">
          {TASK_RECURRENCE.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-due-date" className="label">
            Due date
          </label>
          <input id="task-due-date" type="datetime-local" name="dueDate" value={form.dueDate} onChange={handleChange} className="input" />
        </div>

        <div>
          <label htmlFor="task-reminder-date" className="label">
            Reminder
          </label>
          <input
            id="task-reminder-date"
            type="datetime-local"
            name="reminderDate"
            value={form.reminderDate}
            onChange={handleChange}
            className={`input ${errors.reminderDate ? "input-error" : ""}`}
          />
          <FieldError message={errors.reminderDate} />
        </div>
      </div>

      <div>
        <label htmlFor="task-tags" className="label">
          Tags
        </label>
        <input
          id="task-tags"
          name="tags"
          value={form.tags}
          onChange={handleChange}
          placeholder="design, review"
          className={`input ${errors.tags ? "input-error" : ""}`}
        />
        <FieldError message={errors.tags} />
      </div>

      <div className="flex flex-col-reverse gap-2.5 border-t border-neutral-200 pt-4 sm:flex-row sm:justify-end dark:border-neutral-800">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="btn-primary min-w-[110px]">
          {loading ? <Spinner size="sm" /> : null}
          {isEditing ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
};
