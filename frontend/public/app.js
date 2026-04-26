/**
 * Daily Task Tracker - Frontend Logic
 * Features: Tab navigation, checkbox completion, date range tasks,
 *           today-only stats, dark mode, loading states
 */

const apiBase = "/api/tasks";

// DOM Elements
const todayDateEl = document.getElementById("todayDate");
const taskInput = document.getElementById("taskInput");
const typeInput = document.getElementById("typeInput");
const fromDateInput = document.getElementById("fromDateInput");
const toDateInput = document.getElementById("toDateInput");
const timeInput = document.getElementById("timeInput");
const addTaskBtn = document.getElementById("addTaskBtn");

// Tab elements
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

// Section lists
const todayDoList = document.getElementById("todayDoList");
const todayDontList = document.getElementById("todayDontList");
const futureDoList = document.getElementById("futureDoList");
const futureDontList = document.getElementById("futureDontList");

const historyList = document.getElementById("historyList");
const refreshBtn = document.getElementById("refreshBtn");
const themeToggle = document.getElementById("themeToggle");
const notifToggle = document.getElementById("notifToggle");
const loadingOverlay = document.getElementById("loadingOverlay");
const studentNameEl = document.getElementById("studentName");

// Stats elements
const statTotal = document.getElementById("statTotal");
const statDone = document.getElementById("statDone");
const statNotDone = document.getElementById("statNotDone");
const statCompletion = document.getElementById("statCompletion");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

// Cache all tasks
let allTasks = [];
let isLoading = false;

/**
 * Get today's date as YYYY-MM-DD in local timezone
 */
function getTodayDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

/**
 * Format date string for display
 */
function prettyDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format time for display (12-hour format)
 */
function prettyTime(timeStr) {
  if (!timeStr) return "";
  const [hours, minutes] = timeStr.split(":");
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

/**
 * Show/hide loading overlay and disable buttons
 */
function setLoading(loading) {
  isLoading = loading;
  if (loading) {
    loadingOverlay.classList.remove("hidden");
    addTaskBtn.disabled = true;
    refreshBtn.disabled = true;
  } else {
    loadingOverlay.classList.add("hidden");
    addTaskBtn.disabled = false;
    refreshBtn.disabled = false;
  }
}

/**
 * Save current scroll position
 */
function saveScroll() {
  sessionStorage.setItem("task-tracker-scroll", window.scrollY.toString());
}

/**
 * Restore saved scroll position
 */
function restoreScroll() {
  const scrollY = sessionStorage.getItem("task-tracker-scroll");
  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY, 10));
    sessionStorage.removeItem("task-tracker-scroll");
  }
}

/**
 * API helper with loading state management
 */
async function api(path = "", options = {}) {
  setLoading(true);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.message || "Request failed");
    }

    if (response.status === 204) return null;
    return response.json();
  } finally {
    setLoading(false);
  }
}

/**
 * Get status badge text
 */
function statusBadge(status) {
  const map = {
    done: "✔ Done",
    not_done: "✖ Not Done",
  };
  return map[status] || status;
}

/**
 * Determine if a task can be edited based on its date
 */
function getTaskDateStatus(taskDate) {
  const today = getTodayDateString();
  if (taskDate === today) return "today";
  if (taskDate < today) return "past";
  return "future";
}

/**
 * Create a task element based on its date status
 * Today: checkbox (enabled) + edit/delete buttons
 * Past: checkbox (disabled, read-only)
 * Future: locked badge, no controls
 */
function createTaskElement(task) {
  const dateStatus = getTaskDateStatus(task.date);
  const isDone = task.status === "done";
  const li = document.createElement("li");
  li.className = isDone ? "task-item done" : "task-item";

  const timeDisplay = task.time ? `⏰ ${prettyTime(task.time)}` : "";

  // Build task content based on date status
  let actionsHTML = "";

  if (dateStatus === "past") {
    // PAST: Checkbox (disabled, read-only)
    actionsHTML = `
      <label class="checkbox-wrapper disabled">
        <input type="checkbox" ${isDone ? "checked" : ""} disabled />
        <span>${isDone ? "Done" : "Not Done"}</span>
      </label>
    `;
  } else {
    // TODAY & FUTURE: Checkbox (enabled) + edit + delete
    actionsHTML = `
      <label class="checkbox-wrapper">
        <input data-action="toggle" data-id="${task.id}" type="checkbox" ${isDone ? "checked" : ""} />
        <span>Mark as Done</span>
      </label>
      <button data-action="edit" data-id="${task.id}" class="icon-btn">Edit</button>
      <button data-action="delete" data-id="${task.id}" class="icon-btn">Delete</button>
    `;
  }

  li.innerHTML = `
    <div class="task-header">
      <span class="task-title">${task.title}</span>
      ${dateStatus !== "today" ? `<span class="badge ${task.status}">${statusBadge(task.status)}</span>` : ""}
    </div>
    <div class="task-meta">
      <span>📅 ${prettyDate(task.date)}</span>
      ${timeDisplay ? `<span>${timeDisplay}</span>` : ""}
    </div>
    <div class="task-actions">
      ${actionsHTML}
    </div>
  `;

  return li;
}

