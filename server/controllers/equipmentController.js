const db = require("../config/db");

const categories = ["shoes", "trail_packs", "gps_watches", "trail_poles"];

// Charge les catégories de l'utilisateur
exports.getCategories = async (req, res) => {
  const userId = req.user.id_user;
  const connection = db.promise();

  try {
    const [statuses] = await connection.execute(
      `SELECT category, CAST(has_equipment AS UNSIGNED) AS has_equipment
       FROM user_equipment_status
       WHERE id_user = ?`,
      [userId],
    );

    // Dernière sélection par catégorie
    const [submissions] = await connection.execute(
      `SELECT s.category, s.id_submission
       FROM equipment_submissions s
       WHERE s.id_user = ? AND s.id_submission = (
         SELECT latest.id_submission
         FROM equipment_submissions latest
         WHERE latest.id_user = s.id_user AND latest.category = s.category
         ORDER BY latest.created_at DESC, latest.id_submission DESC
         LIMIT 1
       )`,
      [userId],
    );

    const items = [];

    // Prépare les quatre tuiles
    for (const category of categories) {
      const status = statuses.find((item) => item.category === category);
      const submission = submissions.find((item) => item.category === category);

      let hasEquipment = null;
      if (status) {
        hasEquipment = Number(status.has_equipment) === 1;
      }

      let latestSubmissionId = null;
      if (submission) {
        latestSubmissionId = submission.id_submission;
      }

      items.push({
        category,
        has_equipment: hasEquipment,
        latest_submission_id: latestSubmissionId,
      });
    }

    return res.json(items);
  } catch (err) {
    console.error("Unable to load equipment:", err);
    return res.status(500).json({ error: "Unable to load equipment." });
  }
};

// Enregistre la possession d'un équipement
exports.saveStatus = async (req, res) => {
  const category = req.params.category;

  if (!categories.includes(category)) {
    return res.status(404).json({ error: "Unknown equipment category." });
  }

  if (!req.body || typeof req.body.has_equipment !== "boolean") {
    return res.status(400).json({ error: "has_equipment must be a boolean." });
  }

  const hasEquipment = req.body.has_equipment;
  const value = Number(hasEquipment);

  try {
    // Insère ou actualise le choix
    await db.promise().execute(
      `INSERT INTO user_equipment_status (id_user, category, has_equipment, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE has_equipment = ?, updated_at = CURRENT_TIMESTAMP`,
      [req.user.id_user, category, value, value],
    );

    return res.json({ category, has_equipment: hasEquipment });
  } catch (err) {
    console.error("Unable to save equipment status:", err);
    return res.status(500).json({ error: "Unable to save your choice." });
  }
};
