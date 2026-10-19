// Prepare the complete question for the API
export function prepareQuestionData(form) {
  const data = {
    text: form.text.trim(),
    type_answer: form.type,
    points: form.points,
    options: [],
  };

  const answers = form.answers;

  if (form.type === "choice") {
    let correctCount = 0;

    for (let i = 0; i < answers.choice.length; i++) {
      const option = answers.choice[i];

      if (option.is_correct) {
        correctCount++;
      }

      data.options.push({
        text: option.text.trim(),
        is_correct: option.is_correct,
      });
    }

    // Choose the type from the number of correct answers
    if (correctCount > 1) {
      data.type_answer = "multiple_choice";
    } else {
      data.type_answer = "single_choice";
    }
  }

  if (form.type === "true_false") {
    let trueIsCorrect = false;
    let falseIsCorrect = false;

    if (answers.boolean === "true") {
      trueIsCorrect = true;
    } else {
      falseIsCorrect = true;
    }

    data.options.push({
      text: "Vrai",
      is_correct: trueIsCorrect,
    });

    data.options.push({
      text: "Faux",
      is_correct: falseIsCorrect,
    });
  }

  if (form.type === "numeric") {
    data.correct_number = answers.number.correct_number;
    data.tolerance = answers.number.tolerance;
    data.unit = answers.number.unit;
  }

  if (form.type === "slider") {
    data.correct_number = answers.slider.correct_number;
    data.tolerance = answers.slider.tolerance;
    data.min_value = answers.slider.min_value;
    data.max_value = answers.slider.max_value;
    data.step_value = answers.slider.step_value;
    data.unit = answers.slider.unit;
  }

  if (form.type === "short_text") {
    data.accepted_texts = [];

    const lines = answers.shortText.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const answer = lines[i].trim();

      if (answer !== "") {
        data.accepted_texts.push(answer);
      }
    }
  }

  if (form.type === "ordering") {
    for (let i = 0; i < answers.ordering.length; i++) {
      data.options.push({
        text: answers.ordering[i].trim(),
        correct_position: i + 1,
      });
    }
  }

  if (form.type === "matching") {
    // One form row becomes two options
    for (let i = 0; i < answers.matching.length; i++) {
      const pair = answers.matching[i];
      const pairKey = "pair" + (i + 1);

      data.options.push({
        text: pair.left.trim(),
        pair_key: pairKey,
        pair_side: "left",
      });

      data.options.push({
        text: pair.right.trim(),
        pair_key: pairKey,
        pair_side: "right",
      });
    }
  }

  if (form.type === "categorization") {
    for (let i = 0; i < answers.categories.length; i++) {
      const item = answers.categories[i];

      data.options.push({
        text: item.text.trim(),
        correct_category: item.category.trim(),
      });
    }
  }

  return data;
}

// Create an empty form or read an existing question
export function readQuestionData(question = null) {
  const form = {
    text: "",
    type: "choice",
    points: 1,
    answers: {
      choice: [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
      boolean: "true",
      number: {
        correct_number: 0,
        tolerance: 0,
        unit: "",
      },
      slider: {
        correct_number: 0,
        tolerance: 0,
        min_value: 0,
        max_value: 60,
        step_value: 1,
        unit: "",
      },
      shortText: "",
      ordering: ["", ""],
      matching: [
        { left: "", right: "" },
        { left: "", right: "" },
      ],
      categories: [
        { text: "", category: "" },
        { text: "", category: "" },
      ],
    },
  };

  // No question means a new empty form
  if (question === null) {
    return form;
  }

  form.text = question.text;
  form.type = question.type_answer;
  form.points = Number(question.points);

  let options = [];

  if (Array.isArray(question.options)) {
    options = question.options;
  }

  if (
    question.type_answer === "single_choice" ||
    question.type_answer === "multiple_choice"
  ) {
    form.type = "choice";
    form.answers.choice = [];

    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      let isCorrect = false;

      if (Number(option.is_correct) === 1) {
        isCorrect = true;
      }

      form.answers.choice.push({
        text: option.text,
        is_correct: isCorrect,
      });
    }
  }

  if (form.type === "true_false") {
    for (let i = 0; i < options.length; i++) {
      const option = options[i];

      if (Number(option.is_correct) === 1) {
        const label = option.text.trim().toLowerCase();

        if (label === "vrai") {
          form.answers.boolean = "true";
        } else {
          form.answers.boolean = "false";
        }

        break;
      }
    }
  }

  if (form.type === "numeric") {
    // MySQL decimal values must become numbers
    form.answers.number.correct_number = Number(question.correct_number);
    form.answers.number.tolerance = Number(question.tolerance);

    if (question.unit !== null && question.unit !== undefined) {
      form.answers.number.unit = question.unit;
    }
  }

  if (form.type === "slider") {
    form.answers.slider.correct_number = Number(question.correct_number);
    form.answers.slider.tolerance = Number(question.tolerance);
    form.answers.slider.min_value = Number(question.min_value);
    form.answers.slider.max_value = Number(question.max_value);
    form.answers.slider.step_value = Number(question.step_value);

    if (question.unit !== null && question.unit !== undefined) {
      form.answers.slider.unit = question.unit;
    }
  }

  if (form.type === "short_text") {
    if (Array.isArray(question.accepted_texts)) {
      form.answers.shortText = question.accepted_texts.join("\n");
    }
  }

  if (form.type === "ordering") {
    form.answers.ordering = [];

    // Place each item at its expected position
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      const position = Number(option.correct_position);

      form.answers.ordering[position - 1] = option.text;
    }
  }

  if (form.type === "matching") {
    form.answers.matching = [];

    for (let i = 0; i < options.length; i++) {
      const leftOption = options[i];

      if (leftOption.pair_side === "left") {
        const pair = {
          left: leftOption.text,
          right: "",
        };

        // Find the right side with the same pair key
        for (let j = 0; j < options.length; j++) {
          const rightOption = options[j];

          if (
            rightOption.pair_side === "right" &&
            rightOption.pair_key === leftOption.pair_key
          ) {
            pair.right = rightOption.text;
            break;
          }
        }

        form.answers.matching.push(pair);
      }
    }
  }

  if (form.type === "categorization") {
    form.answers.categories = [];

    for (let i = 0; i < options.length; i++) {
      const option = options[i];

      form.answers.categories.push({
        text: option.text,
        category: option.correct_category,
      });
    }
  }

  return form;
}