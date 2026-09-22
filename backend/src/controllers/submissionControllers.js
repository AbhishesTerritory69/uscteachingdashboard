const Admission = require("../models/Admission");
const ContactMessage = require("../models/ContactMessage");
const Program = require("../models/Program");
const { getPagination, handleControllerError, isValidObjectId, parseBoolean, sendError, validateRequired } = require("../utils/controllerHelpers");

const emailIsValid = (email) => /^\S+@\S+\.\S+$/.test(email);
const statusValues = {
  admission: ["new", "contacted", "processing", "approved", "rejected"],
  contact: ["unread", "read", "replied"]
};

const submit = (Model, required, validate) => async (req, res) => {
  try {
    const missing = validateRequired(req.body, required);
    if (missing.length) return sendError(res, 400, "Required fields are missing.", missing);
    const error = validate(req.body);
    if (error) return sendError(res, 400, error);
    const data = Object.fromEntries(Object.keys(Model.schema.paths).filter((field) => field !== "_id" && req.body[field] !== undefined).map((field) => [field, req.body[field]]));
    if (data.program !== undefined) {
      if (!isValidObjectId(data.program)) return sendError(res, 400, "program must be a valid reference.");
      if (!(await Program.exists({ _id: data.program }))) return sendError(res, 400, "program reference does not exist.");
    }
    const item = await Model.create(data);
    return res.status(201).json({ success: true, data: item });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const adminList = (Model, type) => async (req, res) => {
  try {
    const filter = {};
    if (req.query.status !== undefined) {
      if (!statusValues[type].includes(req.query.status)) return sendError(res, 400, "Invalid status value.");
      filter.status = req.query.status;
    }
    const { page, limit, skip } = getPagination(req.query);
    const [data, total] = await Promise.all([
      Model.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
      Model.countDocuments(filter)
    ]);
    return res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const updateStatus = (Model, type) => async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid resource ID.");
    if (!statusValues[type].includes(req.body.status)) return sendError(res, 400, "Invalid status value.");
    const item = await Model.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }).lean();
    if (!item) return sendError(res, 404, "Resource not found.");
    return res.json({ success: true, data: item });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const getById = (Model) => async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid resource ID.");
    const item = await Model.findById(req.params.id).populate("program", "name slug degree").lean();
    if (!item) return sendError(res, 404, "Resource not found.");
    return res.json({ success: true, data: item });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const admission = {
  create: submit(Admission, ["fullName", "email", "phone"], (body) => !emailIsValid(String(body.email).trim().toLowerCase()) ? "A valid email address is required." : null),
  list: adminList(Admission, "admission"),
  getById: getById(Admission),
  updateStatus: updateStatus(Admission, "admission")
};

const contact = {
  create: submit(ContactMessage, ["name", "email", "subject", "message"], (body) => !emailIsValid(String(body.email).trim().toLowerCase()) ? "A valid email address is required." : null),
  list: adminList(ContactMessage, "contact"),
  getById: getById(ContactMessage),
  updateStatus: updateStatus(ContactMessage, "contact")
};

module.exports = { admission, contact };
