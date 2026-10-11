const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

// INSCRIPTION
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Vérifie que rien n'est vide
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "Champs manquants" });
  }

  // Transforme le mot de passe en hash
  const hash = await bcrypt.hash(password, 10);

  // Insère l'utilisateur dans la base
  db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
    [name, email, hash, role],
    (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({ message: "Compte créé !", id: result.insertId });
    },
  );
};

// CONNEXION
exports.login = (req, res) => {
  const { email, password } = req.body;

  // Cherche l'utilisateur par email
  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Email inconnu" });
      }

      const user = results[0];

      // Compare le mot de passe tapé avec le hash en base
      const ok = await bcrypt.compare(password, user.password_hash);

      if (!ok) {
        return res.status(401).json({ error: "Mauvais mot de passe" });
      }

      // Génère le token (valable 2h)
      const token = jwt.sign(
        { id_user: user.id_user, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "2h" },
      );

      res.json({
        message: "Connecté !",
        token: token,
        user: { id: user.id_user, name: user.name, role: user.role },
      });
    },
  );
};

// PROFIL CONNECTÉ (utilisé après verifyToken)
exports.me = (req, res) => {
  res.json({ message: "Tu es connecté", user: req.user });
};
