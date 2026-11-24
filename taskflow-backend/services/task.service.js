const prisma = require("../config/prisma");
const { TASK_PRIORITY, TASK_STATUS, TASK_RECURRENCE, LEGACY_TASK_STATUS, ACTIVITY_TYPE } = require("../constants");
const { serializeTask } = require("../utils/serializers");
const {
  syncTaskNotifications,
  recordTaskCompletion,
  deleteTaskNotifications,
} = require("./notification.service");
const { recordActivity } = require("./activity.service");

const SORTABLE_FIELDS = [
  "createdAt",
  "updatedAt",
  "dueDate",
  "reminderDate",
  "completedAt",
  "archivedAt",
  "title",
  "status",
  "priority",
];
const MAX_PAGE_SIZE = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_STATUSES = Object.values(TASK_STATUS);
const ACTIVE_STATUSES = [TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS];
const COMPLETION_STATUSES = [TASK_STATUS.COMPLETED, TASK_STATUS.ARCHIVED];
const VIEW_NAMES = new Set(["all", "my_day", "upcoming", "completed", "archived"]);
const DATE_FILTERS = new Set(["all", "today", "tomorrow", "this_week", "overdue", "no_date"]);
const GENERAL_UPDATE_FIELDS = ["title", "description", "reminderDate", "tags", "recurrence"];

const getDayBounds = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const addDays = (date, amount) => {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
};

const addMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};

const normalizeStatus = (status) => LEGACY_TASK_STATUS[status] || status;

const normalizeStatusFilter = (status) => {
  const normalized = normalizeStatus(status);
  return VALID_STATUSES.includes(normalized) ? normalized : null;
};

const normalizeRecurrence = (recurrence) => {
  const validRecurrences = Object.values(TASK_RECURRENCE);
  return validRecurrences.includes(recurrence) ? recurrence : TASK_RECURRENCE.NONE;
};

const toValidDate = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getNextRecurrenceDate = (date, recurrence, step = 1) => {
  if (!date) return null;

  if (recurrence === TASK_RECURRENCE.DAILY) {
    return addDays(date, step);
  }

  if (recurrence === TASK_RECURRENCE.WEEKLY) {
    return addDays(date, step * 7);
  }

  if (recurrence === TASK_RECURRENCE.MONTHLY) {
    return addMonths(date, step);
  }

  return null;
};

const buildTaskWhere = (userId, { status, priority, search, view, dueDate, tag, label }) => {
  const where = { userId, recurrenceParentId: null, parentId: null };
  const filters = [];
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getDayBounds(now);
  const tomorrowStart = addDays(todayStart, 1);
  const tomorrowEnd = addDays(todayEnd, 1);
  const thisWeekEnd = getDayBounds(addDays(todayStart, 6)).end;
  const normalizedView = VIEW_NAMES.has((view || "all").toLowerCase()) ? (view || "all").toLowerCase() : "all";
  const normalizedDueDateFilter = DATE_FILTERS.has((dueDate || "all").toLowerCase()) ? (dueDate || "all").toLowerCase() : "all";

  if (normalizedView === "my_day") {
    filters.push({
      OR: [
        { dueDate: { gte: todayStart, lte: todayEnd } },
        { reminderDate: { gte: todayStart, lte: todayEnd } },
      ],
    });
  }

  if (normalizedView === "upcoming") {
    filters.push({ dueDate: { gt: todayEnd } });
    filters.push({ status: { in: ACTIVE_STATUSES } });
  }

  if (normalizedView === "completed") {
    filters.push({ status: TASK_STATUS.COMPLETED });
  }

  if (normalizedView === "archived") {
    filters.push({ status: TASK_STATUS.ARCHIVED });
  }

  const normalizedStatus = normalizeStatusFilter(status);
  if (normalizedStatus) {
    filters.push({ status: normalizedStatus });
  }

  if (Object.values(TASK_PRIORITY).includes(priority)) {
    filters.push({ priority });
  }

  if (search) {
    const trimmedSearch = typeof search === "string" ? search.trim() : "";
    if (trimmedSearch) {
      filters.push({
        OR: [
          { title: { contains: trimmedSearch, mode: "insensitive" } },
          { description: { contains: trimmedSearch, mode: "insensitive" } },
          { tags: { has: trimmedSearch } },
        ],
      });
    }
  }

  // Reliable exact tag-specific filtering
  const tagFilter = typeof tag === "string" ? tag.trim() : typeof label === "string" ? label.trim() : "";
  if (tagFilter) {
    filters.push({
      tags: { has: tagFilter },
    });
  }

  if (normalizedDueDateFilter === "today") {
    filters.push({ dueDate: { gte: todayStart, lte: todayEnd } });
  } else if (normalizedDueDateFilter === "tomorrow") {
    filters.push({ dueDate: { gte: tomorrowStart, lte: tomorrowEnd } });
  } else if (normalizedDueDateFilter === "this_week") {
    filters.push({ dueDate: { gte: todayStart, lte: thisWeekEnd } });
  } else if (normalizedDueDateFilter === "overdue") {
    filters.push({ dueDate: { lt: now } });
    filters.push({ status: { notIn: COMPLETION_STATUSES } });
  } else if (normalizedDueDateFilter === "no_date") {
    filters.push({ dueDate: null });
  }

  if (filters.length > 0) {
    where.AND = filters;
  }

  return where;
};

