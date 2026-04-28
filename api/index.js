require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("../backend/config/db");
const { TaskService } = require("../backend/services/taskService");
const { PushService } = require("../backend/services/pushService");
const createTaskController = require("../backend/controllers/taskController");
const { createUpdateValidationMiddleware } = require("../backend/controllers/taskController");
const createTaskRoutes = require("../backend/routes/taskRoutes");
const createPushController = require("../backend/controllers/pushController");
const createPushRoutes = require("../backend/routes/pushRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Lazy initialization - will be set up on first request
let taskController = null;
let updateValidationMiddleware = null;
let taskRouter = null;
let pushController = null;
let pushRouter = null;
let isMongoEnabled = false;

async function ensureInitialized() {
  if (taskController) return isMongoEnabled;
  isMongoEnabled = await connectDB();
  const taskService = new TaskService(isMongoEnabled);
  taskController = createTaskController(taskService);
  updateValidationMiddleware = createUpdateValidationMiddleware(taskService);
  taskRouter = createTaskRoutes(taskController, updateValidationMiddleware);

  // Initialize push notification service
  const pushService = new PushService(isMongoEnabled);
  pushController = createPushController(pushService);
  pushRouter = createPushRoutes(pushController);
}

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  await ensureInitialized();
  res.json({ ok: true, storage: isMongoEnabled ? "mongo" : "json" });
});

// Task routes - initialize on first request
app.use("/api/tasks", async (req, res, next) => {
  try {
    await ensureInitialized();
    taskRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Push notification routes - initialize on first request
app.use("/api", async (req, res, next) => {
  try {
    await ensureInitialized();
    pushRouter(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
