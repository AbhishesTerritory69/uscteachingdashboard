const crypto = require("crypto");
const os = require("os");
const path = require("path");
const multer = require("multer");

const configuredSizeMb = Number.parseInt(process.env.MAX_IMPORT_FILE_SIZE_MB, 10);
const maxFileSizeMb = Number.isInteger(configuredSizeMb)
  ? Math.min(Math.max(configuredSizeMb, 1), 50)
  : 10;

const storage = multer.diskStorage({
  destination: os.tmpdir(),
  filename: (req, file, callback) => callback(null, `${crypto.randomUUID()}.csv`),
});

const upload = multer({
  storage,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
    files: 1,
    fields: 4,
    parts: 6,
    fieldSize: 4096,
  },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(path.win32.basename(file.originalname)).toLowerCase();
    const allowedMimeTypes = new Set([
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "text/plain",
    ]);
    if (extension !== ".csv" || !allowedMimeTypes.has(file.mimetype.toLowerCase())) {
      const error = new Error("Only CSV files are supported.");
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

const parseSingleCsv = upload.single("file");

const handleUploadError = (error, req, res, next) => {
  if (!error) return next();
  if (req.file?.path) {
    require("fs").promises.unlink(req.file.path).catch(() => {});
  }
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({
      success: false,
      message:
        status === 413
          ? `Import file exceeds the ${maxFileSizeMb} MB size limit.`
          : "Invalid multipart import request.",
    });
  }
  if (error.status === 400) {
    return res.status(400).json({ success: false, message: error.message });
  }
  if (!error.code) {
    return res.status(400).json({
      success: false,
      message: "Malformed multipart import request.",
    });
  }
  return next(error);
};

module.exports = { handleUploadError, maxFileSizeMb, parseSingleCsv };