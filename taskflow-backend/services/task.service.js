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
const RECURRING_GENERATION_LIMIT = 3;
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

const buildRecurringTaskPayload = (template, dueDate) => {
  const templateDueDate = template.dueDate ? new Date(template.dueDate) : null;
  const reminderOffset = template.reminderDate && templateDueDate ? new Date(template.reminderDate).getTime() - templateDueDate.getTime() : null;
  const reminderDate = reminderOffset !== null ? new Date(dueDate.getTime() + reminderOffset) : null;

  return {
    title: template.title,
    description: template.description,
    status: TASK_STATUS.PENDING,
    priority: template.priority,
    recurrence: template.recurrence,
    recurrenceParentId: template.id,
    recurrenceKey: `${template.id}:${dueDate.toISOString()}`,
    dueDate,
    reminderDate,
    completedAt: null,
    archivedAt: null,
    tags: template.tags || [],
    userId: template.userId,
  };
};

const syncRecurringTasks = async (userId) => {
  const templates = await prisma.task.findMany({
    where: {
      userId,
      recurrence: { not: TASK_RECURRENCE.NONE },
      recurrenceParentId: null,
      dueDate: { not: null },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priority: true,
      recurrence: true,
      dueDate: true,
      reminderDate: true,
      tags: true,
      userId: true,
    },
  });

  const now = new Date();
  const tasks = [];

  templates.forEach((template) => {
    const startDate = new Date(template.dueDate);

    for (let step = 1; step <= RECURRING_GENERATION_LIMIT; step += 1) {
      const dueDate = getNextRecurrenceDate(startDate, template.recurrence, step);
      if (!dueDate || dueDate <= now) continue;

      tasks.push(
        prisma.task.upsert({
          where: { recurrenceKey: `${template.id}:${dueDate.toISOString()}` },
          create: buildRecurringTaskPayload(template, dueDate),
          update: {},
        })
      );
    }
  });

  await Promise.all(tasks);
};

const buildTaskWhere = (userId, { status, priority, search, view, dueDate }) => {
  const where = { userId };
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
    filters.push({
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ],
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
  if (data.dueDate !== undefined) taskData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.reminderDate !== undefined) taskData.reminderDate = data.reminderDate ? new Date(data.reminderDate) : null;
  if (data.tags !== undefined) taskData.tags = data.tags;

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

  return {
    status: normalizedStatus,
    completedAt: normalizedStatus === TASK_STATUS.COMPLETED ? existingTask?.completedAt || now : null,
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
  await syncRecurringTasks(userId);
  const where = buildTaskWhere(userId, queryParams);
  const { page, limit, skip } = getPagination(queryParams);
  const orderBy = getOrderBy(queryParams);

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
  });

  if (!task) {
    throw notFound();
  }

  return serializeTask(task);
};

const createTask = async (userId, data) => {
  const taskData = getTaskData(data);
  const task = await prisma.task.create({
    data: {
      ...taskData,
      ...getLifecycleData(null, taskData),
      userId,
    },
  });

  await syncTaskNotifications(userId);
  await syncRecurringTasks(userId);
  await recordActivity({
    userId,
    taskId: task.id,
    type: ACTIVITY_TYPE.TASK_CREATED,
    taskTitle: task.title,
  });
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
  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...taskData,
      ...getLifecycleData(existingTask, taskData),
    },
  });

  await syncTaskNotifications(userId);
  await syncRecurringTasks(userId);
  if (hasMeaningfulTaskUpdate(existingTask, taskData)) {
    await recordActivity({
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.TASK_UPDATED,
      taskTitle: task.title,
    });
  }
  if (hasPriorityChanged(existingTask, taskData)) {
    await recordActivity({
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.PRIORITY_CHANGED,
      taskTitle: task.title,
      from: existingTask.priority,
      to: task.priority,
    });
  }
  if (hasDueDateChanged(existingTask, taskData)) {
    await recordActivity({
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.DUE_DATE_CHANGED,
      taskTitle: task.title,
      from: existingTask.dueDate,
      to: task.dueDate,
    });
  }
  if (hasCompletedStatusChange(existingTask, taskData)) {
    await recordActivity({
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.TASK_COMPLETED,
      taskTitle: task.title,
    });
  }
  if (hasArchivedStatusChange(existingTask, taskData)) {
    await recordActivity({
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.TASK_ARCHIVED,
      taskTitle: task.title,
    });
  }
  if (hasRestoredStatusChange(existingTask, taskData)) {
    await recordActivity({
      userId,
      taskId: task.id,
      type: ACTIVITY_TYPE.TASK_RESTORED,
      taskTitle: task.title,
    });
  }
  await recordTaskCompletion(userId, task);
  return serializeTask(task);
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

  await deleteTaskNotifications(userId, taskId);
  await prisma.$transaction(async (tx) => {
    await tx.task.deleteMany({
      where: {
        userId,
        recurrenceParentId: taskId,
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
  await syncTaskNotifications(userId);
  await syncRecurringTasks(userId);
  const tasks = await prisma.task.findMany({
    where: { userId },
    select: {
      status: true,
      dueDate: true,
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
  };
  const now = new Date();
  const { start: todayStart, end: todayEnd } = getDayBounds(now);

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

    result.total += 1;
  });

  return result;
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };
