const mongoose = require("mongoose");

const pageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    slug: {
      type: String,
      required: true,
      unique: true
    },

    content: {
      type: String,
      required: true
    },

    featuredImage: {
      type: String
    },

    metaTitle: {
      type: String
    },

    metaDescription: {
      type: String
    },

    isPublished: {
      type: Boolean,
      default: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Page", pageSchema);