const getPagination = ({ page = 1, limit = 10 }) => {
  const safePage = Math.max(Number(page) || 1, 1);
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), MAX_PAGE_SIZE);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
};

const getOrderBy = ({ sortBy = "createdAt", order = "desc" }) => {
  const field = SORTABLE_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const direction = order === "asc" ? "asc" : "desc";

  return { [field]: direction };
};

const getTaskData = (data) => {
  const taskData = {};

  if (data.title !== undefined) taskData.title = data.title;
  if (data.description !== undefined) taskData.description = data.description;
  if (data.status !== undefined) taskData.status = normalizeStatus(data.status);
  if (data.priority !== undefined) taskData.priority = data.priority;
  if (data.recurrence !== undefined) taskData.recurrence = normalizeRecurrence(data.recurrence);
  if (data.dueDate !== undefined) taskData.dueDate = toValidDate(data.dueDate);
  if (data.reminderDate !== undefined) taskData.reminderDate = toValidDate(data.reminderDate);
  if (data.tags !== undefined) taskData.tags = data.tags;
  if (data.parentId !== undefined) taskData.parentId = data.parentId || null;

  return taskData;
};

const hasMeaningfulTaskUpdate = (existingTask, taskData) => {
  const trackedFields = GENERAL_UPDATE_FIELDS;

  return trackedFields.some((field) => {
    if (!(field in taskData)) return false;

    const nextValue = taskData[field];
    const currentValue = existingTask[field];

    if (Array.isArray(nextValue) || Array.isArray(currentValue)) {
      return JSON.stringify(nextValue || []) !== JSON.stringify(currentValue || []);
    }

    if (nextValue instanceof Date || currentValue instanceof Date) {
      return new Date(nextValue || null).getTime() !== new Date(currentValue || null).getTime();
    }

    return nextValue !== currentValue;
  });
};

const hasTitleChanged = (existingTask, taskData) =>
  taskData.title !== undefined && taskData.title.trim() !== existingTask.title;

const hasDescriptionChanged = (existingTask, taskData) =>
  taskData.description !== undefined && (taskData.description || "") !== (existingTask.description || "");

const hasTagsChanged = (existingTask, taskData) => {
  if (taskData.tags === undefined) return false;
  const currentTags = Array.isArray(existingTask.tags) ? existingTask.tags : [];
  const nextTags = Array.isArray(taskData.tags) ? taskData.tags : [];
  return JSON.stringify([...currentTags].sort()) !== JSON.stringify([...nextTags].sort());
};

