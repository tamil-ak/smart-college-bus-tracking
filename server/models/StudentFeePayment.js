const mongoose = require("mongoose");

const studentFeePaymentSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: [true, "Bus is required"],
    },
    feeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusFee",
      required: [true, "Bus Fee is required"],
    },
    academicYear: {
      type: String,
      required: [true, "Academic Year is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be a positive number"],
    },
    status: {
      type: String,
      enum: ["Unpaid", "Pending", "Paid"],
      default: "Unpaid",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Pending", "Paid"],
      default: "Unpaid",
    },
    registerNumber: {
      type: String,
      trim: true,
      default: "",
    },
    busNumber: {
      type: String,
      trim: true,
      default: "",
    },
    paymentDate: {
      type: String,
      default: null,
    },
    paymentTime: {
      type: String,
      default: null,
    },
    paymentMethod: {
      type: String,
      default: "UPI",
    },
    transactionId: {
      type: String,
      trim: true,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate records for same student + bus + academic year
studentFeePaymentSchema.index(
  { studentId: 1, busId: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model("StudentFeePayment", studentFeePaymentSchema);
