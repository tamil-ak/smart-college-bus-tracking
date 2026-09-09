const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const BusFee = require("../models/BusFee");
const Bus = require("../models/Bus");
const User = require("../models/User");
const StudentFeePayment = require("../models/StudentFeePayment");
const PaymentSettings = require("../models/PaymentSettings");

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
 * Helper to ensure QR image URL is absolute for client consumption
 */
const formatQrImageUrl = (img) => {
  if (!img) return "";
  if (img.startsWith("data:") || img.startsWith("http://") || img.startsWith("https://")) {
    return img;
  }
  return `http://localhost:5000${img.startsWith("/") ? "" : "/"}${img}`;
};

/**
 * Create a new Bus Fee definition
 * For each bus, one fee applies to all students from 1st, 2nd, 3rd and 4th year.
 */
const createBusFee = async (req, res) => {
  try {
    const { academicYear, busId, amount, dueDate, status, collegeId } = req.body;

    if (!academicYear || !busId || amount === undefined || amount === null || !dueDate) {
      return res.status(400).json({
        success: false,
        message: "All fields (Academic Year, Bus, Fee Amount, Due Date) are required.",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Fee amount must be a positive number greater than zero.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bus ID format.",
      });
    }

    const busExists = await Bus.findById(busId);
    if (!busExists) {
      return res.status(404).json({
        success: false,
        message: "Selected bus not found in the fleet database.",
      });
    }

    const targetCollegeId = await getRequestCollegeId(req) || collegeId || busExists.collegeId;
    const feeStatus = status === "Inactive" ? "Inactive" : "Active";

    if (feeStatus === "Active") {
      const duplicateFee = await BusFee.findOne({
        academicYear: academicYear.trim(),
        busId: busId,
        collegeId: targetCollegeId,
        status: "Active",
      });

      if (duplicateFee) {
        return res.status(400).json({
          success: false,
          message: `An active fee already exists for Bus ${busExists.busNumber} in Academic Year ${academicYear}. You can edit the existing fee schedule.`,
        });
      }
    }

    const newFee = await BusFee.create({
      academicYear: academicYear.trim(),
      busId,
      collegeId: targetCollegeId,
      amount: numericAmount,
      dueDate: new Date(dueDate),
      applicableYears: ["1st Year", "2nd Year", "3rd Year", "4th Year"],
      status: feeStatus,
    });

    const populatedFee = await BusFee.findById(newFee._id)
      .populate("busId", "busNumber route driverName driverPhone totalSeats availableSeats status")
      .populate("collegeId", "name code");

    return res.status(201).json({
      success: true,
      message: `Bus ${busExists.busNumber} fee created successfully for all students (1st–4th Year).`,
      fee: populatedFee,
    });
  } catch (error) {
    console.error("Error creating bus fee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error while creating bus fee.",
    });
  }
};

/**
 * Get all Bus Fee definitions with populated Bus details
 */
const getAllBusFees = async (req, res) => {
  try {
    const targetCollegeId = await getRequestCollegeId(req);
    const query = {};
    if (targetCollegeId) {
      query.collegeId = targetCollegeId;
    }

    const fees = await BusFee.find(query)
      .populate("busId", "busNumber route driverName driverPhone totalSeats availableSeats status")
      .populate("collegeId", "name code")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: fees.length,
      fees,
    });
  } catch (error) {
    console.error("Error fetching bus fees:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bus fees.",
    });
  }
};

/**
 * Get single Bus Fee by ID
 */
const getBusFeeById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Fee ID format.",
      });
    }

    const fee = await BusFee.findById(id).populate(
      "busId",
      "busNumber route driverName driverPhone totalSeats availableSeats status"
    );

    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Bus fee not found.",
      });
    }

    return res.status(200).json({
      success: true,
      fee,
    });
  } catch (error) {
    console.error("Error fetching bus fee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch bus fee.",
    });
  }
};

/**
 * Update an existing Bus Fee
 */
const updateBusFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { academicYear, busId, amount, dueDate, status } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Fee ID format.",
      });
    }

    const fee = await BusFee.findById(id);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Bus fee not found.",
      });
    }

    if (academicYear && typeof academicYear === "string") {
      fee.academicYear = academicYear.trim();
    }

    if (busId) {
      if (!mongoose.Types.ObjectId.isValid(busId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Bus ID format.",
        });
      }
      const busExists = await Bus.findById(busId);
      if (!busExists) {
        return res.status(404).json({
          success: false,
          message: "Selected bus not found.",
        });
      }
      fee.busId = new mongoose.Types.ObjectId(busId);
    }

    if (amount !== undefined && amount !== null && amount !== "") {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Fee amount must be a positive number greater than zero.",
        });
      }
      fee.amount = numericAmount;
    }

    if (dueDate) {
      const parsedDate = new Date(dueDate);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid Due Date format.",
        });
      }
      fee.dueDate = parsedDate;
    }

    if (status) {
      fee.status = status === "Inactive" ? "Inactive" : "Active";
    }

    if (fee.status === "Active") {
      const duplicateFee = await BusFee.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        academicYear: fee.academicYear,
        busId: fee.busId,
        status: "Active",
      });

      if (duplicateFee) {
        return res.status(400).json({
          success: false,
          message: "Another active fee already exists for this Bus in this Academic Year.",
        });
      }
    }

    await fee.save();

    const populatedFee = await BusFee.findById(id).populate(
      "busId",
      "busNumber route driverName driverPhone totalSeats availableSeats status"
    );

    return res.status(200).json({
      success: true,
      message: "Bus fee updated successfully.",
      fee: populatedFee,
    });
  } catch (error) {
    console.error("Error updating bus fee:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update bus fee.",
    });
  }
};

/**
 * Toggle or update Bus Fee status (Active / Inactive)
 */
const toggleFeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Fee ID format.",
      });
    }

    const fee = await BusFee.findById(id);
    if (!fee) {
      return res.status(404).json({
        success: false,
        message: "Bus fee not found.",
      });
    }

    const targetStatus = status
      ? status === "Active"
        ? "Active"
        : "Inactive"
      : fee.status === "Active"
      ? "Inactive"
      : "Active";

    if (targetStatus === "Active") {
      const duplicateFee = await BusFee.findOne({
        _id: { $ne: new mongoose.Types.ObjectId(id) },
        academicYear: fee.academicYear,
        busId: fee.busId,
        status: "Active",
      });

      if (duplicateFee) {
        return res.status(400).json({
          success: false,
          message: "Cannot activate: another active fee already exists for this Bus in this Academic Year.",
        });
      }
    }

    fee.status = targetStatus;
    await fee.save();

    const populatedFee = await BusFee.findById(id).populate(
      "busId",
      "busNumber route driverName driverPhone totalSeats availableSeats status"
    );

    return res.status(200).json({
      success: true,
      message: `Bus fee marked as ${targetStatus}.`,
      fee: populatedFee,
    });
  } catch (error) {
    console.error("Error toggling bus fee status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update fee status.",
    });
  }
};

/**
 * =========================================================================
 * UPI PAYMENT QR MANAGEMENT (Admin Upload, Get, and Remove)
 * =========================================================================
 */

/**
 * Get the current active UPI Payment QR
 */
