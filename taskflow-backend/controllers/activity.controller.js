const activityService = require("../services/activity.service");
const { sendSuccess } = require("../utils/response");

const getRecentActivity = async (req, res, next) => {
  try {
    const activities = await activityService.getRecentActivity(req.user._id, req.query.limit);
    sendSuccess(res, { activities });
  } catch (error) {
    next(error);
  }
};

module.exports = { getRecentActivity };
