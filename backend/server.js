require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { TaskService } = require("./services/taskService");
const createTaskController = require("./controllers/taskController");
const { createUpdateValidationMiddleware } = require("./controllers/taskController");
const createTaskRoutes = require("./routes/taskRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

async function startServer() {
  // Connect to database (MongoDB or JSON fallback)
  const isMongoEnabled = await connectDB();
  const taskService = new TaskService(isMongoEnabled);
  const taskController = createTaskController(taskService);
  const updateValidationMiddleware = createUpdateValidationMiddleware(taskService);

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, storage: isMongoEnabled ? "mongo" : "json" });
  });

  // Task routes with validation middleware
  app.use("/api/tasks", createTaskRoutes(taskController, updateValidationMiddleware));

  // Serve static frontend files
  const publicPath = path.join(__dirname, "..", "frontend", "public");
  app.use(express.static(publicPath));

  // Fallback to index.html for SPA routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  // Global error handler
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  });

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

