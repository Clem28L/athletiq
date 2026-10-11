const mysql = require("mysql2");
require("dotenv").config();

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
module.exports = db; // provide acces to the db to the other files
