const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const {
  getCategories,
  getQuestionnaire,
  submitQuestionnaire,
  getSubmission,
  getProduct,
  saveStatus,
} = require("../controllers/equipmentController");

const router = express.Router();

// Accès réservé aux athlètes
router.use(verifyToken, requireRole("athlete"));
router.get("/categories", getCategories);
router.get("/categories/:category/questionnaire", getQuestionnaire);
router.post("/categories/:category/submissions", submitQuestionnaire);
router.get("/submissions/:id", getSubmission);
router.get("/products/:id", getProduct);
router.put("/categories/:category/status", saveStatus);

module.exports = router;
