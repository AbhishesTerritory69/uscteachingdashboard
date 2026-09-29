const { authorize, protect } = require("./auth");

const optionalAuth = (req, res, next) => {
  const authorization = req.get("authorization");
  if (!authorization && !req.cookies?.token) return next();

  return protect(req, res, () =>
    authorize("admin", "editor")(req, res, next),
  );
};

module.exports = optionalAuth;