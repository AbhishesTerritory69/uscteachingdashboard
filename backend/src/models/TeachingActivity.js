const mongoose = require("mongoose");

const activityTypes = [
  "lecture",
  "tutorial",
  "practical",
  "laboratory",
  "seminar",
];
const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const academicPeriods = ["Trimester 1", "Trimester 2", "Trimester 3"];
const activityStatuses = ["scheduled", "cancelled", "completed"];
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const teachingActivitySchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
      trim: true,
      match: [
        /^\d{4}(?:-\d{4})?$/,
        "academicYear must be a year or year range.",
      ],
    },
    academicPeriod: {
      type: String,
      required: true,
      enum: academicPeriods,
    },
    activityType: {
      type: String,
      required: true,
      enum: activityTypes,
    },
    day: {
      type: String,
      required: true,
      enum: weekdays,
    },
    startTime: {
      type: String,
      required: true,
      match: [timePattern, "startTime must use 24-hour HH:mm format."],
    },
    endTime: {
      type: String,
      required: true,
      match: [timePattern, "endTime must use 24-hour HH:mm format."],
    },
    duration: {
      type: Number,
      required: true,
      min: [Number.MIN_VALUE, "duration must be greater than zero."],
    },
    occurrences: {
      type: Number,
      required: true,
      min: [1, "occurrences must be at least one."],
      validate: {
        validator: Number.isInteger,
        message: "occurrences must be a whole number.",
      },
    },
    teachingHours: {
      type: Number,
      required: true,
      min: 0,
    },
    room: {
      type: String,
      trim: true,
    },
    section: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: activityStatuses,
      default: "scheduled",
    },
  },
  {
    timestamps: true,
  },
);

teachingActivitySchema.pre("validate", function () {
  if (Number.isFinite(this.duration) && Number.isInteger(this.occurrences)) {
    this.teachingHours =
      Math.round(this.duration * this.occurrences * 100) / 100;
  }

  if (
    timePattern.test(this.startTime || "") &&
    timePattern.test(this.endTime || "")
  ) {
    const toMinutes = (time) => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };
    if (toMinutes(this.endTime) <= toMinutes(this.startTime)) {
      this.invalidate("endTime", "endTime must be later than startTime.");
    } else if (
      Number.isFinite(this.duration) &&
      Math.abs(
        toMinutes(this.endTime) -
          toMinutes(this.startTime) -
          this.duration * 60,
      ) > 0.01
    ) {
      this.invalidate(
        "duration",
        "duration must match the startTime/endTime schedule span.",
      );
    }
  }
});

teachingActivitySchema.index({
  faculty: 1,
  academicYear: 1,
  academicPeriod: 1,
});
teachingActivitySchema.index({ course: 1, academicYear: 1, academicPeriod: 1 });
teachingActivitySchema.index({ academicYear: 1, academicPeriod: 1 });

module.exports = mongoose.model("TeachingActivity", teachingActivitySchema);
