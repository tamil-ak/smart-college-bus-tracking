const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");
const BusFee = require("../models/BusFee");
const StudentFeePayment = require("../models/StudentFeePayment");

// Initialize Razorpay SDK with environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a secure Razorpay order from the backend
 */
const createOrder = async (req, res) => {
  try {
    const { studentId, academicYear = "2026-2027" } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "A valid Student ID is required.",
      });
    }

    // 1. Fetch student information and verify they have an assigned bus
    const student = await User.findById(studentId).populate("busId");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found.",
      });
    }

    if (!student.busId) {
      return res.status(400).json({
        success: false,
        message: "No bus assigned to student yet. Fee payment requires an assigned bus.",
      });
    }

    const bus = student.busId;

    // 2. Fetch active fee configuration for this bus and academic year
    const fee = await BusFee.findOne({
      busId: bus._id,
      academicYear: academicYear.trim(),
      status: "Active",
    });

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: `No active bus fee config found for Bus ${bus.busNumber} in Academic Year ${academicYear}.`,
      });
    }

    // 3. Prevent duplicate payment if already Paid for this academic year
    const existingPayment = await StudentFeePayment.findOne({
      studentId: student._id,
      busId: bus._id,
      academicYear: fee.academicYear,
    });

    if (existingPayment && existingPayment.status === "Paid") {
      return res.status(400).json({
        success: false,
        message: `Bus fee for Academic Year ${fee.academicYear} is already paid.`,
        payment: existingPayment,
      });
    }

    // 4. Create Razorpay order (amount in paise)
    const amountInPaise = Math.round(fee.amount * 100);
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${student._id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    if (!order) {
      throw new Error("Razorpay order creation failed.");
    }

    // 5. Store/update payment record in database with status "Pending" and associate orderId
    let payment = existingPayment;

    if (!payment) {
      payment = new StudentFeePayment({
        studentId: student._id,
        registerNumber: student.registerNumber || "",
        busId: bus._id,
        busNumber: bus.busNumber || "",
        feeId: fee._id,
        academicYear: fee.academicYear,
        amount: fee.amount,
        status: "Pending",
        paymentStatus: "Pending",
        paymentMethod: "Razorpay",
        orderId: order.id,
      });
    } else {
      payment.registerNumber = student.registerNumber || "";
      payment.busNumber = bus.busNumber || "";
      payment.feeId = fee._id;
      payment.amount = fee.amount;
      payment.status = "Pending";
      payment.paymentStatus = "Pending";
      payment.paymentMethod = "Razorpay";
      payment.orderId = order.id;
    }

    await payment.save();

    return res.status(201).json({
      success: true,
      order,
      keyId: process.env.RAZORPAY_KEY_ID, // Expose key ID safely (do not expose secret)
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to initiate payment order.",
    });
  }
};

/**
 * Verify Razorpay payment signature on backend
 */
const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required Razorpay parameters for verification.",
      });
    }

    // Generate expected signature
    const hmacSource = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(hmacSource.toString())
      .digest("hex");

    // Match signature to authenticate payment
    if (expectedSignature === razorpay_signature) {
      const payment = await StudentFeePayment.findOne({ orderId: razorpay_order_id });
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: "Payment record for this order could not be located in database.",
        });
      }

      // Record successful payment details
      payment.status = "Paid";
      payment.paymentStatus = "Paid";
      payment.paymentId = razorpay_payment_id;
      payment.transactionId = razorpay_payment_id; // Map for backwards compatibility
      payment.paidAt = new Date();
      payment.paymentMethod = "Razorpay";

      await payment.save();

      return res.status(200).json({
        success: true,
        message: "Payment verified and recorded successfully ✓",
        payment,
      });
    } else {
      // Signature mismatch
      console.warn(`Payment signature verification failed for order: ${razorpay_order_id}`);
      return res.status(400).json({
        success: false,
        message: "Signature verification failed. The transaction may be compromised.",
      });
    }
  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error during payment verification.",
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};
