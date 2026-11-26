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

  let subtasksCount = 0;
  let completedSubtasksCount = 0;
  let subtasksProgress = null;
  let serializedSubtasks = undefined;

  if (Array.isArray(task.subtasks)) {
    const activeSubtasks = task.subtasks.filter((s) => s && s.status !== "archived");
    subtasksCount = activeSubtasks.length;
    completedSubtasksCount = activeSubtasks.filter((s) => s.status === "completed").length;
    subtasksProgress = subtasksCount > 0 ? {
      total: subtasksCount,
      completed: completedSubtasksCount,
      percent: Math.round((completedSubtasksCount / subtasksCount) * 100),
    } : null;

    if (task.subtasks.length > 0 && task.subtasks[0].title !== undefined) {
      serializedSubtasks = task.subtasks.map((s) => serializeTask(s));
    } else if (task.subtasks.length === 0) {
      serializedSubtasks = [];
    }
  }

  const serialized = toMongoId({
    ...task,
    description: task.description || "",
    status: LEGACY_TASK_STATUS[task.status] || task.status,
    parentId: task.parentId || null,
    dueDate,
    reminderDate: task.reminderDate || null,
    completedAt,
    archivedAt,
    tags: task.tags || [],
    isOverdue,
    subtasksCount,
    completedSubtasksCount,
    subtasksProgress,
  });

  if (serializedSubtasks !== undefined) {
    serialized.subtasks = serializedSubtasks;
  }

  if (Array.isArray(task.dependencies)) {
    serialized.dependencies = task.dependencies.map((d) => ({
      id: d.id,
      _id: d.id,
      taskId: d.taskId,
      prerequisiteId: d.prerequisiteId,
      createdAt: d.createdAt,
      prerequisite: d.prerequisite ? serializeTask(d.prerequisite) : undefined,
    }));
    serialized.isBlocked = task.dependencies.some(
      (d) => d.prerequisite && d.prerequisite.status !== "completed"
    );
  }

  if (Array.isArray(task.prerequisites)) {
    serialized.prerequisites = task.prerequisites.map((d) => ({
      id: d.id,
      _id: d.id,
      taskId: d.taskId,
      prerequisiteId: d.prerequisiteId,
      createdAt: d.createdAt,
      task: d.task ? serializeTask(d.task) : undefined,
    }));
  }

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

const serializeActivity = (activity) => {
  if (!activity) return null;

  const serialized = toMongoId({
    ...activity,
    taskId: activity.taskId || null,
  });

  if (activity.userId) {
    serialized.user = activity.userId;
  }

  return serialized;
};

module.exports = { serializeUser, serializeTask, serializeNotification, serializeActivity };
