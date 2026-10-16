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

  // Check the question exists
  const checkQuery = "SELECT id_question FROM questions WHERE id_question = ?";

  db.query(checkQuery, [questionId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Convert boolean to 1/0 for MySQL
    const isCorrectValue = is_correct ? 1 : 0;

    const insertQuery = `
      INSERT INTO options (text, is_correct, id_question)
      VALUES (?, ?, ?)
    `;

    db.query(insertQuery, [text, isCorrectValue, questionId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        message: "Option created",
        optionId: result.insertId,
      });
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

  const isCorrectValue = is_correct ? 1 : 0;

  const query = `
    UPDATE options
    SET text = ?, is_correct = ?
    WHERE id_option = ?
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
  const query = "DELETE FROM options WHERE id_option = ?";

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
