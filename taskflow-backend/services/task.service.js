const prisma = require("../config/prisma");
const { TASK_PRIORITY, TASK_STATUS } = require("../constants");
const { serializeTask } = require("../utils/serializers");

const SORTABLE_FIELDS = ["createdAt", "updatedAt", "dueDate", "title", "status", "priority"];
const MAX_PAGE_SIZE = 50;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildTaskWhere = (userId, { status, priority, search }) => {
  const where = { userId };

  if (Object.values(TASK_STATUS).includes(status)) {
    where.status = status;
  }

  if (Object.values(TASK_PRIORITY).includes(priority)) {
    where.priority = priority;
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
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
  if (data.status !== undefined) taskData.status = data.status;
  if (data.priority !== undefined) taskData.priority = data.priority;
  if (data.dueDate !== undefined) taskData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.tags !== undefined) taskData.tags = data.tags;

  return taskData;
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
  const task = await prisma.task.create({
    data: {
      ...getTaskData(data),
      userId,
    },
  });

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

  const task = await prisma.task.update({
    where: { id: taskId },
    data: getTaskData(data),
  });

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

  await prisma.task.delete({ where: { id: taskId } });
  return serializeTask(task);
};

const getTaskStats = async (userId) => {
  const stats = await prisma.task.groupBy({
    by: ["status"],
    where: { userId },
    _count: {
      status: true,
    },
  });

  const result = { todo: 0, in_progress: 0, done: 0, total: 0 };

  stats.forEach(({ status, _count }) => {
    result[status] = _count.status;
    result.total += _count.status;
  });

  return result;
};

module.exports = { getTasks, getTaskById, createTask, updateTask, deleteTask, getTaskStats };
