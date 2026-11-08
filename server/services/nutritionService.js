// Check the race, products and stops before calculating.
function validateNutritionPlan(data) {
  if (!data) return "The form is required.";

  // Check the race details and the athlete's own hourly targets.
  if (typeof data.name !== "string" || data.name.trim() === "" || data.name.length > 100) {
    return "The race name must contain 1 to 100 characters.";
  }
  if (!Number.isFinite(data.distance_km) || data.distance_km <= 0 || data.distance_km > 9999.99) {
    return "The distance must be greater than 0 and no more than 9999.99 km.";
  }
  if (!Number.isInteger(data.estimated_duration) || data.estimated_duration <= 0 || data.estimated_duration > 2147483647) {
    return "Enter a positive whole number of minutes for the duration.";
  }
  if (data.elevation_gain != null) {
    if (!Number.isInteger(data.elevation_gain) || data.elevation_gain < 0 || data.elevation_gain > 2147483647) {
      return "The elevation gain must be a whole number of 0 or more.";
    }
  }
  if (data.temperature != null) {
    if (!Number.isFinite(data.temperature) || data.temperature < -99.9 || data.temperature > 99.9) {
      return "The temperature must be between -99.9 and 99.9 degrees.";
    }
  }
  if (!Number.isFinite(data.carbs_per_hour) || data.carbs_per_hour <= 0 || data.carbs_per_hour > 9999999999999.99) {
    return "The carb target must be greater than 0.";
  }
  if (!Number.isInteger(data.hydration_ml_per_hour) || data.hydration_ml_per_hour <= 0 || data.hydration_ml_per_hour > 2147483647) {
    return "Enter a positive whole number of millilitres for fluid per hour.";
  }
  if (!Number.isFinite(data.flask_capacity_ml) || data.flask_capacity_ml <= 0) {
    return "The total flask capacity must be greater than 0.";
  }
  // Older forms did not have this option. Leaving it out keeps it off.
  if (data.reuse_leftovers !== undefined && typeof data.reuse_leftovers !== "boolean") {
    return "Choose whether to reuse leftover food.";
  }

  if (!Array.isArray(data.drinks) || data.drinks.length === 0) {
    return "Add at least one drink, including plain water if used.";
  }
  let drinkShare = 0;
  let drinkCarbsPerHour = 0;

  // Drink shares split the total fluid volume, including plain water.
  for (let i = 0; i < data.drinks.length; i++) {
    const drink = data.drinks[i];
    if (!drink || typeof drink.name !== "string" || drink.name.trim() === "") {
      return "Each drink needs a name.";
    }
    if (!Number.isFinite(drink.carbs_per_litre) || drink.carbs_per_litre < 0) {
      return "Drink carbs per litre must be 0 or more.";
    }
    if (!Number.isInteger(drink.share_percent) || drink.share_percent < 0 || drink.share_percent > 100) {
      return "Each drink share must be a whole percentage between 0 and 100.";
    }
    if (drink.sodium_mg_per_litre != null) {
      if (!Number.isFinite(drink.sodium_mg_per_litre) || drink.sodium_mg_per_litre < 0) {
        return "Drink sodium must be 0 or more, or left empty.";
      }
    }
    drinkShare += drink.share_percent;
    drinkCarbsPerHour += data.hydration_ml_per_hour / 1000 * drink.share_percent / 100 * drink.carbs_per_litre;
  }
  if (drinkShare !== 100) return "Drink shares must add up to 100%.";

  if (!Array.isArray(data.foods)) return "Food products must be a list.";
  let foodShare = 0;

  // Food shares split the carbs left after the drinks have been counted.
  for (let i = 0; i < data.foods.length; i++) {
    const food = data.foods[i];
    if (!food || typeof food.name !== "string" || food.name.trim() === "") {
      return "Each food product needs a name.";
    }
    if (!Number.isFinite(food.carbs_per_portion) || food.carbs_per_portion <= 0) {
      return "Food carbs per portion must be greater than 0.";
    }
    if (!Number.isInteger(food.share_percent) || food.share_percent < 0 || food.share_percent > 100) {
      return "Each food share must be a whole percentage between 0 and 100.";
    }
    foodShare += food.share_percent;
  }
  if (data.foods.length > 0 && foodShare !== 100) {
    return "Food shares must add up to 100%.";
  }
  if (data.foods.length === 0 && drinkCarbsPerHour < data.carbs_per_hour) {
    return "Add food products to cover the carbs not supplied by drinks.";
  }

  if (!Array.isArray(data.aid_stations)) return "The stops must be a list.";
  let previousTime = 0;
  let previousDistance = 0;

  // Stop times are elapsed times from the start, not section durations.
  for (let i = 0; i < data.aid_stations.length; i++) {
    const stop = data.aid_stations[i];
    if (!stop) return "Each stop needs its details.";
    if (stop.name != null && typeof stop.name !== "string") {
      return "The optional stop name must be text.";
    }
    if (!Number.isFinite(stop.time_minutes) || stop.time_minutes <= previousTime || stop.time_minutes >= data.estimated_duration) {
      return "Stop times must be in order and before the finish.";
    }
    if (!Number.isFinite(stop.distance_km) || stop.distance_km <= previousDistance || stop.distance_km >= data.distance_km) {
      return "Stop distances must be in order and before the finish.";
    }
    if (typeof stop.collect_products !== "boolean") {
      return "Choose whether you can collect food at each stop.";
    }
    previousTime = stop.time_minutes;
    previousDistance = stop.distance_km;
  }
  return null;
}

