const mongoose = require("mongoose");
const Bus = require("../models/Bus");

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
    } = req.body;

    // Validate request data
    if (!busNumber || !driverName || !driverPhone || !route || totalSeats === undefined || availableSeats === undefined) {
      return res.status(400).json({
        message: "Missing required fields.",
      });
    }

    // Check if the bus number already exists
    const existingBus = await Bus.findOne({ busNumber });
    if (existingBus) {
      return res.status(400).json({
        message: `Bus number ${busNumber} already exists.`,
      });
    }

    // Create the bus document
    const bus = await Bus.create({
      busNumber,
      driverName,
      driverPhone,
      route,
      totalSeats,
      availableSeats,
      status: status || "Active",
    });

    res.status(201).json({
      success: true,
      message: "Bus added successfully.",
      bus,
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
    const buses = await Bus.find().sort({ createdAt: -1 });
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
    const {
      busNumber,
      driverName,
      driverPhone,
      route,
      totalSeats,
      availableSeats,
      status,
    } = req.body;

    const updatedBus = await Bus.findByIdAndUpdate(
      id,
      {
        busNumber,
        driverName,
        driverPhone,
        route,
        totalSeats,
        availableSeats,
        status,
      },
      { new: true }
    );

    if (!updatedBus) {
      return res.status(404).json({
        message: "Bus not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bus updated successfully.",
      bus: updatedBus,
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

    const deletedBus = await Bus.findByIdAndDelete(id);

    if (!deletedBus) {
      return res.status(404).json({
        message: "Bus not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Bus deleted successfully.",
      bus: deletedBus,
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
