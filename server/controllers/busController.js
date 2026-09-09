const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const College = require("../models/College");
const User = require("../models/User");

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
 * Add a new bus record to database
 */
const addBus = async (req, res) => {
  try {
    const {
      busNumber,
      driverName,
      driverPhone,
      route,
      totalSeats,
      availableSeats,
      status,
      collegeId,
    } = req.body;

    // Validate request data
    if (!busNumber || !driverName || !driverPhone || !route || totalSeats === undefined || availableSeats === undefined) {
      return res.status(400).json({
        message: "Missing required fields.",
      });
    }

    let targetCollegeId = await getRequestCollegeId(req) || collegeId;
    if (!targetCollegeId) {
      const defaultCol = await College.findOne({ code: "MAIN" });
      if (defaultCol) targetCollegeId = defaultCol._id;
    }

    // Check if the bus number already exists in this college
    const existingBus = await Bus.findOne({ busNumber: busNumber.trim(), collegeId: targetCollegeId });
    if (existingBus) {
      return res.status(400).json({
        message: `Bus number ${busNumber} already exists for this college.`,
      });
    }

    // Create the bus document
    const bus = await Bus.create({
      busNumber: busNumber.trim(),
      collegeId: targetCollegeId,
      driverName: driverName.trim(),
      driverPhone: driverPhone.trim(),
      route: route.trim(),
      totalSeats: Number(totalSeats),
      availableSeats: Number(availableSeats),
      status: status || "Active",
    });

    const populatedBus = await Bus.findById(bus._id).populate("collegeId", "name code");

    res.status(201).json({
      success: true,
      message: "Bus added successfully.",
      bus: populatedBus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Fetch all bus records from database
 */
const getAllBuses = async (req, res) => {
  try {
    const targetCollegeId = await getRequestCollegeId(req);
    const query = {};

    if (targetCollegeId) {
      query.collegeId = targetCollegeId;
    }

    const buses = await Bus.find(query).populate("collegeId", "name code").sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      buses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateBus = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCollegeId = await getRequestCollegeId(req);

    const busToUpdate = await Bus.findById(id);
    if (!busToUpdate) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (targetCollegeId && busToUpdate.collegeId && busToUpdate.collegeId.toString() !== targetCollegeId) {
      return res.status(403).json({ message: "Forbidden: You cannot modify a bus belonging to another college." });
    }

    const {
      busNumber,
      driverName,
      driverPhone,
      route,
      totalSeats,
      availableSeats,
      status,
    } = req.body;

    if (busNumber) busToUpdate.busNumber = busNumber;
    if (driverName) busToUpdate.driverName = driverName;
    if (driverPhone) busToUpdate.driverPhone = driverPhone;
    if (route) busToUpdate.route = route;
    if (totalSeats !== undefined) busToUpdate.totalSeats = totalSeats;
    if (availableSeats !== undefined) busToUpdate.availableSeats = availableSeats;
    if (status) busToUpdate.status = status;

    await busToUpdate.save();

    res.status(200).json({
      success: true,
      message: "Bus updated successfully.",
      bus: busToUpdate,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteBus = async (req, res) => {
  try {
    const { id } = req.params;
    const targetCollegeId = await getRequestCollegeId(req);

    const busToDelete = await Bus.findById(id);
    if (!busToDelete) {
      return res.status(404).json({ message: "Bus not found" });
    }

    if (targetCollegeId && busToDelete.collegeId && busToDelete.collegeId.toString() !== targetCollegeId) {
      return res.status(403).json({ message: "Forbidden: You cannot delete a bus belonging to another college." });
    }

    await Bus.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Bus deleted successfully.",
      bus: busToDelete,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const generateBusQr = async (req, res) => {
  try {
    const { id } = req.params;
    const bus = await Bus.findById(id);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found",
      });
    }

    // 1. Check whether that bus already has a qrId
    let qrId = bus.qrId || bus.qrCode;

    if (!qrId) {
      // 2. If no, generate a unique qrId and save it to that bus document
      const uniqueHash = Math.random().toString(36).substring(2, 8).toUpperCase();
      const cleanBusNumber = bus.busNumber.replace(/\s+/g, '-').toUpperCase();
      qrId = `CBTS-BUS-${cleanBusNumber}-${uniqueHash}`;

      bus.qrId = qrId;
      bus.qrCode = qrId;
      await bus.save();
    } else if (!bus.qrId) {
      // Ensure qrId field is synced if qrCode existed previously
      bus.qrId = qrId;
      await bus.save();
    }

    // 3. The QR encodes the bus's unique ID and qrId
    const qrData = JSON.stringify({
      busId: bus._id.toString(),
      busNumber: bus.busNumber,
      qrId: qrId,
    });

    res.status(200).json({
      success: true,
      message: "Bus QR generated and loaded successfully.",
      qrId: qrId,
      qrCode: qrId,
      qrData: qrData,
      bus,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const validateBusQr = async (req, res) => {
  try {
    const { busId, qrId } = req.body;

    if (!busId && !qrId) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Invalid Bus QR",
      });
    }

    let bus = null;
    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    }

    if (!bus && qrId) {
      bus = await Bus.findOne({
        $or: [{ qrId: qrId }, { qrCode: qrId }],
      });
    }

    if (!bus) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: "Invalid Bus QR",
      });
    }

    // Check if the qrId matches this specific bus
    const storedQrId = bus.qrId || bus.qrCode;
    if (storedQrId && qrId && storedQrId !== qrId) {
      return res.status(400).json({
        success: false,
        valid: false,
        message: "Invalid Bus QR",
      });
    }

    return res.status(200).json({
      success: true,
      valid: true,
      message: `Valid Bus QR – Bus ${bus.busNumber}`,
      busNumber: bus.busNumber,
      bus: {
        _id: bus._id,
        busNumber: bus.busNumber,
        route: bus.route,
        driverName: bus.driverName,
        driverPhone: bus.driverPhone,
        status: bus.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      valid: false,
      message: "Invalid Bus QR",
      error: error.message,
    });
  }
};

module.exports = {
  addBus,
  getAllBuses,
  updateBus,
  deleteBus,
  generateBusQr,
  validateBusQr,
};
