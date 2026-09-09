const User = require("../models/User");
const College = require("../models/College");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const registerStudent = async (req, res) => {
  try {
    const {
      name,
      registerNumber,
      department,
      year,
      section,
      email,
      phone,
      password,
      collegeId,
    } = req.body;

    let targetCollegeId = collegeId;
    if (!targetCollegeId) {
      const defaultCol = await College.findOne({ code: "MAIN" });
      if (defaultCol) targetCollegeId = defaultCol._id;
    }

    // Check existing user
    const existingQuery = {
      $or: [
        { email: email.toLowerCase().trim() },
        { registerNumber: registerNumber.trim(), collegeId: targetCollegeId }
      ]
    };
    const existingUser = await User.findOne(existingQuery);

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const user = await User.create({
      name: name.trim(),
      registerNumber: registerNumber.trim(),
      department,
      year,
      section,
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role: "student",
      status: "Pending",
      collegeId: targetCollegeId,
    });

    res.status(201).json({
      success: true,
      message: "Registration submitted successfully. Waiting for Admin Approval.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Register Parent & Map to Existing Student
 */
const registerParent = async (req, res) => {
  try {
    const { name, email, phone, password, childRegisterNumber, collegeId } = req.body;

    if (!name || !email || !phone || !password || !childRegisterNumber) {
      return res.status(400).json({
        success: false,
        message: "Parent Name, Email, Phone, Password, and Child Student Register Number are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanChildRegNo = childRegisterNumber.trim();

    // Check if parent email already exists
    const existingParent = await User.findOne({ email: cleanEmail });
    if (existingParent) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Find student
    const studentQuery = {
      role: "student",
      registerNumber: { $regex: new RegExp(`^${cleanChildRegNo}$`, "i") },
    };
    if (collegeId) {
      studentQuery.collegeId = collegeId;
    }

    const existingStudent = await User.findOne(studentQuery).populate("busId").populate("collegeId");

    if (!existingStudent) {
      return res.status(404).json({
        success: false,
        message: "Student Register Number not found.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create parent user mapped to the existing student
    const parentUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      password: hashedPassword,
      role: "parent",
      status: "Approved",
      studentId: existingStudent._id,
      childRegisterNumber: existingStudent.registerNumber,
      collegeId: existingStudent.collegeId ? existingStudent.collegeId._id || existingStudent.collegeId : collegeId,
    });

    const populatedParent = await User.findById(parentUser._id)
      .populate("collegeId")
      .populate({
        path: "studentId",
        populate: { path: "busId" },
      });

    return res.status(201).json({
      success: true,
      message: `Parent registered successfully and linked to student ${existingStudent.name} (${existingStudent.registerNumber}).`,
      user: populatedParent,
    });
  } catch (error) {
    console.error("Error registering parent:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to register parent account.",
    });
  }
};

/**
 * Register College Admin & Submit for Super Admin Approval
 */
const registerCollegeAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, collegeId } = req.body;

    if (!name || !email || !password || !collegeId) {
      return res.status(400).json({
        success: false,
        message: "Name, Email, Password, and College selection are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({
        success: false,
        message: "Selected college not found.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : college.phone,
      password: hashedPassword,
      role: "college_admin",
      collegeId: college._id,
      status: "pending",
      registerNumber: `ADMIN-${college.code}-${Date.now().toString().slice(-4)}`,
    });

    return res.status(201).json({
      success: true,
      message: "College Admin registration submitted successfully. Waiting for Super Admin approval.",
      user: adminUser,
    });
  } catch (error) {
    console.error("Error registering college admin:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to submit admin registration.",
    });
  }
};

const loginStudent = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email or Register Number and password are required",
      });
    }

    const cleanIdentifier = identifier.trim();

    // Find user using email or registerNumber or phone
    const user = await User.findOne({
      $or: [
        { email: cleanIdentifier.toLowerCase() },
        { registerNumber: cleanIdentifier },
        { phone: cleanIdentifier }
      ]
    })
      .populate("collegeId")
      .populate({
        path: "studentId",
        populate: { path: "busId" }
      })
      .populate("busId");

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Compare password using bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Detect device registration status
    const isDeviceRegistered = Boolean(user.registeredDeviceId);
    const deviceStatus = isDeviceRegistered ? "Registered" : "Device not registered";

    // Super Admin login check
    if (user.role === "super_admin") {
      return res.status(200).json({
        success: true,
        message: "Super Admin login successful",
        deviceStatus,
        isDeviceRegistered,
        user,
      });
    }

    // College Admin login check
    if (["admin", "college_admin"].includes(user.role)) {
      if (["pending", "Pending"].includes(user.status)) {
        return res.status(400).json({
          message: "Your College Admin registration is pending Super Admin approval.",
        });
      }
      if (["rejected", "Rejected"].includes(user.status)) {
        return res.status(400).json({
          message: "Your College Admin registration request was rejected by Super Admin.",
        });
      }

      return res.status(200).json({
        success: true,
        message: "College Admin login successful",
        deviceStatus,
        isDeviceRegistered,
        user,
      });
    }

    // Parent login check
    if (user.role === "parent") {
      return res.status(200).json({
        success: true,
        message: "Login successful",
        deviceStatus,
        isDeviceRegistered,
        user,
      });
    }

    // If role === "student", check approval status
    if (user.role === "student") {
      if (user.status === "Pending") {
        return res.status(400).json({
          message: "Waiting for Admin Approval",
        });
      }
      if (user.status === "Rejected") {
        return res.status(400).json({
          message: "Registration Rejected",
        });
      }
    }

    // If login succeeds, return success
    res.status(200).json({
      success: true,
      message: "Login successful",
      deviceStatus,
      isDeviceRegistered,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).populate("busId");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getParentStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await User.findById(id).populate({
      path: "studentId",
      populate: { path: "busId" },
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: "Parent account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      user: parent,
      student: parent.studentId,
    });
  } catch (error) {
    console.error("Error fetching parent-student profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch student data for parent.",
    });
  }
};

