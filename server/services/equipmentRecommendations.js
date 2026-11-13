const shoeSurfaces = {
  road: "Road running",
  trail: "Trail running",
  mixed: "Road and light trails",
};

const shoeSessions = {
  easy: "Easy runs",
  long_run: "Long runs",
  tempo: "Tempo sessions",
  speed: "Speed sessions",
  race: "Race use",
};

const shoeTerrains = {
  gravel: "Gravel and smooth paths",
  technical: "Technical trails",
  mud: "Muddy trails",
};

const shoePlates = {
  carbon: "Carbon plate",
  none: "No plate",
};

const packVolumes = { short: 3, medium: 6, long: 10, ultra: 15 };

const gpsModes = {
  "tous systèmes": "all systems",
  "GPS seul": "GPS only",
  "précision maximale": "max accuracy",
  "GPS continu": "continuous GPS",
};

// Lit un nombre sans assimiler une donnée manquante à zéro.
function readNumber(value) {
  if (typeof value !== "number" && (typeof value !== "string" || value.trim() === "")) {
    return null;
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return null;
  }

  return number;
}

// Lit les listes stockées en JSON dans le catalogue.
function readList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      return [];
    }
  }

  return [];
}

// Classe le drop selon les plages du questionnaire.
function getDropBand(drop) {
  if (drop <= 4) {
    return "low";
  }

  if (drop <= 8) {
    return "medium";
  }

  return "high";
}

// Filtre la surface et classe les préférences de course.
function matchShoes(answers, attributes) {
  const surface = answers.surface;
  if (!Object.hasOwn(shoeSurfaces, surface) || attributes.surface !== surface) {
    return null;
  }

  const highlights = [shoeSurfaces[surface]];
  let score = 0;

  const session = answers.session_type;
  if (Object.hasOwn(shoeSessions, session) && readList(attributes.session_types).includes(session)) {
    highlights.push(shoeSessions[session]);
    score += 3;
  }

  const terrain = answers.terrain_type;
  if (Object.hasOwn(shoeTerrains, terrain) && readList(attributes.terrain_types).includes(terrain)) {
    highlights.push(shoeTerrains[terrain]);
    score += 2;
  }

  const plate = answers.plate_preference;
  if (Object.hasOwn(shoePlates, plate) && attributes.plate_type === plate) {
    highlights.push(shoePlates[plate]);
    score += 2;
  }

  const drop = readNumber(attributes.drop_mm);
  if (drop !== null && drop >= 0 && getDropBand(drop) === answers.drop_preference) {
    highlights.push(drop + " mm drop");
    score += 1;
  }

  return { highlights, score, distance: 0 };
}

// Applique les minimums puis préfère le volume adapté à la sortie.
function matchPacks(answers, attributes) {
  const minVolume = readNumber(answers.volume_min_l);
  const minHydration = readNumber(answers.hydration_min_l);
  const volume = readNumber(attributes.volume_l);
  const hydration = readNumber(attributes.hydration_l);
  const hydrationTypes = readList(attributes.hydration_types);
  const carriesPoles = attributes.pole_carry === "true" || attributes.pole_carry === true;
  const needsAccessory = attributes.pole_carry_requires_accessory === "true" ||
    attributes.pole_carry_requires_accessory === true;

  if (minVolume !== null && (volume === null || volume < minVolume)) {
    return null;
  }

  if (minHydration !== null && (hydration === null || hydration < minHydration)) {
    return null;
  }

  // Un carquois vendu à part n'entre pas dans le prix connu du sac.
  if (answers.pole_carry === "required" && (!carriesPoles || needsAccessory)) {
    return null;
  }

  const highlights = [];
  let score = 0;

  if (volume !== null && volume > 0) {
    highlights.push(volume + " L pack volume");
  }

  if (hydration !== null && hydration > 0) {
    highlights.push(hydration + " L hydration capacity");
  }

  if (answers.hydration_type === "flasks" && hydrationTypes.includes("flasks")) {
    highlights.push("Soft flask compatible");
    score += 1;
  }

  if (answers.hydration_type === "bladder" && hydrationTypes.includes("bladder")) {
    highlights.push("Hydration bladder compatible");
    score += 1;
  }

  if (carriesPoles && !needsAccessory) {
    highlights.push("Pole carry supported");
  }

  const targetVolume = Math.max(minVolume || 0, packVolumes[answers.outing_duration] || 0);
  let distance = 0;
  if (targetVolume > 0) {
    distance = Infinity;
    if (volume !== null) {
      distance = Math.abs(volume - targetVolume);
    }
  }

  return { highlights, score, distance };
}

