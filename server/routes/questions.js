const express = require("express");
const router = express.Router();
const questionController = require("../controllers/questionController");
const { verifyToken, requireRole } = require("../middleware/auth");


router.put("/:id", verifyToken, requireRole("expert"), questionController.updateQuestion);
router.delete("/:id", verifyToken, requireRole("expert"), questionController.deleteQuestion);

















module.exports = router;