const db = require("../config/db");

// Copy the form fields and leave out IDs sent by the browser.
function readProfile(body) {
  if (!body) {
    return null;
  }

  if (typeof body !== "object") {
    return null;
  }

  if (Array.isArray(body)) {
    return null;
  }

  const fields = [
    "sport",
    "weekly_volume",
    "level",
    "goal",
    "past_injury",
    "weight_kg",
    "height_cm",
    "birth_date",
    "sex",
  ];
  const data = {};

  // Empty optional fields are stored as NULL in the database.
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    let value = body[field];

    if (value === undefined) {
      value = null;
    }

    if (value === "") {
      value = null;
    }

    data[field] = value;
  }

  return data;
}

// Check the values before saving the profile.
function validateProfile(data) {
  if (!data) {
    return "The profile data is required.";
  }

  const textFields = ["sport", "level", "goal", "past_injury", "sex"];

  // Check only filled fields, because all profile fields are optional.
  for (let i = 0; i < textFields.length; i++) {
    const field = textFields[i];

    if (data[field] !== null) {
      if (typeof data[field] !== "string") {
        return "Profile text fields must contain text.";
      }
    }
  }

  if (data.sport !== null) {
    if (data.sport.length > 50) {
      return "The sport is too long.";
    }
  }

  if (data.level !== null) {
    if (data.level.length > 50) {
      return "The level is too long.";
    }
  }

  if (data.goal !== null) {
    if (data.goal.length > 100) {
      return "The goal must contain at most 100 characters.";
    }
  }

  if (data.past_injury !== null) {
    if (data.past_injury.length > 2000) {
      return "The injury note must contain at most 2000 characters.";
    }
  }

  if (data.sex !== null) {
    const allowedSex = ["male", "female"];

    if (!allowedSex.includes(data.sex)) {
      return "Choose a valid formula sex.";
    }
  }

  // Check the number first, then check its allowed range.
  if (data.weekly_volume !== null) {
    if (!Number.isFinite(data.weekly_volume)) {
      return "Weekly distance must be a number.";
    }

    if (data.weekly_volume < 0) {
      return "Weekly distance must be 0 or more.";
    }

    if (data.weekly_volume > 9999.99) {
      return "Weekly distance must not exceed 9999.99 km.";
    }
  }

  if (data.weight_kg !== null) {
    if (!Number.isFinite(data.weight_kg)) {
      return "Weight must be a number.";
    }

    if (data.weight_kg < 1) {
      return "Weight must be at least 1 kg.";
    }

    if (data.weight_kg > 500) {
      return "Weight must not exceed 500 kg.";
    }
  }

  if (data.height_cm !== null) {
    if (!Number.isFinite(data.height_cm)) {
      return "Height must be a number.";
    }

    if (data.height_cm < 1) {
      return "Height must be at least 1 cm.";
    }

    if (data.height_cm > 300) {
      return "Height must not exceed 300 cm.";
    }
  }

  if (data.birth_date !== null) {
    if (typeof data.birth_date !== "string") {
      return "Enter the birth date as YYYY-MM-DD.";
    }

    const birth = new Date(data.birth_date + "T00:00:00Z");

    if (Number.isNaN(birth.getTime())) {
      return "The birth date is invalid.";
    }

    // JavaScript can move February 30 to March. Compare with the entered date.
    const checkedDate = birth.toISOString().slice(0, 10);

    if (checkedDate !== data.birth_date) {
      return "The birth date is invalid.";
    }

    if (data.birth_date < "1000-01-01") {
      return "The birth date must be valid and not in the future.";
    }

    if (birth > new Date()) {
      return "The birth date must be valid and not in the future.";
    }
  }

  return null;
}

// Get the logged-in athlete's profile.
exports.getProfile = (req, res) => {
  const userId = req.user.id_user;

  // Keep the birth date as YYYY-MM-DD for the date input.
  const query = `
    SELECT id_profile, sport, weekly_volume, level, goal,
           past_injury, weight_kg, height_cm, sex,
           DATE_FORMAT(birth_date, '%Y-%m-%d') AS birth_date
    FROM athlete_profiles
    WHERE id_user = ?
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Unable to load the profile." });
    }

    // A new athlete does not have a profile yet.
    if (results.length === 0) {
      return res.json(null);
    }

    const profile = results[0];
    const numbers = ["weekly_volume", "weight_kg", "height_cm"];

    // MySQL DECIMAL columns return text. The calculator needs numbers.
    for (let i = 0; i < numbers.length; i++) {
      const field = numbers[i];

      if (profile[field] !== null) {
        profile[field] = Number(profile[field]);
      }
    }

    res.json(profile);
  });
};

// Create the first profile for the logged-in athlete.
exports.createProfile = (req, res) => {
  const userId = req.user.id_user;
  const data = readProfile(req.body);
  const error = validateProfile(data);

  if (error) {
    return res.status(400).json({ error: error });
  }

  const query = `
    INSERT INTO athlete_profiles (
      sport, weekly_volume, level, goal, past_injury,
      weight_kg, height_cm, birth_date, sex, id_user
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // The values follow the same order as the columns above.
  const values = [
    data.sport,
    data.weekly_volume,
    data.level,
    data.goal,
    data.past_injury,
    data.weight_kg,
    data.height_cm,
    data.birth_date,
    data.sex,
    userId,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      // The database allows only one profile per athlete.
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: "A profile already exists. Reload the page to edit it.",
        });
      }

      return res.status(500).json({ error: "Unable to create the profile." });
    }

    res.status(201).json({
      message: "Profile saved to your account.",
      profileId: result.insertId,
    });
  });
};

// Update the logged-in athlete's existing profile.
exports.updateProfile = (req, res) => {
  const userId = req.user.id_user;
  const data = readProfile(req.body);
  const error = validateProfile(data);

  if (error) {
    return res.status(400).json({ error: error });
  }

  // Use the token's user ID so another athlete's profile cannot be changed.
  const query = `
    UPDATE athlete_profiles
    SET sport = ?, weekly_volume = ?, level = ?, goal = ?, past_injury = ?,
        weight_kg = ?, height_cm = ?, birth_date = ?, sex = ?
    WHERE id_user = ?
  `;

  const values = [
    data.sport,
    data.weekly_volume,
    data.level,
    data.goal,
    data.past_injury,
    data.weight_kg,
    data.height_cm,
    data.birth_date,
    data.sex,
    userId,
  ];

  db.query(query, values, (err, result) => {
    if (err) {
      return res.status(500).json({ error: "Unable to update the profile." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Profile not found." });
    }

    res.json({ message: "Profile saved to your account." });
  });
};
