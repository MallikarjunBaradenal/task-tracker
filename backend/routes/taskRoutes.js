const express = require("express");

/**
 * Creates task routes with controller and validation middleware
 */
function createTaskRoutes(taskController, updateValidationMiddleware) {
  const router = express.Router();

  // Public read routes
  router.get("/", taskController.listTasks);
  router.get("/history", taskController.history);
  router.get("/stats", taskController.stats);

  // Create task - always allowed (auto-generates for date range)
  router.post("/", taskController.create);

  // Update and Delete - protected by date validation middleware
  // Only tasks scheduled for TODAY can be updated or deleted
  router.put("/:id", updateValidationMiddleware, taskController.update);
  router.delete("/:id", updateValidationMiddleware, taskController.remove);

  return router;
}

module.exports = createTaskRoutes;

