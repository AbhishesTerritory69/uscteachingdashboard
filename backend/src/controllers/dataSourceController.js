const DataSource = require("../models/DataSource");
const {
  getPagination,
  handleControllerError,
  isValidObjectId,
  parseBoolean,
  sendError,
  validateRequired,
} = require("../utils/controllerHelpers");

const types = ["manual", "csv", "xlsx", "api", "database", "other"];
const formats = ["csv", "xlsx", "json", "api", "database", "manual", "other"];
const statuses = ["active", "inactive", "archived"];
const writableFields = [
  "name",
  "key",
  "description",
  "type",
  "provider",
  "location",
  "format",
  "status",
  "isActive",
  "configuration",
];
const stringFields = ["name", "key", "description", "type", "provider", "location", "format", "status"];
const sortableFields = new Set([
  "name",
  "key",
  "type",
  "format",
  "status",
  "isActive",
  "createdAt",
  "updatedAt",
]);
const queryFields = new Set(["page", "limit", "search", "type", "status", "isActive", "format", "sort"]);
const configurationFields = new Set(["delimiter", "encoding", "hasHeader"]);
const populateOptions = [
  { path: "createdBy", select: "name email role" },
  { path: "updatedBy", select: "name email role" },
];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

const normalizeKey = (value) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const validateConfiguration = (configuration) => {
  if (!isPlainObject(configuration)) return "configuration must be a plain object.";
  if (Buffer.byteLength(JSON.stringify(configuration), "utf8") > 4096)
    return "configuration must be 4 KB or smaller.";

  for (const [key, value] of Object.entries(configuration)) {
    if (key.startsWith("$") || key.includes(".") || !configurationFields.has(key))
      return `Unsupported configuration field: ${key}.`;
    if (key === "delimiter" && (typeof value !== "string" || value.length !== 1))
      return "configuration.delimiter must be a single character.";
    if (key === "encoding" && (typeof value !== "string" || value.length > 40))
      return "configuration.encoding must be a string of at most 40 characters.";
    if (key === "hasHeader" && typeof value !== "boolean")
      return "configuration.hasHeader must be a boolean.";
  }
  return null;
};

const validateBody = (body, { required = [] } = {}) => {
  if (!isPlainObject(body)) return { error: "A JSON object is required." };
  const unknownFields = Object.keys(body).filter((field) => !writableFields.includes(field));
  if (unknownFields.length) return { error: "Unexpected data source field.", details: unknownFields };
  const missing = validateRequired(body, required);
  if (missing.length) return { error: "Required fields are missing.", details: missing };

  const data = {};
  for (const field of writableFields) {
    if (body[field] === undefined) continue;
    if (stringFields.includes(field) && typeof body[field] !== "string")
      return { error: `${field} must be a string.` };
    if (field === "isActive" && typeof body[field] !== "boolean")
      return { error: "isActive must be a boolean." };
    if (field === "configuration") {
      const error = validateConfiguration(body[field]);
      if (error) return { error };
    }
    data[field] = body[field];
  }

  if (data.key !== undefined) {
    if (data.key.trim().length > 100) return { error: "key must be 100 characters or fewer." };
    data.key = normalizeKey(data.key);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.key))
      return { error: "key must contain at least one letter or number." };
  }
  return { data };
};

const validateListQuery = (query) => {
  for (const [field, value] of Object.entries(query)) {
    if (!queryFields.has(field)) return `Unsupported query parameter: ${field}.`;
    if (typeof value !== "string") return `${field} must be a scalar value.`;
  }
  for (const field of ["page", "limit"]) {
    if (query[field] !== undefined) {
      if (!/^[1-9]\d*$/.test(query[field]) || !Number.isSafeInteger(Number(query[field])))
        return `${field} must be a positive safe integer.`;
    }
  }
  if (query.search !== undefined && query.search.length > 100)
    return "search must be 100 characters or fewer.";
  if (query.type !== undefined && !types.includes(query.type)) return "Invalid type value.";
  if (query.status !== undefined && !statuses.includes(query.status)) return "Invalid status value.";
  if (query.format !== undefined && !formats.includes(query.format)) return "Invalid format value.";
  if (query.isActive !== undefined && parseBoolean(query.isActive) === null)
    return "isActive must be true or false.";
  const requestedSort = query.sort === undefined ? "-createdAt" : query.sort;
  const field = requestedSort.startsWith("-") ? requestedSort.slice(1) : requestedSort;
  if (!sortableFields.has(field)) return "Unsupported sort field.";
  return null;
};

const getSort = (value) => {
  const requested = value === undefined ? "-createdAt" : value;
  const descending = requested.startsWith("-");
  return { [descending ? requested.slice(1) : requested]: descending ? -1 : 1, _id: 1 };
};

const list = async (req, res) => {
  try {
    const queryError = validateListQuery(req.query);
    if (queryError) return sendError(res, 400, queryError);
    const filter = {};
    for (const field of ["type", "status", "format"]) {
      if (req.query[field] !== undefined) filter[field] = req.query[field];
    }
    if (req.query.isActive !== undefined) filter.isActive = parseBoolean(req.query.isActive);
    if (req.query.search?.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const expression = new RegExp(escaped, "i");
      filter.$or = ["name", "key", "description", "provider"].map((field) => ({ [field]: expression }));
    }
    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      DataSource.find(filter).populate(populateOptions).sort(getSort(req.query.sort)).skip(skip).limit(limit).lean(),
      DataSource.countDocuments(filter),
    ]);
    return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid data source ID.");
    const dataSource = await DataSource.findById(req.params.id).populate(populateOptions).lean();
    if (!dataSource) return sendError(res, 404, "Data source not found.");
    return res.json({ success: true, data: dataSource });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const create = async (req, res) => {
  try {
    const { data, error, details } = validateBody(req.body, { required: ["name", "key", "type"] });
    if (error) return sendError(res, 400, error, details);
    const dataSource = await DataSource.create({ ...data, createdBy: req.user._id, updatedBy: req.user._id });
    await dataSource.populate(populateOptions);
    return res.status(201).json({ success: true, data: dataSource });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const update = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid data source ID.");
    const { data, error, details } = validateBody(req.body);
    if (error) return sendError(res, 400, error, details);
    if (!Object.keys(data).length) return sendError(res, 400, "At least one updatable field is required.");
    const dataSource = await DataSource.findById(req.params.id);
    if (!dataSource) return sendError(res, 404, "Data source not found.");
    dataSource.set(data);
    dataSource.updatedBy = req.user._id;
    await dataSource.save();
    await dataSource.populate(populateOptions);
    return res.json({ success: true, data: dataSource });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const remove = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid data source ID.");
    const dataSource = await DataSource.findByIdAndDelete(req.params.id);
    if (!dataSource) return sendError(res, 404, "Data source not found.");
    return res.json({ success: true, message: "Data source deleted successfully." });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

module.exports = { create, getById, list, remove, update };