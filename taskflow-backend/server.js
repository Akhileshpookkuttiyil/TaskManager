const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const { errorHandler } = require("./middleware/errorHandler");

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS — in production, replace * with your frontend domain
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));

// Body parser
app.use(express.json({ limit: "10kb" }));

// Request logging (dev only)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api", limiter);

// Routes
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/tasks", require("./routes/task.routes"));

// Health check
app.get("/", (req, res) => res.json({ status: "TaskFlow API is running" }));

// 404 handler
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// Centralized error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
