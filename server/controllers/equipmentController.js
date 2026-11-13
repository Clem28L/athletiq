const db = require("../config/db");
const { loadQuizQuestions, getQuizVersion } = require("../services/quizData");
const { normalizeEquipmentAnswers } = require("../services/equipmentAnswers");
const { recommendEquipment, describeEquipmentMatch } = require("../services/equipmentRecommendations");
const { loadCatalogue, loadSavedProducts, saveEquipmentSelection } = require("../services/equipmentSelections");

const categories = ["shoes", "trail_packs", "gps_watches", "trail_poles"];

// Charge les catégories de l'utilisateur
exports.getCategories = async (req, res) => {
  const userId = req.user.id_user;
  const connection = db.promise();

  try {
    const [statuses] = await connection.execute(
      `SELECT category, CAST(has_equipment AS UNSIGNED) AS has_equipment
       FROM user_equipment_status
       WHERE id_user = ?`,
      [userId],
    );

    // Dernière soumission par catégorie
    const [submissions] = await connection.execute(
      `SELECT s.category, s.id_submission
       FROM equipment_submissions s
       WHERE s.id_user = ? AND s.id_submission = (
         SELECT latest.id_submission
         FROM equipment_submissions latest
         WHERE latest.id_user = s.id_user AND latest.category = s.category
         ORDER BY latest.created_at DESC, latest.id_submission DESC
         LIMIT 1
       )`,
      [userId],
    );

    const items = [];

    // Prépare les quatre tuiles
    for (const category of categories) {
      const status = statuses.find((item) => item.category === category);
      const submission = submissions.find((item) => item.category === category);

      let hasEquipment = null;
      if (status) {
        hasEquipment = Number(status.has_equipment) === 1;
      }

      let latestSubmissionId = null;
      if (submission) {
        latestSubmissionId = submission.id_submission;
      }

      items.push({
        category,
        has_equipment: hasEquipment,
        latest_submission_id: latestSubmissionId,
      });
    }

    return res.json(items);
  } catch (err) {
    console.error("Unable to load equipment:", err);
    return res.status(500).json({ error: "Unable to load equipment." });
  }
};

// Prépare les champs affichés dans le questionnaire
function prepareQuestion(question) {
  const result = {
    id_question: question.id_question,
    text: question.text,
    type_answer: question.type_answer,
  };

  if (question.type_answer === "slider") {
    // MySQL renvoie les décimaux sous forme de texte
    result.min_value = Number(question.min_value);
    result.max_value = Number(question.max_value);
    result.step_value = Number(question.step_value);
    result.unit = question.unit;
    return result;
  }

  if (question.type_answer !== "single_choice" || question.options.length === 0) {
    throw new Error("Invalid equipment question: " + question.id_question);
  }

  result.options = [];
  for (const option of question.options) {
    result.options.push({ id: option.id_option, text: option.text });
  }

  return result;
}

// Cherche le dernier questionnaire publié de la catégorie
async function findPublishedQuiz(connection, category) {
  const [quizzes] = await connection.execute(
    `SELECT id_quiz, title
     FROM quizzes
     WHERE category = ? AND module = 'equipment'
       AND kind = 'equipment_recommendation' AND published = 1
     ORDER BY created_at DESC, id_quiz DESC
     LIMIT 1`,
    [category],
  );

  return quizzes[0];
}

// Charge le questionnaire pour l'afficher
exports.getQuestionnaire = async (req, res) => {
  const category = req.params.category;

  if (!categories.includes(category)) {
    return res.status(404).json({ error: "Unknown equipment category." });
  }

  try {
    const connection = db.promise();
    const quiz = await findPublishedQuiz(connection, category);

    if (!quiz) {
      return res.status(404).json({ error: "Questionnaire not found." });
    }

    const questions = await loadQuizQuestions(connection, quiz.id_quiz);

    if (questions.length === 0) {
      return res.status(404).json({ error: "Questionnaire not found." });
    }

    // Garde l'ordre des questions et des options de la base
    const publicQuestions = [];
    for (const question of questions) {
      publicQuestions.push(prepareQuestion(question));
    }

    return res.json({
      id_quiz: quiz.id_quiz,
      title: quiz.title,
      version: getQuizVersion(quiz.id_quiz, questions),
      questions: publicQuestions,
    });
  } catch (err) {
    console.error("Unable to load equipment questionnaire:", err);
    return res.status(500).json({ error: "Unable to load the questionnaire." });
  }
};

