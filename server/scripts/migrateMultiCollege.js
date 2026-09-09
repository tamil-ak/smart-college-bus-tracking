const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const College = require("../models/College");

const runMigration = async () => {
  try {
    console.log("🔄 Connecting to database for multi-college & Kongu College data migration...");
    await connectDB();

    const db = mongoose.connection.db;

    // 1. Ensure Kongu Engineering College exists and update legacy "MAIN" college if present
    let konguCollege = await College.findOne({
      $or: [{ code: "KEC" }, { code: "MAIN" }, { _id: new mongoose.Types.ObjectId("6a9bd0a847b0f71aa0678e88") }]
    });

    if (!konguCollege) {
      konguCollege = await College.create({
        name: "Kongu Engineering College",
        code: "KEC",
        email: "admin@kongu.edu",
        phone: "04294226700",
        address: "Perundurai, Erode, Tamil Nadu 638060",
        status: "Active",
      });
      console.log("✅ Created Kongu Engineering College:", konguCollege.name, `(${konguCollege.code})`);
    } else {
      konguCollege.name = "Kongu Engineering College";
      konguCollege.code = "KEC";
      konguCollege.email = "admin@kongu.edu";
      konguCollege.phone = "04294226700";
      konguCollege.address = "Perundurai, Erode, Tamil Nadu 638060";
      konguCollege.status = "Active";
      await konguCollege.save();
      console.log("✅ Updated & Preserved Kongu Engineering College record:", konguCollege.name, `(${konguCollege._id})`);
    }

    const konguCollegeId = konguCollege._id;

    // 2. Set up Super Admin user (role: "super_admin", collegeId: null, status: "approved")
    console.log("🔄 Configuring Super Admin user...");
    const superAdminUser = await db.collection("users").findOneAndUpdate(
      { email: "tamil200019@gmail.com" },
      {
        $set: {
          role: "super_admin",
          collegeId: null,
          status: "approved",
        }
      },
      { returnDocument: "after" }
    );

    if (superAdminUser && superAdminUser.value) {
      console.log("✅ Configured Super Admin:", superAdminUser.value.email, "role:", superAdminUser.value.role, "collegeId:", superAdminUser.value.collegeId);
    }

    // 3. Migrate Users collection (all non-super_admin users bound to Kongu College if missing or legacy)
    console.log("🔄 Updating Users collection with Kongu Engineering College ID...");
    const userRes = await db.collection("users").updateMany(
      { role: { $ne: "super_admin" }, $or: [{ collegeId: { $exists: false } }, { collegeId: null }] },
      { $set: { collegeId: konguCollegeId } }
    );
    console.log(`✅ Non-SuperAdmin Users updated to Kongu College: ${userRes.modifiedCount} documents.`);

    // 4. Migrate Bus Collection
    console.log("🔄 Updating Bus collection with Kongu Engineering College ID...");
    try {
      await db.collection("buses").dropIndex("busNumber_1");
    } catch (e) {
      // index already dropped or not present
    }
    const busRes = await db.collection("buses").updateMany(
      { $or: [{ collegeId: { $exists: false } }, { collegeId: null }] },
      { $set: { collegeId: konguCollegeId } }
    );
    console.log(`✅ Buses updated: ${busRes.modifiedCount} documents.`);

    // 5. Migrate BusFee Collection
    console.log("🔄 Updating BusFee collection with Kongu Engineering College ID...");
    const feeRes = await db.collection("busfees").updateMany(
      { $or: [{ collegeId: { $exists: false } }, { collegeId: null }] },
      { $set: { collegeId: konguCollegeId } }
    );
    console.log(`✅ BusFees updated: ${feeRes.modifiedCount} documents.`);

    // 6. Migrate StudentFeePayment Collection
    console.log("🔄 Updating StudentFeePayment collection with Kongu Engineering College ID...");
    try {
      await db.collection("studentfeepayments").dropIndex("studentId_1_busId_1_academicYear_1");
    } catch (e) {
      // index already dropped or not present
    }
    const paymentRes = await db.collection("studentfeepayments").updateMany(
      { $or: [{ collegeId: { $exists: false } }, { collegeId: null }] },
      { $set: { collegeId: konguCollegeId } }
    );
    console.log(`✅ StudentFeePayments updated: ${paymentRes.modifiedCount} documents.`);

    // 7. Migrate PaymentSettings Collection
    console.log("🔄 Updating PaymentSettings collection with Kongu Engineering College ID...");
    const settingsRes = await db.collection("paymentsettings").updateMany(
      { $or: [{ collegeId: { $exists: false } }, { collegeId: null }] },
      { $set: { collegeId: konguCollegeId } }
    );
    console.log(`✅ PaymentSettings updated: ${settingsRes.modifiedCount} documents.`);

    console.log("\n🎉 Multi-College & Kongu Engineering College Safe Data Migration Completed!");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

runMigration();
