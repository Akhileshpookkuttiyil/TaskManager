const prisma = require("../config/prisma");
const { ACTIVITY_TYPE } = require("../constants");
const { serializeActivity } = require("../utils/serializers");

const toTitleCase = (value) => (value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "");
const formatDateTime = (value) =>
  value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "no due date";

const buildActivityMessage = ({ type, taskTitle, from, to }) => {
  switch (type) {
    case ACTIVITY_TYPE.TASK_CREATED:
      return `Created task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_UPDATED:
      return `Updated task '${taskTitle}'`;
    case ACTIVITY_TYPE.PRIORITY_CHANGED:
      return `Changed priority for task '${taskTitle}' from ${toTitleCase(from)} to ${toTitleCase(to)}`;
    case ACTIVITY_TYPE.DUE_DATE_CHANGED:
      return `Changed due date for task '${taskTitle}' from ${formatDateTime(from)} to ${formatDateTime(to)}`;
    case ACTIVITY_TYPE.TASK_COMPLETED:
      return `Completed task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_ARCHIVED:
      return `Archived task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_RESTORED:
      return `Restored task '${taskTitle}'`;
    case ACTIVITY_TYPE.TASK_DELETED:
      return `Deleted task '${taskTitle}'`;
    default:
      return taskTitle ? `Updated task '${taskTitle}'` : "Updated a task";
  }
};

const recordActivity = async ({ client = prisma, userId, taskId = null, type, taskTitle, from, to }) => {
  const message = buildActivityMessage({ type, taskTitle, from, to });

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

module.exports = { recordActivity, getRecentActivity, buildActivityMessage };
