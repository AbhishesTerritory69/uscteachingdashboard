const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const dataSourceController = require("../controllers/dataSourceController");

const router = express.Router();
const editorOrAdmin = [protect, authorize("admin", "editor")];
const adminOnly = [protect, authorize("admin")];

router.get("/", ...editorOrAdmin, dataSourceController.list);
router.get("/:id", ...editorOrAdmin, dataSourceController.getById);
router.post("/", ...editorOrAdmin, dataSourceController.create);
router.patch("/:id", ...editorOrAdmin, dataSourceController.update);
router.put("/:id", ...editorOrAdmin, dataSourceController.update);
router.delete("/:id", ...adminOnly, dataSourceController.remove);

module.exports = router;