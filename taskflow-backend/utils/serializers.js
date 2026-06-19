const { LEGACY_TASK_STATUS } = require("../constants");

const toMongoId = (record) => ({
  ...record,
  _id: record.id,
});

const serializeUser = (user) => {
  if (!user) return null;

  const { password, ...safeUser } = user;
  return toMongoId({
    ...safeUser,
    avatar: safeUser.avatar || "",
  });
};

const serializeTask = (task) => {
  if (!task) return null;

  const dueDate = task.dueDate || null;
  const completedAt = task.completedAt || null;
  const archivedAt = task.archivedAt || null;
  const isOverdue = Boolean(
    dueDate &&
      !completedAt &&
      !archivedAt &&
      new Date(dueDate).getTime() < Date.now() &&
      task.status !== "completed" &&
      task.status !== "archived"
  );

  const serialized = toMongoId({
    ...task,
    description: task.description || "",
    status: LEGACY_TASK_STATUS[task.status] || task.status,
    dueDate,
    reminderDate: task.reminderDate || null,
    completedAt,
    archivedAt,
    tags: task.tags || [],
    isOverdue,
  });

  if (task.userId) {
    serialized.user = task.userId;
  }

  return serialized;
};

const serializeNotification = (notification) => {
  if (!notification) return null;

  const serialized = toMongoId({
    ...notification,
    isRead: Boolean(notification.isRead),
    readAt: notification.readAt || null,
    taskId: notification.taskId || null,
  });

  if (notification.userId) {
    serialized.user = notification.userId;
  }

  return serialized;
};

module.exports = { serializeUser, serializeTask, serializeNotification };
