const shoeSurfaces = ["road", "trail", "mixed"];
const shoeSessions = ["easy", "long_run", "tempo", "speed", "race"];
const shoeTerrains = ["gravel", "technical", "mud"];
const packVolumes = { short: 3, medium: 6, long: 10, ultra: 15 };

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
  if (!shoeSurfaces.includes(surface) || attributes.surface !== surface) {
    return null;
  }

  let score = 0;

  const session = answers.session_type;
  if (shoeSessions.includes(session) && readList(attributes.session_types).includes(session)) {
    score += 3;
  }

  const terrain = answers.terrain_type;
  if (shoeTerrains.includes(terrain) && readList(attributes.terrain_types).includes(terrain)) {
    score += 2;
  }

  const plate = answers.plate_preference;
  if (["carbon", "none"].includes(plate) && attributes.plate_type === plate) {
    score += 2;
  }

  const drop = readNumber(attributes.drop_mm);
  if (drop !== null && drop >= 0 && getDropBand(drop) === answers.drop_preference) {
    score += 1;
  }

  return { score, distance: 0 };
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

  let score = 0;
  if (answers.hydration_type === "flasks" && hydrationTypes.includes("flasks")) {
    score += 1;
  }

  if (answers.hydration_type === "bladder" && hydrationTypes.includes("bladder")) {
    score += 1;
  }

  const targetVolume = Math.max(minVolume || 0, packVolumes[answers.outing_duration] || 0);
  let distance = 0;
  if (targetVolume > 0) {
    distance = Infinity;
    if (volume !== null) {
      distance = Math.abs(volume - targetVolume);
    }
  }

  return { score, distance };
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

  let score = 0;
  const training = answers.training_level;
  if (["basic", "advanced"].includes(training) && training === attributes.training_level) {
    score += 1;
  }

  return { score, distance: 0 };
}

// Trouve une longueur fixe connue proche du repère.
function distanceToFixedLength(lengths, target) {
  let distance = Infinity;

  for (const value of lengths) {
    const length = readNumber(value);
    if (length === null || length <= 0) {
      continue;
    }

    const difference = Math.abs(length - target);
    if (difference < distance) {
      distance = difference;
    }
  }

  if (distance > 5) {
    return null;
  }

  return distance;
}

// Vérifie une plage de réglage réellement documentée.
function fitsAdjustableLength(attributes, target) {
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
      return true;
    }
  }

  return false;
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
  let distance = null;
  if (attributes.length_type === "fixed") {
    distance = distanceToFixedLength(readList(attributes.fixed_lengths_cm), target);
  } else if (attributes.length_type === "adjustable" && fitsAdjustableLength(attributes, target)) {
    distance = 0;
  }

  if (distance === null) {
    return null;
  }

  let score = 0;

  if (attributes.length_type === answers.length_type) {
    score += 2;
  }

  if (answers.material === "carbon" && attributes.material === "carbon") {
    score += 1;
  } else if (answers.material === "aluminium" && attributes.material === "aluminium") {
    score += 1;
  }

  return { score, distance };
}

const matchByCategory = {
  shoes: matchShoes,
  trail_packs: matchPacks,
  gps_watches: matchWatches,
  trail_poles: matchPoles,
};

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

// Classe tous les produits compatibles.
function recommendEquipment(category, answers, products) {
  if (!answers || !Object.hasOwn(matchByCategory, category)) {
    return [];
  }

  const budget = readNumber(answers.budget_max);
  if (budget === null || budget <= 0) {
    return [];
  }

  const matchCategory = matchByCategory[category];
  const matches = [];

  for (const product of products) {
    if (product.category && product.category !== category) {
      continue;
    }

    const price = readNumber(product.price);
    if (price === null || price <= 0 || price > budget || product.currency !== "MYR") {
      continue;
    }

    const match = matchCategory(answers, product.attributes || {});
    if (match) {
      matches.push({ ...match, price, product });
    }
  }

  matches.sort(compareMatches);
  return matches.map((match) => match.product);
}

module.exports = { recommendEquipment };
