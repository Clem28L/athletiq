const mysql = require("mysql2/promise");
const db = require("../config/db");

const productFields = `
  e.id_equipment, e.category, e.name, e.brand, e.price, e.currency,
  e.image_url, e.model_reference
`;

// Regroupe les caractéristiques par produit
function groupProducts(rows) {
  const products = new Map();

  for (const { attribute_name, attribute_value, ...product } of rows) {
    if (!products.has(product.id_equipment)) {
      product.attributes = Object.create(null);
      products.set(product.id_equipment, product);
    }

    if (attribute_name) {
      products.get(product.id_equipment).attributes[attribute_name] = attribute_value;
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
    `SELECT ${productFields}, a.attribute_name, a.attribute_value
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
     WHERE r.id_submission = ?
     ORDER BY r.display_rank`,
    [submissionId],
  );

  return rows;
}

// Charge la fiche d'un produit du catalogue
async function loadProduct(connection, productId) {
  const [rows] = await connection.execute(
    `SELECT ${productFields}, a.attribute_name, a.attribute_value
     FROM equipment e
     LEFT JOIN equipment_attributes a ON a.id_equipment = e.id_equipment
       AND RIGHT(a.attribute_name, 4) <> '_url'
       AND a.attribute_name NOT IN ('price_checked_on', 'observed_price_myr', 'price_unit', 'hydration_spec_source')
     WHERE e.id_equipment = ?
     ORDER BY a.id_attribute`,
    [productId],
  );

  const [product] = groupProducts(rows);
  if (!product) {
    return null;
  }

  const [offers] = await connection.execute(
    `SELECT retailer, url, price, sold_per_pole
     FROM equipment_offers
     WHERE id_equipment = ?
     ORDER BY price, retailer, url`,
    [productId],
  );
  return { ...product, offers };
}

// Sauvegarde les réponses et le classement ensemble
async function saveEquipmentSelection(userId, quizId, category, answers, products) {
  // Connexion réservée à cette transaction
  const { host, port, user, password, database, ssl } = db.config;
  const connection = await mysql.createConnection({ host, port, user, password, database, ssl });

  try {
    await connection.beginTransaction();

    // Distingue le classement complet des anciennes sélections
    const savedAnswers = { ...answers, _selection_saved: "all_matches" };
    const [result] = await connection.execute(
      `INSERT INTO equipment_submissions (id_user, id_quiz, category, answers, created_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, quizId, category, JSON.stringify(savedAnswers)],
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

module.exports = { loadCatalogue, loadSavedProducts, loadProduct, saveEquipmentSelection };