const registerDevice = async (req, res) => {
  try {
    const { studentId, userId, id, deviceId } = req.body;
    const targetId = studentId || userId || id;

    if (!targetId || !deviceId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and Device ID are required",
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Update only the registeredDeviceId field
    user.registeredDeviceId = deviceId;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Device registered successfully.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const registerFace = async (req, res) => {
  try {
    const { studentId, userId, id, faceEmbedding } = req.body;
    const targetId = studentId || userId || id;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    if (!faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid numeric face embedding vector is required",
      });
    }

    // Ensure all elements in faceEmbedding are numbers
    const isValidNumbers = faceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
    if (!isValidNumbers) {
      return res.status(400).json({
        success: false,
        message: "Face embedding must contain valid numeric descriptor values",
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Save the numeric face embedding vector and set isFaceRegistered to true
    user.faceEmbedding = faceEmbedding;
    user.isFaceRegistered = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Face registered successfully.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Configurable Face Matching Threshold (testing/prototype threshold: 0.40)
const FACE_MATCH_THRESHOLD = process.env.FACE_MATCH_THRESHOLD
  ? parseFloat(process.env.FACE_MATCH_THRESHOLD)
  : 0.40;

const verifyFace = async (req, res) => {
  try {
    const { studentId, userId, id, faceEmbedding } = req.body;
    const targetId = studentId || userId || id;

    if (!targetId || !faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Unable to generate face embedding.",
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: "Student not found.",
      });
    }

    if (!user.isFaceRegistered || !user.faceEmbedding || user.faceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: "Registered face embedding not found.",
      });
    }

    const storedEmbedding = user.faceEmbedding;
    const currentEmbedding = faceEmbedding;

    // 1. Perform explicit L2 Normalization on both vectors before comparison
    const normA = Math.sqrt(currentEmbedding.reduce((sum, v) => sum + v * v, 0)) || 1;
    const normB = Math.sqrt(storedEmbedding.reduce((sum, v) => sum + v * v, 0)) || 1;

    // 2. Calculate Cosine Similarity: dot(storedEmbedding, currentEmbedding) / (norm(storedEmbedding) * norm(currentEmbedding))
    let dotProduct = 0;
    const len = Math.min(currentEmbedding.length, storedEmbedding.length);

    for (let i = 0; i < len; i++) {
      const a = currentEmbedding[i] / normA;
      const b = storedEmbedding[i] / normB;
      dotProduct += a * b;
    }

    const similarity = Number(dotProduct.toFixed(4));
    const isMatch = similarity >= FACE_MATCH_THRESHOLD;

    // Server-side debugging logs
    console.log("Stored embedding length:", storedEmbedding.length);
    console.log("Current embedding length:", currentEmbedding.length);
    console.log("Face similarity:", similarity);

    return res.status(200).json({
      success: true,
      verified: isMatch,
      similarity: similarity,
      threshold: FACE_MATCH_THRESHOLD,
      storedEmbeddingLength: storedEmbedding.length,
      currentEmbeddingLength: currentEmbedding.length,
      message: isMatch ? "Registered face matched" : "Face does not match the registered profile.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      verified: false,
      message: error.message,
    });
  }
};

const registerAiFace = async (req, res) => {
  try {
    const { studentId, userId, id, aiFaceEmbedding } = req.body;
    const targetId = studentId || userId || id;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required",
      });
    }

    if (!aiFaceEmbedding || !Array.isArray(aiFaceEmbedding) || aiFaceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Valid numeric AI face descriptor vector is required",
      });
    }

    // Ensure all elements in aiFaceEmbedding are numbers
    const isValidNumbers = aiFaceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
    if (!isValidNumbers) {
      return res.status(400).json({
        success: false,
        message: "AI face embedding must contain valid numeric descriptor values",
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Save the numeric AI face embedding vector and set isAiFaceRegistered to true
    user.aiFaceEmbedding = aiFaceEmbedding;
    user.isAiFaceRegistered = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "AI Face registered successfully.",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Configurable AI Face Matching Threshold (Cosine Similarity: default 0.60)
const AI_FACE_MATCH_THRESHOLD = process.env.AI_FACE_MATCH_THRESHOLD
  ? parseFloat(process.env.AI_FACE_MATCH_THRESHOLD)
  : 0.60;

const verifyAiFace = async (req, res) => {
  try {
    const { studentId, userId, id, faceEmbedding } = req.body;
    const targetId = studentId || userId || id;

    if (!targetId || !faceEmbedding || !Array.isArray(faceEmbedding) || faceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        matched: false,
        verified: false,
        message: "Valid AI face descriptor is required.",
      });
    }

    // Ensure all elements in faceEmbedding are numbers
    const isValidNumbers = faceEmbedding.every(val => typeof val === 'number' && !isNaN(val));
    if (!isValidNumbers) {
      return res.status(400).json({
        success: false,
        matched: false,
        verified: false,
        message: "AI face descriptor must contain valid numeric values.",
      });
    }

    const user = await User.findById(targetId);
    if (!user) {
      return res.status(404).json({
        success: false,
        matched: false,
        verified: false,
        message: "Student not found.",
      });
    }

    if (!user.isAiFaceRegistered || !user.aiFaceEmbedding || user.aiFaceEmbedding.length === 0) {
      return res.status(400).json({
        success: false,
        matched: false,
        verified: false,
        message: "Registered AI face embedding not found. Please register your face first.",
      });
    }

    const storedEmbedding = user.aiFaceEmbedding;
    const currentEmbedding = faceEmbedding;

    // Compute Cosine Similarity with L2 Normalization
    const normA = Math.sqrt(currentEmbedding.reduce((sum, v) => sum + v * v, 0)) || 1;
    const normB = Math.sqrt(storedEmbedding.reduce((sum, v) => sum + v * v, 0)) || 1;

    let dotProduct = 0;
    const len = Math.min(currentEmbedding.length, storedEmbedding.length);

    for (let i = 0; i < len; i++) {
      const a = currentEmbedding[i] / normA;
      const b = storedEmbedding[i] / normB;
      dotProduct += a * b;
    }

    const similarity = Number(dotProduct.toFixed(4));
    const isMatch = similarity >= AI_FACE_MATCH_THRESHOLD;

    console.log("Stored AI embedding length:", storedEmbedding.length);
    console.log("Current AI embedding length:", currentEmbedding.length);
    console.log("AI Face similarity:", similarity, "Threshold:", AI_FACE_MATCH_THRESHOLD, "Matched:", isMatch);

    return res.status(200).json({
      success: true,
      matched: isMatch,
      verified: isMatch,
      similarity: similarity,
      threshold: AI_FACE_MATCH_THRESHOLD,
      storedEmbeddingLength: storedEmbedding.length,
      currentEmbeddingLength: currentEmbedding.length,
      message: isMatch ? "Registered face matched" : "Face does not match the registered profile.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      matched: false,
      verified: false,
      message: error.message,
    });
  }
};

/**
 * Upload & Save Student Profile Image
 */
const uploadProfileImage = async (req, res) => {
  try {
    const { userId, studentId, id, image } = req.body;
    const targetUserId = userId || studentId || id;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        success: false,
        message: "Profile image data is required.",
      });
    }

    // Context user check to prevent arbitrary user updates
    const callerId = req.headers["x-user-id"];
    if (callerId && callerId !== targetUserId.toString()) {
      const callerUser = await User.findById(callerId);
      if (!callerUser || !["super_admin", "college_admin", "admin"].includes(callerUser.role)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You cannot update another user's profile image.",
        });
      }
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User account not found.",
      });
    }

    // Protect Super Admin account from being updated by any other caller
    if (user.role === "super_admin" && callerId !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Super Admin profile can only be modified by the Super Admin.",
      });
    }

    // Validate MIME type & size
    const matches = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
    if (!matches) {
      return res.status(400).json({
        success: false,
        message: "Invalid image format. Allowed formats are JPG, JPEG, PNG, and WEBP.",
      });
    }

    const ext = matches[1].toLowerCase() === "jpeg" ? "jpg" : matches[1].toLowerCase();
    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/i, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Max file size check: 5MB (5 * 1024 * 1024 bytes)
    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size exceeds 5MB limit. Please select a smaller photo.",
      });
    }

    // Ensure uploads/profiles directory exists
    const profilesDir = path.join(__dirname, "../uploads/profiles");
    if (!fs.existsSync(profilesDir)) {
      fs.mkdirSync(profilesDir, { recursive: true });
    }

    // Remove old profile picture file if present
    if (user.profileImage && user.profileImage.startsWith("/uploads/profiles/")) {
      const oldPath = path.join(__dirname, "..", user.profileImage);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (e) {
          console.warn("Failed to remove old profile picture:", e.message);
        }
      }
    }

    const filename = `profile_${user._id}_${Date.now()}.${ext}`;
    const filePath = path.join(profilesDir, filename);
    fs.writeFileSync(filePath, buffer);

    const relativePath = `/uploads/profiles/${filename}`;
    user.profileImage = relativePath;
    await user.save();

    const populatedUser = await User.findById(user._id).populate("collegeId busId");

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully.",
      user: populatedUser,
      profileImage: relativePath,
    });
  } catch (error) {
    console.error("Error uploading profile image:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to upload profile picture.",
    });
  }
};