// Calcule et enregistre la sélection après validation
exports.submitQuestionnaire = async (req, res) => {
  const category = req.params.category;

  if (!categories.includes(category)) {
    return res.status(404).json({ error: "Unknown equipment category." });
  }

  if (!req.body || typeof req.body.version !== "string") {
    return res.status(400).json({ error: "Invalid questionnaire submission." });
  }

  const answers = req.body.answers;
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    return res.status(400).json({ error: "Invalid questionnaire answers." });
  }

  try {
    const connection = db.promise();
    const quiz = await findPublishedQuiz(connection, category);

    if (!quiz) {
      return res.status(404).json({ error: "Questionnaire not found." });
    }

    const questions = await loadQuizQuestions(connection, quiz.id_quiz);
    const version = getQuizVersion(quiz.id_quiz, questions);

    // Vérifie que le questionnaire est toujours le même
    if (req.body.version !== version || questions.length === 0) {
      return res.status(409).json({ error: "The questionnaire has changed." });
    }

    const normalized = normalizeEquipmentAnswers(questions, answers);
    if (!normalized) {
      return res.status(400).json({ error: "Invalid questionnaire answers." });
    }

    const catalogue = await loadCatalogue(connection, category, normalized.budget_max);
    const products = recommendEquipment(category, normalized, catalogue);
    const submissionId = await saveEquipmentSelection(
      req.user.id_user, quiz.id_quiz, category, normalized, products,
    );

    return res.status(201).json({ id_submission: submissionId });
  } catch (err) {
    console.error("Unable to save equipment answers:", err);
    return res.status(500).json({ error: "Unable to save the answers." });
  }
};

// Rouvre la sélection du compte connecté
exports.getSubmission = async (req, res) => {
  const submissionId = Number(req.params.id);
  if (!Number.isSafeInteger(submissionId) || submissionId < 1) {
    return res.status(404).json({ error: "Selection not found." });
  }

  try {
    const connection = db.promise();
    const [rows] = await connection.execute(
      `SELECT id_submission, category, answers
       FROM equipment_submissions
       WHERE id_submission = ? AND id_user = ?`,
      [submissionId, req.user.id_user],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Selection not found." });
    }

    const submission = rows[0];
    let answers = submission.answers;
    if (typeof answers === "string") {
      answers = JSON.parse(answers);
    }
    const selectionSaved = answers._selection_saved === true;
    delete answers._selection_saved;

    let products = await loadSavedProducts(connection, submissionId);
    if (!selectionSaved && products.length === 0) {
      // Les anciennes réponses n'avaient pas encore de classement
      const catalogue = await loadCatalogue(connection, submission.category, answers.budget_max);
      products = recommendEquipment(submission.category, answers, catalogue);
    } else {
      for (const product of products) {
        product.highlights = describeEquipmentMatch(submission.category, answers, product);
      }
    }

    // Les cartes n'ont besoin que des champs affichés
    for (const product of products) {
      delete product.attributes;
    }

    return res.json({
      id_submission: submission.id_submission,
      category: submission.category,
      answers,
      products,
    });
  } catch (err) {
    console.error("Unable to load equipment selection:", err);
    return res.status(500).json({ error: "Unable to load the selection." });
  }
};

// Enregistre la possession d'un équipement
exports.saveStatus = async (req, res) => {
  const category = req.params.category;

  if (!categories.includes(category)) {
    return res.status(404).json({ error: "Unknown equipment category." });
  }

  if (!req.body || typeof req.body.has_equipment !== "boolean") {
    return res.status(400).json({ error: "has_equipment must be a boolean." });
  }

  const hasEquipment = req.body.has_equipment;
  const value = Number(hasEquipment);

  try {
    // Insère ou actualise le choix
    await db.promise().execute(
      `INSERT INTO user_equipment_status (id_user, category, has_equipment, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE has_equipment = ?, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id_user, category, value, value],
    );

    return res.json({ category, has_equipment: hasEquipment });
  } catch (err) {
    console.error("Unable to save equipment status:", err);
    return res.status(500).json({ error: "Unable to save your choice." });
  }
};
