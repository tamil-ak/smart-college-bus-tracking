const express = require("express");
const router = express.Router();
const { addBus, getAllBuses, updateBus, deleteBus, generateBusQr, validateBusQr } = require("../controllers/busController");

router.post("/add", addBus);
router.get("/all", getAllBuses);
router.put("/update/:id", updateBus);
router.delete("/delete/:id", deleteBus);
router.post("/generate-qr/:id", generateBusQr);
router.post("/validate-qr", validateBusQr);

module.exports = router;