/**
 * Render empty state message
 */
function renderEmptyState(container, message) {
  container.innerHTML = `<li class="empty-state">${message}</li>`;
}

/**
 * Load all tasks into cache
 */
async function loadAllTasks() {
  allTasks = await api("");
}

/**
 * Render today's tasks
 */
function renderTodayTasks() {
  const today = getTodayDateString();
  const todayTasks = allTasks.filter((t) => t.date === today);

  const doTasks = todayTasks.filter((t) => t.type === "do");
  const dontTasks = todayTasks.filter((t) => t.type === "dont");

  todayDoList.innerHTML = "";
  todayDontList.innerHTML = "";

  if (doTasks.length === 0) {
    renderEmptyState(todayDoList, "No Do tasks for today. Add one above!");
  } else {
    doTasks.forEach((task) => todayDoList.appendChild(createTaskElement(task)));
  }

  if (dontTasks.length === 0) {
    renderEmptyState(todayDontList, "No Don't tasks for today. Add one above!");
  } else {
    dontTasks.forEach((task) => todayDontList.appendChild(createTaskElement(task)));
  }
}

/**
 * Render future tasks
 */
function renderFutureTasks() {
  const today = getTodayDateString();
  const futureTasks = allTasks.filter((t) => t.date > today);

  const doTasks = futureTasks.filter((t) => t.type === "do");
  const dontTasks = futureTasks.filter((t) => t.type === "dont");

  futureDoList.innerHTML = "";
  futureDontList.innerHTML = "";

  if (doTasks.length === 0) {
    renderEmptyState(futureDoList, "No future Do tasks.");
  } else {
    doTasks.forEach((task) => futureDoList.appendChild(createTaskElement(task)));
  }

  if (dontTasks.length === 0) {
    renderEmptyState(futureDontList, "No future Don't tasks.");
  } else {
    dontTasks.forEach((task) => futureDontList.appendChild(createTaskElement(task)));
  }
}

/**
 * Load and display history (past tasks grouped by date)
 */
async function loadHistory() {
  const history = await api("/history");
  historyList.innerHTML = "";

  const today = getTodayDateString();

  // Filter to only show past dates (not today, not future)
  const pastHistory = history.filter((entry) => entry.date < today);

  if (pastHistory.length === 0) {
    historyList.innerHTML = "<p class='empty-state'>No history yet. Complete some tasks!</p>";
    return;
  }

  pastHistory.slice(0, 10).forEach((entry) => {
    const wrapper = document.createElement("div");
    wrapper.className = "history-item";

    const lines = entry.tasks
      .map(
        (t) =>
          `<div class="history-task">${t.type === "do" ? "✅" : "❌"} ${t.title} — ${statusBadge(
            t.status
          )}${t.time ? ` ⏰ ${prettyTime(t.time)}` : ""}</div>`
      )
      .join("");

    wrapper.innerHTML = `
      <div class="history-date">${prettyDate(entry.date)}</div>
      ${lines}
    `;

    historyList.appendChild(wrapper);
  });
}

/**
 * Load and display statistics (TODAY ONLY)
 */
async function loadStats() {
  const stats = await api("/stats");
  statTotal.textContent = stats.total;
  statDone.textContent = stats.done;
  statNotDone.textContent = stats.notDone;
  statCompletion.textContent = `${stats.completion}%`;

  // Update progress bar
  progressBar.style.width = `${stats.completion}%`;
  progressText.textContent = `${stats.completion}% Complete (${stats.done}/${stats.total} tasks done today)`;
}

/**
 * Switch active tab
 */
function switchTab(tabName) {
  // Update button states
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  // Update content visibility
  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === `tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`);
  });

  // Save active tab
  sessionStorage.setItem("task-tracker-tab", tabName);
}

/**
 * Refresh all data
 */
async function refreshAll() {
  saveScroll();
  await loadAllTasks();
  renderTodayTasks();
  renderFutureTasks();
  await loadHistory();
  await loadStats();
  restoreScroll();
}

/**
 * Add a new task with date range
 */
async function addTask() {
  if (isLoading) return;

  const title = taskInput.value.trim();
  if (!title) {
    alert("Please enter a task title.");
    return;
  }

  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value || fromDate;
  const time = timeInput.value;

  // Validate dates
  if (!fromDate) {
    alert("Please select a from date.");
    return;
  }

  if (toDate < fromDate) {
    alert("To date cannot be before from date.");
    return;
  }

  saveScroll();
  await api("", {
    method: "POST",
    body: JSON.stringify({
      title,
      type: typeInput.value,
      status: "not_done",
      fromDate,
      toDate,
      time,
    }),
  });

  // Clear inputs
  taskInput.value = "";
  timeInput.value = "";

  await refreshAll();
}

/**
 * Handle task actions (checkbox toggle, edit, delete)
 * Only works for today's tasks due to backend validation
 */
