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
      required: function () {
        return this.role === "student";
      },
      sparse: true,
      trim: true,
    },

    department: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },

    year: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },

    section: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["student", "parent", "management", "admin", "college_admin", "super_admin"],
      default: "student",
    },

    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: false,
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Assigned", "pending", "approved", "rejected", "assigned"],
      default: "Approved",
    },

    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      default: null,
    },

    // Parent to Student mapping
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    childRegisterNumber: {
      type: String,
      default: null,
      trim: true,
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

    profileImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);