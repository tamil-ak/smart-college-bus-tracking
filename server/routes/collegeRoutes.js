const express = require("express");
const router = express.Router();
const {
  createCollege,
  getAllColleges,
  getCollegeById,
  updateCollege,
  createCollegeAdmin,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getApprovedCollegeAdmins,
  getSuperAdminStats,
} = require("../controllers/collegeController");

router.post("/create", createCollege);
router.get("/all", getAllColleges);
router.get("/stats", getSuperAdminStats);
router.get("/pending-admins", getPendingAdminRequests);
router.put("/approve-admin/:id", approveAdminRequest);
router.put("/reject-admin/:id", rejectAdminRequest);
router.get("/approved-admins", getApprovedCollegeAdmins);
router.get("/:id", getCollegeById);
router.put("/update/:id", updateCollege);
router.post("/create-admin", createCollegeAdmin);

module.exports = router;