async function handleTaskAction(event) {
  if (isLoading) return;

  const target = event.target;
  const id = target.dataset.id;
  if (!id) return;

  const action = target.dataset.action;

  if (action === "delete") {
    const confirmDelete = confirm("Are you sure you want to delete this task?");
    if (!confirmDelete) return;
    saveScroll();
    await api(`/${id}`, { method: "DELETE" });
    await refreshAll();
    return;
  }

  if (action === "edit") {
    const newTitle = prompt("Edit task title:", target.closest(".task-item")?.querySelector(".task-title")?.textContent || "");
    if (!newTitle || !newTitle.trim()) return;
    saveScroll();
    await api(`/${id}`, {
      method: "PUT",
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    await refreshAll();
    return;
  }

  if (action === "toggle") {
    // Checkbox toggled - instant visual feedback
    const isChecked = target.checked;
    const taskItem = target.closest(".task-item");
    if (taskItem) {
      taskItem.classList.toggle("done", isChecked);
    }

    // Update backend in background
    const newStatus = isChecked ? "done" : "not_done";
    saveScroll();
    await api(`/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    await refreshAll();
    return;
  }
}

/**
 * Setup dark mode toggle with localStorage persistence
 */
function setupTheme() {
  const saved = localStorage.getItem("task-tracker-theme") || "light";
  if (saved === "dark") {
    document.body.classList.add("dark");
  }

  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    const next = document.body.classList.contains("dark") ? "dark" : "light";
    localStorage.setItem("task-tracker-theme", next);
  });
}

/**
 * Setup student name personalization
 */
function setupStudentName() {
  let name = localStorage.getItem("task-tracker-student");
  if (!name) {
    name = prompt("Welcome! Enter your name (or leave blank for default):");
    if (name && name.trim()) {
      localStorage.setItem("task-tracker-student", name.trim());
    } else {
      localStorage.setItem("task-tracker-student", "Engineering Student");
    }
    name = localStorage.getItem("task-tracker-student");
  }
  studentNameEl.textContent = `Hello, ${name}! 👋`;
}

/**
 * Setup push notifications (PWA)
 */
async function setupNotifications() {
  // Check if browser supports notifications and service workers
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    notifToggle.disabled = true;
    notifToggle.title = "Notifications not supported";
    return;
  }

  // Check current permission state
  const permission = Notification.permission;
  if (permission === "granted") {
    notifToggle.textContent = "🔔 On";
    notifToggle.classList.add("enabled");
    await registerPush();
  } else if (permission === "denied") {
    notifToggle.disabled = true;
    notifToggle.title = "Notifications blocked";
  }

  // Handle notification toggle click
  notifToggle.addEventListener("click", async () => {
    if (Notification.permission === "granted") {
      // Already enabled, show info
      alert("Push notifications are already enabled! You'll get reminders at task time.");
      return;
    }

    const result = await Notification.requestPermission();
    if (result === "granted") {
      notifToggle.textContent = "🔔 On";
      notifToggle.classList.add("enabled");
      await registerPush();
      alert("Push notifications enabled! You'll get reminders when tasks are due.");
    } else {
      alert("Please allow notifications in your browser settings to enable reminders.");
    }
  });
}

/**
 * Register service worker and subscribe to push
 */
async function registerPush() {
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js");
    console.log("Service Worker registered:", registration.scope);

    // Get push subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Get VAPID public key from server
      const vapidKeyResponse = await fetch("/api/vapid-public-key");
      const { publicKey } = await vapidKeyResponse.json();

      // Subscribe
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // Send subscription to server
    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });

    console.log("Push subscription sent to server");
  } catch (error) {
    console.error("Push registration failed:", error);
  }
}

/**
 * Convert URL-safe base64 to Uint8Array (for VAPID key)
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split("").map((char) => char.charCodeAt(0)));
}

/**
 * Setup tab navigation
 */
function setupTabs() {
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Restore last active tab
  const savedTab = sessionStorage.getItem("task-tracker-tab") || "today";
  switchTab(savedTab);
}

/**
 * Initialize the application
 */
function setup() {
  const today = getTodayDateString();
  todayDateEl.textContent = `Today: ${prettyDate(today)}`;
  fromDateInput.value = today;
  toDateInput.value = today;

  setupStudentName();
  setupTheme();
  setupTabs();
  setupNotifications();

  // Event listeners
  addTaskBtn.addEventListener("click", addTask);
  refreshBtn.addEventListener("click", refreshAll);

  // Enter key to add task
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  });

  // Event delegation for task actions (today + future lists)
  todayDoList.addEventListener("change", handleTaskAction);
  todayDoList.addEventListener("click", handleTaskAction);
  todayDontList.addEventListener("change", handleTaskAction);
  todayDontList.addEventListener("click", handleTaskAction);
  futureDoList.addEventListener("change", handleTaskAction);
  futureDoList.addEventListener("click", handleTaskAction);
  futureDontList.addEventListener("change", handleTaskAction);
  futureDontList.addEventListener("click", handleTaskAction);

  // Initial load
  refreshAll().catch((error) => {
    alert(error.message);
  });
}

// Start the app
setup();
