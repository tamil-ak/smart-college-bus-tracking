require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const createAdmin = async () => {
  try {
    // Establish database connection
    await connectDB();

    const adminEmail = "tamil200019@gmail.com";

    // Check if an admin with this email already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`Admin with email "${adminEmail}" already exists.`);
      return;
    }

    // Hash the admin password using bcryptjs
    const hashedPassword = await bcrypt.hash("Tamil2025@", 10);

    // Create the Admin user
    const admin = await User.create({
      name: "Tamilselvan M",
      email: adminEmail,
      password: hashedPassword,
      registerNumber: "ADMIN001",
      department: "Administration",
      year: "0",
      section: "A",
      phone: "8220326899",
      role: "admin",
      status: "Approved",
    });

    console.log("✅ Admin user created successfully in database:", admin.email);
  } catch (error) {
    console.error("❌ Error provisioning admin user:", error.message);
  } finally {
    // Close the database connection cleanly
    mongoose.connection.close();
  }
};

createAdmin();
