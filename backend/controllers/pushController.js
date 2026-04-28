/**
 * Push notification controller
 * Handles VAPID public key retrieval and subscription storage
 */
function createPushController(pushService) {
  return {
    /**
     * Get VAPID public key for frontend PushManager subscription
     */
    async getVapidPublicKey(_req, res) {
      try {
        const publicKey = process.env.VAPID_PUBLIC_KEY;

        if (!publicKey) {
          return res.status(500).json({
            message: "VAPID public key not configured on server",
          });
        }

        res.json({ publicKey });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },

    /**
     * Store a push subscription from the client
     */
    async subscribe(req, res) {
      try {
        const subscription = req.body;

        if (!subscription || !subscription.endpoint) {
          return res.status(400).json({ message: "Invalid subscription data" });
        }

        await pushService.saveSubscription(subscription);
        res.json({ success: true, message: "Push subscription saved" });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },

    /**
     * Test push notification (for debugging)
     */
    async testNotification(_req, res) {
      try {
        const result = await pushService.broadcastNotification({
          title: "Test Notification",
          body: "Push notifications are working!",
          tag: "test-notification",
          url: "/",
        });

        res.json({
          success: true,
          message: `Test notification sent to ${result.sent} subscribers`,
          result,
        });
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    },
  };
}

module.exports = createPushController;

