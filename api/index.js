require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("../backend/config/db");
const { TaskService } = require("../backend/services/taskService");
const createTaskController = require("../backend/controllers/taskController");
const { createUpdateValidationMiddleware } = require("../backend/controllers/taskController");
const createTaskRoutes = require("../backend/routes/taskRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Lazy initialization - will be set up on first request
let taskController = null;
let updateValidationMiddleware = null;
let router = null;

async function ensureInitialized() {
  if (taskController) return;
  const isMongoEnabled = await connectDB();
  const taskService = new TaskService(isMongoEnabled);
  taskController = createTaskController(taskService);
  updateValidationMiddleware = createUpdateValidationMiddleware(taskService);
  router = createTaskRoutes(taskController, updateValidationMiddleware);
}

// Health check endpoint
app.get("/api/health", async (_req, res) => {
  await ensureInitialized();
  res.json({ ok: true, storage: "json" });
});

// Task routes - initialize on first request
app.use("/api/tasks", async (req, res, next) => {
  try {
    await ensureInitialized();
    router(req, res, next);
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

