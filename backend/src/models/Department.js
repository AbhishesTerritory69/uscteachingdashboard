const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    shortDescription: {
      type: String,
      trim: true
    },

    description: {
      type: String
    },

    image: {
      type: String
    },

    headOfDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty"
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Department", departmentSchema);