const hasRecurrenceChanged = (existingTask, taskData) =>
  taskData.recurrence !== undefined && taskData.recurrence !== existingTask.recurrence;

const hasGenericStatusChange = (existingTask, taskData) => {
  if (taskData.status === undefined) return false;
  const nextStatus = normalizeStatus(taskData.status);
  const currentStatus = normalizeStatus(existingTask.status);
  if (nextStatus === currentStatus) return false;
  if (hasCompletedStatusChange(existingTask, taskData)) return false;
  if (hasArchivedStatusChange(existingTask, taskData)) return false;
  if (hasRestoredStatusChange(existingTask, taskData)) return false;
  return true;
};

const hasDateChanged = (existingValue, nextValue) =>
  new Date(existingValue || null).getTime() !== new Date(nextValue || null).getTime();

const hasPriorityChanged = (existingTask, taskData) => taskData.priority !== undefined && taskData.priority !== existingTask.priority;

const hasDueDateChanged = (existingTask, taskData) =>
  taskData.dueDate !== undefined && hasDateChanged(existingTask.dueDate, taskData.dueDate);

const hasRestoredStatusChange = (existingTask, taskData) => {
  if (taskData.status === undefined) return false;

  const nextStatus = normalizeStatus(taskData.status);
  return COMPLETION_STATUSES.includes(existingTask.status) && ACTIVE_STATUSES.includes(nextStatus);
};

const hasCompletedStatusChange = (existingTask, taskData) => {
  if (taskData.status === undefined) return false;

  const nextStatus = normalizeStatus(taskData.status);
  return nextStatus === TASK_STATUS.COMPLETED && existingTask.status !== TASK_STATUS.COMPLETED;
};

const hasArchivedStatusChange = (existingTask, taskData) => {
  if (taskData.status === undefined) return false;

  const nextStatus = normalizeStatus(taskData.status);
  return nextStatus === TASK_STATUS.ARCHIVED && existingTask.status !== TASK_STATUS.ARCHIVED;
};

const getLifecycleData = (existingTask, taskData, now = new Date()) => {
  const nextStatus = taskData.status || existingTask?.status || TASK_STATUS.PENDING;
  const normalizedStatus = normalizeStatus(nextStatus);

  let completedAt = null;
  if (normalizedStatus === TASK_STATUS.COMPLETED) {
    if (existingTask && existingTask.status === TASK_STATUS.COMPLETED && existingTask.completedAt) {
      completedAt = existingTask.completedAt;
    } else {
      completedAt = now;
    }
  }

  return {
    status: normalizedStatus,
    completedAt,
    archivedAt: normalizedStatus === TASK_STATUS.ARCHIVED ? existingTask?.archivedAt || now : null,
  };
};

const notFound = () => {
  const error = new Error("Task not found");
  error.statusCode = 404;
  return error;
};

const ensureTaskId = (taskId) => {
  if (!UUID_PATTERN.test(taskId)) {
    throw notFound();
  }
};

const getTasks = async (userId, queryParams) => {
  await syncTaskNotifications(userId);
  const where = buildTaskWhere(userId, queryParams);
  const { page, limit, skip } = getPagination(queryParams);
  const orderBy = getOrderBy(queryParams);

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        subtasks: {
          select: { id: true, status: true, title: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return {
    tasks: tasks.map(serializeTask),
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    },
  };
};

const getTaskById = async (taskId, userId) => {
  ensureTaskId(taskId);

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
    include: {
      subtasks: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) {
    throw notFound();
  }

  return serializeTask(task);
};

const createTask = async (userId, data) => {
  const taskData = getTaskData(data);
  const lifecycleData = getLifecycleData(null, taskData);

  let parentTask = null;
  if (taskData.parentId) {
    ensureTaskId(taskData.parentId);
    parentTask = await prisma.task.findFirst({
      where: { id: taskData.parentId, userId },
    });
    if (!parentTask) {
      const error = new Error("Parent task not found");
      error.statusCode = 404;
      throw error;
    }
    if (parentTask.parentId) {
      const error = new Error("Nested subtasks are not supported: a subtask cannot be a parent");
      error.statusCode = 400;
      throw error;
    }
  }

  const task = await prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        ...taskData,
        ...lifecycleData,
        userId,
      },
    });

    if (parentTask) {
      await recordActivity({
        client: tx,
        userId,
        taskId: parentTask.id,
        type: ACTIVITY_TYPE.SUBTASK_CREATED,
        taskTitle: parentTask.title,
        to: created.title,
      });
    }

    await recordActivity({
      client: tx,
      userId,
      taskId: created.id,
      type: ACTIVITY_TYPE.TASK_CREATED,
      taskTitle: created.title,
    });

    return created;
  });

  await syncTaskNotifications(userId);
  await recordTaskCompletion(userId, task);
  return serializeTask(task);
};

