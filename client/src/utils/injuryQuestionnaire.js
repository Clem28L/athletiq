function getOption(data, answer) {
  const question = data.questions[answer.questionId];

  if (!question) {
    return null;
  }

  for (const option of question.options) {
    if (option.id === answer.optionId) {
      return option;
    }
  }

  return null;
}

// Only compare injuries that can fit the selected body area
export function rankInjuries(data, zone, answers) {
  const area = data.zones[zone.id];
  const ranked = [];

  if (!area) {
    return ranked;
  }

  for (const id of area.injuries) {
    let score = 0;
    let signs = 0;

    for (const answer of answers) {
      const question = data.questions[answer.questionId];
      const option = getOption(data, answer);

      if (!option || !option.scores || !option.scores[id]) {
        continue;
      }

      const points = option.scores[id];
      score += points;

      // Training history adds context, but cannot identify an injury on its own
      if (!question.context && points >= 2) {
        signs += 1;
      }
    }

    // These are simple prototype rules, not a medical probability
    if (score >= 6 && signs >= 2) {
      const candidate = { id: id, score: score };
      let position = 0;

      while (position < ranked.length && ranked[position].score >= score) {
        position += 1;
      }

      ranked.splice(position, 0, candidate);
    }
  }

  return ranked;
}

export function getInjuryResult(data, zone, answers) {
  const ranked = rankInjuries(data, zone, answers);
  let id = "unclear";
  let alternative = null;
  let trainingAdvice = "";
  let care = "";
  const reasons = [];
  const sources = [];

  if (ranked.length > 0) {
    id = ranked[0].id;
  }

  if (ranked.length > 1 && ranked[0].score - ranked[1].score <= 3) {
    alternative = data.results[ranked[1].id];
  }

  for (const answer of answers) {
    const question = data.questions[answer.questionId];
    const option = getOption(data, answer);

    if (!option) {
      continue;
    }

    if (option.reason && option.scores && option.scores[id] > 0) {
      reasons.push(option.reason);
    }

    if (option.trainingAdvice) {
      trainingAdvice = option.trainingAdvice;
    }

    if (option.care) {
      care = option.care;
    }

    if (question.context && option.reason && !reasons.includes(option.reason)) {
      reasons.push(option.reason);
    }
  }

  const details = data.results[id];
  const sourceIds = [...details.sources];

  if (alternative) {
    sourceIds.push(...alternative.sources);
  }

  if (trainingAdvice) {
    sourceIds.push("clinic-load");
  }

  // Keep each source once when two hypotheses share the same reference
  for (const sourceId of sourceIds) {
    const source = data.sources[sourceId];

    if (source && !sources.includes(source)) {
      sources.push(source);
    }
  }

  let advice = details.advice;

  if (care) {
    advice = care;
  }

  return {
    id: id,
    details: details,
    advice: advice,
    alternative: alternative,
    reasons: reasons,
    sources: sources,
    trainingAdvice: trainingAdvice,
    answers: answers,
  };
}
