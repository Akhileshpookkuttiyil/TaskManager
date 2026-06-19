const prisma = require("../config/prisma");
const { TASK_PRIORITY, TASK_STATUS, LEGACY_TASK_STATUS } = require("../constants");
const { serializeTask } = require("../utils/serializers");
const {
  syncTaskNotifications,
  recordTaskCompletion,
  deleteTaskNotifications,
} = require("./notification.service");

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

const normalizeStatus = (status) => LEGACY_TASK_STATUS[status] || status;

const normalizeStatusFilter = (status) => {
  const normalized = normalizeStatus(status);
  return VALID_STATUSES.includes(normalized) ? normalized : null;
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
  if (data.dueDate !== undefined) taskData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.reminderDate !== undefined) taskData.reminderDate = data.reminderDate ? new Date(data.reminderDate) : null;
  if (data.tags !== undefined) taskData.tags = data.tags;

  return taskData;
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
  await prisma.task.delete({ where: { id: taskId } });
  return serializeTask(task);
};

const getTaskStats = async (userId) => {
  await syncTaskNotifications(userId);
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

    if (dueDate && dueDate >= todayStart && dueDate <= todayEnd) {
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