const updateTask = async (taskId, userId, data) => {
  ensureTaskId(taskId);

  const existingTask = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!existingTask) {
    throw notFound();
  }

  const taskData = getTaskData(data);
  const timeZone = data.timeZone;
  const nextLifecycleData = getLifecycleData(existingTask, taskData);

  if (taskData.parentId !== undefined) {
    if (taskData.parentId === taskId) {
      const error = new Error("A task cannot be its own parent");
      error.statusCode = 400;
      throw error;
    }
    if (taskData.parentId !== null) {
      ensureTaskId(taskData.parentId);
      const childCount = await prisma.task.count({
        where: { parentId: taskId, userId },
      });
      if (childCount > 0) {
        const error = new Error("Cannot convert a parent task with subtasks into a subtask");
        error.statusCode = 400;
        throw error;
      }
      const parent = await prisma.task.findFirst({
        where: { id: taskData.parentId, userId },
      });
      if (!parent) {
        const error = new Error("Parent task not found");
        error.statusCode = 404;
        throw error;
      }
      if (parent.parentId) {
        const error = new Error("Nested subtasks are not supported: a subtask cannot be a parent");
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const finalTask = await prisma.$transaction(async (tx) => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        ...taskData,
        ...nextLifecycleData,
      },
    });

    let currentTask = updatedTask;
    const shouldAdvanceRecurringTask =
      existingTask.recurrence !== TASK_RECURRENCE.NONE &&
      hasCompletedStatusChange(existingTask, taskData) &&
      Boolean(existingTask.dueDate);

    if (shouldAdvanceRecurringTask) {
      const nextDueDate = getNextRecurrenceDate(existingTask.dueDate, existingTask.recurrence);
      if (nextDueDate) {
        const reminderOffset =
          existingTask.reminderDate && existingTask.dueDate
            ? new Date(existingTask.reminderDate).getTime() - new Date(existingTask.dueDate).getTime()
            : null;

        const nextReminderDate = reminderOffset !== null ? new Date(nextDueDate.getTime() + reminderOffset) : null;

        currentTask = await tx.task.update({
          where: { id: taskId },
          data: {
            status: TASK_STATUS.PENDING,
            completedAt: null,
            archivedAt: null,
            dueDate: nextDueDate,
            reminderDate: nextReminderDate,
          },
        });

        await recordActivity({
          client: tx,
          userId,
          taskId: currentTask.id,
          type: ACTIVITY_TYPE.DUE_DATE_CHANGED,
          taskTitle: currentTask.title,
          from: existingTask.dueDate,
          to: currentTask.dueDate,
          timeZone,
        });
      }
    }

    let specificActivityLogged = false;

    if (hasTitleChanged(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.TITLE_CHANGED,
        taskTitle: currentTask.title,
        from: existingTask.title,
        to: currentTask.title,
      });
      specificActivityLogged = true;
    }

    if (hasDescriptionChanged(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.DESCRIPTION_CHANGED,
        taskTitle: currentTask.title,
      });
      specificActivityLogged = true;
    }

    if (hasPriorityChanged(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.PRIORITY_CHANGED,
        taskTitle: currentTask.title,
        from: existingTask.priority,
        to: currentTask.priority,
      });
      specificActivityLogged = true;
    }

    if (hasDueDateChanged(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.DUE_DATE_CHANGED,
        taskTitle: currentTask.title,
        from: existingTask.dueDate,
        to: currentTask.dueDate,
        timeZone,
      });
      specificActivityLogged = true;
    }

    if (hasTagsChanged(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.TAGS_CHANGED,
        taskTitle: currentTask.title,
        from: existingTask.tags,
        to: currentTask.tags,
      });
      specificActivityLogged = true;
    }

    if (hasCompletedStatusChange(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: updatedTask.id,
        type: ACTIVITY_TYPE.TASK_COMPLETED,
        taskTitle: updatedTask.title,
      });
      specificActivityLogged = true;
    }

    if (hasArchivedStatusChange(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.TASK_ARCHIVED,
        taskTitle: currentTask.title,
      });
      specificActivityLogged = true;
    }

    if (hasRestoredStatusChange(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.TASK_RESTORED,
        taskTitle: currentTask.title,
      });
      specificActivityLogged = true;
    }

    if (hasGenericStatusChange(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.STATUS_CHANGED,
        taskTitle: currentTask.title,
        from: existingTask.status,
        to: currentTask.status,
      });
      specificActivityLogged = true;
    }

    if (hasRecurrenceChanged(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.TASK_UPDATED,
        taskTitle: currentTask.title,
        customMessage: `Changed recurrence for task '${currentTask.title}' from ${existingTask.recurrence} to ${currentTask.recurrence}`,
      });
      specificActivityLogged = true;
    }

    // Only log generic TASK_UPDATED if no specific activity was logged
    if (!specificActivityLogged && hasMeaningfulTaskUpdate(existingTask, taskData)) {
      await recordActivity({
        client: tx,
        userId,
        taskId: currentTask.id,
        type: ACTIVITY_TYPE.TASK_UPDATED,
        taskTitle: currentTask.title,
      });
    }

    if (existingTask.parentId) {
      if (hasCompletedStatusChange(existingTask, taskData)) {
        await recordActivity({
          client: tx,
          userId,
          taskId: existingTask.parentId,
          type: ACTIVITY_TYPE.SUBTASK_COMPLETED,
          to: currentTask.title,
        });
      } else if (hasRestoredStatusChange(existingTask, taskData)) {
        await recordActivity({
          client: tx,
          userId,
          taskId: existingTask.parentId,
          type: ACTIVITY_TYPE.SUBTASK_REOPENED,
          to: currentTask.title,
        });
      }

      if (hasTitleChanged(existingTask, taskData)) {
        await recordActivity({
          client: tx,
          userId,
          taskId: existingTask.parentId,
          type: ACTIVITY_TYPE.SUBTASK_UPDATED,
          from: existingTask.title,
          to: currentTask.title,
        });
      }
    }

    return currentTask;
  });

  await syncTaskNotifications(userId);
  await recordTaskCompletion(userId, finalTask);
  return serializeTask(finalTask);
};

