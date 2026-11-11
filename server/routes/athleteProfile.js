const express = require("express");
const router = express.Router();
const profileController = require("../controllers/athleteProfileController");
const { verifyToken, requireRole } = require("../middleware/auth");

// Check the login and athlete role before opening any profile route.
router.use(verifyToken, requireRole("athlete"));

// Read, create or update the logged-in athlete's own profile.
router.get("/", profileController.getProfile);
router.post("/", profileController.createProfile);
router.put("/", profileController.updateProfile);

module.exports = router;
