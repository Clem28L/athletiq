// Load the crypto tools included in Node.js
const crypto = require("crypto");

// Load the questions and their options
async function loadQuizQuestions(connection, quizId, lockRows = false) {
  let questionQuery = `
    SELECT id_question, text, type_answer, points, question_order,
           correct_number, tolerance, min_value, max_value,
           step_value, unit, accepted_texts, settings
    FROM questions
    WHERE id_quiz = ?
    ORDER BY question_order, id_question
  `;

  let optionQuery = `
    SELECT o.id_option, o.id_question, o.text, o.is_correct,
           o.display_order, o.correct_position, o.pair_key,
           o.pair_side, o.correct_category
    FROM options o
    JOIN questions q ON q.id_question = o.id_question
    WHERE q.id_quiz = ?
    ORDER BY o.id_question, o.display_order, o.id_option
  `;

  // Prevent changes while the answers are being saved
  if (lockRows) {
    questionQuery += " FOR UPDATE";
    optionQuery += " FOR UPDATE";
  }

  // MySQL returns the rows in the first item
  const questionResult = await connection.execute(questionQuery, [quizId]);
  const questions = questionResult[0];

  const optionResult = await connection.execute(optionQuery, [quizId]);
  const options = optionResult[0];

  for (let i = 0; i < questions.length; i++) {
    questions[i].options = [];

    // Find the options belonging to this question
    for (let j = 0; j < options.length; j++) {
      if (options[j].id_question === questions[i].id_question) {
        questions[i].options.push(options[j]);
      }
    }
  }

  return questions;
}

// Create a public key for an option
function getOptionKey(option) {
  const signature = crypto.createHmac("sha256", process.env.JWT_SECRET);

  // Use the option ID to create a stable key
  signature.update("option:" + option.id_option);

  return signature.digest("hex");
}

// Create a version from the current quiz content
function getQuizVersion(quizId, questions) {
  const quizText = quizId + ":" + JSON.stringify(questions);

  const signature = crypto.createHmac("sha256", process.env.JWT_SECRET);
  signature.update(quizText);

  return signature.digest("hex");
}

// Mix the items in a list
function shuffle(items) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);

    // Swap the current item with a random item
    const saved = items[i];
    items[i] = items[j];
    items[j] = saved;
  }

  return items;
}

// Prepare a question without sending its correction
function prepareAthleteQuestion(question) {
  const data = {
    id_question: question.id_question,
    text: question.text,
    type_answer: question.type_answer,
    points: question.points,
    unit: question.unit,
    options: [],
    categories: [],
  };

  if (question.type_answer === "slider") {
    data.min_value = Number(question.min_value);
    data.max_value = Number(question.max_value);
    data.step_value = Number(question.step_value);
  }

  for (let i = 0; i < question.options.length; i++) {
    const option = question.options[i];

    const publicOption = {
      id: getOptionKey(option),
      text: option.text,
    };

    if (question.type_answer === "matching") {
      publicOption.pair_side = option.pair_side;
    }

    if (question.type_answer === "true_false") {
      if (option.text.trim().toLowerCase() === "vrai") {
        publicOption.text = "True";
      } else {
        publicOption.text = "False";
      }
    }

    // Send category names without revealing the correct category of each item
    if (question.type_answer === "categorization") {
      const category = option.correct_category.trim();

      if (!data.categories.includes(category)) {
        data.categories.push(category);
      }
    }

    data.options.push(publicOption);
  }

  shuffle(data.options);
  shuffle(data.categories);

  return data;
}

module.exports = {
  loadQuizQuestions,
  getOptionKey,
  getQuizVersion,
  prepareAthleteQuestion,
};