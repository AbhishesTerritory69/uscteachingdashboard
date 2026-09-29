const Course = require("../models/Course");
const Department = require("../models/Department");
const Faculty = require("../models/Faculty");
const TeachingActivity = require("../models/TeachingActivity");
const {
  getPagination,
  handleControllerError,
  isValidObjectId,
  sendError,
  validateRequired,
} = require("../utils/controllerHelpers");

const academicPeriods = ["Trimester 1", "Trimester 2", "Trimester 3"];
const activityTypes = ["lecture", "tutorial", "practical", "laboratory", "seminar"];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const statuses = ["scheduled", "cancelled", "completed"];
const writableFields = [
  "course",
  "faculty",
  "academicYear",
  "academicPeriod",
  "activityType",
  "day",
  "startTime",
  "endTime",
  "duration",
  "occurrences",
  "room",
  "section",
  "status",
];
const requiredFields = [
  "course",
  "faculty",
  "academicYear",
  "academicPeriod",
  "activityType",
  "day",
  "startTime",
  "endTime",
  "duration",
  "occurrences",
];
const populateOptions = [
  {
    path: "course",
    select: "code name department program",
    populate: [
      { path: "department", select: "name slug" },
      { path: "program", select: "name slug degree" },
    ],
  },
  {
    path: "faculty",
    select: "name designation email department",
    populate: { path: "department", select: "name slug" },
  },
];
const sortableFields = new Set([
  "academicYear",
  "academicPeriod",
  "activityType",
  "day",
  "startTime",
  "duration",
  "occurrences",
  "teachingHours",
  "status",
  "createdAt",
  "updatedAt",
]);

const getSort = (value) => {
  const requested = typeof value === "string" && value ? value : "-createdAt";
  const descending = requested.startsWith("-");
  const field = descending ? requested.slice(1) : requested;
  return sortableFields.has(field) ? { [field]: descending ? -1 : 1 } : null;
};

const validateReferences = async (data, res) => {
  for (const [field, Model, label] of [
    ["course", Course, "Course"],
    ["faculty", Faculty, "Faculty member"],
  ]) {
    if (data[field] === undefined) continue;
    if (!isValidObjectId(data[field])) {
      sendError(res, 400, `${field} must be a valid reference.`);
      return false;
    }
    if (!(await Model.exists({ _id: data[field] }))) {
      sendError(res, 404, `${label} not found.`);
      return false;
    }
  }
  return true;
};

const applyFilters = async (req, res, filter) => {
  for (const [field, Model, label] of [
    ["faculty", Faculty, "Faculty member"],
    ["course", Course, "Course"],
  ]) {
    if (req.query[field] === undefined) continue;
    if (!isValidObjectId(req.query[field]))
      return sendError(res, 400, `Invalid ${field} reference.`);
    if (!(await Model.exists({ _id: req.query[field] })))
      return sendError(res, 404, `${label} not found.`);
    if (filter[field] && String(filter[field]) !== String(req.query[field]))
      return sendError(res, 400, `${field} filter conflicts with the requested relationship.`);
    filter[field] = req.query[field];
  }

  if (req.query.department !== undefined) {
    if (!isValidObjectId(req.query.department))
      return sendError(res, 400, "Invalid department reference.");
    if (!(await Department.exists({ _id: req.query.department })))
      return sendError(res, 404, "Department not found.");
    const courseFilter = { department: req.query.department };
    if (filter.course) {
      courseFilter._id = filter.course.$in
        ? { $in: filter.course.$in }
        : filter.course;
    }
    const courseIds = await Course.find(courseFilter).distinct("_id");
    filter.course = { $in: courseIds };
  }

  for (const [field, values] of [
    ["academicPeriod", academicPeriods],
    ["activityType", activityTypes],
    ["day", weekdays],
    ["status", statuses],
  ]) {
    if (req.query[field] === undefined) continue;
    if (!values.includes(req.query[field]))
      return sendError(res, 400, `Invalid ${field} value.`);
    filter[field] = req.query[field];
  }

  if (req.query.academicYear !== undefined) {
    if (!/^\d{4}(?:-\d{4})?$/.test(req.query.academicYear))
      return sendError(res, 400, "Invalid academicYear value.");
    filter.academicYear = req.query.academicYear;
  }

  return null;
};

const listWithFilter = async (req, res, baseFilter = {}) => {
  try {
    const filter = { ...baseFilter };
    const filterError = await applyFilters(req, res, filter);
    if (filterError) return filterError;

    const sort = getSort(req.query.sort);
    if (!sort) return sendError(res, 400, "Unsupported sort field.");
    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      TeachingActivity.find(filter)
        .populate(populateOptions)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      TeachingActivity.countDocuments(filter),
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

const list = (req, res) => listWithFilter(req, res);

const getById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid teaching activity ID.");
    const activity = await TeachingActivity.findById(req.params.id)
      .populate(populateOptions)
      .lean();
    if (!activity) return sendError(res, 404, "Teaching activity not found.");
    return res.json({ success: true, data: activity });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    const missing = validateRequired(body, requiredFields);
    if (missing.length)
      return sendError(res, 400, "Required fields are missing.", missing);

    const data = Object.fromEntries(
      writableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]]),
    );
    if (!(await validateReferences(data, res))) return;

    const activity = new TeachingActivity(data);
    await activity.save();
    await activity.populate(populateOptions);
    return res.status(201).json({ success: true, data: activity });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const update = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid teaching activity ID.");
    const body = req.body || {};
    const data = Object.fromEntries(
      writableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]]),
    );
    if (!Object.keys(data).length)
      return sendError(res, 400, "At least one updatable field is required.");
    if (!(await validateReferences(data, res))) return;

    const activity = await TeachingActivity.findById(req.params.id);
    if (!activity) return sendError(res, 404, "Teaching activity not found.");
    Object.assign(activity, data);
    await activity.save();
    await activity.populate(populateOptions);
    return res.json({ success: true, data: activity });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid teaching activity ID.");
    const activity = await TeachingActivity.findByIdAndDelete(req.params.id);
    if (!activity) return sendError(res, 404, "Teaching activity not found.");
    return res.json({ success: true, message: "Teaching activity deleted successfully." });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const listForFaculty = async (req, res) => {
  if (!isValidObjectId(req.params.facultyId))
    return sendError(res, 400, "Invalid faculty ID.");
  if (!(await Faculty.exists({ _id: req.params.facultyId })))
    return sendError(res, 404, "Faculty member not found.");
  return listWithFilter(req, res, { faculty: req.params.facultyId });
};

const listForCourse = async (req, res) => {
  if (!isValidObjectId(req.params.courseId))
    return sendError(res, 400, "Invalid course ID.");
  if (!(await Course.exists({ _id: req.params.courseId })))
    return sendError(res, 404, "Course not found.");
  return listWithFilter(req, res, { course: req.params.courseId });
};

module.exports = {
  create,
  getById,
  list,
  listForCourse,
  listForFaculty,
  remove,
  update,
};