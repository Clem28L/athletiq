function getOption(data, answer) {
  // Récupérer la question correspondant à la réponse
  const question = data.questions[answer.questionId];

  if (!question) {
    return null;
  }

  // Chercher l'option sélectionnée par l'utilisateur
  for (const option of question.options) {
    if (option.id === answer.optionId) {
      return option;
    }
  }

  return null;
}

// Classer les blessures possibles selon la zone du corps et les réponses
export function rankInjuries(data, zone, answers) {
  const area = data.zones[zone.id];
  const ranked = [];

  if (!area) {
    return ranked;
  }

  // Parcourir les blessures associées à cette zone
  for (const id of area.injuries) {
    let score = 0;
    let signs = 0;

    for (const answer of answers) {
      const question = data.questions[answer.questionId];
      const option = getOption(data, answer);

      // Ignorer les réponses qui n'apportent aucun point à cette blessure
      if (!option || !option.scores || !option.scores[id]) {
        continue;
      }

      // Ajouter les points associés à la réponse
      const points = option.scores[id];
      score += points;

      // Compter les symptômes significatifs
      if (!question.context && points >= 2) {
        signs += 1;
      }
    }

    // Conserver uniquement les blessures avec un score suffisant et au moins deux symptômes significatifs
    if (score >= 6 && signs >= 2) {
      const candidate = { id: id, score: score };
      let position = 0;

      // Trouver la position pour classer les blessures par score décroissant
      while (position < ranked.length && ranked[position].score >= score) {
        position += 1;
      }

      // Insérer la blessure à la bonne position
      ranked.splice(position, 0, candidate);
    }
  }

  return ranked;
}

// Générer le résultat final à partir des blessures classées
export function getInjuryResult(data, zone, answers) {
  const ranked = rankInjuries(data, zone, answers);

  let id = "unclear";
  let alternative = null;
  let trainingAdvice = "";
  let care = "";
  const reasons = [];
  const sources = [];

  // Sélectionner la blessure ayant le score le plus élevé
  if (ranked.length > 0) {
    id = ranked[0].id;
  }

  // Proposer une deuxième blessure si les scores sont proches
  if (ranked.length > 1 && ranked[0].score - ranked[1].score <= 3) {
    alternative = data.results[ranked[1].id];
  }

  // Parcourir les réponses pour récupérer les explications et conseils
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

  // Récupérer les détails de la blessure principale
  const details = data.results[id];
  const sourceIds = details.sources.slice();

  if (alternative) {
    for (const source of alternative.sources) {
      sourceIds.push(source);
    }
  }

  // Ajouter la source liée aux conseils d'entraînement
  if (trainingAdvice) {
    sourceIds.push("clinic-load");
  }

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

  // Retourner toutes les informations nécessaires à l'affichage du résultat
  return {
    id: id, // Identifiant de la blessure détectée
    details: details, // Informations détaillées sur la blessure
    advice: advice, // Conseils de soins adaptés à la blessure
    alternative: alternative, // Autre blessure possible si les scores sont proches
    reasons: reasons, // Raisons qui expliquent le résultat obtenu
    sources: sources, // Sources médicales utilisées pour le résultat
    trainingAdvice: trainingAdvice, // Conseils pour adapter l'entraînement
    answers: answers, // Réponses données par l'utilisateur au questionnaire
  };
}
