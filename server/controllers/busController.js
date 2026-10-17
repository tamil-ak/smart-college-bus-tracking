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

/**
 * Default Route Waypoints for Kongu Engineering College Bus 3
 * Route: Kottapalli - Erode - Perundurai - Kongu Engineering College
 */
const DEFAULT_BUS_3_WAYPOINTS = [
  { name: "Kottapalli Origin", latitude: 11.3522, longitude: 77.7123 },
  { name: "Erode Bus Terminal", latitude: 11.3410, longitude: 77.7172 },
  { name: "Thindal Junction", latitude: 11.3120, longitude: 77.6740 },
  { name: "Vilarasampatti Stop", latitude: 11.3010, longitude: 77.6520 },
  { name: "Perundurai Old Bus Stand", latitude: 11.2820, longitude: 77.6250 },
  { name: "Kongu Engineering College Main Gate", latitude: 11.2742, longitude: 77.6070 },
];

// Active background simulation intervals keyed by busId
const activeSimulations = new Map();

/**
 * Ensure bus has initialized tracking structure and waypoints
 */
const ensureBusTrackingInitialized = async (bus) => {
  let modified = false;

  if (!bus.tracking) {
    bus.tracking = {};
    modified = true;
  }

  if (!bus.tracking.routeWaypoints || bus.tracking.routeWaypoints.length === 0) {
    bus.tracking.routeWaypoints = DEFAULT_BUS_3_WAYPOINTS;
    modified = true;
  }

  if (!bus.tracking.currentLocation || !bus.tracking.currentLocation.latitude) {
    const firstPoint = bus.tracking.routeWaypoints[0];
    bus.tracking.currentLocation = {
      latitude: firstPoint.latitude,
      longitude: firstPoint.longitude,
      speed: 0,
      heading: 0,
      accuracy: 5,
      timestamp: new Date(),
    };
    bus.tracking.source = "simulation";
    bus.tracking.status = "offline";
    bus.tracking.lastUpdated = new Date();
    bus.tracking.pathHistory = [
      {
        latitude: firstPoint.latitude,
        longitude: firstPoint.longitude,
        speed: 0,
        timestamp: new Date(),
      },
    ];
    modified = true;
  }

  if (modified) {
    await bus.save();
  }
  return bus;
};

/**
 * HARDWARE GPS INGESTION API
 * For future connection: ESP32 + NEO-6M GPS + SIM7600 4G
 * Expected future flow: GPS -> ESP32 -> SIM7600/Internet -> POST /api/bus/tracking/gps -> MongoDB
 */
const updateGpsLocation = async (req, res) => {
  try {
    const { busId, deviceKey, latitude, longitude, speed, heading, accuracy, timestamp } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and Longitude coordinates are required.",
      });
    }

    const latNum = Number(latitude);
    const lngNum = Number(longitude);

    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      return res.status(400).json({
        success: false,
        message: "Invalid GPS coordinates.",
      });
    }

    let bus = null;
    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    } else if (deviceKey) {
      bus = await Bus.findOne({ "tracking.deviceKey": deviceKey });
    }

    // Default fallback to Bus 3 if neither provided in development/testing
    if (!bus) {
      bus = await Bus.findOne({ busNumber: "3" });
    }

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Target bus for GPS tracking update was not found.",
      });
    }

    // Authenticate device key if configured on the bus
    if (bus.tracking?.deviceKey && deviceKey && bus.tracking.deviceKey !== deviceKey) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Invalid hardware device key.",
      });
    }

    await ensureBusTrackingInitialized(bus);

    const now = timestamp ? new Date(timestamp) : new Date();
    const speedNum = speed !== undefined ? Math.max(0, Number(speed)) : 0;
    const headingNum = heading !== undefined ? Number(heading) : 0;
    const accuracyNum = accuracy !== undefined ? Number(accuracy) : 2.5;

    // Record Real Hardware Telemetry
    bus.tracking.currentLocation = {
      latitude: latNum,
      longitude: lngNum,
      speed: speedNum,
      heading: headingNum,
      accuracy: accuracyNum,
      timestamp: now,
    };

    bus.tracking.source = "hardware";
    bus.tracking.status = "online";
    bus.tracking.lastUpdated = now;

    // Append to path history (capped to last 60 points)
    if (!bus.tracking.pathHistory) {
      bus.tracking.pathHistory = [];
    }
    bus.tracking.pathHistory.push({
      latitude: latNum,
      longitude: lngNum,
      speed: speedNum,
      timestamp: now,
    });
    if (bus.tracking.pathHistory.length > 60) {
      bus.tracking.pathHistory = bus.tracking.pathHistory.slice(-60);
    }

    await bus.save();

    return res.status(200).json({
      success: true,
      message: "Real hardware GPS telemetry recorded successfully.",
      source: "hardware",
      status: "online",
      busNumber: bus.busNumber,
      currentLocation: bus.tracking.currentLocation,
    });
  } catch (error) {
    console.error("Error in updateGpsLocation:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process GPS telemetry.",
    });
  }
};

