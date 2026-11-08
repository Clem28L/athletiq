const db = require("../config/db");

// ============================================================
// ADD OPTION TO A QUESTION
// ============================================================
exports.addOption = (req, res) => {
  const questionId = req.params.id;
  const { text, is_correct } = req.body;

  // Required field
  if (!text) {
    return res.status(400).json({ error: "Option text is required" });
  }

  let isCorrectValue = 0;
  if (is_correct) {
    isCorrectValue = 1;
  }
  const query = `
    INSERT INTO options (text, is_correct, id_question)
    SELECT ?, ?, q.id_question
    FROM questions q
    JOIN quizzes ON quizzes.id_quiz = q.id_quiz
    WHERE q.id_question = ? AND quizzes.kind = 'educational'
  `;

  db.query(query, [text, isCorrectValue, questionId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.status(201).json({
      message: "Option created",
      optionId: result.insertId,
    });
  });
};

// ============================================================
// UPDATE AN OPTION
// ============================================================
exports.updateOption = (req, res) => {
  const optionId = req.params.id;
  const { text, is_correct } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Option text is required" });
  }

  let isCorrectValue = 0;
  if (is_correct) {
    isCorrectValue = 1;
  }

  const query = `
    UPDATE options o
    JOIN questions q ON q.id_question = o.id_question
    JOIN quizzes ON quizzes.id_quiz = q.id_quiz
    SET o.text = ?, o.is_correct = ?
    WHERE o.id_option = ? AND quizzes.kind = 'educational'
  `;

  db.query(query, [text, isCorrectValue, optionId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Option not found" });
    }

    res.json({ message: "Option updated" });
  });
};

// ============================================================
// DELETE AN OPTION
// ============================================================
exports.deleteOption = (req, res) => {
  const optionId = req.params.id;
  const query = `
    DELETE o FROM options o
    JOIN questions q ON q.id_question = o.id_question
    JOIN quizzes ON quizzes.id_quiz = q.id_quiz
    WHERE o.id_option = ? AND quizzes.kind = 'educational'
  `;

  db.query(query, [optionId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Option not found" });
    }

    res.json({ message: "Option deleted" });
  });
};
