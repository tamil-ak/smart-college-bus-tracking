const User = require("../models/User");
const bcrypt = require("bcryptjs");

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
    } = req.body;

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { registerNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student
    const user = await User.create({
      name,
      registerNumber,
      department,
      year,
      section,
      email,
      phone,
      password: hashedPassword,
      role: "student",
      status: "Pending",
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

const loginStudent = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Email or Register Number and password are required",
      });
    }

    // Find student using email or registerNumber
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { registerNumber: identifier }
      ]
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Compare the password using bcrypt.compare()
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Detect device registration status
    const isDeviceRegistered = Boolean(user.registeredDeviceId);
    const deviceStatus = isDeviceRegistered ? "Registered" : "Device not registered";

    // If role === "admin", return success immediately without checking status
    if (user.role === "admin") {
      return res.status(200).json({
        success: true,
        message: "Login successful",
        deviceStatus,
        isDeviceRegistered,
        user,
      });
    }

    // If role === "student", check status
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

module.exports = {
  registerStudent,
  loginStudent,
  getStudentProfile,
  registerDevice,
  registerFace,
  registerAiFace,
  verifyFace,
  verifyAiFace,
};