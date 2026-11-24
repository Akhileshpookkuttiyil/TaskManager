const prisma = require("../config/prisma");
const { ACTIVITY_TYPE } = require("../constants");
const { serializeActivity } = require("../utils/serializers");

const toTitleCase = (value) => (value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "");
const formatDateTime = (value, timeZone) => {
  if (!value) return "no due date";

  const options = {
    dateStyle: "medium",
    timeStyle: "short",
  };

  if (timeZone) {
    options.timeZone = timeZone;
  }

  return new Intl.DateTimeFormat("en-US", options).format(new Date(value));
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const formatTags = (tags) => {
  if (Array.isArray(tags) && tags.length > 0) {
    return tags.join(", ");
  }
  return "no tags";
};

const buildActivityMessage = ({ type, taskTitle, from, to, timeZone, customMessage }) => {
  if (customMessage) return customMessage;

  switch (type) {
    case ACTIVITY_TYPE.TASK_CREATED:
      return `Created task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_UPDATED:
      return `Updated task '${taskTitle}'`;
    case ACTIVITY_TYPE.TITLE_CHANGED:
      return `Changed title from '${from}' to '${to}'`;
    case ACTIVITY_TYPE.DESCRIPTION_CHANGED:
      return `Updated description for task '${taskTitle}'`;
    case ACTIVITY_TYPE.STATUS_CHANGED:
      return `Changed status for task '${taskTitle}' from ${toTitleCase(from)} to ${toTitleCase(to)}`;
    case ACTIVITY_TYPE.PRIORITY_CHANGED:
      return `Changed priority for task '${taskTitle}' from ${toTitleCase(from)} to ${toTitleCase(to)}`;
    case ACTIVITY_TYPE.DUE_DATE_CHANGED:
      return `Changed due date for task '${taskTitle}' from ${formatDateTime(from, timeZone)} to ${formatDateTime(to, timeZone)}`;
    case ACTIVITY_TYPE.TAGS_CHANGED:
      return `Updated tags for task '${taskTitle}' from [${formatTags(from)}] to [${formatTags(to)}]`;
    case ACTIVITY_TYPE.TASK_COMPLETED:
      return `Completed task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_ARCHIVED:
      return `Archived task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_RESTORED:
      return `Restored task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_DELETED:
      return `Deleted task '${taskTitle}'`;
    case ACTIVITY_TYPE.SUBTASK_CREATED:
      return `Added subtask '${to || taskTitle}'`;
    case ACTIVITY_TYPE.SUBTASK_COMPLETED:
      return `Completed subtask '${to || taskTitle}'`;
    case ACTIVITY_TYPE.SUBTASK_REOPENED:
      return `Reopened subtask '${to || taskTitle}'`;
    case ACTIVITY_TYPE.SUBTASK_UPDATED:
      return from && to ? `Updated subtask from '${from}' to '${to}'` : `Updated subtask '${to || taskTitle}'`;
    case ACTIVITY_TYPE.SUBTASK_DELETED:
      return `Deleted subtask '${to || taskTitle}'`;
    default:
      return taskTitle ? `Updated task '${taskTitle}'` : "Updated a task";
  }
};

const recordActivity = async ({ client = prisma, userId, taskId = null, type, taskTitle, from, to, timeZone, customMessage }) => {
  const message = buildActivityMessage({ type, taskTitle, from, to, timeZone, customMessage });

  const activity = await client.activity.create({
    data: {
      userId,
      taskId,
      type,
      message,
    },
  });

  return serializeActivity(activity);
};

const getRecentActivity = async (userId, limit = 8) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 8, 1), 20);

  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  return activities.map(serializeActivity);
};

const getTaskActivities = async (taskId, userId, queryParams = {}) => {
  if (!taskId || !UUID_PATTERN.test(taskId)) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  // Ensure task exists and belongs to the authenticated user
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      userId,
    },
    select: { id: true },
  });

  if (!task) {
    const error = new Error("Task not found");
    error.statusCode = 404;
    throw error;
  }

  const isAll = queryParams.all === "true" || queryParams.all === true;
  const page = Math.max(Number(queryParams.page) || 1, 1);
  const limit = isAll ? 500 : Math.min(Math.max(Number(queryParams.limit) || 50, 1), 100);
  const skip = (page - 1) * limit;

  const where = {
    taskId,
    userId,
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: isAll ? undefined : skip,
      take: isAll ? undefined : limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities: activities.map(serializeActivity),
    pagination: {
      total,
      page: isAll ? 1 : page,
      pages: isAll ? 1 : Math.ceil(total / limit),
      limit: isAll ? total : limit,
    },
  };
};

module.exports = { recordActivity, getRecentActivity, getTaskActivities, buildActivityMessage };
