const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getNotifications, markNotificationRead, markAllNotificationsRead } = require("../controllers/notification.controller");

router.use(protect);

router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
