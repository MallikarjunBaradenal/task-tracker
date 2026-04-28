const express = require("express");

/**
 * Creates push notification routes
 */
function createPushRoutes(pushController) {
  const router = express.Router();

  // Get VAPID public key
  router.get("/vapid-public-key", pushController.getVapidPublicKey);

  // Store push subscription
  router.post("/subscribe", pushController.subscribe);

  // Test push notification (optional, for debugging)
  router.post("/test-notification", pushController.testNotification);

  return router;
}

module.exports = createPushRoutes;

