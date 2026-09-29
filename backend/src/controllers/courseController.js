const Course = require("../models/Course");
const Department = require("../models/Department");
const Program = require("../models/Program");
const {
  getPagination,
  handleControllerError,
  isValidObjectId,
  sendError,
  validateRequired,
} = require("../utils/controllerHelpers");

const writableFields = [
  "code",
  "name",
  "description",
  "department",
  "program",
  "creditHours",
  "level",
  "status",
];
const populateOptions = [
  { path: "department", select: "name slug" },
  { path: "program", select: "name slug degree" },
];
const statuses = ["active", "inactive"];
const sortableFields = new Set([
  "code",
  "name",
  "creditHours",
  "level",
  "status",
  "createdAt",
  "updatedAt",
]);

const validateReferences = async (data, res) => {
  for (const [field, Model, label] of [
    ["department", Department, "Department"],
    ["program", Program, "Program"],
  ]) {
    const id = data[field];
    if (id === undefined || (field === "program" && id === null)) continue;
    if (!isValidObjectId(id)) {
      sendError(res, 400, `${field} must be a valid reference.`);
      return false;
    }
    if (!(await Model.exists({ _id: id }))) {
      sendError(res, 404, `${label} not found.`);
      return false;
    }
  }
  return true;
};

const getSort = (value) => {
  const requested = typeof value === "string" && value ? value : "-createdAt";
  const descending = requested.startsWith("-");
  const field = descending ? requested.slice(1) : requested;
  if (!sortableFields.has(field)) return null;
  return { [field]: descending ? -1 : 1 };
};

const list = async (req, res) => {
  try {
    const filter = {};
    for (const field of ["department", "program"]) {
      if (req.query[field] === undefined) continue;
      if (!isValidObjectId(req.query[field]))
        return sendError(res, 400, `Invalid ${field} reference.`);
      filter[field] = req.query[field];
    }
    if (req.query.status !== undefined) {
      if (!statuses.includes(req.query.status))
        return sendError(res, 400, "Invalid status value.");
      filter.status = req.query.status;
    }
    if (req.query.search !== undefined) {
      const search = String(req.query.search).trim();
      if (search.length > 100)
        return sendError(res, 400, "Search must be 100 characters or fewer.");
      if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const expression = new RegExp(escaped, "i");
        filter.$or = [{ code: expression }, { name: expression }];
      }
    }
    const sort = getSort(req.query.sort);
    if (!sort) return sendError(res, 400, "Unsupported sort field.");

    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      Course.find(filter)
        .populate(populateOptions)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Course.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid course ID.");
    const course = await Course.findById(req.params.id)
      .populate(populateOptions)
      .lean();
    if (!course) return sendError(res, 404, "Course not found.");
    return res.json({ success: true, data: course });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    const missing = validateRequired(body, ["code", "name", "department"]);
    if (missing.length)
      return sendError(res, 400, "Required fields are missing.", missing);

    const data = Object.fromEntries(
      writableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]]),
    );
    if (!(await validateReferences(data, res))) return;

    const course = await Course.create(data);
    await course.populate(populateOptions);
    return res.status(201).json({ success: true, data: course });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const update = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid course ID.");
    const body = req.body || {};
    const data = Object.fromEntries(
      writableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]]),
    );
    if (!Object.keys(data).length)
      return sendError(res, 400, "At least one updatable field is required.");
    if (!(await validateReferences(data, res))) return;

    const course = await Course.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    }).populate(populateOptions);
    if (!course) return sendError(res, 404, "Course not found.");
    return res.json({ success: true, data: course });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid course ID.");
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return sendError(res, 404, "Course not found.");
    return res.json({ success: true, message: "Course deleted successfully." });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { create, getById, list, remove, update };