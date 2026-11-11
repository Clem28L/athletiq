const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { getCategories, saveStatus } = require("../controllers/equipmentController");

const router = express.Router();

// Accès réservé aux athlètes
router.use(verifyToken, requireRole("athlete"));
router.get("/categories", getCategories);
router.put("/categories/:category/status", saveStatus);

module.exports = router;
