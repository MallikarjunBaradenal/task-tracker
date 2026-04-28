const cron = require("node-cron");
const { PushService } = require("./pushService");

/**
 * SchedulerService runs a cron job to check tasks and send push notifications
 * Runs every minute to match task times
 *
 * IMPORTANT: This service only works with persistent servers (not serverless/Vercel).
 * For serverless, use an external cron service or scheduled function.
 */
class SchedulerService {
  constructor(taskService, pushService) {
    this.taskService = taskService;
    this.pushService = pushService;
    this.isRunning = false;
    this.sentNotifications = new Set(); // Track sent notifications to prevent duplicates
  }

  /**
   * Generate a unique key for a notification to prevent duplicates
   */
  generateNotificationKey(taskId, date, time) {
    return `${taskId}-${date}-${time}`;
  }

  /**
   * Check tasks and send notifications for those matching current time
   */
  async checkAndNotify() {
    const now = new Date();
    const todayDate = now.toISOString().split("T")[0];
    const currentHour = String(now.getHours()).padStart(2, "0");
    const currentMinute = String(now.getMinutes()).padStart(2, "0");
    const currentTime = `${currentHour}:${currentMinute}`;

    console.log(`[Scheduler] Checking tasks at ${todayDate} ${currentTime}`);

    try {
      // Get today's tasks that are not done and have a time set
      const tasks = await this.taskService.getTasks({
        date: todayDate,
        status: "not_done",
      });

      const tasksToNotify = tasks.filter((task) => {
        if (!task.time) return false;
        return task.time === currentTime;
      });

      if (tasksToNotify.length === 0) {
        console.log("[Scheduler] No tasks to notify at this time");
        return;
      }

      console.log(`[Scheduler] Found ${tasksToNotify.length} task(s) to notify`);

      for (const task of tasksToNotify) {
        const notificationKey = this.generateNotificationKey(task.id || task._id, todayDate, currentTime);

        // Skip if already sent in this session
        if (this.sentNotifications.has(notificationKey)) {
          console.log(`[Scheduler] Already sent notification for task: ${task.title}`);
          continue;
        }

        // Send notification
        await this.pushService.broadcastNotification({
          title: "Task Reminder",
          body: `Time to complete: ${task.title}`,
          tag: notificationKey,
          taskId: task.id || task._id,
          url: "/",
        });

        // Mark as sent
        this.sentNotifications.add(notificationKey);
        console.log(`[Scheduler] Notification sent for task: ${task.title}`);
      }
    } catch (error) {
      console.error("[Scheduler] Error checking tasks:", error.message);
    }
  }

  /**
   * Start the cron scheduler
   * Runs every minute
   */
  start() {
    if (this.isRunning) {
      console.log("[Scheduler] Already running");
      return;
    }

    console.log("[Scheduler] Starting task notification scheduler...");

    // Run every minute
    this.job = cron.schedule("* * * * *", async () => {
      await this.checkAndNotify();
    });

    this.isRunning = true;

    // Also run immediately on start
    this.checkAndNotify();
  }

  /**
   * Stop the cron scheduler
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      console.log("[Scheduler] Stopped");
    }
  }

  /**
   * Clear sent notifications cache (useful for testing)
   */
  clearCache() {
    this.sentNotifications.clear();
    console.log("[Scheduler] Notification cache cleared");
  }
}

module.exports = { SchedulerService };

