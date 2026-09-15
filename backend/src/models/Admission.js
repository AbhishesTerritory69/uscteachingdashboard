const mongoose = require("mongoose");

const admissionSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: true
    },

    program: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Program"
    },

    message: {
      type: String
    },

    status: {
      type: String,
      enum: [
        "new",
        "contacted",
        "processing",
        "approved",
        "rejected"
      ],
      default: "new"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Admission", admissionSchema);