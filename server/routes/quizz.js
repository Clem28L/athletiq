const express = require("express");
const router = express.Router();
const quizController = require("../controllers/quizzController");
const { verifyToken, requireRole } = require("../middleware/auth");

// GET /api/quizzes → tous les quiz (expert)
router.get(
  "/",
  verifyToken,
  requireRole("expert"),
  quizController.getAllQuizzes,
);

// GET /api/quizzes/published → quiz publiés (athlète)
router.get("/published", verifyToken, quizController.getPublishedQuizzes);

module.exports = router;
