const College = require("../models/College");
const User = require("../models/User");
const Bus = require("../models/Bus");
const StudentFeePayment = require("../models/StudentFeePayment");
const bcrypt = require("bcryptjs");

/**
 * Create a new College (Super Admin)
 */
const createCollege = async (req, res) => {
  try {
    const { name, code, email, phone, address, adminName, adminEmail, adminPassword, adminPhone } = req.body;

    if (!name || !code || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "College Name, Code, Email, Phone, and Address are required.",
      });
    }

    const existingCollege = await College.findOne({ code: code.trim().toUpperCase() });
    if (existingCollege) {
      return res.status(400).json({
        success: false,
        message: `College with code "${code.trim().toUpperCase()}" already exists.`,
      });
    }

    const college = await College.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      address: address.trim(),
      status: "Active",
    });

    let adminUser = null;

    // Optionally create College Admin user along with the college
    if (adminEmail && adminPassword) {
      const cleanAdminEmail = adminEmail.toLowerCase().trim();
      const existingUser = await User.findOne({ email: cleanAdminEmail });
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        adminUser = await User.create({
          name: adminName ? adminName.trim() : `${name.trim()} Admin`,
          email: cleanAdminEmail,
          password: hashedPassword,
          phone: adminPhone ? adminPhone.trim() : phone.trim(),
          role: "admin",
          collegeId: college._id,
          status: "Approved",
          registerNumber: `ADMIN-${code.trim().toUpperCase()}`,
        });

        college.adminId = adminUser._id;
        await college.save();
      }
    }

    return res.status(201).json({
      success: true,
      message: `College "${college.name}" created successfully.`,
      college,
      adminUser,
    });
  } catch (error) {
    console.error("Error creating college:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create college.",
    });
  }
};

/**
 * Get all Colleges (Public for Registration Select & Super Admin)
 */
const getAllColleges = async (req, res) => {
  try {
    const colleges = await College.find().populate("adminId", "name email phone").sort({ name: 1 });
    return res.status(200).json({
      success: true,
      count: colleges.length,
      colleges,
    });
  } catch (error) {
    console.error("Error fetching colleges:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch colleges.",
    });
  }
};

/**
 * Get College by ID
 */
const getCollegeById = async (req, res) => {
  try {
    const { id } = req.params;
    const college = await College.findById(id).populate("adminId", "name email phone");
    
    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found.",
      });
    }

    return res.status(200).json({
      success: true,
      college,
    });
  } catch (error) {
    console.error("Error fetching college:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch college details.",
    });
  }
};

/**
 * Update College Details
 */
const updateCollege = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, status } = req.body;

    const college = await College.findById(id);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found.",
      });
    }

    if (name) college.name = name.trim();
    if (email) college.email = email.toLowerCase().trim();
    if (phone) college.phone = phone.trim();
    if (address) college.address = address.trim();
    if (status) college.status = status;

    await college.save();

    return res.status(200).json({
      success: true,
      message: "College updated successfully.",
      college,
    });
  } catch (error) {
    console.error("Error updating college:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update college.",
    });
  }
};

/**
 * Create or Assign College Admin
 */
const createCollegeAdmin = async (req, res) => {
  try {
    const { collegeId, name, email, password, phone } = req.body;

    if (!collegeId || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "College ID, Name, Email, and Password are required.",
      });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: "College not found.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    let existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      // Reassign to college admin
      existingUser.role = "admin";
      existingUser.collegeId = college._id;
      existingUser.status = "Approved";
      await existingUser.save();
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        phone: phone ? phone.trim() : college.phone,
        role: "admin",
        collegeId: college._id,
        status: "Approved",
        registerNumber: `ADMIN-${college.code}`,
      });
    }

    college.adminId = existingUser._id;
    await college.save();

    return res.status(200).json({
      success: true,
      message: `College Admin assigned to ${college.name} successfully.`,
      user: existingUser,
    });
  } catch (error) {
    console.error("Error creating college admin:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to assign college admin.",
    });
  }
};

/**
 * Fetch all pending College Admin registration requests (Super Admin)
 */
const getPendingAdminRequests = async (req, res) => {
  try {
    const requests = await User.find({
      role: { $in: ["college_admin", "admin"] },
      status: { $in: ["pending", "Pending"] },
    })
      .populate("collegeId", "name code email phone address")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Error fetching pending admin requests:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch pending admin requests.",
    });
  }
};

/**
 * Approve a College Admin registration request (Super Admin)
 */
const approveAdminRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Admin request user not found.",
      });
    }

    user.status = "approved";
    user.role = "college_admin";
    await user.save();

    // Bind as active admin for their assigned college
    if (user.collegeId) {
      await College.findByIdAndUpdate(user.collegeId, { adminId: user._id });
    }

    const updatedUser = await User.findById(id).populate("collegeId", "name code");

    return res.status(200).json({
      success: true,
      message: `Admin registration for ${user.name} approved successfully.`,
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error approving admin request:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to approve admin request.",
    });
  }
};

/**
 * Reject a College Admin registration request (Super Admin)
 */
const rejectAdminRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Admin request user not found.",
      });
    }

    user.status = "rejected";
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Admin registration for ${user.name} rejected.`,
      user,
    });
  } catch (error) {
    console.error("Error rejecting admin request:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reject admin request.",
    });
  }
};

/**
 * Fetch all approved College Admins (Super Admin)
 */
const getApprovedCollegeAdmins = async (req, res) => {
  try {
    const admins = await User.find({
      role: { $in: ["college_admin", "admin"] },
      status: { $in: ["approved", "Approved"] },
    })
      .populate("collegeId", "name code")
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: admins.length,
      admins,
    });
  } catch (error) {
    console.error("Error fetching college admins:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch college admins.",
    });
  }
};

/**
 * Platform-wide Super Admin Metrics
 */
const getSuperAdminStats = async (req, res) => {
  try {
    const totalColleges = await College.countDocuments({ status: "Active" });
    const pendingAdminRequests = await User.countDocuments({
      role: { $in: ["college_admin", "admin"] },
      status: { $in: ["pending", "Pending"] },
    });
    const totalApprovedAdmins = await User.countDocuments({
      role: { $in: ["college_admin", "admin"] },
      status: { $in: ["approved", "Approved"] },
    });

    return res.status(200).json({
      success: true,
      stats: {
        totalColleges,
        pendingAdminRequests,
        totalApprovedAdmins,
      },
    });
  } catch (error) {
    console.error("Error fetching super admin stats:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch platform metrics.",
    });
  }
};

module.exports = {
  createCollege,
  getAllColleges,
  getCollegeById,
  updateCollege,
  createCollegeAdmin,
  getPendingAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
  getApprovedCollegeAdmins,
  getSuperAdminStats,
};
