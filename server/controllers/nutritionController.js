const db = require("../config/db");
const {
  validateNutritionPlan,
  calculateNutritionPlan,
} = require("../services/nutritionService");
const { validateRacePlan, calculateRacePlan, completeRacePlan } = require("../services/raceNutritionService");

// Keep older saved plans working with their original calculator.
function validatePlan(data) {
  if (data && data.format === "timeline") {
    return validateRacePlan(data);
  }
  return validateNutritionPlan(data);
}

// Use the calculator for this plan format.
function calculatePlan(data) {
  if (data.format === "timeline") {
    return calculateRacePlan(data);
  }
  return calculateNutritionPlan(data);
}

// Calculate a plan without saving it.
exports.calculatePlan = (req, res) => {
  const data = req.body;
  const error = validatePlan(data);

  if (error) {
    return res.status(400).json({ error: error });
  }

  const plan = calculatePlan(data);
  res.json(plan);
};

// Suggest additions without changing or saving the current plan.
exports.suggestPlan = (req, res) => {
  const error = validateRacePlan(req.body);
  if (error) {
    return res.status(400).json({ error: error });
  }
  const proposal = completeRacePlan(req.body);
  // Keep generated items inside the same limits as manual items.
  const proposalError = validateRacePlan(proposal.draft);
  if (proposalError) {
    return res.status(400).json({ error: "Unable to complete this plan. " + proposalError });
  }
  res.json(proposal);
};

