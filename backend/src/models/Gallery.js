const mongoose = require("mongoose");

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String
    },

    images: [
      {
        url: {
          type: String,
          required: true
        },

        caption: {
          type: String
        }
      }
    ],

    category: {
      type: String,
      enum: [
        "campus",
        "events",
        "sports",
        "cultural",
        "academic",
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

module.exports = mongoose.model("Gallery", gallerySchema);