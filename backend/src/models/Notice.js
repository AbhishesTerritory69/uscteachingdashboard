const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true
    },

    description: {
      type: String
    },

    content: {
      type: String
    },

    category: {
      type: String,
      enum: [
        "general",
        "admission",
        "exam",
        "result",
        "scholarship",
        "vacancy",
        "event"
      ],
      default: "general"
    },

    attachment: {
      type: String
    },

    publishedAt: {
      type: Date,
      default: Date.now
    },

    isPublished: {
      type: Boolean,
      default: true
    },

    isFeatured: {
      type: Boolean,
      default: false
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Notice", noticeSchema);