function validateQuestion(data) {
  // Check the received data
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return "Invalid question data.";
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
    return "Enter the question text.";
  }

  if (!Number.isInteger(points) || points < 1) {
    return "Points must be a positive whole number.";
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
    return "Invalid question type.";
  }

  // Check numeric answers
  if (type_answer === "numeric" || type_answer === "slider") {
    if (!Number.isFinite(correct_number)) {
      return "The correct answer must be a number.";
    }

    if (
      tolerance !== undefined &&
      (!Number.isFinite(tolerance) || tolerance < 0)
    ) {
      return "Tolerance must be zero or greater.";
    }
  }

  // Check slider settings
  if (type_answer === "slider") {
    if (
      !Number.isFinite(min_value) ||
      !Number.isFinite(max_value) ||
      min_value >= max_value
    ) {
      return "The maximum must be greater than the minimum.";
    }

    if (!Number.isFinite(step_value) || step_value <= 0) {
      return "The slider step must be greater than zero.";
    }

    if (correct_number < min_value || correct_number > max_value) {
      return "The answer must be within the slider range.";
    }

    // The answer must be reachable with the slider
    const steps = (correct_number - min_value) / step_value;

    if (Math.abs(steps - Math.round(steps)) > 0.000001) {
      return "The correct answer must match a slider step.";
    }
  }

  // Check accepted text answers
  if (type_answer === "short_text") {
    if (!Array.isArray(accepted_texts) || accepted_texts.length === 0) {
      return "Add at least one accepted answer.";
    }

    for (const answer of accepted_texts) {
      if (typeof answer !== "string" || !answer.trim()) {
        return "Every accepted answer needs text.";
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
      return "This question type does not use options.";
    }

    return null;
  }

  // Check options
  if (!Array.isArray(options) || options.length < 2) {
    return "Add at least two options.";
  }

  for (const option of options) {
    if (
      !option ||
      typeof option.text !== "string" ||
      !option.text.trim()
    ) {
      return "Every option needs text.";
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
        return "Mark whether each option is correct.";
      }
    }

    const correctOptions = options.filter((option) => option.is_correct);

    if (type_answer === "multiple_choice") {
      if (correctOptions.length < 2) {
        return "Multiple-choice questions need at least two correct answers.";
      }
    } else if (correctOptions.length !== 1) {
      return "This question needs exactly one correct answer.";
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
        return "True/False questions need one True option and one False option.";
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
        return "Each position must be within the number of options, starting at 1.";
      }

      if (positions.includes(option.correct_position)) {
        return "Each option needs a different position.";
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
        return "Each item needs a pair key of 1 to 50 characters.";
      }

      if (option.pair_side !== "left" && option.pair_side !== "right") {
        return "Each item needs a left or right side.";
      }

      // Prefix the key to keep a plain object safe
      const key = "pair:" + option.pair_key;

      if (!pairs[key]) {
        pairs[key] = [];
      }

      if (pairs[key].includes(option.pair_side)) {
        return "Each pair can have only one item on each side.";
      }

      pairs[key].push(option.pair_side);
    }

    if (Object.keys(pairs).length < 2) {
      return "Add at least two pairs.";
    }

    for (const key of Object.keys(pairs)) {
      if (pairs[key].length !== 2) {
        return "Each pair needs a left item and a right item.";
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
        return "Each item needs a category of 1 to 100 characters.";
      }
    }
  }

  return null;
}

module.exports = { validateQuestion };