const db = require("../config/db");
const mysql = require("mysql2/promise");
const { validateQuestion } = require("../services/questionValidation");

// LISTE DES QUIZ
exports.getAllQuizzes = (req, res) => {
  const query = `
    SELECT id_quiz, title, description, module, category, published, created_at
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
    SELECT id_quiz, title, description, module, category
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
  const isExpert = req.user.role === "expert";

  // Check the user role
  if (!isExpert && req.user.role !== "athlete") {
    return res.status(403).json({ error: "Accès refusé." });
  }

  // Get the quiz information
  const quizQuery = `
    SELECT id_quiz, title, description, module, category,
           published, created_at, id_user
    FROM quizzes
    WHERE id_quiz = ?
  `;

  db.query(quizQuery, [quizId], (err, quizResults) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (quizResults.length === 0) {
      return res.status(404).json({ error: "Quiz non trouvé." });
    }

    const quiz = quizResults[0];

    // Experts can only manage their own quizzes
    if (isExpert && quiz.id_user !== req.user.id_user) {
      return res.status(403).json({
        error: "Tu peux seulement consulter tes propres quiz.",
      });
    }

    // Athletes can only access published quizzes
    if (!isExpert && !quiz.published) {
      return res.status(404).json({ error: "Quiz non trouvé." });
    }

    // Get all question fields
    const questionsQuery = `
      SELECT id_question, text, type_answer, points,
             question_order, correct_number, tolerance,
             min_value, max_value, step_value, unit,
             accepted_texts, settings
      FROM questions
      WHERE id_quiz = ?
      ORDER BY question_order, id_question
    `;

    db.query(questionsQuery, [quizId], (err, questionResults) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (questionResults.length === 0) {
        quiz.questions = [];
        return res.json(quiz);
      }

      let questionsLoaded = 0;

      // Prevent several responses if a query fails
      let hasError = false;

      questionResults.forEach((question) => {
        // Hide corrections from athletes
        if (!isExpert) {
          delete question.correct_number;
          delete question.tolerance;
          delete question.accepted_texts;

          // Settings may contain private correction rules
          delete question.settings;
        }

        // Get all option fields
        const optionsQuery = `
          SELECT id_option, text, is_correct, display_order,
                 correct_position, pair_key, pair_side,
                 correct_category
          FROM options
          WHERE id_question = ?
          ORDER BY display_order, id_option
        `;

        db.query(
          optionsQuery,
          [question.id_question],
          (err, optionResults) => {
            if (hasError) return;

            if (err) {
              hasError = true;

              return res.status(500).json({
                error: err.message,
              });
            }

            // Keep correction fields for experts only
            if (!isExpert) {
              optionResults.forEach((option) => {
                delete option.is_correct;
                delete option.correct_position;
                delete option.pair_key;
                delete option.correct_category;
              });
            }

            question.options = optionResults;
            questionsLoaded++;

            // Reply when all options are loaded
            if (questionsLoaded === questionResults.length) {
              quiz.questions = questionResults;
              return res.json(quiz);
            }
          }
        );
      });
    });
  });
};

exports.createQuiz = (req, res) => {
  // Get the quiz information from the request body
  const { title, description, module, category } = req.body;

  // Get the user ID from the authenticated user
  const userId = req.user.id_user;

  // Check if all required fields are provided
  if (!title || !description || !module || !category) {
    return res.status(400).json({ error: "Tous les champs sont requis" });
  }

  // Create the quiz with published set to false
  const query = `
    INSERT INTO quizzes (title, description, module, category, published, id_user)
    VALUES (?, ?, ?, ?, FALSE, ?)
  `;

  db.query(
    query,
    [title, description, module, category, userId],
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
    },
  );
};

exports.updateQuiz = (req, res) => {
  // Get the quiz ID from the URL
  const quizId = req.params.id;

  // Get the updated quiz information from the request body
  const { title, description, module, category, published } = req.body;

  // Check if all required fields are provided
  if (
    !title ||
    !description ||
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
      SET title = ?, description = ?, module = ?, category = ?, published = ?
      WHERE id_quiz = ?
    `;

    db.query(
      query,
      [title, description, module, category, published, quizId],
      (err) => {
        // Handle database errors
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Return the success message
        res.json({ message: "Quiz mis à jour avec succès" });
      },
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

exports.addQuestionToQuiz = async (req, res) => {
  // Get the quiz ID
  const quizId = Number(req.params.id);

  if (!Number.isInteger(quizId) || quizId < 1) {
    return res.status(400).json({ error: "ID du quiz invalide." });
  }

  // Validate the question
  const data = req.body;
  const validationError = validateQuestion(data);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const {
    text,
    type_answer,
    points,
    options = [],
    correct_number,
    tolerance = 0,
    min_value,
    max_value,
    step_value,
    unit,
    accepted_texts,
  } = data;

  if (
    unit !== undefined &&
    (typeof unit !== "string" || unit.length > 30)
  ) {
    return res.status(400).json({
      error: "L’unité doit être un texte de 30 caractères maximum.",
    });
  }

  let connection;

  try {
    // Use a separate connection for this transaction
    connection = await mysql.createConnection({
      host: db.config.host,
      port: db.config.port,
      user: db.config.user,
      password: db.config.password,
      database: db.config.database,
      ssl: db.config.ssl,
    });

    await connection.beginTransaction();

    // Check the quiz and its owner
    const [quizzes] = await connection.execute(
      "SELECT id_quiz, id_user FROM quizzes WHERE id_quiz = ? FOR UPDATE",
      [quizId]
    );

    if (quizzes.length === 0) {
      await connection.rollback();

      return res.status(404).json({ error: "Quiz non trouvé." });
    }

    if (quizzes[0].id_user !== req.user.id_user) {
      await connection.rollback();

      return res.status(403).json({
        error: "Tu peux seulement modifier tes propres quiz.",
      });
    }

    const isNumeric =
      type_answer === "numeric" || type_answer === "slider";

    const isSlider = type_answer === "slider";

    // Insert the question
    const query = `
      INSERT INTO questions (
        id_quiz,
        text,
        type_answer,
        points,
        correct_number,
        tolerance,
        min_value,
        max_value,
        step_value,
        unit,
        accepted_texts
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await connection.execute(query, [
      quizId,
      text.trim(),
      type_answer,
      points,
      isNumeric ? correct_number : null,
      isNumeric ? tolerance : 0,
      isSlider ? min_value : null,
      isSlider ? max_value : null,
      isSlider ? step_value : null,
      isNumeric ? (unit || "").trim() : null,
      type_answer === "short_text"
        ? JSON.stringify(accepted_texts)
        : null,
    ]);

    const questionId = result.insertId;

    // Insert the options when needed
    const optionQuery = `
      INSERT INTO options (
        id_question,
        text,
        is_correct,
        display_order,
        correct_position,
        pair_key,
        pair_side,
        correct_category
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (let index = 0; index < options.length; index++) {
      const option = options[index];

      const isChoice =
        type_answer === "single_choice" ||
        type_answer === "multiple_choice" ||
        type_answer === "true_false";

      await connection.execute(optionQuery, [
        questionId,
        option.text.trim(),
        isChoice && option.is_correct ? 1 : 0,
        index + 1,
        type_answer === "ordering" ? option.correct_position : null,
        type_answer === "matching" ? option.pair_key : null,
        type_answer === "matching" ? option.pair_side : null,
        type_answer === "categorization"
          ? option.correct_category.trim()
          : null,
      ]);
    }

    // Save everything together
    await connection.commit();

    return res.status(201).json({
      message: "Question ajoutée avec succès.",
      questionId: questionId,
    });
  } catch (err) {
    // Cancel all inserts if something fails
    if (connection) {
      await connection.rollback();
    }

    console.error(err);

    return res.status(500).json({
      error: "Impossible d’ajouter la question.",
    });
  } finally {
    // Always close this connection
    if (connection) {
      await connection.end();
    }
  }
};