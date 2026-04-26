const { getTodayDateString } = require("../services/taskService");

/**
 * Factory function that creates task controller with injected taskService
 */
function createTaskController(taskService) {
  return {
    /**
     * List tasks with optional filters
     */
    async listTasks(req, res) {
      try {
        const tasks = await taskService.getTasks(req.query);
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },

    /**
     * Get task history grouped by date
     */
    async history(req, res) {
      try {
        const history = await taskService.getHistory();
        res.json(history);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },

    /**
     * Get statistics
     */
    async stats(_req, res) {
      try {
        const stats = await taskService.getStats();
        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },

    /**
     * Create task(s) - auto-generates for date range if fromDate and toDate provided
     */
    async create(req, res) {
      try {
        const tasks = await taskService.createTask(req.body);
        res.status(201).json(tasks);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    },

    /**
     * Update a task (only today's tasks allowed - validated by middleware)
     */
    async update(req, res) {
      try {
        const task = await taskService.updateTask(req.params.id, req.body);
        res.json(task);
      } catch (error) {
        const status = error.message === "Task not found" ? 404 : 400;
        res.status(status).json({ message: error.message });
      }
    },

    /**
     * Delete a task
     */
    async remove(req, res) {
      try {
        await taskService.deleteTask(req.params.id);
        res.status(204).send();
      } catch (error) {
        const status = error.message === "Task not found" ? 404 : 400;
        res.status(status).json({ message: error.message });
      }
    },
  };
}

/**
 * Middleware to validate that task being updated is scheduled for today
 * Only today's tasks can be edited/deleted
 */
function createUpdateValidationMiddleware(taskService) {
  return async function validateTodayTask(req, res, next) {
    try {
      const taskId = req.params.id;
      const task = await taskService.getTaskById(taskId);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const today = getTodayDateString();

      // Only today's tasks can be updated or deleted
      if (task.date !== today) {
        return res.status(403).json({
          message: "Task can only be updated on its scheduled date",
          taskDate: task.date,
          today,
        });
      }

      req.task = task;
      next();
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
}

module.exports = createTaskController;
module.exports.createUpdateValidationMiddleware = createUpdateValidationMiddleware;

