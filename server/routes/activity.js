const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Update user activity (heartbeat)
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastSeen: new Date(),
      isOnline: true
    });

    // Broadcast presence update to friends
    try {
      const io = req.app.get('io');
      io.emit('presence:update', { userId: req.user._id.toString(), isOnline: true, lastSeen: new Date().toISOString() });
    } catch {}

    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update activity' });
  }
});

// Mark user as offline
router.post('/offline', authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      lastSeen: new Date(),
      isOnline: false
    });

    // Broadcast presence update to friends
    try {
      const io = req.app.get('io');
      io.emit('presence:update', { userId: req.user._id.toString(), isOnline: false, lastSeen: new Date().toISOString() });
    } catch {}

    res.json({ success: true });
  } catch (error) {
    console.error('Offline update error:', error);
    res.status(500).json({ error: 'Failed to update offline status' });
  }
});

// Get online users count (for dashboard/stats)
router.get('/online-count', async (req, res) => {
  try {
    // Consider users online if they were active in the last 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    
    const onlineCount = await User.countDocuments({
      $or: [
        { isOnline: true, lastSeen: { $gte: twoMinutesAgo } },
        { lastSeen: { $gte: twoMinutesAgo } }
      ]
    });

    res.json({ onlineCount });
  } catch (error) {
    console.error('Online count error:', error);
    res.status(500).json({ error: 'Failed to get online count' });
  }
});

module.exports = router;
