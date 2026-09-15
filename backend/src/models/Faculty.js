const mongoose = require("mongoose");

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    designation: {
      type: String,
      required: true
    },

    qualification: {
      type: String
    },

    specialization: {
      type: String
    },

    email: {
      type: String,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String
    },

    bio: {
      type: String
    },

    image: {
      type: String
    },

    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    displayOrder: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Faculty", facultySchema);