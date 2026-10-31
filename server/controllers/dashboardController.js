const db = require("../config/db");

// Load the dashboard for the connected user.
exports.getDashboard = (req, res) => {
  const userId = req.user.id_user;
  const role = req.user.role;

  let statsQuery = "";
  let quizzesQuery = "";
  let recentQuery = "";

  if (role === "athlete") {
    // Count all attempts made by this athlete.
    statsQuery = `
      SELECT COUNT(*) AS total_attempts,
             COUNT(DISTINCT id_quiz) AS completed_quizzes,
             ROUND(AVG(score), 1) AS average_score
      FROM attempts
      WHERE id_user = ?
    `;

    // Keep published quizzes and only this athlete's results.
    quizzesQuery = `
      SELECT q.id_quiz, q.title, q.module, q.published,
             COUNT(a.id_attempt) AS attempt_count,
             ROUND(AVG(a.score), 1) AS average_score
      FROM quizzes q
      LEFT JOIN attempts a
        ON a.id_quiz = q.id_quiz AND a.id_user = ?
      WHERE q.published = 1
      GROUP BY q.id_quiz, q.title, q.module, q.published, q.created_at
      ORDER BY q.created_at DESC, q.id_quiz DESC
    `;

    recentQuery = `
      SELECT a.id_attempt, a.score, a.attempt_date, q.title
      FROM attempts a
      JOIN quizzes q ON q.id_quiz = a.id_quiz
      WHERE a.id_user = ?
      ORDER BY a.attempt_date DESC, a.id_attempt DESC
      LIMIT 5
    `;
  } else if (role === "expert") {
    // Only count results from quizzes owned by this expert.
    statsQuery = `
      SELECT COUNT(a.id_attempt) AS total_attempts,
             COUNT(DISTINCT a.id_user) AS total_athletes,
             ROUND(AVG(a.score), 1) AS average_score
      FROM quizzes q
      LEFT JOIN attempts a ON a.id_quiz = q.id_quiz
      WHERE q.id_user = ?
    `;

    quizzesQuery = `
      SELECT q.id_quiz, q.title, q.module, q.published,
             COUNT(a.id_attempt) AS attempt_count,
             ROUND(AVG(a.score), 1) AS average_score
      FROM quizzes q
      LEFT JOIN attempts a ON a.id_quiz = q.id_quiz
      WHERE q.id_user = ?
      GROUP BY q.id_quiz, q.title, q.module, q.published, q.created_at
      ORDER BY q.created_at DESC, q.id_quiz DESC
    `;

    recentQuery = `
      SELECT a.id_attempt, a.score, a.attempt_date, q.title
      FROM attempts a
      JOIN quizzes q ON q.id_quiz = a.id_quiz
      WHERE q.id_user = ?
      ORDER BY a.attempt_date DESC, a.id_attempt DESC
      LIMIT 5
    `;
  } else {
    return res.status(403).json({
      error: "Access denied.",
    });
  }

  db.query(statsQuery, [userId], (err, statsResults) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Unable to load the dashboard.",
      });
    }

    db.query(quizzesQuery, [userId], (err, quizResults) => {
      if (err) {
        console.error(err);

        return res.status(500).json({
          error: "Unable to load the dashboard.",
        });
      }

      const stats = statsResults[0];
      stats.total_quizzes = quizResults.length;

      if (role === "expert") {
        stats.published_quizzes = 0;

        // Count the expert's published quizzes.
        for (let i = 0; i < quizResults.length; i++) {
          if (Number(quizResults[i].published) === 1) {
            stats.published_quizzes++;
          }
        }
      }

      // Load the latest attempts for this dashboard.
      db.query(recentQuery, [userId], (err, recentResults) => {
        if (err) {
          console.error(err);

          return res.status(500).json({
            error: "Unable to load recent activity.",
          });
        }

        return res.json({
          stats: stats,
          quizzes: quizResults,
          recent: recentResults,
        });
      });
    });
  });
};