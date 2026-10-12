const jwt = require("jsonwebtoken");

// Vérifie que la requête contient un token valide
function verifyToken(req, res, next) {
  const header = req.headers["authorization"];

  // Pas de token → accès refusé
  if (!header) {
    return res.status(401).json({ error: "Pas de token" });
  }

  // Format : "Bearer eyJhbGc..." → on garde que le token
  const token = header.split(" ")[1];

  try {
    // Vérifie le token et attache les infos à req.user
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next(); // OK, on continue
  } catch (err) {
    res.status(401).json({ error: "Token invalide" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    // Sécurité : si pas connecté, on refuse
    if (!req.user) {
      return res.status(401).json({ error: "Pas connecté" });
    }

    // Vérification du rôle
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Accès refusé" });
    }

    next();
  };
}

module.exports = { verifyToken, requireRole };
