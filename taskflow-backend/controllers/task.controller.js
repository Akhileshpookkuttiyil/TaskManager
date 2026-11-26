const taskService = require("../services/task.service");
const activityService = require("../services/activity.service");
const { sendSuccess } = require("../utils/response");

const getTasks = async (req, res, next) => {
  try {
    const result = await taskService.getTasks(req.user._id, req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user._id);
    sendSuccess(res, { task });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.user._id, req.body);
    sendSuccess(res, { task }, "Task created", 201);
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(req.params.id, req.user._id, req.body);
    sendSuccess(res, { task }, "Task updated");
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user._id);
    sendSuccess(res, null, "Task deleted");
  } catch (error) {
    next(error);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await taskService.getTaskStats(req.user._id);
    sendSuccess(res, { stats });
  } catch (error) {
    next(error);
  }
};

const getTaskActivities = async (req, res, next) => {
  try {
    const result = await activityService.getTaskActivities(req.params.id, req.user._id, req.query);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const getSubtasks = async (req, res, next) => {
  try {
    const result = await taskService.getSubtasks(req.params.id, req.user._id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const createSubtask = async (req, res, next) => {
  try {
    const result = await taskService.createSubtask(req.params.id, req.user._id, req.body);
    sendSuccess(res, result, "Subtask created", 201);
  } catch (error) {
    next(error);
  }
};

const updateSubtask = async (req, res, next) => {
  try {
    const result = await taskService.updateSubtask(req.params.id, req.params.subtaskId, req.user._id, req.body);
    sendSuccess(res, result, "Subtask updated");
  } catch (error) {
    next(error);
  }
};

const deleteSubtask = async (req, res, next) => {
  try {
    const result = await taskService.deleteSubtask(req.params.id, req.params.subtaskId, req.user._id);
    sendSuccess(res, result, "Subtask deleted");
  } catch (error) {
    next(error);
  }
};

const getTaskDependencies = async (req, res, next) => {
  try {
    const result = await taskService.getTaskDependencies(req.params.id, req.user._id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const getTaskDependents = async (req, res, next) => {
  try {
    const result = await taskService.getTaskDependents(req.params.id, req.user._id);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
};

const addTaskDependency = async (req, res, next) => {
  try {
    const result = await taskService.addTaskDependency(req.params.id, req.user._id, req.body);
    sendSuccess(res, result, "Dependency added", 201);
  } catch (error) {
    next(error);
  }
};

const removeTaskDependency = async (req, res, next) => {
  try {
    const targetId = req.params.dependencyId || req.params.targetId;
    const result = await taskService.removeTaskDependency(req.params.id, targetId, req.user._id);
    sendSuccess(res, result, "Dependency removed");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStats,
  getTaskActivities,
  getSubtasks,
  createSubtask,
  updateSubtask,
  deleteSubtask,
  getTaskDependencies,
  getTaskDependents,
  addTaskDependency,
  removeTaskDependency,
};