/**
 * Get Super Admin Profile
 */
const getSuperAdminProfile = async (req, res) => {
  try {
    const callerId = req.headers["x-user-id"] || req.query.userId || req.query.id;
    if (!callerId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const user = await User.findById(callerId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access restricted to Super Admin.",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching Super Admin profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch Super Admin profile.",
    });
  }
};

/**
 * Update Super Admin Profile (Name, Phone, and/or Profile Image)
 */
const updateSuperAdminProfile = async (req, res) => {
  try {
    const callerId = req.headers["x-user-id"] || req.body.userId;
    if (!callerId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const user = await User.findById(callerId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Super Admin account not found.",
      });
    }

    if (user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Only the authenticated Super Admin can update this profile.",
      });
    }

    const { name, phone, image } = req.body;

    if (name && typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (phone && typeof phone === "string" && phone.trim()) {
      user.phone = phone.trim();
    }

    // Process image upload if provided
    if (image && typeof image === "string") {
      const matches = image.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
      if (!matches) {
        return res.status(400).json({
          success: false,
          message: "Invalid image format. Allowed formats are JPG, JPEG, PNG, and WEBP.",
        });
      }

      const ext = matches[1].toLowerCase() === "jpeg" ? "jpg" : matches[1].toLowerCase();
      const base64Data = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/i, "");
      const buffer = Buffer.from(base64Data, "base64");

      // Max file size: 5MB
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds 5MB limit. Please select a smaller photo.",
        });
      }

      // Ensure uploads/profiles directory exists
      const profilesDir = path.join(__dirname, "../uploads/profiles");
      if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, { recursive: true });
      }

      // Remove old profile picture file if present
      if (user.profileImage && user.profileImage.startsWith("/uploads/profiles/")) {
        const oldPath = path.join(__dirname, "..", user.profileImage);
        if (fs.existsSync(oldPath)) {
          try {
            fs.unlinkSync(oldPath);
          } catch (e) {
            console.warn("Failed to remove old profile picture:", e.message);
          }
        }
      }

      const filename = `superadmin_${user._id}_${Date.now()}.${ext}`;
      const filePath = path.join(profilesDir, filename);
      fs.writeFileSync(filePath, buffer);

      user.profileImage = `/uploads/profiles/${filename}`;
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select("-password");

    return res.status(200).json({
      success: true,
      message: "Super Admin profile updated successfully.",
      user: updatedUser,
      profileImage: updatedUser.profileImage,
    });
  } catch (error) {
    console.error("Error updating Super Admin profile:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update Super Admin profile.",
    });
  }
};

module.exports = {
  registerStudent,
  registerParent,
  registerCollegeAdmin,
  loginStudent,
  getStudentProfile,
  getParentStudentProfile,
  registerDevice,
  registerFace,
  registerAiFace,
  verifyFace,
  verifyAiFace,
  uploadProfileImage,
  getSuperAdminProfile,
  updateSuperAdminProfile,
};