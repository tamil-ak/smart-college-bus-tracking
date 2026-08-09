const User = require("../models/User");
const Bus = require("../models/Bus");

/**
 * Fetch all students whose status is "Pending"
 */
const getPendingStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student", status: "Pending" }).sort({ createdAt: -1 });
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

    const student = await User.findByIdAndUpdate(
      id,
      { status: "Approved" },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Student registration approved successfully.",
      student,
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

    const student = await User.findByIdAndUpdate(
      id,
      { status: "Rejected" },
      { new: true }
    );

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Student registration rejected successfully.",
      student,
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
    const students = await User.find({ role: "student", status: "Approved" }).sort({ createdAt: -1 });
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

    if (!studentId || !busId) {
      return res.status(400).json({ message: "Student ID and Bus ID are required" });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (bus.availableSeats <= 0) {
      return res.status(400).json({ message: "No available seats in this bus" });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
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
      bus
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
