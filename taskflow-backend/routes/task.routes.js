const express = require("express");
const router = express.Router();
const {
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
} = require("../controllers/task.controller");
const { protect } = require("../middleware/auth");
const {
  createTaskValidator,
  updateTaskValidator,
  createSubtaskValidator,
  updateSubtaskValidator,
  addDependencyValidator,
} = require("../validators/task.validator");
const { validate } = require("../middleware/validate");

// All task routes are protected
router.use(protect);

router.get("/stats", getStats);
router.get("/", getTasks);
router.get("/:id", getTask);
router.get("/:id/activities", getTaskActivities);
router.get("/:id/subtasks", getSubtasks);
router.post("/:id/subtasks", ...createSubtaskValidator, validate, createSubtask);
router.put("/:id/subtasks/:subtaskId", ...updateSubtaskValidator, validate, updateSubtask);
router.delete("/:id/subtasks/:subtaskId", deleteSubtask);

// Dependencies & Prerequisites
router.get("/:id/dependencies", getTaskDependencies);
router.get("/:id/prerequisites", getTaskDependencies);
router.post("/:id/dependencies", ...addDependencyValidator, validate, addTaskDependency);
router.post("/:id/prerequisites", ...addDependencyValidator, validate, addTaskDependency);
router.get("/:id/dependents", getTaskDependents);
router.delete("/:id/dependencies/:targetId", removeTaskDependency);
router.delete("/:id/prerequisites/:targetId", removeTaskDependency);

router.post("/", ...createTaskValidator, validate, createTask);
router.put("/:id", ...updateTaskValidator, validate, updateTask);
router.delete("/:id", deleteTask);

module.exports = router;
