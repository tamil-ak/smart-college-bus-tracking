const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      required: [true, "College is required"],
    },
    upiQrImage: {
      type: String,
      required: [true, "UPI QR Image is required"],
    },
    upiId: {
      type: String,
      trim: true,
      default: "",
    },
    upiName: {
      type: String,
      trim: true,
      default: "College Bus Transport Fee",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);
