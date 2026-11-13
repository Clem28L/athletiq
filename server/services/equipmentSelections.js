const mysql = require("mysql2/promise");
const db = require("../config/db");

const productFields = `
  e.id_equipment, e.name, e.brand, e.price, e.currency,
  e.description, e.image_url, a.attribute_name, a.attribute_value
`;

// Regroupe les caractéristiques par produit
function groupProducts(rows) {
  const products = new Map();

  for (const row of rows) {
    if (!products.has(row.id_equipment)) {
      products.set(row.id_equipment, {
        id_equipment: row.id_equipment,
        name: row.name,
        brand: row.brand,
        price: row.price,
        currency: row.currency,
        description: row.description,
        image_url: row.image_url,
        attributes: Object.create(null),
      });
    }

    if (row.attribute_name) {
      products.get(row.id_equipment).attributes[row.attribute_name] = row.attribute_value;
    }
  }

  return Array.from(products.values());
}

// Charge les produits actifs dans le budget
async function loadCatalogue(connection, category, budget) {
  if (!Number.isFinite(budget) || budget <= 0) {
    return [];
  }

  const [rows] = await connection.execute(
    `SELECT ${productFields}
     FROM equipment e
     LEFT JOIN equipment_attributes a ON a.id_equipment = e.id_equipment
     WHERE e.category = ? AND e.is_active = 1 AND e.currency = 'MYR'
       AND e.price > 0 AND e.price <= ?
     ORDER BY e.id_equipment, a.id_attribute`,
    [category, budget],
  );

  return groupProducts(rows);
}

// Relit les produits dans leur ordre enregistré
async function loadSavedProducts(connection, submissionId) {
  const [rows] = await connection.execute(
    `SELECT ${productFields}
     FROM equipment_recommendations r
     JOIN equipment e ON e.id_equipment = r.id_equipment
     LEFT JOIN equipment_attributes a ON a.id_equipment = e.id_equipment
     WHERE r.id_submission = ?
     ORDER BY r.display_rank, a.id_attribute`,
    [submissionId],
  );

  return groupProducts(rows);
}

// Sauvegarde les réponses et le classement ensemble
async function saveEquipmentSelection(userId, quizId, category, answers, products) {
  // Connexion réservée à cette transaction
  const { host, port, user, password, database, ssl } = db.config;
  const connection = await mysql.createConnection({ host, port, user, password, database, ssl });

  try {
    await connection.beginTransaction();

    // Distingue une sélection vide d'une ancienne soumission
    answers._selection_saved = true;
    const [result] = await connection.execute(
      `INSERT INTO equipment_submissions (id_user, id_quiz, category, answers, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, quizId, category, JSON.stringify(answers)],
    );

    const submissionId = result.insertId;
    if (products.length > 0) {
      const ranks = [];
      for (let index = 0; index < products.length; index++) {
        ranks.push([submissionId, products[index].id_equipment, index + 1]);
      }

      await connection.query(
        `INSERT INTO equipment_recommendations (id_submission, id_equipment, display_rank)
         VALUES ?`,
        [ranks],
      );
    }

    await connection.commit();
    return submissionId;
  } catch (err) {
    await connection.rollback().catch((rollbackError) => console.error("Equipment rollback failed:", rollbackError));
    throw err;
  } finally {
    await connection.end().catch((err) => console.error("Equipment connection close failed:", err));
  }
}

module.exports = { loadCatalogue, loadSavedProducts, saveEquipmentSelection };
