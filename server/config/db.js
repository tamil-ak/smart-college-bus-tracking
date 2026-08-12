const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config();

// Ensure reliable IPv4-first and DNS resolution on Windows for MongoDB Atlas SRV records
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder("ipv4first");
  }
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (dnsErr) {
  console.warn("Notice: Custom DNS configuration skipped:", dnsErr.message);
}

const connectDB = async (retryCount = 0) => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  const isLoaded = Boolean(mongoUri);
  let safeHost = "N/A";
  if (mongoUri) {
    try {
      const atSplit = mongoUri.split("@");
      if (atSplit.length > 1) {
        safeHost = atSplit[1].split("/")[0].split("?")[0];
      } else {
        safeHost = mongoUri.split("://")[1]?.split("/")[0] || "Unknown";
      }
    } catch (e) {
      safeHost = "Error parsing host";
    }
  }

  console.log(`[Diagnostic] MongoDB URI loaded: ${isLoaded ? "YES" : "NO"}`);
  console.log(`[Diagnostic] MongoDB URI host: ${safeHost}`);

  if (!mongoUri) {
    console.error("❌ MongoDB Error: MONGO_URI is not defined in .env file.");
    return;
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`✅ MongoDB Connected Successfully (${mongoose.connection.name})`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (${error.message})`);
    
    if (retryCount < 5) {
      const waitTime = Math.min(3000 * (retryCount + 1), 10000);
      console.log(`⏳ Retrying MongoDB connection in ${waitTime / 1000}s (Attempt ${retryCount + 1}/5)...`);
      setTimeout(() => connectDB(retryCount + 1), waitTime);
    } else {
      console.error("❌ Max connection retry attempts reached. Please verify your network and MongoDB Atlas access.");
    }
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected. Attempting reconnection...");
});

mongoose.connection.on("error", (err) => {
  console.error("⚠️ MongoDB connection error:", err.message);
});

module.exports = connectDB;