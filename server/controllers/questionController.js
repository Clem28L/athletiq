const db = require("../config/db");
const mysql = require("mysql2/promise");
const { validateQuestion } = require("../services/questionValidation");

exports.updateQuestion = async (req, res) => {
  // Get the question ID from the URL
  const questionId = Number(req.params.id);

  if (!Number.isInteger(questionId) || questionId < 1) {
    return res.status(400).json({
      error: "ID de la question invalide.",
    });
  }

  // Validate the updated question
  const data = req.body;
  const validationError = validateQuestion(data);

  if (validationError) {
    return res.status(400).json({
      error: validationError,
    });
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

    // Check the question and its quiz owner
    const checkQuery = `
      SELECT questions.id_question, quizzes.id_user
      FROM questions
      JOIN quizzes ON questions.id_quiz = quizzes.id_quiz
      WHERE questions.id_question = ?
      FOR UPDATE
    `;

    const [results] = await connection.execute(checkQuery, [questionId]);

    if (results.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: "Question non trouvée.",
      });
    }

    if (results[0].id_user !== req.user.id_user) {
      await connection.rollback();

      return res.status(403).json({
        error: "Tu peux seulement modifier tes propres quiz.",
      });
    }

    const isNumeric =
      type_answer === "numeric" || type_answer === "slider";

    const isSlider = type_answer === "slider";

    // Update the question and clear unused fields
    const updateQuery = `
      UPDATE questions
      SET text = ?,
          type_answer = ?,
          points = ?,
          correct_number = ?,
          tolerance = ?,
          min_value = ?,
          max_value = ?,
          step_value = ?,
          unit = ?,
          accepted_texts = ?
      WHERE id_question = ?
    `;

    await connection.execute(updateQuery, [
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
      questionId,
    ]);

    // Remove the old options
    await connection.execute(
      "DELETE FROM options WHERE id_question = ?",
      [questionId]
    );

    // Insert the updated options
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

    const isChoice =
      type_answer === "single_choice" ||
      type_answer === "multiple_choice" ||
      type_answer === "true_false";

    for (let index = 0; index < options.length; index++) {
      const option = options[index];

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

    // Save all changes together
    await connection.commit();

    return res.json({
      message: "Question mise à jour avec succès.",
    });
  } catch (err) {
    // Cancel all changes if something fails
    if (connection) {
      await connection.rollback();
    }

    console.error(err);

    return res.status(500).json({
      error: "Impossible de modifier la question.",
    });
  } finally {
    // Always close this connection
    if (connection) {
      await connection.end();
    }
  }
};


exports.deleteQuestion = (req, res) => {
  // Get the question ID from the URL
  const questionId = req.params.id;

  // Check the question and its quiz owner
  const checkQuery = `
    SELECT questions.id_question, quizzes.id_user
    FROM questions
    JOIN quizzes ON questions.id_quiz = quizzes.id_quiz
    WHERE questions.id_question = ?
  `;

  db.query(checkQuery, [questionId], (err, results) => {
    // Handle database errors
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Check if the question exists
    if (results.length === 0) {
      return res.status(404).json({
        error: "Question non trouvée.",
      });
    }

    // Check the quiz owner
    if (results[0].id_user !== req.user.id_user) {
      return res.status(403).json({
        error: "Tu peux seulement modifier tes propres quiz.",
      });
    }

    // Check ownership again when deleting
    const deleteQuery = `
      DELETE questions
      FROM questions
      JOIN quizzes ON questions.id_quiz = quizzes.id_quiz
      WHERE questions.id_question = ?
        AND quizzes.id_user = ?
    `;

    db.query(
      deleteQuery,
      [questionId, req.user.id_user],
      (err, result) => {
        // Handle database errors
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
          return res.status(404).json({
            error: "Question introuvable ou inaccessible.",
          });
        }

        // Related options are deleted automatically
        return res.json({
          message: "Question supprimée avec succès.",
        });
      }
    );
  });
};