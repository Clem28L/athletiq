const { getOptionKey } = require("./quizData");

// Build the colours and correct answers sent after a check.
function getAnswerFeedback(question, value, checked) {
  const feedback = {
    correct: checked.correct,
    items: [],
    expected: [],
  };

  const type = question.type_answer;

  if (type === "single_choice" || type === "multiple_choice" || type === "true_false") {
    for (let i = 0; i < question.options.length; i++) {
      const option = question.options[i];
      const key = getOptionKey(option);
      let correct = null;

      // Show all correct options and mark wrong selected options.
      if (Number(option.is_correct) === 1) {
        correct = true;
      } else if (value.includes(key)) {
        correct = false;
      }

      feedback.items.push({ key: key, correct: correct });
    }
  }

  if (type === "numeric" || type === "slider") {
    let answer = String(Number(question.correct_number));

    if (question.unit) {
      answer += " " + question.unit;
    }

    if (Number(question.tolerance) > 0) {
      answer += " (± " + Number(question.tolerance) + ")";
    }

    feedback.expected.push(answer);
  }

  if (type === "short_text") {
    let accepted = question.accepted_texts;

    if (typeof accepted === "string") {
      accepted = JSON.parse(accepted);
    }

    // Show one answer, while the checker still accepts all saved forms.
    feedback.expected.push(accepted[0]);
  }

  if (type === "ordering") {
    for (let i = 0; i < question.options.length; i++) {
      const option = question.options[i];
      const key = getOptionKey(option);
      const position = Number(option.correct_position);

      feedback.items.push({
        key: key,
        correct: value[position - 1] === key,
      });

      // Put each item in its correct place in the list.
      feedback.expected[position - 1] = position + ". " + option.text;
    }
  }

  if (type === "matching") {
    for (let i = 0; i < question.options.length; i++) {
      const left = question.options[i];

      if (left.pair_side === "left") {
        // Find the right item with the same pair key.
        for (let j = 0; j < question.options.length; j++) {
          const right = question.options[j];

          if (right.pair_side === "right" && right.pair_key === left.pair_key) {
            feedback.items.push({
              key: getOptionKey(left),
              correct: value[getOptionKey(left)] === getOptionKey(right),
            });
            feedback.expected.push(left.text + " → " + right.text);
            break;
          }
        }
      }
    }
  }

  if (type === "categorization") {
    for (let i = 0; i < question.options.length; i++) {
      const option = question.options[i];
      const key = getOptionKey(option);
      const category = option.correct_category.trim();

      feedback.items.push({
        key: key,
        correct: value[key] === category,
      });
      feedback.expected.push(option.text + " → " + category);
    }
  }

  return feedback;
}

module.exports = { getAnswerFeedback };
