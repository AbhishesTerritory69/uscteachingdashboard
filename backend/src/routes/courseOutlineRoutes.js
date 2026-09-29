const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const optionalAuth = require("../middlewares/optionalAuth");
const courseOutlineController = require("../controllers/courseOutlineController");

const router = express.Router();
const admin = [protect, authorize("admin", "editor")];

router.get("/", optionalAuth, courseOutlineController.list);
router.get("/:id", optionalAuth, courseOutlineController.getById);
router.post("/", ...admin, courseOutlineController.create);
router.patch("/:id", ...admin, courseOutlineController.update);
router.put("/:id", ...admin, courseOutlineController.update);
router.delete("/:id", ...admin, courseOutlineController.remove);

module.exports = router;