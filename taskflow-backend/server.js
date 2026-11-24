const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const { errorHandler } = require("./middleware/errorHandler");

dotenv.config();

const app = express();

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://localhost:5000",
];

const configuredOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter((origin) => origin && origin !== "*");

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...configuredOrigins]));

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, health checks)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.trim().replace(/\/$/, "");
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // Disallow origins not in the explicit allowlist
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(helmet());
app.set("trust proxy", 1);

app.use(cors(corsOptions));

app.use(express.json({ limit: "10kb" }));

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api", limiter);

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/tasks", require("./routes/task.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/activities", require("./routes/activity.routes"));

app.get("/", (req, res) => res.json({ status: "TaskFlow API is running" }));

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT);
}

module.exports = app;
