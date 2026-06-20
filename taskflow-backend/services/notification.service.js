const prisma = require("../config/prisma");
const { NOTIFICATION_TYPE, TASK_STATUS } = require("../constants");
const { serializeNotification } = require("../utils/serializers");

const TASK_DUE_NOTIFICATION_TYPES = [
  NOTIFICATION_TYPE.TASK_REMINDER,
  NOTIFICATION_TYPE.DUE_SOON,
  NOTIFICATION_TYPE.DUE_TODAY,
  NOTIFICATION_TYPE.OVERDUE,
];

const MAX_LIMIT = 50;

const getDayDiffMs = (hours) => hours * 60 * 60 * 1000;

const isActiveTask = (task) => task.status !== TASK_STATUS.COMPLETED && task.status !== TASK_STATUS.ARCHIVED;

const getDueNotificationType = (task, now = new Date()) => {
  if (!task.dueDate) return null;

  const dueDate = new Date(task.dueDate);
  if (Number.isNaN(dueDate.getTime())) return null;

  if (!isActiveTask(task)) {
    return null;
  }

  if (dueDate.getTime() < now.getTime()) {
    return NOTIFICATION_TYPE.OVERDUE;
  }

  const diffMs = dueDate.getTime() - now.getTime();
  if (diffMs <= getDayDiffMs(1)) {
    return NOTIFICATION_TYPE.DUE_SOON;
  }

  if (diffMs <= getDayDiffMs(24)) {
    return NOTIFICATION_TYPE.DUE_TODAY;
  }

  return null;
};

const getReminderNotificationType = (task, now = new Date()) => {
  if (!task.reminderDate) return null;

  const reminderDate = new Date(task.reminderDate);
  if (Number.isNaN(reminderDate.getTime())) return null;

  if (!isActiveTask(task)) {
    return null;
  }

  if (reminderDate.getTime() > now.getTime()) {
    return null;
  }

  return NOTIFICATION_TYPE.TASK_REMINDER;
};

const buildNotificationContent = (task, type) => {
  const titleBase = task.title || "Task";

  switch (type) {
    case NOTIFICATION_TYPE.TASK_REMINDER:
      return {
        title: `${titleBase} reminder`,
        message: "Your reminder time has arrived.",
      };
    case NOTIFICATION_TYPE.DUE_SOON:
      return {
        title: `${titleBase} is due soon`,
        message: "This task needs attention within the next hour.",
      };
    case NOTIFICATION_TYPE.DUE_TODAY:
      return {
        title: `${titleBase} is due today`,
        message: "Keep it on your radar for later today.",
      };
    case NOTIFICATION_TYPE.OVERDUE:
      return {
        title: `${titleBase} is overdue`,
        message: "The due date has passed and the task still needs attention.",
      };
    case NOTIFICATION_TYPE.TASK_COMPLETED:
      return {
        title: `${titleBase} completed`,
        message: "Nice work. This task was marked complete.",
      };
    case NOTIFICATION_TYPE.RECURRING_TASK_GENERATED:
      return {
        title: `${titleBase} generated`,
        message: "A new recurring task has been created for you.",
      };
    case NOTIFICATION_TYPE.STREAK_MILESTONE:
      return {
        title: "Streak milestone reached",
        message: "You just hit a new productivity streak milestone.",
      };
    default:
      return {
        title: "Task update",
        message: "A task status changed.",
      };
  }
};

const upsertNotification = async ({ userId, taskId = null, type, dedupeKey, title, message }) =>
  prisma.notification.upsert({
    where: { dedupeKey },
    create: {
      userId,
      taskId,
      type,
      dedupeKey,
      title,
      message,
    },
    update: {
      title,
      message,
      taskId,
      type,
    },
  });

const syncTaskNotifications = async (userId) => {
  const tasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      dueDate: true,
      reminderDate: true,
      status: true,
      completedAt: true,
      archivedAt: true,
    },
  });

  const operations = tasks.flatMap((task) => {
    const reminderType = getReminderNotificationType(task);
    const dueType = getDueNotificationType(task);
    const activeTypes = [reminderType, dueType].filter(Boolean);
    const dueDeleteFilter = {
      userId,
      taskId: task.id,
      type: { in: TASK_DUE_NOTIFICATION_TYPES.filter((type) => !activeTypes.includes(type)) },
    };

    const taskOps = [
      prisma.notification.deleteMany({
        where: dueDeleteFilter,
      }),
    ];

    if (reminderType) {
      const { title, message } = buildNotificationContent(task, reminderType);
      taskOps.push(
        upsertNotification({
          userId,
          taskId: task.id,
          type: reminderType,
          dedupeKey: `task:${task.id}:reminder:${new Date(task.reminderDate).getTime()}`,
          title,
          message,
        })
      );
    }

    if (dueType) {
      const { title, message } = buildNotificationContent(task, dueType);
      taskOps.push(
        upsertNotification({
          userId,
          taskId: task.id,
          type: dueType,
          dedupeKey: `task:${task.id}:${dueType}`,
          title,
          message,
        })
      );
    }

    return taskOps;
  });

  await Promise.all(operations);
};

const recordTaskCompletion = async (userId, task) => {
  if (task.status !== TASK_STATUS.COMPLETED || !task.completedAt) return null;

  const completedStamp = new Date(task.completedAt).getTime();
  const { title, message } = buildNotificationContent(task, NOTIFICATION_TYPE.TASK_COMPLETED);

  return upsertNotification({
    userId,
    taskId: task.id,
    type: NOTIFICATION_TYPE.TASK_COMPLETED,
    dedupeKey: `task:${task.id}:completed:${completedStamp}`,
    title,
    message,
  });
};

const deleteTaskNotifications = async (userId, taskId) =>
  prisma.notification.deleteMany({
    where: {
      userId,
      taskId,
    },
  });

const getNotifications = async (userId, { unreadOnly = false, limit = 20 } = {}) => {
  await syncTaskNotifications(userId);

  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), MAX_LIMIT);
  const where = { userId };

  if (unreadOnly === true || unreadOnly === "true") {
    where.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: safeLimit,
    }),
    prisma.notification.count({
      where: { userId, isRead: false },
    }),
  ]);

  return {
    notifications: notifications.map(serializeNotification),
    unreadCount,
  };
};

const markNotificationRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) {
    const error = new Error("Notification not found");
    error.statusCode = 404;
    throw error;
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: notification.readAt || new Date(),
    },
  });

  return serializeNotification(updated);
};

const markAllNotificationsRead = async (userId) => {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return getNotifications(userId);
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  syncTaskNotifications,
  recordTaskCompletion,
  deleteTaskNotifications,
  getDueNotificationType,
  getReminderNotificationType,
  buildNotificationContent,
};
