// Find a product by its ID.
function findProduct(products, id) {
  for (let i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      return products[i];
    }
  }
  return null;
}

// Check only the data needed to calculate and save the timeline.
function validateRacePlan(data) {
  if (!data || typeof data.name !== "string" || !data.name.trim() || data.name.length > 100) {
    return "Enter a race name of up to 100 characters.";
  }
  if (!Number.isFinite(data.distance_km) || data.distance_km <= 0 || data.distance_km > 9999.99) {
    return "Enter a distance between 0 and 9999.99 km.";
  }
  if (
    !Number.isInteger(data.estimated_duration) ||
    data.estimated_duration < 1 ||
    data.estimated_duration > 10080
  ) {
    return "Enter a duration between 1 and 10080 minutes.";
  }
  if (!Number.isFinite(data.carbs_per_hour) || data.carbs_per_hour <= 0 || data.carbs_per_hour > 10000) {
    return "Enter a positive carbohydrate target below 10000 g/hour.";
  }
  if (
    !Number.isFinite(data.hydration_ml_per_hour) ||
    data.hydration_ml_per_hour <= 0 ||
    data.hydration_ml_per_hour > 100000
  ) {
    return "Enter a positive fluid target below 100000 ml/hour.";
  }
  if (
    !Number.isFinite(data.flask_capacity_ml) ||
    data.flask_capacity_ml <= 0 ||
    data.flask_capacity_ml > 100000
  ) {
    return "Enter a positive flask capacity below 100000 ml.";
  }
  // Lists need unique IDs so edits keep the right items.
  const lists = [data.products, data.foods, data.drinks, data.aid_stations];
  for (let i = 0; i < lists.length; i++) {
    if (!Array.isArray(lists[i]) || lists[i].length > 2000) {
      return "The product, intake and aid station lists must contain at most 2000 items each.";
    }
    const ids = new Set();
    for (let j = 0; j < lists[i].length; j++) {
      const item = lists[i][j];
      if (!item || !Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id)) {
        return "Each item needs a unique positive ID.";
      }
      ids.add(item.id);
    }
  }
  if (data.products.length > 30) {
    return "Use at most 30 products in one plan.";
  }
  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    if (
      !["gel", "bar", "food", "drink"].includes(product.kind) ||
      typeof product.name !== "string" ||
      !product.name.trim() ||
      product.name.length > 100
    ) {
      return "Each product needs a type and a name of up to 100 characters.";
    }
    if (!Number.isFinite(product.carbs) || product.carbs < 0 || product.carbs > 10000) {
      return "Product carbohydrates must be between 0 and 10000 g.";
    }
  }
  for (let i = 0; i < data.foods.length; i++) {
    const food = data.foods[i];
    const product = findProduct(data.products, food.product_id);
    if (!product || product.kind === "drink") {
      return "Choose a food product for each food intake.";
    }
    if (
      !Number.isInteger(food.time_minutes) ||
      food.time_minutes < 0 ||
      food.time_minutes >= data.estimated_duration
    ) {
      return "Food times must be between the start and the finish.";
    }
    if (!Number.isFinite(food.quantity) || food.quantity <= 0 || food.quantity > 10000) {
      return "Enter a positive food quantity below 10000 portions.";
    }
  }
  for (let i = 0; i < data.drinks.length; i++) {
    const drink = data.drinks[i];
    const product = findProduct(data.products, drink.product_id);
    if (!product || product.kind !== "drink") {
      return "Choose a drink product for each drink period.";
    }
    if (
      !Number.isInteger(drink.start_minutes) ||
      !Number.isInteger(drink.end_minutes) ||
      drink.start_minutes < 0 ||
      drink.end_minutes <= drink.start_minutes ||
      drink.end_minutes > data.estimated_duration
    ) {
      return "Drink periods must start before they end and stay inside the race.";
    }
    if (!Number.isFinite(drink.volume_ml) || drink.volume_ml <= 0 || drink.volume_ml > 1000000) {
      return "Enter a positive drink volume below 1000000 ml.";
    }
  }
  const times = new Set();
  for (let i = 0; i < data.aid_stations.length; i++) {
    const stop = data.aid_stations[i];
    if (
      typeof stop.name !== "string" ||
      !stop.name.trim() ||
      stop.name.length > 100 ||
      typeof stop.collect_products !== "boolean"
    ) {
      return "Each aid station needs a name and a food collection choice.";
    }
    if (
      !Number.isInteger(stop.time_minutes) ||
      stop.time_minutes <= 0 ||
      stop.time_minutes >= data.estimated_duration ||
      times.has(stop.time_minutes)
    ) {
      return "Aid stations need different times between the start and the finish.";
    }
    times.add(stop.time_minutes);
  }
  return null;
}

