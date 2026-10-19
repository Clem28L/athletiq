function validateQuestion(data) {
  // Check the received data
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Les données de la question sont invalides.";
  }

  const {
    text,
    type_answer,
    points,
    options,
    correct_number,
    tolerance,
    min_value,
    max_value,
    step_value,
    accepted_texts,
  } = data;

  // Check common fields
  if (typeof text !== "string" || !text.trim()) {
    return "Le texte de la question est requis.";
  }

  if (!Number.isInteger(points) || points < 1) {
    return "Les points doivent être un entier supérieur à 0.";
  }

  const types = [
    "single_choice",
    "multiple_choice",
    "true_false",
    "numeric",
    "slider",
    "short_text",
    "ordering",
    "matching",
    "categorization",
  ];

  if (!types.includes(type_answer)) {
    return "Le type de question est invalide.";
  }

  // Check numeric answers
  if (type_answer === "numeric" || type_answer === "slider") {
    if (!Number.isFinite(correct_number)) {
      return "La réponse attendue doit être un nombre.";
    }

    if (
      tolerance !== undefined &&
      (!Number.isFinite(tolerance) || tolerance < 0)
    ) {
      return "La tolérance doit être positive ou nulle.";
    }
  }

  // Check slider settings
  if (type_answer === "slider") {
    if (
      !Number.isFinite(min_value) ||
      !Number.isFinite(max_value) ||
      min_value >= max_value
    ) {
      return "Le maximum doit être supérieur au minimum.";
    }

    if (!Number.isFinite(step_value) || step_value <= 0) {
      return "Le pas du curseur doit être supérieur à 0.";
    }

    if (correct_number < min_value || correct_number > max_value) {
      return "La réponse doit être comprise entre le minimum et le maximum.";
    }

    // The answer must be reachable with the slider
    const steps = (correct_number - min_value) / step_value;

    if (Math.abs(steps - Math.round(steps)) > 0.000001) {
      return "La réponse attendue ne correspond pas au pas du curseur.";
    }
  }

  // Check accepted text answers
  if (type_answer === "short_text") {
    if (!Array.isArray(accepted_texts) || accepted_texts.length === 0) {
      return "Ajoute au moins une réponse acceptée.";
    }

    for (const answer of accepted_texts) {
      if (typeof answer !== "string" || !answer.trim()) {
        return "Chaque réponse acceptée doit contenir du texte.";
      }
    }
  }

  // These types do not need options
  if (
    type_answer === "numeric" ||
    type_answer === "slider" ||
    type_answer === "short_text"
  ) {
    if (options !== undefined && (!Array.isArray(options) || options.length > 0)) {
      return "Ce type de question ne doit pas contenir d’options.";
    }

    return null;
  }

  // Check options
  if (!Array.isArray(options) || options.length < 2) {
    return "Ajoute au moins deux options.";
  }

  for (const option of options) {
    if (
      !option ||
      typeof option.text !== "string" ||
      !option.text.trim()
    ) {
      return "Chaque option doit contenir du texte.";
    }
  }

  // Check correct choices
  if (
    type_answer === "single_choice" ||
    type_answer === "multiple_choice" ||
    type_answer === "true_false"
  ) {
    for (const option of options) {
      if (typeof option.is_correct !== "boolean") {
        return "Chaque option doit préciser si elle est correcte.";
      }
    }

    const correctOptions = options.filter((option) => option.is_correct);

    if (type_answer === "multiple_choice") {
      if (correctOptions.length < 2) {
        return "Un choix multiple doit avoir au moins deux bonnes réponses.";
      }
    } else if (correctOptions.length !== 1) {
      return "Cette question doit avoir exactement une bonne réponse.";
    }

    if (type_answer === "true_false") {
      const labels = options.map((option) =>
        option.text.trim().toLowerCase()
      );

      if (
        options.length !== 2 ||
        !labels.includes("vrai") ||
        !labels.includes("faux")
      ) {
        return "Les options doivent être Vrai et Faux.";
      }
    }
  }

  // Check the expected order
  if (type_answer === "ordering") {
    const positions = [];

    for (const option of options) {
      if (
        !Number.isInteger(option.correct_position) ||
        option.correct_position < 1 ||
        option.correct_position > options.length
      ) {
        return "Chaque position doit être comprise entre 1 et le nombre d’options.";
      }

      if (positions.includes(option.correct_position)) {
        return "Deux options ne peuvent pas avoir la même position.";
      }

      positions.push(option.correct_position);
    }
  }

  // Check matching pairs
  if (type_answer === "matching") {
    const pairs = {};

    for (const option of options) {
      if (
        typeof option.pair_key !== "string" ||
        !option.pair_key.trim() ||
        option.pair_key.length > 50
      ) {
        return "Chaque élément doit avoir une clé de paire de 1 à 50 caractères.";
      }

      if (option.pair_side !== "left" && option.pair_side !== "right") {
        return "Le côté d’une paire doit être left ou right.";
      }

      // Prefix the key to keep a plain object safe
      const key = "pair:" + option.pair_key;

      if (!pairs[key]) {
        pairs[key] = [];
      }

      if (pairs[key].includes(option.pair_side)) {
        return "Une paire ne peut pas avoir deux éléments du même côté.";
      }

      pairs[key].push(option.pair_side);
    }

    if (Object.keys(pairs).length < 2) {
      return "Ajoute au moins deux paires.";
    }

    for (const key of Object.keys(pairs)) {
      if (pairs[key].length !== 2) {
        return "Chaque paire doit avoir un élément à gauche et un à droite.";
      }
    }
  }

  // Check categories
  if (type_answer === "categorization") {
    for (const option of options) {
      if (
        typeof option.correct_category !== "string" ||
        !option.correct_category.trim() ||
        option.correct_category.length > 100
      ) {
        return "Chaque élément doit avoir une catégorie de 1 à 100 caractères.";
      }
    }
  }

  return null;
}

module.exports = { validateQuestion };