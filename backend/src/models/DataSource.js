const mongoose = require("mongoose");

const dataSourceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Key must be a lowercase slug."],
    },
    description: { type: String, trim: true, maxlength: 2000 },
    type: {
      type: String,
      required: true,
      enum: ["manual", "csv", "xlsx", "api", "database", "other"],
    },
    provider: { type: String, trim: true, maxlength: 100 },
    location: { type: String, trim: true, maxlength: 1000 },
    format: {
      type: String,
      enum: ["csv", "xlsx", "json", "api", "database", "manual", "other"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "archived"],
      default: "active",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    configuration: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    lastSyncAt: Date,
    lastSyncStatus: {
      type: String,
      enum: ["never", "success", "failed", "partial"],
      default: "never",
    },
    lastSyncMessage: { type: String, trim: true, maxlength: 2000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

dataSourceSchema.index({ type: 1 });
dataSourceSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DataSource", dataSourceSchema);