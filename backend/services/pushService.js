const webpush = require("web-push");
const fs = require("fs").promises;
const path = require("path");
const Subscription = require("../models/Subscription");

const subscriptionsFilePath = process.env.VERCEL
  ? path.join("/tmp", "subscriptions.json")
  : path.join(__dirname, "..", "data", "subscriptions.json");

/**
 * Get today's date as YYYY-MM-DD string in local timezone
 */
function getTodayDateString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

/**
 * Configure web-push with VAPID keys from environment
 */
function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@tasktracker.local";

  if (!publicKey || !privateKey) {
    console.warn("[PushService] VAPID keys not set. Push notifications will not work.");
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  console.log("[PushService] VAPID configured successfully");
  return true;
}

/**
 * Ensure JSON subscriptions file exists
 */
async function ensureJsonSubscriptionsFile() {
  try {
    await fs.access(subscriptionsFilePath);
  } catch {
    await fs.writeFile(subscriptionsFilePath, JSON.stringify([], null, 2), "utf-8");
  }
}

/**
 * Read subscriptions from JSON file
 */
async function readJsonSubscriptions() {
  await ensureJsonSubscriptionsFile();
  const raw = await fs.readFile(subscriptionsFilePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Write subscriptions to JSON file
 */
async function writeJsonSubscriptions(subscriptions) {
  await fs.writeFile(subscriptionsFilePath, JSON.stringify(subscriptions, null, 2), "utf-8");
}

/**
 * PushService class handles subscription storage and push sending
 */
class PushService {
  constructor(isMongoEnabled) {
    this.isMongoEnabled = isMongoEnabled;
    this.isConfigured = configureWebPush();
  }

  /**
   * Store a push subscription
   */
  async saveSubscription(subscriptionData) {
    const { endpoint, keys } = subscriptionData;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      throw new Error("Invalid subscription data");
    }

    if (this.isMongoEnabled) {
      // Upsert to avoid duplicates
      await Subscription.findOneAndUpdate(
        { endpoint },
        { endpoint, keys, expirationTime: subscriptionData.expirationTime || null },
        { upsert: true, new: true }
      );
      return { success: true };
    }

    const subscriptions = await readJsonSubscriptions();
    const existingIndex = subscriptions.findIndex((s) => s.endpoint === endpoint);

    const subscriptionRecord = {
      endpoint,
      keys,
      expirationTime: subscriptionData.expirationTime || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      subscriptions[existingIndex] = subscriptionRecord;
    } else {
      subscriptions.push(subscriptionRecord);
    }

    await writeJsonSubscriptions(subscriptions);
    return { success: true };
  }

  /**
   * Get all active subscriptions
   */
  async getSubscriptions() {
    if (this.isMongoEnabled) {
      return Subscription.find({});
    }

    const subscriptions = await readJsonSubscriptions();
    return subscriptions.map((s) => ({
      ...s,
      id: s.endpoint, // consistent interface
    }));
  }

  /**
   * Send push notification to a single subscription
   */
  async sendNotification(subscription, payload) {
    if (!this.isConfigured) {
      console.warn("[PushService] Cannot send notification - VAPID not configured");
      return { success: false, error: "VAPID not configured" };
    }

    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
      return { success: true };
    } catch (error) {
      console.error("[PushService] Push failed:", error.message);

      // Remove invalid/expired subscriptions
      if (error.statusCode === 404 || error.statusCode === 410) {
        await this.removeSubscription(subscription.endpoint);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to all subscriptions
   */
  async broadcastNotification(payload) {
    const subscriptions = await this.getSubscriptions();

    if (subscriptions.length === 0) {
      console.log("[PushService] No subscriptions to notify");
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    await Promise.all(
      subscriptions.map(async (sub) => {
        const result = await this.sendNotification(sub, payload);
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      })
    );

    console.log(`[PushService] Broadcast complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Remove a subscription by endpoint
   */
  async removeSubscription(endpoint) {
    if (this.isMongoEnabled) {
      await Subscription.deleteOne({ endpoint });
      return;
    }

    const subscriptions = await readJsonSubscriptions();
    const filtered = subscriptions.filter((s) => s.endpoint !== endpoint);
    await writeJsonSubscriptions(filtered);
  }
}

module.exports = { PushService, getTodayDateString };

