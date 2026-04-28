const mongoose = require("mongoose");

/**
 * Push Subscription Schema
 * Stores Web Push API subscriptions for sending notifications
 */
const subscriptionSchema = new mongoose.Schema(
  {
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },
    expirationTime: {
      type: Number,
      default: null,
    },
    keys: {
      p256dh: {
        type: String,
        required: true,
      },
      auth: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Transform output to remove MongoDB internals
subscriptionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Subscription", subscriptionSchema);

