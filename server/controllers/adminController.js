const User = require("../models/User");
const Bus = require("../models/Bus");

/**
 * Helper to resolve authenticated user and target collegeId
 */
const getRequestCollegeId = async (req) => {
  const userId = req.headers["x-user-id"] || (req.body && req.body.userId);
  if (userId) {
    const user = await User.findById(userId);
    if (user && user.role !== "super_admin" && user.collegeId) {
      return user.collegeId.toString();
    }
  }
  const headerCol = req.headers["x-college-id"];
  if (headerCol && headerCol !== "ALL" && headerCol !== "null" && headerCol !== "undefined") {
    return headerCol;
  }
  const queryCol = req.query ? req.query.collegeId : null;
  if (queryCol && queryCol !== "ALL" && queryCol !== "null" && queryCol !== "undefined") {
    return queryCol;
  }
  const bodyCol = req.body ? req.body.collegeId : null;
  if (bodyCol && bodyCol !== "ALL" && bodyCol !== "null" && bodyCol !== "undefined") {
    return bodyCol;
  }
  return null;
};

/**
 * Fetch all students whose status is "Pending" for the targeted college
 */
const getPendingStudents = async (req, res) => {
  try {
    const targetCollegeId = await getRequestCollegeId(req);
    const query = { role: "student", status: "Pending" };
    
    if (targetCollegeId) {
      query.collegeId = targetCollegeId;
    }

    const students = await User.find(query).populate("collegeId").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Approve a student's registration
 */
const approveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCollegeId = await getRequestCollegeId(req);

    const existingStudent = await User.findById(id);
    if (!existingStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (targetCollegeId && existingStudent.collegeId && existingStudent.collegeId.toString() !== targetCollegeId) {
      return res.status(403).json({ message: "Forbidden: You cannot modify students from another college." });
    }

    existingStudent.status = "Approved";
    await existingStudent.save();

    res.status(200).json({
      success: true,
      message: "Student registration approved successfully.",
      student: existingStudent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Reject a student's registration
 */
const rejectStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCollegeId = await getRequestCollegeId(req);

    const existingStudent = await User.findById(id);
    if (!existingStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (targetCollegeId && existingStudent.collegeId && existingStudent.collegeId.toString() !== targetCollegeId) {
      return res.status(403).json({ message: "Forbidden: You cannot modify students from another college." });
    }

    existingStudent.status = "Rejected";
    await existingStudent.save();

    res.status(200).json({
      success: true,
      message: "Student registration rejected successfully.",
      student: existingStudent,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Fetch all Approved students who do not have a bus assigned
 */
const getUnassignedStudents = async (req, res) => {
  try {
    const targetCollegeId = await getRequestCollegeId(req);
    const query = { role: "student", status: "Approved" };

    if (targetCollegeId) {
      query.collegeId = targetCollegeId;
    }

    const students = await User.find(query).populate("collegeId").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Assign a bus to a student
 */
const assignBus = async (req, res) => {
  try {
    const { studentId, busId } = req.body;
    const targetCollegeId = await getRequestCollegeId(req);

    if (!studentId || !busId) {
      return res.status(400).json({ message: "Student ID and Bus ID are required" });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (targetCollegeId && bus.collegeId && bus.collegeId.toString() !== targetCollegeId) {
      return res.status(403).json({ message: "Forbidden: Selected bus belongs to another college." });
    }

    if (bus.availableSeats <= 0) {
      return res.status(400).json({ message: "No available seats in this bus" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (targetCollegeId && student.collegeId && student.collegeId.toString() !== targetCollegeId) {
      return res.status(403).json({ message: "Forbidden: Student belongs to another college." });
    }

    // Update Bus available seats
    bus.availableSeats -= 1;
    await bus.save();

    // Update Student details
    student.busId = busId;
    student.status = "Assigned";
    await student.save();

    res.status(200).json({
      success: true,
      message: "Bus assigned to student successfully.",
      student,
      bus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getPendingStudents,
  approveStudent,
  rejectStudent,
  getUnassignedStudents,
  assignBus,
};
