const mysql = require("mysql2");
require("dotenv").config();
const fs = require("fs");
//Connexion a la bd
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  port: process.env.DB_PORT,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    ca: fs.readFileSync("ca.pem"),
  },
});

db.connect((err) => {
  if (err) {
    console.error("Connexion a la BD échouée :", err.message);
  } else {
    console.log("Connecté à la BD ");
  }
});
module.exports = db; // provide acces to the db to the other files
