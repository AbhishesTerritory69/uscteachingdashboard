const Course = require("../models/Course");
const CourseOutline = require("../models/CourseOutline");
const {
  getPagination,
  handleControllerError,
  isValidObjectId,
  sendError,
  validateRequired,
} = require("../utils/controllerHelpers");

const academicPeriods = ["Trimester 1", "Trimester 2", "Trimester 3"];
const statuses = ["draft", "published", "archived"];
const writableFields = [
  "course",
  "title",
  "description",
  "learningOutcomes",
  "prerequisites",
  "assessmentMethods",
  "weeklyTopics",
  "recommendedReadings",
  "additionalResources",
  "teachingMethods",
  "attendanceRequirements",
  "gradingPolicy",
  "academicYear",
  "academicPeriod",
  "status",
];
const stringArrayFields = [
  "learningOutcomes",
  "prerequisites",
  "recommendedReadings",
  "additionalResources",
  "teachingMethods",
];
const optionalTextFields = ["attendanceRequirements", "gradingPolicy"];
const sortableFields = new Set([
  "title",
  "academicYear",
  "academicPeriod",
  "status",
  "createdAt",
  "updatedAt",
]);
const coursePopulation = {
  path: "course",
  select: "code name status department program",
  populate: [
    { path: "department", select: "name slug" },
    { path: "program", select: "name slug degree" },
  ],
};

const isPrivileged = (req) =>
  ["admin", "editor"].includes(req.user?.role);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const validatePayload = (body, res) => {
  for (const field of ["title", "description", ...optionalTextFields]) {
    if (body[field] === undefined || body[field] === null) continue;
    if (typeof body[field] !== "string") {
      sendError(res, 400, `${field} must be a string.`);
      return false;
    }
    if (["title", "description"].includes(field) && !body[field].trim()) {
      sendError(res, 400, `${field} is required.`);
      return false;
    }
  }

  for (const field of stringArrayFields) {
    if (body[field] === undefined) continue;
    if (
      !Array.isArray(body[field]) ||
      body[field].some((item) => typeof item !== "string" || !item.trim())
    ) {
      sendError(res, 400, `${field} must be an array of non-empty strings.`);
      return false;
    }
  }

  if (body.academicYear !== undefined && body.academicYear !== null) {
    if (
      typeof body.academicYear !== "string" ||
      !/^\d{4}(?:-\d{4})?$/.test(body.academicYear.trim())
    ) {
      sendError(res, 400, "academicYear must be a year or year range.");
      return false;
    }
  }
  if (
    body.academicPeriod !== undefined &&
    body.academicPeriod !== null &&
    !academicPeriods.includes(body.academicPeriod)
  ) {
    sendError(res, 400, "Invalid academicPeriod value.");
    return false;
  }
  if (body.status !== undefined && !statuses.includes(body.status)) {
    sendError(res, 400, "Invalid status value.");
    return false;
  }

  if (body.assessmentMethods !== undefined) {
    if (!Array.isArray(body.assessmentMethods)) {
      sendError(res, 400, "assessmentMethods must be an array.");
      return false;
    }
    let weightTotal = 0;
    for (const assessment of body.assessmentMethods) {
      if (
        !isPlainObject(assessment) ||
        Object.keys(assessment).some(
          (field) => !["name", "description", "weight"].includes(field),
        ) ||
        typeof assessment.name !== "string" ||
        !assessment.name.trim() ||
        typeof assessment.description !== "string" ||
        !assessment.description.trim() ||
        typeof assessment.weight !== "number" ||
        !Number.isFinite(assessment.weight) ||
        assessment.weight < 0 ||
        assessment.weight > 100
      ) {
        sendError(
          res,
          400,
          "Each assessment method requires a name, description, and numeric weight from 0 to 100.",
        );
        return false;
      }
      weightTotal += assessment.weight;
    }
    if (weightTotal > 100) {
      sendError(res, 400, "Total assessment weight must not exceed 100.");
      return false;
    }
  }

  if (body.weeklyTopics !== undefined) {
    if (!Array.isArray(body.weeklyTopics)) {
      sendError(res, 400, "weeklyTopics must be an array.");
      return false;
    }
    for (const topic of body.weeklyTopics) {
      if (
        !isPlainObject(topic) ||
        Object.keys(topic).some(
          (field) => !["week", "title", "description"].includes(field),
        ) ||
        !Number.isInteger(topic.week) ||
        topic.week < 1 ||
        typeof topic.title !== "string" ||
        !topic.title.trim() ||
        (topic.description !== undefined &&
          typeof topic.description !== "string")
      ) {
        sendError(
          res,
          400,
          "Each weekly topic requires a positive integer week and a title; only description is optional.",
        );
        return false;
      }
    }
  }

  return true;
};

const validateCourseReference = async (id, res) => {
  if (typeof id !== "string" || !isValidObjectId(id)) {
    sendError(res, 400, "course must be a valid reference.");
    return false;
  }
  if (!(await Course.exists({ _id: id }))) {
    sendError(res, 404, "Course not found.");
    return false;
  }
  return true;
};

