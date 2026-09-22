const mongoose = require("mongoose");

const isValidObjectId = (value) => mongoose.isValidObjectId(value);

const cleanString = (value) => typeof value === "string" ? value.trim() : value;

const validateRequired = (body, fields) => {
  const missing = fields.filter((field) => {
    const value = body[field];
    return value === undefined || value === null || (typeof value === "string" && !value.trim());
  });

  return missing;
};

const parseBoolean = (value) => {
  if (value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const parseDate = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sendError = (res, status, message, details) => {
  const payload = { success: false, message };
  if (details) payload.details = details;
  return res.status(status).json(payload);
};

const handleControllerError = (res, error) => {
  if (error?.code === 11000) {
    return sendError(res, 409, "A record with this unique value already exists.", error.keyValue);
  }

  if (error?.name === "ValidationError" || error?.name === "CastError") {
    const details = error.errors
      ? Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message]))
      : undefined;
    return sendError(res, 400, "Invalid request data.", details);
  }

  console.error(error);
  return sendError(res, 500, "An unexpected server error occurred.");
};

const getPagination = (query) => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = {
  cleanString,
  getPagination,
  handleControllerError,
  isValidObjectId,
  parseBoolean,
  parseDate,
  sendError,
  validateRequired
};
