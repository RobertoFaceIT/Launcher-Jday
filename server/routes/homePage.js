const express = require("express");
const router = express.Router();
const HomePage = require("../models/HomePage");
const authMiddleware = require("../middleware/authMiddleware");   // ✅ JWT check
const roleMiddleware = require("../middleware/roleMiddleware");   // ✅ role checker

// Public: get homepage content
router.get("/", async (req, res) => {
  try {
    const homepage = await HomePage.findOne({});
    res.json(homepage);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch homepage" });
  }
});

// Admin: update homepage content
router.put("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const data = req.body;
    let homepage = await HomePage.findOne({});
    if (!homepage) {
      homepage = new HomePage(data);
    } else {
      Object.assign(homepage, data);
      homepage.updatedAt = Date.now();
    }
    await homepage.save();
    res.json(homepage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update homepage" });
  }
});

module.exports = router;