const deleteTask = async (taskId, userId) => {
  ensureTaskId(taskId);

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });

  if (!task) {
    throw notFound();
  }

  const activeSubtasks = await prisma.task.count({
    where: {
      parentId: taskId,
      userId,
      status: { notIn: [TASK_STATUS.COMPLETED, TASK_STATUS.ARCHIVED] },
    },
  });

  if (activeSubtasks > 0) {
    const error = new Error("Cannot delete task with active subtasks. Please complete, delete, or reassign subtasks first.");
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await deleteTaskNotifications(userId, taskId, tx);
    await tx.task.deleteMany({
      where: {
        userId,
        recurrenceParentId: taskId,
      },
    });

    if (task.parentId) {
      await recordActivity({
        client: tx,
        userId,
        taskId: task.parentId,
        type: ACTIVITY_TYPE.SUBTASK_DELETED,
        to: task.title,
      });
    }

    // Delete any completed/archived subtasks under this parent
    await tx.task.deleteMany({
      where: {
        userId,
        parentId: taskId,
      },
    });

    await recordActivity({
      client: tx,
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.TASK_DELETED,
      taskTitle: task.title,
    });
    await tx.task.delete({ where: { id: taskId } });
  });

  return serializeTask(task);
};

const getTaskStats = async (userId) => {
  const tasks = await prisma.task.findMany({
    where: { userId, recurrenceParentId: null, parentId: null },
    select: {
      status: true,
      dueDate: true,
      tags: true,
    },
  });

  const result = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    archived: 0,
    overdue: 0,
    dueToday: 0,
    total: 0,
    todo: 0,
    done: 0,
    tags: [],
  };
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getDayBounds(now);
  const tagSet = new Set();

  tasks.forEach((task) => {
    const status = normalizeStatus(task.status);
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;

    if (result[status] !== undefined) {
      result[status] += 1;
    }

    if (status === TASK_STATUS.PENDING) {
      result.todo += 1;
    }

    if (status === TASK_STATUS.COMPLETED) {
      result.done += 1;
    }

    if (ACTIVE_STATUSES.includes(status) && dueDate && dueDate >= todayStart && dueDate <= todayEnd) {
      result.dueToday += 1;
    }

    if (dueDate && dueDate < now && !COMPLETION_STATUSES.includes(status)) {
      result.overdue += 1;
    }

    if (Array.isArray(task.tags)) {
      task.tags.forEach((tag) => {
        if (tag && typeof tag === "string" && tag.trim()) {
          tagSet.add(tag.trim());
        }
      });
    }

    result.total += 1;
  });

  result.tags = Array.from(tagSet);
  return result;
};

