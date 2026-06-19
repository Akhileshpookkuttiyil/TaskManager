const taskService = require("../services/task.service");
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

module.exports = { getTasks, getTask, createTask, updateTask, deleteTask, getStats };
