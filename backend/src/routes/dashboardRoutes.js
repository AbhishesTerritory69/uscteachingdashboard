const express = require("express");
const { protect, authorize } = require("../middlewares/auth");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();
const dashboardAccess = [protect, authorize("admin", "editor")];

router.get("/summary", ...dashboardAccess, dashboardController.dashboardSummary);
router.get("/workload", ...dashboardAccess, dashboardController.workloadSummary);
router.get("/departments", ...dashboardAccess, dashboardController.departmentWorkload);
router.get("/alerts", ...dashboardAccess, dashboardController.alerts);

module.exports = router;