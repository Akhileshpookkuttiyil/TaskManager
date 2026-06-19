const express = require("express");
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, deleteTask, getStats } = require("../controllers/task.controller");
const { protect } = require("../middleware/auth");
const { taskValidator } = require("../validators/task.validator");
const { validate } = require("../middleware/validate");

// All task routes are protected
router.use(protect);

router.get("/stats", getStats);
router.get("/", getTasks);
router.get("/:id", getTask);
router.post("/", ...taskValidator, validate, createTask);
router.put("/:id", ...taskValidator, validate, updateTask);
router.delete("/:id", deleteTask);

module.exports = router;