// Count food at its time and spread each drink evenly across its period.
function getAmounts(data, start, end) {
  let carbs = 0;
  let fluid = 0;
  for (let i = 0; i < data.foods.length; i++) {
    const food = data.foods[i];
    if (food.time_minutes >= start && food.time_minutes < end) {
      carbs += findProduct(data.products, food.product_id).carbs * food.quantity;
    }
  }
  for (let i = 0; i < data.drinks.length; i++) {
    const drink = data.drinks[i];
    const overlap = Math.max(0, Math.min(end, drink.end_minutes) - Math.max(start, drink.start_minutes));
    const volume = drink.volume_ml * overlap / (drink.end_minutes - drink.start_minutes);
    fluid += volume;
    carbs += volume / 500 * findProduct(data.products, drink.product_id).carbs;
  }
  return {
    carbs: carbs,
    fluid: fluid
  };
}

// Compare targets and prepare the packing list.
function calculateRacePlan(data) {
  const hourly = [];
  const segments = [];
  const supplies = [];
  let covered = true;
  let hydrationFeasible = true;
  let groupedGels = 0;

  // A short final hour uses a smaller target.
  for (let start = 0; start < data.estimated_duration; start += 60) {
    const end = Math.min(start + 60, data.estimated_duration);
    const amounts = getAmounts(data, start, end);
    const carbsTarget = data.carbs_per_hour * (end - start) / 60;
    const fluidTarget = data.hydration_ml_per_hour * (end - start) / 60;
    // Allow a small gap around the user's targets.
    const carbsMargin = Math.min(10, data.carbs_per_hour * 0.2) * (end - start) / 60;
    const fluidMargin = fluidTarget * 0.1;
    const carbsStatus = compareTarget(amounts.carbs, carbsTarget, carbsMargin);
    const fluidStatus = compareTarget(amounts.fluid, fluidTarget, fluidMargin);
    if (carbsStatus !== "close" || fluidStatus !== "close") {
      covered = false;
    }
    hourly.push({
      start_minutes: start,
      end_minutes: end,
      carbs_g: amounts.carbs,
      fluid_ml: amounts.fluid,
      carbs_target_g: carbsTarget,
      fluid_target_ml: fluidTarget,
      carbs_status: carbsStatus,
      fluid_status: fluidStatus
    });
  }
  const stops = [...data.aid_stations];
  // Read aid stations in race order.
  stops.sort(function (a, b) {
    return a.time_minutes - b.time_minutes;
  });
  const points = [{
    name: "Start",
    time_minutes: 0,
    collect_products: true
  }, ...stops, {
    name: "Finish",
    time_minutes: data.estimated_duration,
    collect_products: false
  }];

  // All listed aid stations are confirmed water refill points.
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const fluid = getAmounts(data, start.time_minutes, end.time_minutes).fluid;
    const shortfall = Math.max(0, fluid - data.flask_capacity_ml);
    if (shortfall > 0.01) {
      hydrationFeasible = false;
    }
    segments.push({
      from: start.name,
      to: end.name,
      start_minutes: start.time_minutes,
      end_minutes: end.time_minutes,
      fluid_ml: fluid,
      fluid_shortfall_ml: shortfall
    });
    if (start.collect_products) {
      let until = data.estimated_duration;
      for (let j = i + 1; j < points.length; j++) {
        if (points[j].collect_products) {
          until = points[j].time_minutes;
          break;
        }
      }
      const products = [];
      for (let j = 0; j < data.products.length; j++) {
        const product = data.products[j];
        let quantity = 0;
        for (let k = 0; k < data.foods.length; k++) {
          const food = data.foods[k];
          if (food.product_id === product.id && food.time_minutes >= start.time_minutes && food.time_minutes < until) {
            quantity += food.quantity;
          }
        }
        if (quantity > 0) {
          products.push({
            product_id: product.id,
            name: product.name,
            quantity: quantity,
            portions_to_pack: Math.ceil(quantity - 0.000000001)
          });
        }
      }
      supplies.push({
        location: start.name,
        time_minutes: start.time_minutes,
        until_minutes: until,
        products: products
      });
    }
  }
  // Count old grouped gels so the screen can offer an update.
  for (let i = 0; i < data.foods.length; i++) {
    const food = data.foods[i];
    const product = findProduct(data.products, food.product_id);
    if (product.kind === "gel" && food.quantity !== 1) {
      groupedGels++;
    }
  }
  const totals = getAmounts(data, 0, data.estimated_duration);
  return {
    format: "timeline",
    draft: data,
    hourly: hourly,
    segments: segments,
    supplies: supplies,
    covered: covered,
    grouped_gels: groupedGels,
    hydration_feasible: hydrationFeasible,
    totals: {
      carbs_g: totals.carbs,
      fluid_ml: totals.fluid,
      carbs_target_g: data.carbs_per_hour * data.estimated_duration / 60,
      fluid_target_ml: data.hydration_ml_per_hour * data.estimated_duration / 60
    }
  };
}