/**
 * GET LIVE BUS TRACKING WITH STRICT ACCESS CONTROL
 * Rules:
 * - Super Admin: Blocked (403)
 * - College Admin: Only buses belonging to their college
 * - Student: Only their assigned bus
 * - Parent: Only the bus assigned to their linked child
 */
const getLiveTracking = async (req, res) => {
  try {
    const { busId } = req.params;

    if (!busId || !mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Bus ID is required.",
      });
    }

    const bus = await Bus.findById(busId).populate("collegeId", "name code");
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found.",
      });
    }

    // Role-Based Authorization
    const callerId = req.headers["x-user-id"];
    if (!callerId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access live bus tracking.",
      });
    }

    const user = await User.findById(callerId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user account not found.",
      });
    }

    // 1. Super Admin is strictly forbidden from viewing college operational live tracking
    if (user.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Super Admin does not have access to live bus operational tracking.",
      });
    }

        // 2. Student can only view their own assigned bus
        if (user.role === "student") {
          const userBusId = user.busId ? (user.busId._id ? user.busId._id.toString() : user.busId.toString()) : null;
          if (!userBusId || userBusId !== bus._id.toString()) {
            return res.status(403).json({
              success: false,
              message: "Forbidden: You are only authorized to track your assigned college bus.",
            });
          }
        }

        // 3. Parent can only view their linked child's assigned bus
        if (user.role === "parent") {
          if (!user.studentId) {
            return res.status(403).json({
              success: false,
              message: "Forbidden: No linked student profile found for this parent.",
            });
          }
          const child = await User.findById(user.studentId);
          const childBusId = child?.busId ? (child.busId._id ? child.busId._id.toString() : child.busId.toString()) : null;
          if (!childBusId || childBusId !== bus._id.toString()) {
            return res.status(403).json({
              success: false,
              message: "Forbidden: You are only authorized to track your child's assigned college bus.",
            });
          }
        }

        // 4. College Admin can only view buses belonging to their own college
        if (["admin", "college_admin"].includes(user.role)) {
          const userColId = user.collegeId ? user.collegeId.toString() : null;
          const busColId = bus.collegeId ? (bus.collegeId._id ? bus.collegeId._id.toString() : bus.collegeId.toString()) : null;
          if (userColId && busColId && userColId !== busColId) {
            return res.status(403).json({
              success: false,
              message: "Forbidden: You can only track buses belonging to your college campus.",
            });
          }
        }

    await ensureBusTrackingInitialized(bus);

    return res.status(200).json({
      success: true,
      bus: {
        _id: bus._id,
        busNumber: bus.busNumber,
        route: bus.route,
        driverName: bus.driverName,
        driverPhone: bus.driverPhone,
        collegeId: bus.collegeId,
        status: bus.status,
        tracking: {
          currentLocation: bus.tracking?.currentLocation || null,
          source: bus.tracking?.source || "simulation",
          status: bus.tracking?.status || "offline",
          lastUpdated: bus.tracking?.lastUpdated || null,
          routeWaypoints: bus.tracking?.routeWaypoints || DEFAULT_BUS_3_WAYPOINTS,
          pathHistory: bus.tracking?.pathHistory || [],
        },
      },
    });
  } catch (error) {
    console.error("Error in getLiveTracking:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch live bus tracking data.",
    });
  }
};

/**
 * ADVANCE SIMULATION STEP (Demo Mode)
 * Moves the bus smoothly along the predefined route waypoints for dev testing.
 * Source is always clearly marked as "simulation".
 */
