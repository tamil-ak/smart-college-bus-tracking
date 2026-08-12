const express = require("express");
const router = express.Router();

const {
  registerStudent,
  registerParent,
  loginStudent,
  getStudentProfile,
  getParentStudentProfile,
  registerDevice,
  registerFace,
  registerAiFace,
  verifyFace,
  verifyAiFace,
} = require("../controllers/authController");

router.post("/register/student", registerStudent);
router.post("/register/parent", registerParent);
router.post("/login/student", loginStudent);
router.post("/login/parent", loginStudent);
router.post("/login", loginStudent);

router.post("/register-device", registerDevice);
router.post("/register-face", registerFace);
router.post("/register-ai-face", registerAiFace);
router.post("/verify-face", verifyFace);
router.post("/verify-ai-face", verifyAiFace);

router.get("/profile/:id", getStudentProfile);
router.get("/parent-student/:id", getParentStudentProfile);

module.exports = router;