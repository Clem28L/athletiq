const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const {
  getCategories,
  getQuestionnaire,
  submitQuestionnaire,
  saveStatus,
} = require("../controllers/equipmentController");

const router = express.Router();

// Accès réservé aux athlètes
router.use(verifyToken, requireRole("athlete"));
router.get("/categories", getCategories);
router.get("/categories/:category/questionnaire", getQuestionnaire);
router.post("/categories/:category/submissions", submitQuestionnaire);
router.put("/categories/:category/status", saveStatus);

module.exports = router;