const getActiveUpiQr = async (req, res) => {
  try {
    const { collegeId } = req.query;
    let query = { isActive: true };

    if (collegeId && collegeId !== "ALL" && collegeId !== "null" && collegeId !== "undefined") {
      query.collegeId = collegeId;
    }

    let activeSetting = await PaymentSettings.findOne(query).sort({ updatedAt: -1 });

    if (!activeSetting) {
      activeSetting = await PaymentSettings.findOne({ isActive: true }).sort({ updatedAt: -1 });
    }

    if (!activeSetting || !activeSetting.upiQrImage) {
      return res.status(200).json({
        success: true,
        isConfigured: false,
        message: "UPI payment QR is not configured yet. Please contact the administrator.",
      });
    }

    return res.status(200).json({
      success: true,
      isConfigured: true,
      upiQr: {
        _id: activeSetting._id,
        upiQrImage: formatQrImageUrl(activeSetting.upiQrImage),
        upiId: activeSetting.upiId || "",
        upiName: activeSetting.upiName || "College Bus Transport Fee",
        updatedAt: activeSetting.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching active UPI QR:", error.stack || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch active UPI QR.",
    });
  }
};

/**
 * Save or Replace the active UPI Payment QR (Admin)
 */
const saveUpiQr = async (req, res) => {
  try {
    const { upiQrImage, upiId, upiName, collegeId } = req.body;

    if (!upiQrImage || typeof upiQrImage !== "string" || !upiQrImage.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid QR image is required.",
      });
    }

    let targetCollegeId = collegeId;
    if (!targetCollegeId) {
      const defaultCol = await College.findOne({ code: "MAIN" });
      if (defaultCol) targetCollegeId = defaultCol._id;
    }

    let finalQrImage = upiQrImage.trim();

    // If Base64 image is provided, write to local uploads directory for file persistence
    if (upiQrImage.startsWith("data:image/")) {
      try {
        const uploadsDir = path.join(__dirname, "../uploads/upi-qr");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const matches = upiQrImage.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const extension = matches[1] === "svg+xml" ? "svg" : matches[1];
          const base64Data = matches[2];
          const fileName = `upi-qr-${Date.now()}.${extension}`;
          const filePath = path.join(uploadsDir, fileName);

          fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
          finalQrImage = `/uploads/upi-qr/${fileName}`;
        }
      } catch (fileErr) {
        console.warn("Notice: Local file write failed, falling back to direct image payload:", fileErr.message);
        finalQrImage = upiQrImage.trim();
      }
    }

    // Deactivate previous active records for this college
    await PaymentSettings.updateMany({ collegeId: targetCollegeId }, { isActive: false });

    // Create new active setting with actual UPI ID entered by admin
    const newSetting = await PaymentSettings.create({
      collegeId: targetCollegeId,
      upiQrImage: finalQrImage,
      upiId: upiId ? upiId.trim() : "",
      upiName: upiName ? upiName.trim() : "College Bus Transport Fee",
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: "UPI Payment QR Activated Successfully ✓",
      upiQr: {
        _id: newSetting._id,
        upiQrImage: formatQrImageUrl(newSetting.upiQrImage),
        upiId: newSetting.upiId,
        upiName: newSetting.upiName,
        updatedAt: newSetting.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error saving UPI QR:", error.stack || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save UPI Payment QR.",
    });
  }
};

/**
 * Remove the active UPI Payment QR (Admin)
 */
const removeUpiQr = async (req, res) => {
  try {
    await PaymentSettings.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "UPI Payment QR removed successfully.",
    });
  } catch (error) {
    console.error("Error removing UPI QR:", error.stack || error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to remove UPI QR.",
    });
  }
};

/**
 * =========================================================================
 * DIRECT STUDENT PAYMENT FLOW (Scan QR + UTR Submission = Immediate "Paid ✓")
 * =========================================================================
 */

/**
 * Get Student's Bus Fee & Payment Status for Student Dashboard
 */
const getStudentFeeStatus = async (req, res) => {
  try {
    const { studentId } = req.params;
    const academicYearQuery = req.query.academicYear || "2026-2027";

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Student ID format.",
      });
    }

    const student = await User.findById(studentId).populate("busId");
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student record not found.",
      });
    }

    if (!student.busId) {
      return res.status(200).json({
        success: true,
        hasAssignedBus: false,
        message: "No bus assigned to student yet.",
      });
    }

    const bus = student.busId;

    // Find active bus fee for this bus and academic year
    let fee = await BusFee.findOne({
      busId: bus._id,
      academicYear: academicYearQuery,
      status: "Active",
    });

    if (!fee) {
      fee = await BusFee.findOne({
        busId: bus._id,
        status: "Active",
      }).sort({ createdAt: -1 });
    }

    if (!fee) {
      return res.status(200).json({
        success: true,
        hasAssignedBus: true,
        hasFeeConfigured: false,
        bus: {
          _id: bus._id,
          busNumber: bus.busNumber,
          route: bus.route,
          driverName: bus.driverName,
          driverPhone: bus.driverPhone,
        },
        message: "Fee schedule has not been set by administrator yet for this bus.",
      });
    }

    // Check payment record from MongoDB
    const payment = await StudentFeePayment.findOne({
      studentId: student._id,
      busId: bus._id,
      academicYear: fee.academicYear,
    });

    // Check active UPI QR
    const activeSetting = await PaymentSettings.findOne({ isActive: true }).sort({ updatedAt: -1 });

    const isPaid = payment && payment.status === "Paid";

    return res.status(200).json({
      success: true,
      hasAssignedBus: true,
      hasFeeConfigured: true,
      bus: {
        _id: bus._id,
        busNumber: bus.busNumber,
        route: bus.route,
        driverName: bus.driverName,
        driverPhone: bus.driverPhone,
      },
      fee: {
        _id: fee._id,
        academicYear: fee.academicYear,
        amount: fee.amount,
        dueDate: fee.dueDate,
        applicableYears: fee.applicableYears,
      },
      payment: {
        status: isPaid ? "Paid" : "Unpaid",
        amount: isPaid ? payment.amount : fee.amount,
        transactionId: isPaid ? payment.transactionId : null,
        paidAt: isPaid ? payment.paidAt : null,
        paymentMethod: isPaid ? payment.paymentMethod : "UPI Transfer",
      },
      upiQr: activeSetting && activeSetting.upiQrImage
        ? {
            isConfigured: true,
            upiQrImage: formatQrImageUrl(activeSetting.upiQrImage),
            upiId: activeSetting.upiId || "",
            upiName: activeSetting.upiName || "College Bus Transport Fee",
          }
        : {
            isConfigured: false,
            message: "UPI payment QR is not configured yet. Please contact the administrator.",
          },
    });
  } catch (error) {
    console.error("Error fetching student fee status:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student fee status.",
    });
  }
};

