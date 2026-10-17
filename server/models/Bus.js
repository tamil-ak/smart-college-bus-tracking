const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      trim: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },
    driverName: {
      type: String,
      required: true,
      trim: true,
    },
    driverPhone: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
    },
    totalSeats: {
      type: Number,
      required: true,
    },
    availableSeats: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Maintenance"],
      default: "Active",
    },
    qrId: {
      type: String,
      default: null,
    },
    qrCode: {
      type: String,
      default: null,
    },

    // Live Tracking Subdocument (Ready for physical ESP32 + NEO-6M GPS + SIM7600)
    tracking: {
      currentLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        speed: { type: Number, default: 0 },
        heading: { type: Number, default: 0 },
        accuracy: { type: Number, default: null },
        timestamp: { type: Date, default: null },
      },
      source: {
        type: String,
        enum: ["hardware", "simulation", "offline"],
        default: "offline",
      },
      status: {
        type: String,
        enum: ["online", "offline", "simulating"],
        default: "offline",
      },
      lastUpdated: {
        type: Date,
        default: null,
      },
      // Shared secret key for ESP32 microcontroller API authentication
      deviceKey: {
        type: String,
        default: null,
      },
      // Predefined route waypoints for route polyline and demo simulation
      routeWaypoints: [
        {
          name: { type: String, default: "" },
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
        },
      ],
      // Recent coordinates breadcrumb trail for path rendering (capped in controller)
      pathHistory: [
        {
          latitude: { type: Number, required: true },
          longitude: { type: Number, required: true },
          speed: { type: Number, default: 0 },
          timestamp: { type: Date, default: Date.now },
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index for busNumber per college
busSchema.index({ collegeId: 1, busNumber: 1 }, { unique: true });

module.exports = mongoose.model("Bus", busSchema);
