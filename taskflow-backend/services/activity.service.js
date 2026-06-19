const prisma = require("../config/prisma");
const { ACTIVITY_TYPE } = require("../constants");
const { serializeActivity } = require("../utils/serializers");

const toTitleCase = (value) => (value ? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "");

const buildActivityMessage = ({ type, taskTitle, from, to }) => {
  switch (type) {
    case ACTIVITY_TYPE.TASK_CREATED:
      return `Created task "${taskTitle}"`;
    case ACTIVITY_TYPE.TASK_UPDATED:
      return `Updated task "${taskTitle}"`;
    case ACTIVITY_TYPE.PRIORITY_CHANGED:
      return `Changed priority for "${taskTitle}" from ${toTitleCase(from)} to ${toTitleCase(to)}`;
    case ACTIVITY_TYPE.TASK_COMPLETED:
      return `Completed task "${taskTitle}"`;
    case ACTIVITY_TYPE.TASK_ARCHIVED:
      return `Archived task "${taskTitle}"`;
    default:
      return taskTitle ? `Updated "${taskTitle}"` : "Updated a task";
  }
};

const recordActivity = async ({ userId, taskId = null, type, taskTitle, from, to }) => {
  const message = buildActivityMessage({ type, taskTitle, from, to });

  const activity = await prisma.activity.create({
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

module.exports = { recordActivity, getRecentActivity };
