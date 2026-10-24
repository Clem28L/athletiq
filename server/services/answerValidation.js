const { getOptionKey } = require("./quizData");

// Find the option that matches the key sent by the athlete.
function findOption(question, key) {
  for (let i = 0; i < question.options.length; i++) {
    const option = question.options[i];

    if (getOptionKey(option) === key) {
      return option;
    }
  }

  return null;
}

// Check the answer and return the information needed to save it.
function checkAnswer(question, value) {
  // An invalid answer has an error; a wrong answer only has correct set to false.
  const result = {
    error: null,
    correct: false,
    optionIds: [],
    number: null,
    text: null,
    data: null,
  };

  const type = question.type_answer;

  if (
    type === "single_choice" ||
    type === "multiple_choice" ||
    type === "true_false"
  ) {
    if (!Array.isArray(value) || value.length === 0) {
      result.error = "Select at least one answer.";
      return result;
    }

    if (type !== "multiple_choice" && value.length !== 1) {
      result.error = "Select exactly one answer.";
      return result;
    }

    let correctCount = 0;
    let allCorrect = true;

    // Count how many options are correct.
    for (let i = 0; i < question.options.length; i++) {
      if (Number(question.options[i].is_correct) === 1) {
        correctCount++;
      }
    }

    // Check that each selected option belongs to this question and appears once.
    for (let i = 0; i < value.length; i++) {
      const option = findOption(question, value[i]);

      if (!option || result.optionIds.includes(option.id_option)) {
        result.error = "The selected options are invalid.";
        return result;
      }

      result.optionIds.push(option.id_option);

      if (Number(option.is_correct) !== 1) {
        allCorrect = false;
      }
    }

    // All correct options must be selected, with no wrong options.
    if (allCorrect && value.length === correctCount) {
      result.correct = true;
    }

    return result;
  }

  if (type === "numeric" || type === "slider") {
    // Check that the number can be saved in the database.
    if (!Number.isFinite(value) || Math.abs(value) > 999999999.999) {
      result.error = "Enter a valid number.";
      return result;
    }

    // Keep at most three digits after the decimal point.
    if (value !== Number(value.toFixed(3))) {
      result.error = "Use no more than three decimal places.";
      return result;
    }

    if (type === "slider") {
      const min = Number(question.min_value);
      const max = Number(question.max_value);
      const step = Number(question.step_value);

      const steps = (value - min) / step;

      // Check the limits and steps, allowing small rounding differences.
      if (
        value < min ||
        value > max ||
        Math.abs(steps - Math.round(steps)) > 0.000001
      ) {
        result.error = "Choose a value allowed by the slider.";
        return result;
      }
    }

    result.number = value;

    const difference = Math.abs(value - Number(question.correct_number));
    const tolerance = Number(question.tolerance);

    // Accept the allowed difference and small rounding differences.
    if (difference <= tolerance + 0.000000001) {
      result.correct = true;
    }

    return result;
  }

  if (type === "short_text") {
    if (
      typeof value !== "string" ||
      !value.trim() ||
      value.trim().length > 255
    ) {
      result.error = "Enter an answer with 1 to 255 characters.";
      return result;
    }

    result.text = value.trim();

    let accepted = question.accepted_texts;

    // MySQL may return the list as JSON text instead of an array.
    if (typeof accepted === "string") {
      accepted = JSON.parse(accepted);
    }

    if (!Array.isArray(accepted)) {
      throw new Error("Invalid accepted texts");
    }

    // Compare with each accepted answer, ignoring capital letters and outer spaces.
    for (let i = 0; i < accepted.length; i++) {
      if (
        result.text.toLowerCase() ===
        accepted[i].trim().toLowerCase()
      ) {
        result.correct = true;
      }
    }

    return result;
  }

  if (type === "ordering") {
    if (
      !Array.isArray(value) ||
      value.length !== question.options.length
    ) {
      result.error = "Place every item in the list.";
      return result;
    }

    result.data = [];
    result.correct = true;

    // Check each item once and compare its position with the correct position.
    for (let i = 0; i < value.length; i++) {
      const option = findOption(question, value[i]);

      if (!option || result.data.includes(option.id_option)) {
        result.error = "The ordered items are invalid.";
        return result;
      }

      result.data.push(option.id_option);

      if (Number(option.correct_position) !== i + 1) {
        result.correct = false;
      }
    }

    return result;
  }

  if (type === "matching" || type === "categorization") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      result.error = "Complete every item.";
      return result;
    }

    result.data = [];
    result.correct = true;

    if (type === "matching") {
      const usedRightIds = [];
      let leftCount = 0;

      // Find the right item chosen for each left item.
      for (let i = 0; i < question.options.length; i++) {
        const left = question.options[i];

        if (left.pair_side === "left") {
          leftCount++;

          const rightKey = value[getOptionKey(left)];
          const right = findOption(question, rightKey);

          // A right item must exist and cannot be used twice.
          if (
            !right ||
            right.pair_side !== "right" ||
            usedRightIds.includes(right.id_option)
          ) {
            result.error =
              "Match every left item with a different right item.";
            return result;
          }

          usedRightIds.push(right.id_option);

          result.data.push({
            left: left.id_option,
            right: right.id_option,
          });

          // Items belong together when they have the same pair key.
          if (left.pair_key !== right.pair_key) {
            result.correct = false;
          }
        }
      }

      // Check that the answer contains no extra items.
      if (Object.keys(value).length !== leftCount) {
        result.error = "The matching answer contains invalid items.";
      }
    } else {
      const categories = [];

      // Collect each allowed category name once.
      for (let i = 0; i < question.options.length; i++) {
        const category = question.options[i].correct_category.trim();

        if (!categories.includes(category)) {
          categories.push(category);
        }
      }

      // Read the category chosen for each item.
      for (let i = 0; i < question.options.length; i++) {
        const option = question.options[i];
        const category = value[getOptionKey(option)];

        if (!categories.includes(category)) {
          result.error = "Choose a category for every item.";
          return result;
        }

        result.data.push({
          id_option: option.id_option,
          category: category,
        });

        if (category !== option.correct_category.trim()) {
          result.correct = false;
        }
      }

      // Check that the answer contains no extra items.
      if (Object.keys(value).length !== question.options.length) {
        result.error = "The category answer contains invalid items.";
      }
    }

    return result;
  }

  result.error = "This question type is not supported.";

  return result;
}

module.exports = { checkAnswer };