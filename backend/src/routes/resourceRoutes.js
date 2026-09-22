const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const { departmentController, eventController, facultyController, galleryController, noticeController, pageController, programController, userController } = require("../controllers/resourceControllers");
const { admission, contact } = require("../controllers/submissionControllers");

const router = express.Router();
const admin = [protect, authorize("admin", "editor")];
const adminOnly = [protect, authorize("admin")];

const mountCrud = (path, controller, options = {}) => {
  router.get(path, controller.list);
  router.get(`${path}/:id`, controller.getById);
  router.post(path, ...admin, controller.create);
  router.patch(`${path}/:id`, ...admin, controller.update);
  router.put(`${path}/:id`, ...admin, controller.update);
  router.delete(`${path}/:id`, ...(options.adminOnly ? adminOnly : admin), controller.remove);
};

mountCrud("/departments", departmentController);
mountCrud("/programs", programController);
mountCrud("/faculty", facultyController);
mountCrud("/notices", noticeController);
mountCrud("/events", eventController);
mountCrud("/gallery", galleryController);
mountCrud("/pages", pageController);
mountCrud("/users", userController, { adminOnly: true });

router.post("/admissions", admission.create);
router.get("/admissions", ...admin, admission.list);
router.get("/admissions/:id", ...admin, admission.getById);
router.patch("/admissions/:id/status", ...admin, admission.updateStatus);
router.put("/admissions/:id/status", ...admin, admission.updateStatus);

router.post("/contact", contact.create);
router.get("/contact", ...admin, contact.list);
router.get("/contact/:id", ...admin, contact.getById);
router.patch("/contact/:id/status", ...admin, contact.updateStatus);
router.put("/contact/:id/status", ...admin, contact.updateStatus);

module.exports = router;
