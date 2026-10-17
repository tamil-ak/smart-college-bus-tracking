const express = require("express");
const router = express.Router();
const {
  addBus,
  getAllBuses,
  updateBus,
  deleteBus,
  generateBusQr,
  validateBusQr,
  updateGpsLocation,
  getLiveTracking,
  simulateStep,
  toggleSimulation,
} = require("../controllers/busController");

router.post("/add", addBus);
router.get("/all", getAllBuses);
router.put("/update/:id", updateBus);
router.delete("/delete/:id", deleteBus);
router.post("/generate-qr/:id", generateBusQr);
router.post("/validate-qr", validateBusQr);

// Live Bus Tracking Routes (Hardware Ingestion + Demo Simulation + Secure Live Feed)
router.post("/tracking/gps", updateGpsLocation);
router.get("/tracking/live/:busId", getLiveTracking);
router.post("/tracking/simulate-step", simulateStep);
router.post("/tracking/toggle-simulation", toggleSimulation);

module.exports = router;
