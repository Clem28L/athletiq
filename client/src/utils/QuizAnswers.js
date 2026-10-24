// Create an empty answer based on the question type.
export function createAnswer(question) {
  const type = question.type_answer;

  // Use null because zero can be a real answer.
  if (type === "numeric" || type === "slider") {
    return null;
  }

  if (type === "short_text") {
    return "";
  }

  // Store the selected match or category using each item's ID.
  if (type === "matching" || type === "categorization") {
    return {};
  }

  return [];
}

// Check if the athlete has answered, without checking if the answer is correct.
export function isAnswerComplete(question, value) {
  const type = question.type_answer;

  if (type === "numeric" || type === "slider") {
    return Number.isFinite(value);
  }

  if (type === "short_text") {
    return typeof value === "string" && value.trim() !== "";
  }

  if (type === "ordering") {
    return (
      Array.isArray(value) &&
      value.length === question.options.length
    );
  }

  if (type === "matching" || type === "categorization") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    // Check all category items, but only the left items for matching questions.
    for (let i = 0; i < question.options.length; i++) {
      const option = question.options[i];

      if (type === "categorization" || option.pair_side === "left") {
        if (!value[option.id]) {
          return false;
        }
      }
    }

    return true;
  }

  // Choice questions need at least one selected option.
  return Array.isArray(value) && value.length > 0;
}