// Calculate section targets and the products to pack at each collection point.
function calculateNutritionPlan(data) {
  const segments = [];
  const supplies = [];
  const foodTotals = [];
  const leftovers = [];
  const reuseLeftovers = data.reuse_leftovers === true;
  let startName = "Start";
  let startTime = 0;
  let startDistance = 0;
  let totalDrinkCarbs = 0;
  let totalFoodCarbs = 0;
  let totalFoodPortions = 0;
  let totalPackedCarbs = 0;
  let hydrationFeasible = true;

  // Keep each food's totals and leftovers separate.
  for (let i = 0; i < data.foods.length; i++) {
    foodTotals.push({ name: data.foods[i].name, carbs_g: 0, portions_to_pack: 0, packed_carbs_g: 0, extra_carbs_g: 0 });
    leftovers.push(0);
  }

  // Build the sections from the start through each stop to the finish.
  for (let i = 0; i <= data.aid_stations.length; i++) {
    let endName = "Finish";
    let endTime = data.estimated_duration;
    let endDistance = data.distance_km;

    if (i < data.aid_stations.length) {
      const stop = data.aid_stations[i];
      endName = "Stop " + (i + 1);
      if (stop.name && stop.name.trim() !== "") endName = stop.name.trim();
      endTime = stop.time_minutes;
      endDistance = stop.distance_km;
    }

    const hours = (endTime - startTime) / 60;
    const carbs = hours * data.carbs_per_hour;
    const fluid = hours * data.hydration_ml_per_hour;
    const drinks = [];
    let drinkCarbs = 0;

    // Count each drink's volume and carbs before adding food.
    for (let j = 0; j < data.drinks.length; j++) {
      const drink = data.drinks[j];
      const volume = fluid * drink.share_percent / 100;
      const drinkCarbAmount = volume / 1000 * drink.carbs_per_litre;
      drinks.push({ name: drink.name, volume_ml: volume, carbs_g: drinkCarbAmount });
      drinkCarbs += drinkCarbAmount;
    }

    let foodCarbs = carbs - drinkCarbs;
    if (foodCarbs < 0) foodCarbs = 0;
    let fluidShortfall = fluid - data.flask_capacity_ml;
    if (fluidShortfall < 0) fluidShortfall = 0;
    if (fluidShortfall > 0) hydrationFeasible = false;

    // These are amounts to eat, not whole portions to pack.
    const foods = [];
    for (let j = 0; j < data.foods.length; j++) {
      const food = data.foods[j];
      const foodAmount = foodCarbs * food.share_percent / 100;
      foods.push({
        name: food.name,
        carbs_g: foodAmount,
        portions_to_consume: foodAmount / food.carbs_per_portion,
      });
    }

    segments.push({
      from: startName,
      to: endName,
      start_minutes: startTime,
      end_minutes: endTime,
      distance_km: endDistance - startDistance,
      carbs_target_g: carbs,
      fluid_ml: fluid,
      drinks: drinks,
      drink_carbs_g: drinkCarbs,
      food_carbs_g: foodCarbs,
      foods: foods,
      fluid_shortfall_ml: fluidShortfall,
      drink_exceeds_carbs_target: drinkCarbs > carbs,
    });
    totalDrinkCarbs += drinkCarbs;
    totalFoodCarbs += foodCarbs;
    startName = endName;
    startTime = endTime;
    startDistance = endDistance;
  }

  // Pack until the next stop that allows personal food collection.
  for (let i = 0; i < segments.length; i++) {
    if (i > 0 && !data.aid_stations[i - 1].collect_products) continue;
    let foodCarbs = 0;
    let lastSegment = i;
    for (let j = i; j < segments.length; j++) {
      foodCarbs += segments[j].food_carbs_g;
      lastSegment = j;
      if (j < data.aid_stations.length && data.aid_stations[j].collect_products) break;
    }

    const products = [];
    for (let j = 0; j < data.foods.length; j++) {
      const food = data.foods[j];
      const carbs = foodCarbs * food.share_percent / 100;
      let carriedIn = 0;
      if (reuseLeftovers) carriedIn = leftovers[j];

      // Take existing food out of the amount needed at this collection point.
      let carbsToPack = carbs - carriedIn;
      if (carbsToPack < 0) carbsToPack = 0;
      // Round up for packing. Ignore tiny errors from decimal calculations.
      const portions = Math.ceil(Math.max(0, carbsToPack / food.carbs_per_portion - 0.000000001));
      const packedCarbs = portions * food.carbs_per_portion;
      let remainingCarbs = carriedIn + packedCarbs - carbs;
      if (remainingCarbs < 0) remainingCarbs = 0;
      leftovers[j] = remainingCarbs;

      products.push({
        name: food.name,
        carbs_g: carbs,
        portions_to_pack: portions,
        packed_carbs_g: packedCarbs,
        carried_in_carbs_g: carriedIn,
        leftover_carbs_g: remainingCarbs,
      });
      foodTotals[j].carbs_g += carbs;
      foodTotals[j].portions_to_pack += portions;
      foodTotals[j].packed_carbs_g += packedCarbs;
      totalFoodPortions += portions;
      totalPackedCarbs += packedCarbs;
    }
    supplies.push({ location: segments[i].from, until: segments[lastSegment].to, products: products });
  }

  // Extra packed carbs are a reserve, not an extra eating target.
  for (let i = 0; i < foodTotals.length; i++) {
    foodTotals[i].extra_carbs_g = Math.max(0, foodTotals[i].packed_carbs_g - foodTotals[i].carbs_g);
  }

  return {
    name: data.name,
    distance_km: data.distance_km,
    estimated_duration: data.estimated_duration,
    carbs_per_hour: data.carbs_per_hour,
    hydration_ml_per_hour: data.hydration_ml_per_hour,
    flask_capacity_ml: data.flask_capacity_ml,
    reuse_leftovers: reuseLeftovers,
    hydration_feasible: hydrationFeasible,
    foods: data.foods,
    drinks: data.drinks,
    totals: {
      carbs_target_g: data.estimated_duration / 60 * data.carbs_per_hour,
      fluid_ml: data.estimated_duration / 60 * data.hydration_ml_per_hour,
      drink_carbs_g: totalDrinkCarbs,
      food_carbs_g: totalFoodCarbs,
      food_portions_to_pack: totalFoodPortions,
      food_packed_carbs_g: totalPackedCarbs,
      food_extra_carbs_g: Math.max(0, totalPackedCarbs - totalFoodCarbs),
      foods: foodTotals,
    },
    segments: segments,
    supplies: supplies,
  };
}

module.exports = { validateNutritionPlan, calculateNutritionPlan };
