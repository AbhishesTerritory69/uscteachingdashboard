const mongoose = require("mongoose");

const importTypes = [
  "department",
  "program",
  "faculty",
  "course",
  "teachingActivity",
  "courseOutline",
];
const importStatuses = [
  "uploaded",
  "validated",
  "failed",
  "processing",
  "completed",
  "partially_completed",
];

const issueSchema = new mongoose.Schema(
  {
    row: { type: Number, min: 1 },
    field: { type: String, maxlength: 100 },
    value: { type: String, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const warningSchema = new mongoose.Schema(
  {
    row: { type: Number, min: 1 },
    field: { type: String, maxlength: 100 },
    message: { type: String, required: true, maxlength: 500 },
  },
  { _id: false },
);

const previewSchema = new mongoose.Schema(
  {
    row: { type: Number, required: true, min: 1 },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { _id: false, strict: true },
);

const importJobSchema = new mongoose.Schema(
  {
    type: { type: String, enum: importTypes, required: true, index: true },
    filename: { type: String, required: true, maxlength: 255 },
    originalFilename: { type: String, required: true, maxlength: 255 },
    format: { type: String, enum: ["csv"], required: true },
    status: { type: String, enum: importStatuses, required: true, index: true },
    mode: { type: String, enum: ["validate", "import"], required: true },
    totalRows: { type: Number, default: 0, min: 0 },
    validRows: { type: Number, default: 0, min: 0 },
    invalidRows: { type: Number, default: 0, min: 0 },
    importedRows: { type: Number, default: 0, min: 0 },
    skippedRows: { type: Number, default: 0, min: 0 },
    failedRows: { type: Number, default: 0, min: 0 },
    errorCount: { type: Number, default: 0, min: 0 },
    errorsTruncated: { type: Boolean, default: false },
    rowErrors: { type: [issueSchema], default: [] },
    warnings: { type: [warningSchema], default: [] },
    preview: { type: [previewSchema], default: [] },
    dataSource: { type: mongoose.Schema.Types.ObjectId, ref: "DataSource" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true },
);

importJobSchema.index({ createdAt: -1 });
importJobSchema.index({ type: 1, createdAt: -1 });
importJobSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("ImportJob", importJobSchema);