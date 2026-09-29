const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const { departmentController, eventController, facultyController, galleryController, noticeController, pageController, programController, userController } = require("../controllers/resourceControllers");
const courseController = require("../controllers/courseController");
const courseOutlineController = require("../controllers/courseOutlineController");
const teachingActivityController = require("../controllers/teachingActivityController");
const dashboardController = require("../controllers/dashboardController");
const optionalAuth = require("../middlewares/optionalAuth");
const { admission, contact } = require("../controllers/submissionControllers");

const router = express.Router();
const admin = [protect, authorize("admin", "editor")];
const adminOnly = [protect, authorize("admin")];

const mountCrud = (path, controller, options = {}) => {
  const readAccess = options.adminOnly ? adminOnly : [];
  const writeAccess = options.adminOnly ? adminOnly : admin;
  router.get(path, ...readAccess, controller.list);
  router.get(`${path}/:id`, ...readAccess, controller.getById);
  router.post(path, ...writeAccess, controller.create);
  router.patch(`${path}/:id`, ...writeAccess, controller.update);
  router.put(`${path}/:id`, ...writeAccess, controller.update);
  router.delete(`${path}/:id`, ...writeAccess, controller.remove);
};

mountCrud("/departments", departmentController);
mountCrud("/programs", programController);
router.get("/faculty/:facultyId/workload", ...admin, dashboardController.facultyWorkload);
mountCrud("/faculty", facultyController);
router.get("/courses", courseController.list);
router.get("/courses/:courseId/outline", optionalAuth, courseOutlineController.byCourse);
router.get("/courses/:courseId/allocation", ...admin, dashboardController.courseAllocation);
router.get("/courses/:id", courseController.getById);
router.post("/courses", ...admin, courseController.create);
router.patch("/courses/:id", ...admin, courseController.update);
router.put("/courses/:id", ...admin, courseController.update);
router.delete("/courses/:id", ...admin, courseController.remove);
router.get("/teaching-activities", teachingActivityController.list);
router.get("/teaching-activities/faculty/:facultyId", teachingActivityController.listForFaculty);
router.get("/teaching-activities/course/:courseId", teachingActivityController.listForCourse);
router.get("/teaching-activities/:id", teachingActivityController.getById);
router.post("/teaching-activities", ...admin, teachingActivityController.create);
router.patch("/teaching-activities/:id", ...admin, teachingActivityController.update);
router.put("/teaching-activities/:id", ...admin, teachingActivityController.update);
router.delete("/teaching-activities/:id", ...admin, teachingActivityController.remove);
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
