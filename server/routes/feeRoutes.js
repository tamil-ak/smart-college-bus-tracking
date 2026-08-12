const express = require("express");
const router = express.Router();

const {
  createBusFee,
  getAllBusFees,
  getBusFeeById,
  updateBusFee,
  toggleFeeStatus,
  getActiveUpiQr,
  saveUpiQr,
  removeUpiQr,
  getStudentFeeStatus,
  submitStudentPayment,
  getStudentPaymentsAdmin,
  verifyPayment,
} = require("../controllers/feeController");

// UPI Payment QR Management
router.get("/upi-qr", getActiveUpiQr);
router.post("/upi-qr", saveUpiQr);
router.delete("/upi-qr", removeUpiQr);

// Direct Student Payment Confirmation & Status
router.get("/student-fee/:studentId", getStudentFeeStatus);
router.post("/submit-payment", submitStudentPayment);
router.post("/pay", submitStudentPayment);
router.post("/verify-payment", verifyPayment);
router.get("/student-payments", getStudentPaymentsAdmin);

// Standard Bus Fee CRUD Endpoints
router.post("/create", createBusFee);
router.get("/all", getAllBusFees);
router.get("/:id", getBusFeeById);
router.put("/update/:id", updateBusFee);
router.patch("/status/:id", toggleFeeStatus);

module.exports = router;