// Make an ID that is not used in this list.
function nextId(items) {
  let id = 1;
  for (let i = 0; i < items.length; i++) {
    id = Math.max(id, items[i].id + 1);
  }
  return id;
}

// Compare with a visible margin instead of forcing an exact number.
function compareTarget(amount, target, margin) {
  if (amount < target - margin - 0.01) {
    return "low";
  }
  if (amount > target + margin + 0.01) {
    return "high";
  }
  return "close";
}

// Find places for one or two new intakes, away from existing food.
function findFoodTimes(data, start, end, count, spacing) {
  if (count === 0) {
    return [];
  }
  const available = [];
  for (let minute = start + 1; minute < end; minute++) {
    let clear = true;
    for (let i = 0; i < data.foods.length; i++) {
      if (Math.abs(data.foods[i].time_minutes - minute) < spacing) {
        clear = false;
        break;
      }
    }
    if (clear) {
      available.push(minute);
    }
  }
  let best = null;
  let bestScore = Infinity;
  for (let i = 0; i < available.length; i++) {
    if (count === 1) {
      const score = Math.abs(available[i] - (start + end) / 2);
      if (score < bestScore) {
        bestScore = score;
        best = [available[i]];
      }
    } else {
      for (let j = i + 1; j < available.length; j++) {
        if (available[j] - available[i] < spacing) {
          continue;
        }
        const score = Math.abs(available[i] - (start + (end - start) / 4)) +
          Math.abs(available[j] - (start + 3 * (end - start) / 4));
        if (score < bestScore) {
          bestScore = score;
          best = [available[i], available[j]];
        }
      }
    }
  }
  return best;
}

// Build a drink mix for one hour. Keep its chosen carb drinks when possible.
function getDrinkMix(data, start, end) {
  const mixes = [];
  let water = null;
  let firstCarbDrink = null;
  let carbVolume = 0;
  let drinkCarbs = 0;
  const existingFluid = getAmounts(data, start, end).fluid;
  let referenceStart = start;
  let referenceEnd = end;
  let copyFirstHour = false;
  // Use the athlete's first-hour drink split for later empty hours.
  if (start >= 60 && existingFluid < 0.01 && getAmounts(data, 0, 60).fluid > 0) {
    referenceStart = 0;
    referenceEnd = 60;
    copyFirstHour = true;
  }
  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    if (product.kind !== "drink") {
      continue;
    }
    if (product.carbs === 0 && !water) {
      water = product;
    }
    if (product.carbs > 0 && !firstCarbDrink) {
      firstCarbDrink = product;
    }
    let volume = 0;
    for (let j = 0; j < data.drinks.length; j++) {
      const drink = data.drinks[j];
      if (drink.product_id === product.id) {
        const overlap = Math.max(0, Math.min(referenceEnd, drink.end_minutes) - Math.max(referenceStart, drink.start_minutes));
        volume += drink.volume_ml * overlap / (drink.end_minutes - drink.start_minutes);
      }
    }
    if (product.carbs > 0 && volume > 0) {
      mixes.push({ product: product, volume: volume });
      carbVolume += volume;
      drinkCarbs += volume / 500 * product.carbs;
    }
  }
  const total = data.hydration_ml_per_hour * (end - start) / 60;
  const placedCarbVolume = carbVolume;
  if (mixes.length === 0 && firstCarbDrink) {
    mixes.push({ product: firstCarbDrink, volume: 1 });
    drinkCarbs = firstCarbDrink.carbs / 500;
    carbVolume = 1;
  }
  let rate = 0;
  if (carbVolume > 0) {
    rate = drinkCarbs / carbVolume;
  }
  // An unused carb drink starts with no volume; the planner can use it if needed.
  let currentVolume = placedCarbVolume;
  if (copyFirstHour) {
    currentVolume = total * placedCarbVolume / getAmounts(data, 0, 60).fluid;
  } else if (existingFluid < 0.01 && mixes.length > 0) {
    // With no manual split, start with equal amounts of water and carb drink.
    currentVolume = total / 2;
  }
  return {
    water: water,
    mixes: mixes,
    rate: rate,
    total: total,
    original_volume: Math.min(currentVolume, total),
    weight: carbVolume
  };
}

