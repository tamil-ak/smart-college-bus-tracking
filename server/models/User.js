const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    registerNumber: {
      type: String,
      required: true,
      unique: true,
    },

    department: {
      type: String,
      required: true,
    },

    year: {
      type: String,
      required: true,
    },

    section: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "parent", "management", "admin"],
      default: "student",
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Assigned"],
      default: "Pending",
    },

    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },

    registeredDeviceId: {
      type: String,
      default: null,
    },

    isFaceRegistered: {
      type: Boolean,
      default: false,
    },

    faceEmbedding: {
      type: [Number],
      default: [],
    },

    isAiFaceRegistered: {
      type: Boolean,
      default: false,
    },

    aiFaceEmbedding: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);