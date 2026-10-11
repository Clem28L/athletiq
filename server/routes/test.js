const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Route de test simple
router.get("/", (req, res) => {
  res.json({ status: "ok", message: "AthletiQ API is running" });
});

// Route de test DB
router.get("/db", (req, res) => {
  db.query("SELECT COUNT(*) AS total FROM users", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: "Connexion à la base OK",
      nombre_utilisateurs: results[0].total,
    });
  });
});

module.exports = router;
