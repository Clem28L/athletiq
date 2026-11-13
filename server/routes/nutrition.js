const express = require("express");
const router = express.Router();
const nutritionController = require("../controllers/nutritionController");
const { verifyToken, requireRole } = require("../middleware/auth");

// Only athletes can calculate and manage their own plans.
router.post("/calculate", verifyToken, requireRole("athlete"), nutritionController.calculatePlan);
router.post("/suggest", verifyToken, requireRole("athlete"), nutritionController.suggestPlan);
router.post("/", verifyToken, requireRole("athlete"), nutritionController.createPlan);
router.get("/", verifyToken, requireRole("athlete"), nutritionController.getMyPlans);
router.get("/:id", verifyToken, requireRole("athlete"), nutritionController.getPlanById);
router.put("/:id", verifyToken, requireRole("athlete"), nutritionController.updatePlan);
router.delete("/:id", verifyToken, requireRole("athlete"), nutritionController.deletePlan);

module.exports = router;
