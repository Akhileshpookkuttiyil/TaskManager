const notificationService = require("../services/notification.service");
const { sendSuccess } = require("../utils/response");

const getNotifications = async (req, res, next) => {
  try {
    const result = await notificationService.getNotifications(req.user._id, req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markNotificationRead(req.params.id, req.user._id);
    sendSuccess(res, { notification }, "Notification marked as read");
  } catch (error) {
    next(error);
  }
};

const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllNotificationsRead(req.user._id);
    sendSuccess(res, result, "Notifications marked as read");
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, markNotificationRead, markAllNotificationsRead };