/**
 * Submit Payment with UTR -> Direct Confirmation to "Paid"
 */
const submitStudentPayment = async (req, res) => {
  try {
    const { studentId, busId, feeId, academicYear, amount, transactionId, paymentMethod } = req.body;

    if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Student ID is required.",
      });
    }

    if (!busId || !mongoose.Types.ObjectId.isValid(busId)) {
      return res.status(400).json({
        success: false,
        message: "Valid Bus ID is required.",
      });
    }

    if (!transactionId || typeof transactionId !== "string" || !transactionId.trim()) {
      return res.status(400).json({
        success: false,
        message: "UPI Transaction ID / UTR is required.",
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: "Bus not found.",
      });
    }

    let busFee = null;
    if (feeId && mongoose.Types.ObjectId.isValid(feeId)) {
      busFee = await BusFee.findById(feeId);
    }

    if (!busFee) {
      busFee = await BusFee.findOne({
        busId: bus._id,
        academicYear: academicYear || "2026-2027",
        status: "Active",
      });
    }

    if (!busFee) {
      return res.status(404).json({
        success: false,
        message: "Bus Fee schedule not found for this bus.",
      });
    }

    const targetAcademicYear = busFee.academicYear || academicYear || "2026-2027";
    const paymentAmount = Number(amount) || busFee.amount;
    const cleanUtr = transactionId.trim();

    // Prevent duplicate payment if already Paid for this academic year
    let payment = await StudentFeePayment.findOne({
      studentId: student._id,
      busId: bus._id,
      academicYear: targetAcademicYear,
    });

    if (payment && payment.status === "Paid") {
      return res.status(400).json({
        success: false,
        message: `Bus fee for ${targetAcademicYear} is already paid.`,
        payment,
      });
    }

    const currentTimestamp = new Date();

    const targetCollegeId = student.collegeId || bus.collegeId || busFee.collegeId;

    if (!payment) {
      payment = new StudentFeePayment({
        collegeId: targetCollegeId,
        studentId: student._id,
        registerNumber: student.registerNumber || "",
        busId: bus._id,
        busNumber: bus.busNumber || "",
        feeId: busFee._id,
        academicYear: targetAcademicYear,
        amount: paymentAmount,
        status: "Pending",
        paymentStatus: "Pending",
        transactionId: cleanUtr,
        paidAt: null,
        paymentMethod: "UPI",
      });
    } else {
      payment.collegeId = targetCollegeId;
      payment.registerNumber = student.registerNumber || "";
      payment.busNumber = bus.busNumber || "";
      payment.feeId = busFee._id;
      payment.amount = paymentAmount;
      payment.status = "Pending";
      payment.paymentStatus = "Pending";
      payment.transactionId = cleanUtr;
      payment.paidAt = null;
      payment.paymentMethod = "UPI";
    }

    await payment.save();

    return res.status(200).json({
      success: true,
      message: `Bus fee payment of ₹${paymentAmount.toLocaleString("en-IN")} submitted successfully for verification!`,
      payment,
    });
  } catch (error) {
    console.error("Error submitting student payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process payment confirmation.",
    });
  }
};

/**
 * Get Student Payment Status List & Recent Payments for Admin Dashboard
 */
