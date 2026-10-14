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


// GET ONE QUIZ WITH ITS QUESTIONS AND OPTIONS
exports.getQuizById = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Get the quiz information
  const quizQuery = `
    SELECT id_quiz, title, description, type, module, category, published, created_at
    FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(quizQuery, [quizId], (err, quizResults) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the quiz exists
    if (quizResults.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Save the quiz information
    const quiz = quizResults[0];

    // Get the questions linked to this quiz
    const questionsQuery = `
      SELECT id_question, text, type_answer, points
      FROM questions
      WHERE id_quiz = ?
    `;

    db.query(questionsQuery, [quizId], (err, questionResults) => {
      // Handle database errors
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // If there are no questions, return the quiz with an empty list
      if (questionResults.length === 0) {
        quiz.questions = [];
        return res.json(quiz);
      }

      // Count the questions to know when all options are loaded
      let questionsLoaded = 0;

      // Get the options for each question
      questionResults.forEach((question) => {
        const optionsQuery = `
          SELECT id_option, text
          FROM options
          WHERE id_question = ?
        `;

        db.query(
          optionsQuery,
          [question.id_question],
          (err, optionResults) => {
            // Handle database errors
            if (err) {
              return res.status(500).json({ error: err.message });
            }

            // Add the options to the current question
            question.options = optionResults;

            // Count this question as loaded
            questionsLoaded++;

            // Return the quiz only when all questions have their options
            if (questionsLoaded === questionResults.length) {
              quiz.questions = questionResults;
              res.json(quiz);
            }
          }
        );
      });
    });
  });
};

exports.createQuiz = (req, res) => {
  // Get the quiz information from the request body
  const { title, description, type, module, category } = req.body;

  // Get the user ID from the authenticated user
  const userId = req.user.id_user;

  // Check if all required fields are provided
  if (!title || !description || !type || !module || !category) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }

  // Create the quiz with published set to false
  const query = `
    INSERT INTO quizzes (title, description, type, module, category, published, id_user)
    VALUES (?, ?, ?, ?, ?, FALSE, ?)
  `;

  db.query(
    query,
    [title, description, type, module, category, userId],
    (err, result) => {
      // Handle database errors
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return the success message and the new quiz ID
      res.status(201).json({
        message: "Quiz créé avec succès",
        quizId: result.insertId,
      });
    }
  );
};

exports.updateQuiz = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Get the updated quiz information from the request body
  const { title, description, type, module, category, published } = req.body;

  // Check if all required fields are provided
  if (
    !title ||
    !description ||
    !type ||
    !module ||
    !category ||
    typeof published !== "boolean"
  ) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }

  // Check if the quiz exists
  const checkQuery = `
    SELECT id_quiz
    FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(checkQuery, [quizId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the quiz was found
    if (results.length === 0) {
      return res.status(404).json({ error: "Quiz non trouvé" });
    }

    // Update the quiz in the database
    const query = `
      UPDATE quizzes
      SET title = ?, description = ?, type = ?, module = ?, category = ?, published = ?
      WHERE id_quiz = ?
    `;

    db.query(
      query,
      [title, description, type, module, category, published, quizId],
      (err) => {
        // Handle database errors
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Return the success message
        res.json({ message: "Quiz mis à jour avec succès" });
      }
    );
  });
};

exports.deleteQuiz = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Delete the quiz from the database
  const query = `
    DELETE FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(query, [quizId], (err, result) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the quiz was found
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Quiz non trouvé" });
    }

    // Return the success message
    res.json({ message: "Quiz supprimé avec succès" });
  });
};

exports.publishQuiz = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Check if the quiz exists
  const checkQuery = `
    SELECT id_quiz
    FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(checkQuery, [quizId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the quiz was found
    if (results.length === 0) {
      return res.status(404).json({ error: "Quiz non trouvé" });
    }

    // Publish the quiz
    const query = `
      UPDATE quizzes
      SET published = TRUE
      WHERE id_quiz = ?
    `;

    db.query(query, [quizId], (err) => {
      // Handle database errors
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return the success message
      return res.json({ message: "Quiz publié avec succès" });
    });
  });
};
exports.unpublishQuiz = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Check if the quiz exists
  const checkQuery = `
    SELECT id_quiz
    FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(checkQuery, [quizId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the quiz was found
    if (results.length === 0) {
      return res.status(404).json({ error: "Quiz non trouvé" });
    }

    // Unpublish the quiz
    const query = `
      UPDATE quizzes
      SET published = FALSE
      WHERE id_quiz = ?
    `;

    db.query(query, [quizId], (err) => {
      // Handle database errors
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Return the success message
      return res.json({ message: "Quiz dépublié avec succès" });
    });
  });
};  

exports.addQuestionToQuiz = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Get the question information from the request body
  const { text, type_answer, points } = req.body;

  // Check if required fields are provided
  if (!text || !type_answer) {
    return res.status(400).json({
      error: "Le texte et le type de réponse sont requis",
    });
  }

  // Check if points are valid
  if (points !== undefined && (!Number.isInteger(points) || points < 0)) {
    return res.status(400).json({
      error: "Les points doivent être un entier positif ou nul",
    });
  }

  // Check if the quiz exists
  const checkQuery = `
    SELECT id_quiz
    FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(checkQuery, [quizId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the quiz was found
    if (results.length === 0) {
      return res.status(404).json({ error: "Quiz non trouvé" });
    }

    // Insert the new question into the database
    const query = `
      INSERT INTO questions (text, type_answer, points, id_quiz)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      query,
      [text, type_answer, points ?? 1, quizId],
      (err, result) => {
        // Handle database errors
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Return the success message and the new question ID
        res.status(201).json({
          message: "Question ajoutée avec succès",
          questionId: result.insertId,
        });
      },
    );
  });
};
