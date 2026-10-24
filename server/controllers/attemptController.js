const mysql = require("mysql2/promise");
const db = require("../config/db");

const {
  loadQuizQuestions,
  getQuizVersion,
} = require("../services/quizData");

const { checkAnswer } = require("../services/answerValidation");

// Check the answers, calculate the score and save the attempt.
exports.submitQuiz = async (req, res) => {
  const quizId = Number(req.params.id);
  const body = req.body;

  if (
    !Number.isInteger(quizId) ||
    quizId < 1 ||
    !body ||
    !Array.isArray(body.answers)
  ) {
    return res.status(400).json({
      error: "Invalid quiz submission.",
    });
  }

  let connection;

  try {
    // Open a separate database connection for this submission.
    connection = await mysql.createConnection({
      host: db.config.host,
      port: db.config.port,
      user: db.config.user,
      password: db.config.password,
      database: db.config.database,
      ssl: db.config.ssl,
    });

    // Start a group of changes that can all be saved or cancelled together.
    await connection.beginTransaction();

    // Make changes to this quiz wait while we check and save the answers.
    const [quizzes] = await connection.execute(
      `SELECT id_quiz, published
       FROM quizzes
       WHERE id_quiz = ?
       FOR UPDATE`,
      [quizId]
    );

    if (quizzes.length === 0 || !quizzes[0].published) {
      await connection.rollback();

      return res.status(404).json({
        error: "This quiz is not available.",
      });
    }

    const questions = await loadQuizQuestions(connection, quizId, true);
    const version = getQuizVersion(quizId, questions);

    // Reject answers if the quiz changed after the athlete opened it.
    if (body.version !== version) {
      await connection.rollback();

      return res.status(409).json({
        error: "This quiz has changed. Reload it before answering again.",
      });
    }

    if (
      questions.length === 0 ||
      body.answers.length !== questions.length
    ) {
      await connection.rollback();

      return res.status(400).json({
        error: "Answer every question before submitting.",
      });
    }

    const checkedAnswers = [];

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswers = 0;

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      let submitted = null;
      let count = 0;

      // Find the answer for this question and count how many times it appears.
      for (let j = 0; j < body.answers.length; j++) {
        const answer = body.answers[j];

        if (answer && answer.questionId === question.id_question) {
          submitted = answer;
          count++;
        }
      }

      if (count !== 1) {
        await connection.rollback();

        return res.status(400).json({
          error: "Each question needs exactly one answer.",
        });
      }

      const checked = checkAnswer(question, submitted.value);

      if (checked.error) {
        await connection.rollback();

        return res.status(400).json({
          error: "Question " + (i + 1) + ": " + checked.error,
          questionId: question.id_question,
        });
      }

      const points = Number(question.points);

      // Check that the points can be saved in the database.
      if (
        !Number.isInteger(points) ||
        points < 0 ||
        points > 9999
      ) {
        throw new Error("Question points exceed the supported storage range");
      }

      let awarded = 0;

      // Give all the question's points for a correct answer.
      if (checked.correct) {
        awarded = points;
        correctAnswers++;
      }

      totalPoints += points;
      earnedPoints += awarded;

      checkedAnswers.push({
        questionId: question.id_question,
        awarded: awarded,
        answer: checked,
      });
    }

    if (totalPoints <= 0) {
      throw new Error("The quiz must have a positive total score");
    }

    // Calculate the percentage and round it to two decimal places.
    const score = Math.round(earnedPoints / totalPoints * 10000) / 100;

    // Create the attempt after every answer has passed the checks.
    const [attempt] = await connection.execute(
      `INSERT INTO attempts (id_quiz, id_user, score)
       VALUES (?, ?, ?)`,
      [quizId, req.user.id_user, score]
    );

    for (let i = 0; i < checkedAnswers.length; i++) {
      const item = checkedAnswers[i];
      const answer = item.answer;

      let answerData = null;

      // Convert answers with several items to JSON text for the database.
      if (answer.data !== null) {
        answerData = JSON.stringify(answer.data);
      }

      const [saved] = await connection.execute(
        `INSERT INTO attempt_answers (
           id_attempt,
           id_question,
           answer_number,
           answer_text,
           answer_data,
           points_awarded
         )
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          attempt.insertId,
          item.questionId,
          answer.number,
          answer.text,
          answerData,
          item.awarded,
        ]
      );

      // Link each selected option to the answer we just saved.
      for (let j = 0; j < answer.optionIds.length; j++) {
        await connection.execute(
          `INSERT INTO attempt_answer_options (id_answer, id_option)
           VALUES (?, ?)`,
          [saved.insertId, answer.optionIds[j]]
        );
      }
    }

    // Save all changes now that every step has worked.
    await connection.commit();

    return res.status(201).json({
      attemptId: attempt.insertId,
      score: score,
      earnedPoints: earnedPoints,
      totalPoints: totalPoints,
      correctAnswers: correctAnswers,
      totalQuestions: questions.length,
    });
  } catch (err) {
    // Cancel the database changes if something fails.
    if (connection) {
      await connection.rollback();
    }

    console.error(err);

    return res.status(500).json({
      error: "Unable to save your answers.",
    });
  } finally {
    // Close this connection, even if an error occurred.
    if (connection) {
      await connection.end();
    }
  }
};

// Return the athlete's latest saved result for each quiz.
exports.getMyResults = (req, res) => {
  const userId = req.user.id_user;

  // Keep only the latest attempt for each quiz, not the highest score.
  const query = `
    SELECT
      q.id_quiz,
      q.title,
      q.module,
      a.id_attempt,
      a.score,
      a.attempt_date
    FROM attempts a
    JOIN quizzes q ON q.id_quiz = a.id_quiz
    WHERE a.id_user = ?
      AND a.id_attempt = (
        SELECT latest.id_attempt
        FROM attempts latest
        WHERE latest.id_user = a.id_user
          AND latest.id_quiz = a.id_quiz
        ORDER BY latest.attempt_date DESC, latest.id_attempt DESC
        LIMIT 1
      )
    ORDER BY a.attempt_date DESC, a.id_attempt DESC
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Unable to load your results.",
      });
    }

    return res.json(results);
  });
};