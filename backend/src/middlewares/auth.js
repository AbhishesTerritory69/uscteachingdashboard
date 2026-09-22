const crypto = require("crypto");
const User = require("../models/User");

const base64UrlEncode = (value) => Buffer.from(value).toString("base64url");

const signToken = (payload) => {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "development-secret")
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
};

const verifyToken = (token) => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = crypto
    .createHmac("sha256", process.env.JWT_SECRET || "development-secret")
    .update(`${parts[0]}.${parts[1]}`)
    .digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected))) return null;
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
};

const protect = async (req, res, next) => {
  try {
    const header = req.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required." });

    const payload = verifyToken(token);
    if (!payload?.id) return res.status(401).json({ success: false, message: "Invalid or expired token." });

    const user = await User.findById(payload.id).select("-password").lean();
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "User is inactive or no longer exists." });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: "Authentication required." });
  if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: "You do not have permission for this operation." });
  next();
};

module.exports = { authorize, protect, signToken };
