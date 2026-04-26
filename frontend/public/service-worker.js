/**
 * Service Worker for Daily Task Tracker
 * Handles push notifications and offline caching
 */

const CACHE_NAME = "task-tracker-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/manifest.json"
];

// Install event - cache assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Push event - show notification
self.addEventListener("push", (event) => {
  const data = event.data.json();

  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || "task-reminder",
    requireInteraction: true,
    actions: [
      {
        action: "open",
        title: "Open App"
      },
      {
        action: "snooze",
        title: "Snooze 10m"
      }
    ],
    data: {
      taskId: data.taskId,
      url: data.url || "/"
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data;

  if (action === "snooze") {
    // Snooze for 10 minutes
    const snoozeTime = Date.now() + 10 * 60 * 1000;
    console.log("Snoozed until:", new Date(snoozeTime));
    // In a full implementation, you would schedule another push
    return;
  }

  // Open the app
  event.waitUntil(
    clients.openWindow(notificationData.url || "/")
  );
});