// Merge equal neighbouring drink periods to keep the timeline and roadbook short.
function addDrinkPeriod(drinks, productId, start, end, volume) {
  if (volume < 0.01) {
    return;
  }
  for (let i = 0; i < drinks.length; i++) {
    const previous = drinks[i];
    const previousRate = previous.volume_ml / (previous.end_minutes - previous.start_minutes);
    if (previous.product_id === productId && previous.end_minutes === start && Math.abs(previousRate - volume / (end - start)) < 0.000001) {
      previous.end_minutes = end;
      previous.volume_ml += volume;
      return;
    }
  }
  drinks.push({ id: nextId(drinks), product_id: productId, start_minutes: start, end_minutes: end, volume_ml: volume });
}

// Keep manual food placements. Suggest a practical mix instead of tiny gel fractions.
function completeRacePlan(data) {
  const original = data;
  data = JSON.parse(JSON.stringify(data));
  const removedFoods = [];
  // Rebuild old grouped or fractional gels instead of copying those intakes.
  for (let i = data.foods.length - 1; i >= 0; i--) {
    const food = data.foods[i];
    if (findProduct(data.products, food.product_id).kind === "gel" && food.quantity !== 1) {
      removedFoods.unshift(food);
      data.foods.splice(i, 1);
    }
  }
  const draft = JSON.parse(JSON.stringify(data));
  const additions = [];
  const plannedDrinks = [];
  const foodOptions = [];
  const pattern = [];
  let spacing = 30;
  const firstHour = calculateRacePlan(data).hourly[0];
  if (data.estimated_duration >= 60 && firstHour.carbs_status === "close" && firstHour.fluid_status === "close") {
    for (let i = 0; i < data.foods.length; i++) {
      if (data.foods[i].time_minutes < 60) {
        pattern.push(data.foods[i]);
      }
    }
    // Keep the order chosen in the first hour.
    pattern.sort(function (a, b) {
      return a.time_minutes - b.time_minutes;
    });
    for (let i = 1; i < pattern.length; i++) {
      spacing = Math.max(20, Math.min(spacing, pattern[i].time_minutes - pattern[i - 1].time_minutes));
    }
  }
  // Suggest whole portions or half food portions, but never part of a gel.
  for (let i = 0; i < data.products.length; i++) {
    const product = data.products[i];
    if (product.kind === "drink" || product.carbs === 0) {
      continue;
    }
    foodOptions.push({ product: product, quantity: 1 });
    if (product.kind !== "gel") {
      foodOptions.push({ product: product, quantity: 0.5 });
    }
  }

  for (let start = 0; start < data.estimated_duration; start += 60) {
    const end = Math.min(start + 60, data.estimated_duration);
    const target = data.carbs_per_hour * (end - start) / 60;
    const margin = Math.min(10, data.carbs_per_hour * 0.2) * (end - start) / 60;
    const mix = getDrinkMix(data, start, end);
    let existingCarbs = 0;
    const uses = {};
    for (let i = 0; i < draft.foods.length; i++) {
      const id = draft.foods[i].product_id;
      uses[id] = (uses[id] || 0) + 1;
    }
    for (let i = 0; i < data.foods.length; i++) {
      const food = data.foods[i];
      if (food.time_minutes >= start && food.time_minutes < end) {
        existingCarbs += food.quantity * findProduct(data.products, food.product_id).carbs;
      }
    }

    // Try no food, one intake, or two spaced intakes.
    const choices = [[]];
    for (let i = 0; i < foodOptions.length; i++) {
      choices.push([foodOptions[i]]);
      for (let j = i; j < foodOptions.length; j++) {
        choices.push([foodOptions[i], foodOptions[j]]);
      }
    }
    const patternChoice = [];
    if (start >= 60 && existingCarbs === 0) {
      for (let i = 0; i < pattern.length; i++) {
        const time = start + pattern[i].time_minutes;
        if (time < end) {
          patternChoice.push({ product: findProduct(data.products, pattern[i].product_id),
            quantity: pattern[i].quantity, time_minutes: time });
        }
      }
      if (patternChoice.length > 0) {
        choices.push(patternChoice);
      }
    }
    const times = [[], findFoodTimes(draft, start, end, 1, spacing), findFoodTimes(draft, start, end, 2, spacing)];
    let best = null;
    let bestScore = Infinity;
    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      let chosenTimes = times[choice.length];
      if (choice === patternChoice) {
        chosenTimes = [];
        for (let j = 0; j < choice.length; j++) {
          chosenTimes.push(choice[j].time_minutes);
        }
        if (!canPlaceFood(draft, chosenTimes, spacing)) {
          continue;
        }
      }
      if (!chosenTimes) {
        continue;
      }
      let foodCarbs = existingCarbs;
      let repeats = 0;
      for (let j = 0; j < choice.length; j++) {
        foodCarbs += choice[j].product.carbs * choice[j].quantity;
        repeats += uses[choice[j].product.id] || 0;
        if (j > 0 && choice[j].product.id === choice[j - 1].product.id) {
          repeats++;
        }
      }
      let volume = mix.original_volume;
      if (!mix.water && mix.mixes.length > 0) {
        volume = mix.total;
      }
      let carbs = foodCarbs + volume * mix.rate;
      if (compareTarget(carbs, target, margin) !== "close" && mix.rate > 0 && mix.water) {
        // Replace water with carb drink, rather than adding extra total fluid.
        volume = Math.max(0, Math.min(mix.total, (target - foodCarbs) / mix.rate));
        volume = Math.min(mix.total, Math.round(volume / 50) * 50);
        carbs = foodCarbs + volume * mix.rate;
      }
      const outside = Math.max(0, target - margin - carbs, carbs - target - margin);
      // Prefer a near-target plan with fewer new intakes and some product variety.
      let score = outside * 1000 + choice.length * 30 + repeats * 5 +
        Math.abs(carbs - target) / Math.max(1, target) + 150 * Math.abs(volume - mix.original_volume) / Math.max(1, mix.total);
      if (choice === patternChoice) {
        score -= 50;
      }
      if (score < bestScore) {
        bestScore = score;
        best = { foods: choice, times: chosenTimes, volume: volume };
      }
    }

    for (let i = 0; i < best.foods.length; i++) {
      const food = { id: nextId(draft.foods), product_id: best.foods[i].product.id,
        quantity: best.foods[i].quantity, time_minutes: best.times[i] };
      draft.foods.push(food);
      additions.push(food);
    }
    for (let i = 0; i < mix.mixes.length; i++) {
      const item = mix.mixes[i];
      addDrinkPeriod(plannedDrinks, item.product.id, start, end, best.volume * item.volume / mix.weight);
    }
    if (mix.water) {
      addDrinkPeriod(plannedDrinks, mix.water.id, start, end, mix.total - best.volume);
    }
  }
  draft.drinks = plannedDrinks;
  return {
    draft: draft,
    report: calculateRacePlan(draft),
    added_foods: additions.length,
    food_additions: additions,
    replaced_foods: removedFoods,
    drinks_changed: JSON.stringify(draft.drinks) !== JSON.stringify(original.drinks)
  };
}

// Keep new food away from manual intakes, including across hour boundaries.
function canPlaceFood(data, times, spacing) {
  for (let i = 0; i < times.length; i++) {
    for (let j = 0; j < data.foods.length; j++) {
      if (Math.abs(times[i] - data.foods[j].time_minutes) < spacing) {
        return false;
      }
    }
    if (i > 0 && times[i] - times[i - 1] < spacing) {
      return false;
    }
  }
  return true;
}
module.exports = { validateRacePlan, calculateRacePlan, completeRacePlan };
