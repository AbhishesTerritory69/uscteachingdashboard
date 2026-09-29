const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const { handleUploadError, parseSingleCsv } = require("../middlewares/importUpload");
const importController = require("../controllers/importController");

const router = express.Router();
const editorOrAdmin = [protect, authorize("admin", "editor")];
const adminOnly = [protect, authorize("admin")];

router.post(
  "/validate",
  ...editorOrAdmin,
  parseSingleCsv,
  importController.validateUpload,
  handleUploadError,
);
router.post(
  "/",
  ...editorOrAdmin,
  parseSingleCsv,
  importController.executeImport,
  handleUploadError,
);
router.get("/", ...editorOrAdmin, importController.list);
router.get("/:id/errors", ...editorOrAdmin, importController.getErrors);
router.get("/:id", ...editorOrAdmin, importController.getById);
router.delete("/:id", ...adminOnly, importController.remove);

module.exports = router;