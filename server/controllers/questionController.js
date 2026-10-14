const db = require("../config/db");


exports.updateQuestion = (req, res) => {
  // Get the question ID from the URL
  const questionId = req.params.id;

  // Get the updated question information from the request body
  const { text, type_answer } = req.body;

  // Check if all required fields are provided
  if (!text || !type_answer) {
    return res.status(400).json({
      error: "Le texte et le type de réponse sont requis",
    });
  }

  // Check if the question exists
  const checkQuery = `
    SELECT id_question
    FROM questions
    WHERE id_question = ?
  `;

  db.query(checkQuery, [questionId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the question was found
    if (results.length === 0) {
      return res.status(404).json({ error: "Question non trouvée" });
    }

    // Update the question in the database
    const updateQuery = `
      UPDATE questions
      SET text = ?, type_answer = ?
      WHERE id_question = ?
    `;

    db.query(updateQuery, [text, type_answer, questionId], (err) => {
      // Handle database errors
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return the success message
      res.json({ message: "Question mise à jour avec succès" });
    });
  });
};



exports.deleteQuestion = (req, res) => {
  // Get the question ID from the URL
  const questionId = req.params.id;

  // Check if the question exists
  const checkQuery = `
    SELECT id_question
    FROM questions
    WHERE id_question = ?
  `;

  db.query(checkQuery, [questionId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the question was found
    if (results.length === 0) {
      return res.status(404).json({ error: "Question non trouvée" });
    }

    // Delete the question from the database
    const deleteQuery = `
      DELETE FROM questions
      WHERE id_question = ?
    `;

    db.query(deleteQuery, [questionId], (err) => {
      // Handle database errors
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return the success message
      res.json({ message: "Question supprimée avec succès" });
    });
  });
};
