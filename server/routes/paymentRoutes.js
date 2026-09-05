const express = require("express");
const router = express.Router();
const { createOrder, verifyPayment } = require("../controllers/paymentController");

// POST /api/payment/create-order - Initiate Razorpay order creation
router.post("/create-order", createOrder);

// POST /api/payment/verify - Verify signature after successful transaction
router.post("/verify", verifyPayment);

module.exports = router;
