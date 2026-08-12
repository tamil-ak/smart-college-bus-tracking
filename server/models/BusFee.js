const mongoose = require("mongoose");

const busFeeSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: [true, "Academic year is required"],
      trim: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bus",
      required: [true, "Bus is required"],
    },
    amount: {
      type: Number,
      required: [true, "Fee amount is required"],
      min: [1, "Fee amount must be a positive number"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    applicableYears: {
      type: [String],
      default: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BusFee", busFeeSchema);