const getStudentPaymentsAdmin = async (req, res) => {
  try {
    const { academicYear = "2026-2027", busId, status, collegeId } = req.query;

    const studentQuery = {
      role: "student",
      busId: { $ne: null },
    };

    if (collegeId && collegeId !== "ALL" && collegeId !== "null" && collegeId !== "undefined") {
      studentQuery.collegeId = new mongoose.Types.ObjectId(collegeId);
    }

    if (busId && busId !== "All" && mongoose.Types.ObjectId.isValid(busId)) {
      studentQuery.busId = new mongoose.Types.ObjectId(busId);
    }

    const assignedStudents = await User.find(studentQuery)
      .populate("busId", "busNumber route driverName driverPhone totalSeats availableSeats")
      .sort({ name: 1 });

    const fees = await BusFee.find({ academicYear, status: "Active" });
    const feeMap = new Map();
    fees.forEach((f) => {
      feeMap.set(f.busId.toString(), f);
    });

    const payments = await StudentFeePayment.find({ academicYear });
    const paymentMap = new Map();
    payments.forEach((p) => {
      paymentMap.set(`${p.studentId.toString()}_${p.busId.toString()}`, p);
    });

    const records = assignedStudents.map((student) => {
      const bus = student.busId;
      const busFee = bus ? feeMap.get(bus._id.toString()) : null;
      const paymentRecord = bus
        ? paymentMap.get(`${student._id.toString()}_${bus._id.toString()}`)
        : null;

      const isPaid = paymentRecord && paymentRecord.status === "Paid";
      const feeAmount = busFee ? busFee.amount : paymentRecord ? paymentRecord.amount : 0;
      const dueDate = busFee ? busFee.dueDate : null;

      return {
        paymentId: paymentRecord ? paymentRecord._id : null,
        studentId: student._id,
        name: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        year: student.year,
        section: student.section,
        email: student.email,
        phone: student.phone,
        bus: bus
          ? {
              _id: bus._id,
              busNumber: bus.busNumber,
              route: bus.route,
              driverName: bus.driverName,
              driverPhone: bus.driverPhone,
            }
          : null,
        academicYear,
        feeAmount,
        dueDate,
        status: isPaid ? "Paid" : "Unpaid",
        transactionId: isPaid ? paymentRecord.transactionId : null,
        paidAt: isPaid ? paymentRecord.paidAt : null,
        paymentMethod: isPaid ? paymentRecord.paymentMethod : "UPI Transfer",
      };
    });

    let filteredRecords = records;
    if (status && status !== "All") {
      filteredRecords = records.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    }

    // Fetch all confirmed recent payments sorted by paidAt descending (most recent first)
    const recentPaymentDocs = await StudentFeePayment.find({ status: "Paid" })
      .populate("studentId", "name registerNumber department year section email phone")
      .populate("busId", "busNumber route driverName driverPhone")
      .sort({ paidAt: -1 })
      .limit(20);

    const recentPayments = recentPaymentDocs
      .filter((p) => p.studentId && p.busId)
      .map((p) => ({
        paymentId: p._id,
        studentName: p.studentId.name,
        registerNumber: p.studentId.registerNumber,
        department: p.studentId.department,
        year: p.studentId.year,
        section: p.studentId.section,
        busNumber: p.busId.busNumber,
        route: p.busId.route,
        academicYear: p.academicYear,
        amount: p.amount,
        transactionId: p.transactionId,
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod,
      }));

    return res.status(200).json({
      success: true,
      count: filteredRecords.length,
      totalStudents: records.length,
      paidCount: records.filter((r) => r.status === "Paid").length,
      unpaidCount: records.filter((r) => r.status === "Unpaid").length,
      students: filteredRecords,
      recentPayments,
    });
  } catch (error) {
    console.error("Error fetching admin student payments:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student payments.",
    });
  }
};

/**
 * Verify or Reject Student Payment (Admin)
 */
const verifyPayment = async (req, res) => {
  try {
    const { paymentId, studentId, busId, academicYear, action, rejectionReason } = req.body;

    if (!action || !["verify", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid action. Must be 'verify' or 'reject'.",
      });
    }

    let payment;
    if (paymentId && mongoose.Types.ObjectId.isValid(paymentId)) {
      payment = await StudentFeePayment.findById(paymentId);
    } else if (studentId && busId && academicYear) {
      payment = await StudentFeePayment.findOne({
        studentId,
        busId,
        academicYear,
      });
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    if (action === "verify") {
      payment.status = "Paid";
      payment.paymentStatus = "Paid";
      payment.paidAt = new Date();
    } else if (action === "reject") {
      payment.status = "Unpaid";
      payment.paymentStatus = "Unpaid";
      payment.paidAt = null;
      payment.transactionId = null;
    }

    await payment.save();

    return res.status(200).json({
      success: true,
      message: `Payment ${action === "verify" ? "verified" : "rejected"} successfully.`,
      payment,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to process payment verification.",
    });
  }
};

module.exports = {
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
};

