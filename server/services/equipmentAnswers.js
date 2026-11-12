// Vérifie les bornes et le pas du curseur
function isAllowedSliderValue(question, value) {
  if (!Number.isFinite(value)) {
    return false;
  }

  const min = Number(question.min_value);
  const max = Number(question.max_value);
  const step = Number(question.step_value);

  if (value < min || value > max || step <= 0) {
    return false;
  }

  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 0.000001;
}

// Convertit l'option choisie en valeur de critère
function getChoiceValue(question, settings, answer) {
  if (!Array.isArray(answer) || answer.length !== 1) {
    return null;
  }

  const option = question.options.find((item) => item.id_option === answer[0]);
  if (!option) {
    return null;
  }

  const optionMap = settings.option_map;
  if (!optionMap || typeof optionMap[option.id_option] !== "string") {
    throw new Error("Missing option mapping: " + option.id_option);
  }

  return optionMap[option.id_option];
}

// Vérifie les réponses et les classe par critère
function normalizeEquipmentAnswers(questions, answers) {
  if (Object.keys(answers).length !== questions.length) {
    return null;
  }

  const normalized = Object.create(null);

  for (const question of questions) {
    let settings = question.settings;
    if (typeof settings === "string") {
      settings = JSON.parse(settings);
    }

    if (!settings || typeof settings.criterion_key !== "string" || !settings.criterion_key) {
      throw new Error("Missing question criterion: " + question.id_question);
    }

    const criterion = settings.criterion_key;
    if (Object.hasOwn(normalized, criterion)) {
      throw new Error("Duplicate equipment criterion: " + criterion);
    }

    let value = answers[question.id_question];
    if (question.type_answer === "slider") {
      if (!isAllowedSliderValue(question, value)) {
        return null;
      }
    } else if (question.type_answer === "single_choice") {
      value = getChoiceValue(question, settings, value);
      if (value === null) {
        return null;
      }
    } else {
      throw new Error("Invalid equipment question: " + question.id_question);
    }

    normalized[criterion] = value;
  }

  return normalized;
}

module.exports = { normalizeEquipmentAnswers };
