const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Task = require("../models/Task");

const storeFilePath = process.env.VERCEL
  ? path.join("/tmp", "tasks.json")
  : path.join(__dirname, "..", "data", "tasks.json");
const validTypes = ["do", "dont"];
const validStatuses = ["done", "not_done"];

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
function getTodayDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

/**
 * Generate all dates between fromDate and toDate (inclusive)
 * Returns array of YYYY-MM-DD strings
 */
function generateDateRange(fromDate, toDate) {
  const dates = [];
  const start = new Date(fromDate + "T00:00:00");
  const end = new Date(toDate + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

/**
 * Sanitize and validate task input from requests
 */
function sanitizeTaskInput(input = {}) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const type = input.type;
  const status = input.status;
  const date = input.date;
  const fromDate = input.fromDate;
  const toDate = input.toDate;
  const time = input.time;

  return { title, type, status, date, fromDate, toDate, time };
}

/**
 * Ensure JSON store file exists with seed data
 */
async function ensureJsonStore() {
  try {
    await fs.access(storeFilePath);
  } catch {
    const seed = [
      {
        id: uuidv4(),
        title: "Revise DBMS notes",
        type: "do",
        status: "not_done",
        date: getTodayDateString(),
        fromDate: getTodayDateString(),
        toDate: getTodayDateString(),
        time: "10:00",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: uuidv4(),
        title: "Skip all classes",
        type: "dont",
        status: "not_done",
        date: getTodayDateString(),
        fromDate: getTodayDateString(),
        toDate: getTodayDateString(),
        time: "14:00",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    await fs.writeFile(storeFilePath, JSON.stringify(seed, null, 2), "utf-8");
  }
}

/**
 * Read all tasks from JSON file
 */
async function readJsonTasks() {
  await ensureJsonStore();
  const raw = await fs.readFile(storeFilePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Write all tasks to JSON file
 */
async function writeJsonTasks(tasks) {
  await fs.writeFile(storeFilePath, JSON.stringify(tasks, null, 2), "utf-8");
}

/**
 * TaskService class handles all task operations
 * Supports both MongoDB and JSON file storage
 */
class TaskService {
  constructor(isMongoEnabled) {
    this.isMongoEnabled = isMongoEnabled;
  }

  /**
   * Get tasks with optional filters (date, type, status)
   */
  async getTasks(filters = {}) {
    const { date, type, status } = filters;

    if (this.isMongoEnabled) {
      const query = {};
      if (date) query.date = date;
      if (type) query.type = type;
      if (status) query.status = status;

      return Task.find(query).sort({ createdAt: -1 });
    }

    let tasks = await readJsonTasks();
    if (date) tasks = tasks.filter((t) => t.date === date);
    if (type) tasks = tasks.filter((t) => t.type === type);
    if (status) tasks = tasks.filter((t) => t.status === status);

    return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Get all tasks grouped by date for history view
   */
  async getHistory() {
    if (this.isMongoEnabled) {
      const grouped = await Task.aggregate([
        { $sort: { date: -1, createdAt: -1 } },
        {
          $group: {
            _id: "$date",
            tasks: {
              $push: {
                id: { $toString: "$_id" },
                title: "$title",
                type: "$type",
                status: "$status",
                date: "$date",
                time: "$time",
                createdAt: "$createdAt",
              },
            },
          },
        },
        { $project: { _id: 0, date: "$_id", tasks: 1 } },
      ]);
      return grouped;
    }

    const tasks = await readJsonTasks();
    const map = new Map();

    tasks.forEach((task) => {
      if (!map.has(task.date)) map.set(task.date, []);
      map.get(task.date).push(task);
    });

    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, dateTasks]) => ({ date, tasks: dateTasks }));
  }

  /**
   * Create one task (internal helper)
   */
  async _createSingleTask(taskData) {
    if (this.isMongoEnabled) {
      return Task.create(taskData);
    }

    const tasks = await readJsonTasks();
    const now = new Date().toISOString();
    const task = { id: uuidv4(), ...taskData, createdAt: now, updatedAt: now };
    tasks.unshift(task);
    await writeJsonTasks(tasks);
    return task;
  }

  /**
   * Create task(s) - auto-generates for date range if fromDate and toDate provided
   */
  async createTask(payload) {
    const { title, type, status, date, fromDate, toDate, time } = sanitizeTaskInput(payload);

    if (!title) throw new Error("Task title is required");
    if (!validTypes.includes(type)) throw new Error("Task type must be 'do' or 'dont'");

    // Determine date range
    const taskFromDate = fromDate || date || getTodayDateString();
    const taskToDate = toDate || taskFromDate;

    // Validate date range
    if (taskToDate < taskFromDate) {
      throw new Error("To date cannot be before from date");
    }

    // Generate dates in range
    const dates = generateDateRange(taskFromDate, taskToDate);

    const baseTaskData = {
      title,
      type,
      status: validStatuses.includes(status) ? status : "not_done",
      fromDate: taskFromDate,
      toDate: taskToDate,
      time: time || null,
    };

    // Create a task for each date in the range
    const createdTasks = [];
    for (const taskDate of dates) {
      const taskData = { ...baseTaskData, date: taskDate };
      const created = await this._createSingleTask(taskData);
      createdTasks.push(created);
    }

    return createdTasks;
  }

  /**
   * Update a task (only today's tasks allowed - validated in middleware)
   */
  async updateTask(id, payload) {
    const { title, type, status, time } = sanitizeTaskInput(payload);

    const updatePayload = {};
    if (title) updatePayload.title = title;
    if (type) {
      if (!validTypes.includes(type)) throw new Error("Invalid task type");
      updatePayload.type = type;
    }
    if (status) {
      if (!validStatuses.includes(status)) throw new Error("Invalid task status");
      updatePayload.status = status;
    }
    if (time !== undefined) updatePayload.time = time;
    updatePayload.updatedAt = new Date();

    if (this.isMongoEnabled) {
      const updated = await Task.findByIdAndUpdate(id, updatePayload, {
        new: true,
        runValidators: true,
      });
      if (!updated) throw new Error("Task not found");
      return updated;
    }

    const tasks = await readJsonTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Task not found");

    tasks[idx] = { ...tasks[idx], ...updatePayload, updatedAt: new Date().toISOString() };
    await writeJsonTasks(tasks);
    return tasks[idx];
  }

  /**
   * Delete a task
   */
  async deleteTask(id) {
    if (this.isMongoEnabled) {
      const deleted = await Task.findByIdAndDelete(id);
      if (!deleted) throw new Error("Task not found");
      return;
    }

    const tasks = await readJsonTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) throw new Error("Task not found");

    await writeJsonTasks(filtered);
  }

  /**
   * Get task by ID (for validation middleware)
   */
  async getTaskById(id) {
    if (this.isMongoEnabled) {
      return Task.findById(id);
    }

    const tasks = await readJsonTasks();
    return tasks.find((t) => t.id === id) || null;
  }

  /**
   * Get statistics - only done and not_done
   * completion = (done / total) * 100
   */
  async getStats() {
    const today = getTodayDateString();
    const tasks = await this.getTasks({ date: today });
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const notDone = tasks.filter((t) => t.status === "not_done").length;
    const completion = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, notDone, completion };
  }
}

module.exports = { TaskService, getTodayDateString, generateDateRange };

