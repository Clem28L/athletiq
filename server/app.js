//Imports
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/test");
require("dotenv").config();
require("./config/db");

//Création du serveur
const app = express();
const port = process.env.PORT || 3000;
//Middleware
app.use(cors());
app.use(express.json());
//Routes
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);

//Démarrage
app.listen(port, () => {
  console.log("Serveur sur http://localhost:" + port);
});
