const mongoose = require("mongoose");

/**
 * Task Schema - Updated with date range and time fields
 * Status: only "done" or "not_done" (no "absent")
 */
const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ["do", "dont"],
      required: true,
    },
    status: {
      type: String,
      enum: ["done", "not_done"],
      default: "not_done",
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    fromDate: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    toDate: {
      type: String,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    time: {
      type: String,
      match: /^\d{2}:\d{2}$/,
    },
    notified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster date queries
taskSchema.index({ date: 1 });

// Transform output to remove MongoDB internals
taskSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model("Task", taskSchema);