// Calculate and save the athlete's plan.
exports.createPlan = (req, res) => {
  const data = req.body;
  const userId = req.user.id_user;
  const error = validatePlan(data);

  if (error) {
    return res.status(400).json({ error: error });
  }

  // Save the server result, not a result sent by the browser.
  const plan = calculatePlan(data);
  let elevation = 0;
  let temperature = null;

  if (data.elevation_gain != null) {
    elevation = data.elevation_gain;
  }

  if (data.temperature != null) {
    temperature = data.temperature;
  }

  const query = `
    INSERT INTO nutrition_plans (
      id_user, created_at, name, distance_km, elevation_gain,
      estimated_duration, temperature, carbs_per_hour,
      hydration_ml_per_hour, aid_stations, plan_data
    )
    VALUES (?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // The two JSON columns store the stops and the full result.
  const values = [
    userId,
    data.name.trim(),
    data.distance_km,
    elevation,
    data.estimated_duration,
    temperature,
    data.carbs_per_hour,
    data.hydration_ml_per_hour,
    JSON.stringify(data.aid_stations),
    JSON.stringify(plan),
  ];

  // Return the saved plan or a database error.
  db.query(query, values, (err, result) => {
    if (err) {
      return res.status(500).json({
        error: "Unable to save the nutrition plan.",
      });
    }

    res.status(201).json({
      message: "Nutrition plan saved.",
      planId: result.insertId,
      plan: plan,
    });
  });
};

// List the athlete's saved plans, with the newest first.
exports.getMyPlans = (req, res) => {
  const userId = req.user.id_user;
  let page = 1;

  if (req.query.page !== undefined) {
    page = Number(req.query.page);
  }
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    return res.status(400).json({ error: "The page number is invalid." });
  }
  const offset = (page - 1) * 12;

  // Show the saved capacity warning on cards without loading full plans.
  const query = `
    SELECT id_nutplan, name, distance_km, estimated_duration, created_at,
           JSON_UNQUOTE(JSON_EXTRACT(plan_data, '$.hydration_feasible')) = 'false' AS hydration_warning
    FROM nutrition_plans
    WHERE id_user = ?
    ORDER BY created_at DESC, id_nutplan DESC
    LIMIT 13 OFFSET ?
  `;

  // Return this page of plans.
  db.query(query, [userId, offset], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Unable to load the nutrition plans.",
      });
    }

    // Read one extra row to know if there is another page.
    let hasMore = false;
    if (results.length > 12) {
      results.pop();
      hasMore = true;
    }
    res.json({ plans: results, has_more: hasMore });
  });
};

// Read one of the athlete's plans.
exports.getPlanById = (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id_user;

  // Both IDs are needed to keep other users' plans private.
  const query = `
    SELECT id_nutplan, name, distance_km, elevation_gain,
           estimated_duration, temperature, carbs_per_hour,
           hydration_ml_per_hour, aid_stations, plan_data, created_at
    FROM nutrition_plans
    WHERE id_nutplan = ? AND id_user = ?
  `;

  // Open the plan only if this athlete owns it.
  db.query(query, [planId, userId], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Unable to load the nutrition plan.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        error: "Nutrition plan not found.",
      });
    }

    const plan = results[0];

    // Recheck saved timelines with the current comparison rules.
    if (plan.plan_data.format === "timeline") {
      plan.plan_data = calculateRacePlan(plan.plan_data.draft);
    }

    // Add the new details to older plans without changing the saved data.
    if (plan.plan_data.format !== "timeline" && plan.plan_data.totals.food_packed_carbs_g === undefined) {
      const saved = plan.plan_data;
      let foods = saved.foods;
      let drinks = saved.drinks;

      // The first version stored only one food and one drink.
      if (!foods) {
        foods = [{ name: saved.food_name, carbs_per_portion: saved.food_carbs_per_portion, share_percent: 100 }];
        drinks = [
          { name: "Water", carbs_per_litre: 0, share_percent: 100 - saved.drink_percent },
          { name: "Drink", carbs_per_litre: saved.drink_carbs_per_litre, share_percent: saved.drink_percent },
        ];
      }

      plan.plan_data = calculateNutritionPlan({
        name: plan.name,
        distance_km: Number(plan.distance_km),
        estimated_duration: plan.estimated_duration,
        carbs_per_hour: saved.carbs_per_hour,
        hydration_ml_per_hour: saved.hydration_ml_per_hour,
        flask_capacity_ml: saved.flask_capacity_ml,
        foods: foods,
        drinks: drinks,
        aid_stations: plan.aid_stations,
        reuse_leftovers: false,
      });
    }

    res.json(plan);
  });
};

// Update only a plan owned by the logged-in athlete.
exports.updatePlan = (req, res) => {
  const data = req.body;
  const error = validateRacePlan(data);
  if (error) {
    return res.status(400).json({ error: error });
  }
  const plan = calculateRacePlan(data);
  const query = `
    UPDATE nutrition_plans
    SET name = ?, distance_km = ?, estimated_duration = ?,
        carbs_per_hour = ?, hydration_ml_per_hour = ?, aid_stations = ?, plan_data = ?
    WHERE id_nutplan = ? AND id_user = ?
  `;
  const values = [
    data.name.trim(),
    data.distance_km,
    data.estimated_duration,
    data.carbs_per_hour,
    data.hydration_ml_per_hour,
    JSON.stringify(data.aid_stations),
    JSON.stringify(plan),
    req.params.id,
    req.user.id_user
  ];
  // Return the saved plan or a database error.
  db.query(query, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Unable to update the nutrition plan." });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Nutrition plan not found." });
    }
    res.json({ message: "Nutrition plan saved.", planId: Number(req.params.id), plan: plan });
  });
};

// Delete one of the athlete's plans.
exports.deletePlan = (req, res) => {
  const planId = req.params.id;
  const userId = req.user.id_user;

  const query = `
    DELETE FROM nutrition_plans
    WHERE id_nutplan = ? AND id_user = ?
  `;

  // Confirm that this athlete owned the deleted plan.
  db.query(query, [planId, userId], (err, result) => {
    if (err) {
      return res.status(500).json({
        error: "Unable to delete the nutrition plan.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Nutrition plan not found.",
      });
    }

    res.json({ message: "Nutrition plan deleted." });
  });
};
