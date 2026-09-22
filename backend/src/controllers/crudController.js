const {
  getPagination,
  handleControllerError,
  isValidObjectId,
  parseBoolean,
  sendError,
  validateRequired
} = require("../utils/controllerHelpers");

const createCrudController = ({ model, fields, required = [], populate = [], publicFilter = {}, prepare, validate }) => {
  const projection = model.modelName === "User" ? "-password" : undefined;

  const list = async (req, res) => {
    try {
      const filter = req.user ? {} : { ...publicFilter };
      if (req.query.isActive !== undefined) {
        const isActive = parseBoolean(req.query.isActive);
        if (isActive === null) return sendError(res, 400, "isActive must be true or false.");
        filter.isActive = isActive;
      }
      if (req.query.isPublished !== undefined) {
        const isPublished = parseBoolean(req.query.isPublished);
        if (isPublished === null) return sendError(res, 400, "isPublished must be true or false.");
        if (!req.user && publicFilter.isPublished !== undefined && isPublished !== publicFilter.isPublished) return sendError(res, 403, "Only published resources are publicly available.");
        filter.isPublished = isPublished;
      }
      for (const field of ["category", "department", "status", "slug"]) {
        if (req.query[field] !== undefined) {
          if (["department"].includes(field) && !isValidObjectId(req.query[field])) return sendError(res, 400, `Invalid ${field} reference.`);
          filter[field] = req.query[field];
        }
      }

      const { page, limit, skip } = getPagination(req.query);
      const query = model.find(filter).select(projection).sort(req.query.sort || "-createdAt").skip(skip).limit(limit);
      populate.forEach((path) => query.populate(path));
      const [items, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);
      return res.json({ success: true, data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
      return handleControllerError(res, error);
    }
  };

  const getById = async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid resource ID.");
      const query = model.findById(req.params.id).select(projection);
      populate.forEach((path) => query.populate(path));
      const item = await query.lean();
      if (!item) return sendError(res, 404, "Resource not found.");
      return res.json({ success: true, data: item });
    } catch (error) {
      return handleControllerError(res, error);
    }
  };

  const create = async (req, res) => {
    try {
      const missing = validateRequired(req.body, required);
      if (missing.length) return sendError(res, 400, "Required fields are missing.", missing);
      const data = Object.fromEntries(fields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
      if (prepare) await prepare(data, req);
      if (validate) {
        const validationError = await validate(data, req);
        if (validationError) return sendError(res, 400, validationError);
      }
      const item = await model.create(data);
      return res.status(201).json({ success: true, data: item });
    } catch (error) {
      return handleControllerError(res, error);
    }
  };

  const update = async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid resource ID.");
      const data = Object.fromEntries(fields.filter((field) => req.body[field] !== undefined).map((field) => [field, req.body[field]]));
      if (!Object.keys(data).length) return sendError(res, 400, "At least one updatable field is required.");
      if (prepare) await prepare(data, req);
      if (validate) {
        const validationError = await validate(data, req);
        if (validationError) return sendError(res, 400, validationError);
      }
      const item = await model.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true }).select(projection);
      if (!item) return sendError(res, 404, "Resource not found.");
      return res.json({ success: true, data: item });
    } catch (error) {
      return handleControllerError(res, error);
    }
  };

  const remove = async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) return sendError(res, 400, "Invalid resource ID.");
      const item = await model.findByIdAndDelete(req.params.id).select(projection);
      if (!item) return sendError(res, 404, "Resource not found.");
      return res.json({ success: true, message: "Resource deleted successfully." });
    } catch (error) {
      return handleControllerError(res, error);
    }
  };

  return { create, getById, list, remove, update };
};

module.exports = createCrudController;
