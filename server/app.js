require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const busRoutes = require("./routes/busRoutes");
const feeRoutes = require("./routes/feeRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const collegeRoutes = require("./routes/collegeRoutes");

const app = express();

app.use(cors());

// Support large image payloads (e.g. UPI QR code uploads) up to 50MB
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serve static uploaded assets
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/bus", busRoutes);
app.use("/api/fee", feeRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/colleges", collegeRoutes);

app.get("/", (req, res) => {
    res.send("CBTS Backend Running...");
});

module.exports = app;