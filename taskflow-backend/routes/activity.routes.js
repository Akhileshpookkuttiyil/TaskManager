const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getRecentActivity } = require("../controllers/activity.controller");

router.use(protect);

router.get("/", getRecentActivity);

module.exports = router;
