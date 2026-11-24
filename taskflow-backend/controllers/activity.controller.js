const activityService = require("../services/activity.service");
const { sendSuccess } = require("../utils/response");

const getRecentActivity = async (req, res, next) => {
  try {
    if (req.query.taskId) {
      const result = await activityService.getTaskActivities(req.query.taskId, req.user._id, req.query);
      return sendSuccess(res, result);
    }

    const activities = await activityService.getRecentActivity(req.user._id, req.query.limit);
    sendSuccess(res, { activities });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRecentActivity };
