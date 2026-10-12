const db = require("../config/db");

// LISTE DES QUIZ
exports.getAllQuizzes = (req, res) => {
  const query = `
    SELECT id_quiz, title, description, type, module, category, published, created_at
    FROM quizzes
    ORDER BY created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};

// LISTE DES QUIZ PUBLIÉS (pour les athlètes)
exports.getPublishedQuizzes = (req, res) => {
  const query = `
    SELECT id_quiz, title, description, type, module, category
    FROM quizzes
    WHERE published = TRUE
    ORDER BY created_at DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(results);
  });
};