// Vérifie l'autonomie et la navigation, puis classe l'entraînement.
function matchWatches(answers, attributes) {
  const minHours = readNumber(answers.min_gps_hours);
  const hours = readNumber(attributes.gps_battery_hours);
  const navigation = attributes.navigation;

  if (minHours === null || hours === null || hours < minHours) {
    return null;
  }

  if (answers.navigation === "maps" && navigation !== "maps") {
    return null;
  }

  if (answers.navigation === "trace" && navigation !== "trace" && navigation !== "maps") {
    return null;
  }

  let battery = "Up to " + hours + " h GPS";
  if (Object.hasOwn(gpsModes, attributes.gps_battery_mode)) {
    battery += " · " + gpsModes[attributes.gps_battery_mode];
  }

  const highlights = [battery];
  let score = 0;

  if (navigation === "maps") {
    highlights.push("Offline maps");
  } else if (navigation === "trace") {
    highlights.push("Route tracking");
  }

  if (answers.training_level === "advanced" && attributes.training_level === "advanced") {
    highlights.push("Advanced training tools");
    score += 1;
  } else if (answers.training_level === "basic" && attributes.training_level === "basic") {
    highlights.push("Basic training metrics");
    score += 1;
  }

  return { highlights, score, distance: 0 };
}

// Trouve une longueur fixe connue proche du repère.
function findFixedPoleLength(lengths, target) {
  let best = null;
  let distance = Infinity;

  for (const value of lengths) {
    const length = readNumber(value);
    if (length === null || length <= 0) {
      continue;
    }

    const difference = Math.abs(length - target);
    if (difference < distance || (difference === distance && length < best)) {
      best = length;
      distance = difference;
    }
  }

  if (distance > 5) {
    return null;
  }

  return { highlight: best + " cm fixed option · approximate fit", distance };
}

// Vérifie une plage de réglage réellement documentée.
function findAdjustablePoleLength(attributes, target) {
  let ranges = [[attributes.min_length_cm, attributes.max_length_cm]];
  if (attributes.adjustable_ranges_cm) {
    ranges = readList(attributes.adjustable_ranges_cm);
  }

  for (const range of ranges) {
    if (!Array.isArray(range) || range.length !== 2) {
      continue;
    }

    const min = readNumber(range[0]);
    const max = readNumber(range[1]);
    if (min !== null && max !== null && min > 0 && target >= min && target <= max) {
      return { highlight: "Adjustable from " + min + " to " + max + " cm", distance: 0 };
    }
  }

  return null;
}

// Compare la longueur estimée et les options du bâton.
function matchPoles(answers, attributes) {
  const height = readNumber(answers.runner_height_cm);
  const foldable = attributes.foldable === "true" || attributes.foldable === true;

  if (height === null || height <= 0 || (answers.foldable === "required" && !foldable)) {
    return null;
  }

  // Le repère de longueur est une estimation, à confirmer à l'essai.
  const target = Math.round(height * 0.7);
  let fit = null;
  if (attributes.length_type === "fixed") {
    fit = findFixedPoleLength(readList(attributes.fixed_lengths_cm), target);
  } else if (attributes.length_type === "adjustable") {
    fit = findAdjustablePoleLength(attributes, target);
  }

  if (!fit) {
    return null;
  }

  const highlights = [fit.highlight];
  let score = 0;

  if (attributes.length_type === answers.length_type) {
    score += 2;
  }

  if (foldable) {
    highlights.push("Foldable");
  }

  if (answers.material === "carbon" && attributes.material === "carbon") {
    highlights.push("Carbon");
    score += 1;
  } else if (answers.material === "aluminium" && attributes.material === "aluminium") {
    highlights.push("Aluminium");
    score += 1;
  }

  return { highlights, score, distance: fit.distance };
}

const matchByCategory = {
  shoes: matchShoes,
  trail_packs: matchPacks,
  gps_watches: matchWatches,
  trail_poles: matchPoles,
};

// Vérifie le budget avant d'appliquer les règles de la catégorie.
function matchProduct(category, answers, product) {
  if (!answers || !Object.hasOwn(matchByCategory, category)) {
    return null;
  }

  if (product.category && product.category !== category) {
    return null;
  }

  const budget = readNumber(answers.budget_max);
  const price = readNumber(product.price);
  if (budget === null || price === null || price <= 0 || price > budget || product.currency !== "MYR") {
    return null;
  }

  const match = matchByCategory[category](answers, product.attributes || {});
  if (!match) {
    return null;
  }

  return { ...match, price, product };
}

// Départage les produits à score égal de façon stable.
function compareMatches(left, right) {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  if (left.distance !== right.distance) {
    return left.distance - right.distance;
  }

  if (left.price !== right.price) {
    return left.price - right.price;
  }

  return Number(left.product.id_equipment) - Number(right.product.id_equipment);
}

// Garde jusqu'à cinq produits compatibles.
function recommendEquipment(category, answers, products) {
  const matches = [];

  for (const product of products) {
    const match = matchProduct(category, answers, product);
    if (match) {
      matches.push(match);
    }
  }

  matches.sort(compareMatches);
  return matches.slice(0, 5).map((match) => ({ ...match.product, highlights: match.highlights }));
}

// Décrit les correspondances encore vérifiables à la réouverture.
function describeEquipmentMatch(category, answers, product) {
  const match = matchProduct(category, answers, product);
  if (!match) {
    return [];
  }

  return match.highlights;
}

module.exports = { recommendEquipment, describeEquipmentMatch };
