//Imports
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
require("dotenv").config();

//Création du serveur
const app = express();
const port = process.env.PORT || 3000;
//Middleware
app.use(cors());
app.use(bodyParser.json());

//Connexion a la bd
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Connexion a la BD échouée :", err.message);
  } else {
    console.log("Connecté à la BD ");
  }
});

//Route de test
app.get("/api/test", (req, res) => {
  res.json({ status: "ok", message: "AthletiQ API is running" });
});

// Route de test
app.get("/api/test-db", (req, res) => {
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

//Démarrage
app.listen(port, () => {
  console.log("Serveur sur http://localhost:" + port);
});