const calculateProgress = (subtasks = []) => {
  const active = subtasks.filter((s) => s.status !== TASK_STATUS.ARCHIVED);
  const total = active.length;
  const completed = active.filter((s) => s.status === TASK_STATUS.COMPLETED).length;
  return total > 0 ? {
    total,
    completed,
    percent: Math.round((completed / total) * 100),
  } : null;
};

const getSubtasks = async (parentId, userId) => {
  ensureTaskId(parentId);

  const parent = await prisma.task.findFirst({
    where: { id: parentId, userId },
  });

  if (!parent) {
    throw notFound();
  }

  const subtasks = await prisma.task.findMany({
    where: { parentId, userId },
    orderBy: { createdAt: "asc" },
  });

  return {
    subtasks: subtasks.map(serializeTask),
    progress: calculateProgress(subtasks),
  };
};

const createSubtask = async (parentId, userId, data) => {
  ensureTaskId(parentId);
  const subtask = await createTask(userId, { ...data, parentId });
  const { progress } = await getSubtasks(parentId, userId);

  return {
    subtask,
    progress,
  };
};

const updateSubtask = async (parentId, subtaskId, userId, data) => {
  ensureTaskId(parentId);
  ensureTaskId(subtaskId);

  const existingSubtask = await prisma.task.findFirst({
    where: { id: subtaskId, parentId, userId },
  });

  if (!existingSubtask) {
    throw notFound();
  }

  const updatedSubtask = await updateTask(subtaskId, userId, data);
  const { progress } = await getSubtasks(parentId, userId);

  return {
    subtask: updatedSubtask,
    progress,
  };
};

const deleteSubtask = async (parentId, subtaskId, userId) => {
  ensureTaskId(parentId);
  ensureTaskId(subtaskId);

  const existingSubtask = await prisma.task.findFirst({
    where: { id: subtaskId, parentId, userId },
  });

  if (!existingSubtask) {
    throw notFound();
  }

  await deleteTask(subtaskId, userId);
  const { progress } = await getSubtasks(parentId, userId);

  return {
    success: true,
    deletedSubtaskId: subtaskId,
    progress,
  };
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats,
  getSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
};
