const mongoose = require("mongoose");

const academicPeriods = ["Trimester 1", "Trimester 2", "Trimester 3"];
const outlineStatuses = ["draft", "published", "archived"];

const assessmentMethodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const weeklyTopicSchema = new mongoose.Schema(
  {
    week: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "week must be a positive integer.",
      },
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
  },
  { _id: false },
);

const nonEmptyStringArray = (items) =>
  Array.isArray(items) && items.every((item) => typeof item === "string" && item.trim());

const courseOutlineSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    learningOutcomes: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: nonEmptyStringArray,
        message: "learningOutcomes must contain non-empty strings.",
      },
    },
    prerequisites: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: nonEmptyStringArray,
        message: "prerequisites must contain non-empty strings.",
      },
    },
    assessmentMethods: {
      type: [assessmentMethodSchema],
      default: [],
    },
    weeklyTopics: {
      type: [weeklyTopicSchema],
      default: [],
    },
    recommendedReadings: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: nonEmptyStringArray,
        message: "recommendedReadings must contain non-empty strings.",
      },
    },
    additionalResources: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: nonEmptyStringArray,
        message: "additionalResources must contain non-empty strings.",
      },
    },
    teachingMethods: {
      type: [{ type: String, trim: true }],
      default: [],
      validate: {
        validator: nonEmptyStringArray,
        message: "teachingMethods must contain non-empty strings.",
      },
    },
    attendanceRequirements: { type: String, trim: true },
    gradingPolicy: { type: String, trim: true },
    academicYear: {
      type: String,
      trim: true,
      match: [/^\d{4}(?:-\d{4})?$/, "academicYear must be a year or year range."],
    },
    academicPeriod: {
      type: String,
      enum: academicPeriods,
    },
    status: {
      type: String,
      enum: outlineStatuses,
      default: "draft",
    },
  },
  { timestamps: true },
);

courseOutlineSchema.pre("validate", function () {
  const weightTotal = this.assessmentMethods.reduce(
    (total, assessment) => total + (Number.isFinite(assessment.weight) ? assessment.weight : 0),
    0,
  );
  if (weightTotal > 100) {
    this.invalidate("assessmentMethods", "Total assessment weight must not exceed 100.");
  }
});

courseOutlineSchema.index(
  { course: 1, academicYear: 1, academicPeriod: 1 },
  { unique: true },
);
courseOutlineSchema.index({ status: 1, updatedAt: -1 });
courseOutlineSchema.index({ academicYear: 1, academicPeriod: 1 });

module.exports = mongoose.model("CourseOutline", courseOutlineSchema);