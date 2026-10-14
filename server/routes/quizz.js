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

router.get("/:id", verifyToken, quizController.getQuizById);
router.post("/", verifyToken, requireRole("expert"), quizController.createQuiz);
router.put("/:id", verifyToken, requireRole("expert"), quizController.updateQuiz);
router.delete("/:id", verifyToken, requireRole("expert"), quizController.deleteQuiz);
router.patch("/:id/publish", verifyToken, requireRole("expert"), quizController.publishQuiz);
router.patch("/:id/unpublish", verifyToken, requireRole("expert"), quizController.unpublishQuiz);
router.post("/:id/questions", verifyToken, requireRole("expert"), quizController.addQuestionToQuiz);

module.exports = router;