const simulateStep = async (req, res) => {
  try {
    const { busId } = req.body;

    let bus = null;
    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    }
    if (!bus) {
      bus = await Bus.findOne({ busNumber: "3" });
    }
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Demo bus not found.",
      });
    }

    await ensureBusTrackingInitialized(bus);

    const waypoints = bus.tracking.routeWaypoints || DEFAULT_BUS_3_WAYPOINTS;
    const currentLat = bus.tracking.currentLocation?.latitude;
    const currentLng = bus.tracking.currentLocation?.longitude;

    // Find closest waypoint index or step to next
    let nextIndex = 0;
    if (currentLat && currentLng) {
      let closestDist = Infinity;
      let closestIdx = 0;
      waypoints.forEach((wp, idx) => {
        const dist = Math.hypot(wp.latitude - currentLat, wp.longitude - currentLng);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      nextIndex = (closestIdx + 1) % waypoints.length;
    }

    const nextWp = waypoints[nextIndex];
    // Add minor realistic jitter between waypoints
    const jitterLat = (Math.random() - 0.5) * 0.0004;
    const jitterLng = (Math.random() - 0.5) * 0.0004;
    const stepLat = Number((nextWp.latitude + jitterLat).toFixed(6));
    const stepLng = Number((nextWp.longitude + jitterLng).toFixed(6));
    const simulatedSpeed = Math.floor(25 + Math.random() * 20); // 25 - 45 km/h
    const now = new Date();

    bus.tracking.currentLocation = {
      latitude: stepLat,
      longitude: stepLng,
      speed: simulatedSpeed,
      heading: (nextIndex * 60) % 360,
      accuracy: 4,
      timestamp: now,
    };

    bus.tracking.source = "simulation";
    bus.tracking.status = "simulating";
    bus.tracking.lastUpdated = now;

    if (!bus.tracking.pathHistory) bus.tracking.pathHistory = [];
    bus.tracking.pathHistory.push({
      latitude: stepLat,
      longitude: stepLng,
      speed: simulatedSpeed,
      timestamp: now,
    });
    if (bus.tracking.pathHistory.length > 60) {
      bus.tracking.pathHistory = bus.tracking.pathHistory.slice(-60);
    }

    await bus.save();

    return res.status(200).json({
      success: true,
      message: `Simulated step advanced to waypoint ${nextIndex + 1}: ${nextWp.name}`,
      source: "simulation",
      status: "simulating",
      waypoint: nextWp.name,
      currentLocation: bus.tracking.currentLocation,
      busId: bus._id,
    });
  } catch (error) {
    console.error("Error in simulateStep:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to step simulation.",
    });
  }
};

/**
 * TOGGLE BACKGROUND SIMULATION
 * Starts or stops an automated simulation timer for development demo
 */
const toggleSimulation = async (req, res) => {
  try {
    const { busId, enable, intervalSeconds = 4 } = req.body;

    let bus = null;
    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    }
    if (!bus) {
      bus = await Bus.findOne({ busNumber: "3" });
    }
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }

    const idStr = bus._id.toString();

    if (enable) {
      // Clear any existing timer
      if (activeSimulations.has(idStr)) {
        clearInterval(activeSimulations.get(idStr));
      }

      // Step immediately
      await simulateStep({ body: { busId: bus._id } }, { status: () => ({ json: () => {} }) });

      // Run every N seconds
      const timer = setInterval(async () => {
        try {
          await simulateStep({ body: { busId: bus._id } }, { status: () => ({ json: () => {} }) });
        } catch (err) {
          console.warn("Background simulation tick error:", err.message);
        }
      }, Math.max(2, intervalSeconds) * 1000);

      activeSimulations.set(idStr, timer);

      return res.status(200).json({
        success: true,
        message: `Simulation started for Bus ${bus.busNumber} (updates every ${intervalSeconds}s).`,
        simulating: true,
        source: "simulation",
      });
    } else {
      if (activeSimulations.has(idStr)) {
        clearInterval(activeSimulations.get(idStr));
        activeSimulations.delete(idStr);
      }

      bus.tracking.status = "offline";
      await bus.save();

      return res.status(200).json({
        success: true,
        message: `Simulation stopped for Bus ${bus.busNumber}.`,
        simulating: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to toggle simulation.",
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
  updateGpsLocation,
  getLiveTracking,
  simulateStep,
  toggleSimulation,
};
