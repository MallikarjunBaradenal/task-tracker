const mongoose = require("mongoose");

async function connectDB() {
  const useJson = process.env.USE_JSON_DB === "true";

  if (useJson) {
    console.log("[DB] Using JSON storage (USE_JSON_DB=true)");
    return false;
  }

  if (!process.env.MONGODB_URI) {
    console.warn("[DB] MONGODB_URI not found. Falling back to JSON storage.");
    return false;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("[DB] MongoDB connected");
    return true;
  } catch (error) {
    console.warn("[DB] MongoDB connection failed. Falling back to JSON storage.");
    console.warn(`[DB] ${error.message}`);
    return false;
  }
}

module.exports = connectDB;
