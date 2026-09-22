const Department = require("../models/Department");
const Program = require("../models/Program");
const Faculty = require("../models/Faculty");
const Notice = require("../models/Notice");
const Event = require("../models/Event");
const Gallery = require("../models/Gallery");
const Page = require("../models/Page");
const User = require("../models/User");
const createCrudController = require("./crudController");
const { isValidObjectId } = require("../utils/controllerHelpers");
const {
  handleControllerError,
  sendError,
  validateRequired,
} = require("../utils/controllerHelpers");
const { hashPassword } = require("./authController");

const referenceExists = (Model, field) => async (data) => {
  if (data[field] === undefined) return null;
  if (data[field] === null || !isValidObjectId(data[field]))
    return `${field} must be a valid reference.`;
  if (!(await Model.exists({ _id: data[field] })))
    return `${field} reference does not exist.`;
  return null;
};

const departmentController = createCrudController({
  model: Department,
  fields: [
    "name",
    "slug",
    "shortDescription",
    "description",
    "image",
    "headOfDepartment",
    "isActive",
  ],
  required: ["name", "slug"],
  populate: [
    { path: "headOfDepartment", select: "name designation email image" },
  ],
  validate: referenceExists(Faculty, "headOfDepartment"),
});

const programController = createCrudController({
  model: Program,
  fields: [
    "name",
    "slug",
    "degree",
    "duration",
    "description",
    "eligibility",
    "department",
    "image",
    "isActive",
  ],
  required: ["name", "slug", "degree", "department"],
  populate: [{ path: "department", select: "name slug" }],
  validate: referenceExists(Department, "department"),
});

const facultyController = createCrudController({
  model: Faculty,
  fields: [
    "name",
    "designation",
    "qualification",
    "specialization",
    "email",
    "phone",
    "bio",
    "image",
    "department",
    "isActive",
    "displayOrder",
  ],
  required: ["name", "designation"],
  populate: [{ path: "department", select: "name slug" }],
  validate: referenceExists(Department, "department"),
});

const noticeController = createCrudController({
  model: Notice,
  fields: [
    "title",
    "slug",
    "description",
    "content",
    "category",
    "attachment",
    "publishedAt",
    "isPublished",
    "isFeatured",
    "createdBy",
  ],
  required: ["title", "slug"],
  publicFilter: { isPublished: true },
  populate: [{ path: "createdBy", select: "name email role" }],
  prepare: async (data, req) => {
    if (req.user && data.createdBy === undefined) data.createdBy = req.user._id;
  },
});

const eventController = createCrudController({
  model: Event,
  fields: [
    "title",
    "slug",
    "description",
    "image",
    "location",
    "startDate",
    "endDate",
    "category",
    "isPublished",
  ],
  required: ["title", "slug", "startDate"],
  publicFilter: { isPublished: true },
  validate: async (data) => {
    if (
      data.endDate !== undefined &&
      data.startDate !== undefined &&
      new Date(data.endDate) < new Date(data.startDate)
    )
      return "endDate cannot be earlier than startDate.";
    if (
      data.startDate !== undefined &&
      Number.isNaN(new Date(data.startDate).getTime())
    )
      return "startDate must be a valid date.";
    if (
      data.endDate !== undefined &&
      Number.isNaN(new Date(data.endDate).getTime())
    )
      return "endDate must be a valid date.";
    return null;
  },
});

const galleryController = createCrudController({
  model: Gallery,
  fields: ["title", "description", "images", "category", "isPublished"],
  required: ["title", "images"],
  publicFilter: { isPublished: true },
  validate: async (data) => {
    if (
      data.images !== undefined &&
      (!Array.isArray(data.images) ||
        !data.images.length ||
        data.images.some(
          (image) =>
            !image || typeof image.url !== "string" || !image.url.trim(),
        ))
    )
      return "images must be a non-empty array of objects with url values.";
    return null;
  },
});

const pageController = createCrudController({
  model: Page,
  fields: [
    "title",
    "slug",
    "content",
    "featuredImage",
    "metaTitle",
    "metaDescription",
    "isPublished",
    "updatedBy",
  ],
  required: ["title", "slug", "content"],
  publicFilter: { isPublished: true },
  prepare: async (data, req) => {
    if (req.user) data.updatedBy = req.user._id;
  },
  populate: [{ path: "updatedBy", select: "name email role" }],
});

const userController = {
  list: async (req, res) => {
    try {
      const users = await User.find().select("-password").sort("name").lean();
      return res.json({ success: true, data: users });
    } catch (error) {
      return handleControllerError(res, error);
    }
  },
  getById: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return sendError(res, 400, "Invalid user ID.");
      const user = await User.findById(req.params.id)
        .select("-password")
        .lean();
      if (!user) return sendError(res, 404, "User not found.");
      return res.json({ success: true, data: user });
    } catch (error) {
      return handleControllerError(res, error);
    }
  },
  create: async (req, res) => {
    try {
      const missing = validateRequired(req.body, ["name", "email", "password"]);
      if (missing.length)
        return sendError(res, 400, "Required fields are missing.", missing);
      if (String(req.body.password).length < 6)
        return sendError(
          res,
          400,
          "Password must be at least 6 characters long.",
        );
      const email = String(req.body.email).trim().toLowerCase();
      if (await User.exists({ email }))
        return sendError(
          res,
          409,
          "An account with this email already exists.",
        );
      const user = await User.create({
        name: String(req.body.name).trim(),
        email,
        password: hashPassword(String(req.body.password)),
        role: req.body.role || "editor",
        isActive: req.body.isActive,
      });
      return res
        .status(201)
        .json({
          success: true,
          data: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
          },
        });
    } catch (error) {
      return handleControllerError(res, error);
    }
  },
  update: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return sendError(res, 400, "Invalid user ID.");
      const data = Object.fromEntries(
        ["name", "email", "role", "isActive"]
          .filter((field) => req.body[field] !== undefined)
          .map((field) => [field, req.body[field]]),
      );
      if (!Object.keys(data).length)
        return sendError(res, 400, "At least one updatable field is required.");
      if (data.email) data.email = String(data.email).trim().toLowerCase();
      const user = await User.findByIdAndUpdate(req.params.id, data, {
        new: true,
        runValidators: true,
      })
        .select("-password")
        .lean();
      if (!user) return sendError(res, 404, "User not found.");
      return res.json({ success: true, data: user });
    } catch (error) {
      return handleControllerError(res, error);
    }
  },
  remove: async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id))
        return sendError(res, 400, "Invalid user ID.");
      if (req.params.id === String(req.user._id))
        return sendError(res, 400, "You cannot delete your own account.");
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return sendError(res, 404, "User not found.");
      return res.json({ success: true, message: "User deleted successfully." });
    } catch (error) {
      return handleControllerError(res, error);
    }
  },
};

module.exports = {
  departmentController,
  eventController,
  facultyController,
  galleryController,
  noticeController,
  pageController,
  programController,
  userController,
};
