// Create an empty answer for the selected type
export function createAnswer(question) {
  const type = question.type_answer;

  if (type === "numeric" || type === "slider") {
    return null;
  }

  if (type === "short_text") {
    return "";
  }

  if (type === "matching" || type === "categorization") {
    return {};
  }

  return [];
}

// Check that every required item has a value
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

    // Check every category item or every left matching item
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

  return Array.isArray(value) && value.length > 0;
}