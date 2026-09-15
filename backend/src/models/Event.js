const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
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

    image: {
      type: String
    },

    location: {
      type: String
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date
    },

    category: {
      type: String,
      enum: [
        "academic",
        "cultural",
        "sports",
        "seminar",
        "workshop",
        "other"
      ],
      default: "other"
    },

    isPublished: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Event", eventSchema);