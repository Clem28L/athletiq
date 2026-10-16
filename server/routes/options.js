const express = require("express");
const router = express.Router();
const optionController = require("../controllers/optionController");
const { verifyToken, requireRole } = require("../middleware/auth");

// POST /api/questions/:id/options
router.post(
  "/questions/:id/options",
  verifyToken,
  requireRole("expert"),
  optionController.addOption,
);

// PUT /api/options/:id
router.put(
  "/options/:id",
  verifyToken,
  requireRole("expert"),
  optionController.updateOption,
);

// DELETE /api/options/:id
router.delete(
  "/options/:id",
  verifyToken,
  requireRole("expert"),
  optionController.deleteOption,
);

module.exports = router;