const getSort = (value) => {
  const requested = value || "-updatedAt";
  if (typeof requested !== "string") return null;
  const descending = requested.startsWith("-");
  const field = descending ? requested.slice(1) : requested;
  if (!sortableFields.has(field)) return null;
  return { [field]: descending ? -1 : 1 };
};

const buildFilter = async (req, res, baseFilter = {}) => {
  const filter = { ...baseFilter };
  const privileged = isPrivileged(req);

  if (req.query.course !== undefined) {
    if (typeof req.query.course !== "string" || !isValidObjectId(req.query.course)) {
      sendError(res, 400, "Invalid course reference.");
      return null;
    }
    if (!(await Course.exists({ _id: req.query.course }))) {
      sendError(res, 404, "Course not found.");
      return null;
    }
    if (filter.course && String(filter.course) !== String(req.query.course)) {
      sendError(res, 400, "course filter conflicts with the requested course.");
      return null;
    }
    filter.course = req.query.course;
  }

  if (req.query.academicYear !== undefined) {
    if (
      typeof req.query.academicYear !== "string" ||
      !/^\d{4}(?:-\d{4})?$/.test(req.query.academicYear)
    ) {
      sendError(res, 400, "Invalid academicYear value.");
      return null;
    }
    filter.academicYear = req.query.academicYear;
  }
  if (req.query.academicPeriod !== undefined) {
    if (!academicPeriods.includes(req.query.academicPeriod)) {
      sendError(res, 400, "Invalid academicPeriod value.");
      return null;
    }
    filter.academicPeriod = req.query.academicPeriod;
  }
  if (req.query.status !== undefined) {
    if (!statuses.includes(req.query.status)) {
      sendError(res, 400, "Invalid status value.");
      return null;
    }
    if (!privileged && req.query.status !== "published") {
      sendError(res, 403, "Only published course outlines are publicly available.");
      return null;
    }
    filter.status = req.query.status;
  } else if (!privileged) {
    filter.status = "published";
  }

  if (req.query.search !== undefined) {
    if (typeof req.query.search !== "string" || req.query.search.length > 100) {
      sendError(res, 400, "search must be a string of 100 characters or fewer.");
      return null;
    }
    const search = req.query.search.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = new RegExp(escaped, "i");
      filter.$or = [{ title: expression }, { description: expression }];
    }
  }
  return filter;
};

const listWithFilter = async (req, res, baseFilter = {}) => {
  try {
    const filter = await buildFilter(req, res, baseFilter);
    if (!filter) return;
    const sort = getSort(req.query.sort);
    if (!sort) return sendError(res, 400, "Unsupported sort field.");
    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      CourseOutline.find(filter)
        .populate(coursePopulation)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      CourseOutline.countDocuments(filter),
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
      return sendError(res, 400, "Invalid course outline ID.");
    const outline = await CourseOutline.findById(req.params.id)
      .populate(coursePopulation)
      .lean();
    if (!outline || (!isPrivileged(req) && outline.status !== "published"))
      return sendError(res, 404, "Course outline not found.");
    return res.json({ success: true, data: outline });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const byCourse = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.courseId))
      return sendError(res, 400, "Invalid course ID.");
    if (!(await Course.exists({ _id: req.params.courseId })))
      return sendError(res, 404, "Course not found.");
    return listWithFilter(req, res, { course: req.params.courseId });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const create = async (req, res) => {
  try {
    const body = req.body || {};
    const missing = validateRequired(body, ["course", "title", "description"]);
    if (missing.length)
      return sendError(res, 400, "Required fields are missing.", missing);
    if (!validatePayload(body, res)) return;
    if (!(await validateCourseReference(body.course, res))) return;

    const data = Object.fromEntries(
      writableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]]),
    );
    const outline = new CourseOutline(data);
    await outline.save();
    await outline.populate(coursePopulation);
    return res.status(201).json({ success: true, data: outline });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const update = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid course outline ID.");
    const body = req.body || {};
    const data = Object.fromEntries(
      writableFields
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]]),
    );
    if (!Object.keys(data).length)
      return sendError(res, 400, "At least one updatable field is required.");
    if (!validatePayload(data, res)) return;
    if (data.course !== undefined && !(await validateCourseReference(data.course, res)))
      return;

    const outline = await CourseOutline.findById(req.params.id);
    if (!outline) return sendError(res, 404, "Course outline not found.");
    Object.assign(outline, data);
    await outline.save();
    await outline.populate(coursePopulation);
    return res.json({ success: true, data: outline });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id))
      return sendError(res, 400, "Invalid course outline ID.");
    const outline = await CourseOutline.findByIdAndDelete(req.params.id);
    if (!outline) return sendError(res, 404, "Course outline not found.");
    return res.json({ success: true, message: "Course outline deleted successfully." });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { byCourse, create, getById, list, remove, update };