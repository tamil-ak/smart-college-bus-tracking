const express = require("express");
const router = express.Router();
const { getPendingStudents, approveStudent, rejectStudent, getUnassignedStudents, assignBus } = require("../controllers/adminController");

router.get("/pending", getPendingStudents);
router.put("/approve/:id", approveStudent);
router.put("/reject/:id", rejectStudent);
router.get("/unassigned-students", getUnassignedStudents);
router.post("/assign-bus", assignBus);

module.exports = router;
