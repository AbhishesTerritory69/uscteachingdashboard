const crypto = require("crypto");

const User = require("../models/User");

const {
  handleControllerError,
  sendError,
  validateRequired,
} = require("../utils/controllerHelpers");

const { signToken } = require("../middlewares/auth");

const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex")
) => {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const passwordMatches = (password, stored) => {
  const [salt, expected] = String(stored).split(":");

  if (!salt || !expected) return false;

  const actual = crypto.scryptSync(password, salt, 64).toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(actual, "hex"),
    Buffer.from(expected, "hex")
  );
};

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
});

const issueToken = (user) =>
  signToken({
    id: user._id.toString(),
    role: user.role,
    exp:
      Math.floor(Date.now() / 1000) +
      (Number.parseInt(process.env.JWT_EXPIRES_IN, 10) || 86400),
  });

const register = async (req, res) => {
  try {
    const body = req.body || {};

    const missing = validateRequired(body, [
      "name",
      "email",
      "password",
    ]);

    if (missing.length) {
      return sendError(
        res,
        400,
        "Required fields are missing.",
        missing
      );
    }

    const name = String(body.name).trim();
    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);

    if (!name) {
      return sendError(res, 400, "Name is required.");
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return sendError(
        res,
        400,
        "A valid email address is required."
      );
    }

    if (password.length < 6) {
      return sendError(
        res,
        400,
        "Password must be at least 6 characters long."
      );
    }

    const exists = await User.exists({ email });

    if (exists) {
      return sendError(
        res,
        409,
        "An account with this email already exists."
      );
    }

    const user = await User.create({
      name,
      email,
      password: hashPassword(password),

      // Public registration can only create an editor.
      role: "editor",
    });

    return res.status(201).json({
      success: true,
      user: publicUser(user),
      token: issueToken(user),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const login = async (req, res) => {
  try {
    const body = req.body || {};

    const missing = validateRequired(body, [
      "email",
      "password",
    ]);

    if (missing.length) {
      return sendError(
        res,
        400,
        "Email and password are required.",
        missing
      );
    }

    const email = String(body.email).trim().toLowerCase();
    const password = String(body.password);

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return sendError(
        res,
        400,
        "A valid email address is required."
      );
    }

    const user = await User.findOne({ email });

    if (
      !user ||
      !user.isActive ||
      !passwordMatches(password, user.password)
    ) {
      return sendError(
        res,
        401,
        "Invalid email or password."
      );
    }

    return res.json({
      success: true,
      user: publicUser(user),
      token: issueToken(user),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
};

const me = (req, res) =>
  res.json({
    success: true,
    user: req.user,
  });

module.exports = {
  hashPassword,
  login,
  me,
  register,
};