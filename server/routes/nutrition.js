const express = require("express");
const router = express.Router();
const nutritionController = require("../controllers/nutritionController");
const { verifyToken, requireRole } = require("../middleware/auth");


router.post("/calculate", verifyToken, requireRole("athlete"), nutritionController.calculatePlan);
router.post("/", verifyToken, requireRole("athlete"), nutritionController.createPlan);
router.get("/", verifyToken, requireRole("athlete"), nutritionController.getMyPlans);
router.get("/:id", verifyToken, requireRole("athlete"), nutritionController.getPlanById);
router.delete("/:id", verifyToken, requireRole("athlete"), nutritionController.deletePlan);

module.exports = router;
