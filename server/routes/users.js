const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// --- User Game Library Endpoints ---
// Get user's game library (ownedGames with game details)
router.get('/me/library', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('ownedGames.game');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ library: user.ownedGames });
  } catch (error) {
    console.error('Get library error:', error);
    res.status(500).json({ error: 'Server error fetching library' });
  }
});

// Add a game to user's library
router.post('/me/library', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.body;
    if (!gameId) return res.status(400).json({ error: 'gameId is required' });
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Prevent duplicate
    if (user.ownedGames.some(g => g.game.toString() === gameId)) {
      return res.status(400).json({ error: 'Game already in library' });
    }
    user.ownedGames.push({ game: gameId });
    await user.save();
    res.json({ message: 'Game added to library' });
  } catch (error) {
    console.error('Add to library error:', error);
    res.status(500).json({ error: 'Server error adding to library' });
  }
});

// Remove a game from user's library
router.delete('/me/library/:gameId', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.ownedGames = user.ownedGames.filter(g => g.game.toString() !== gameId);
    await user.save();
    res.json({ message: 'Game removed from library' });
  } catch (error) {
    console.error('Remove from library error:', error);
    res.status(500).json({ error: 'Server error removing from library' });
  }
});

// Update game status in user's library (install, uninstall, installing, need_update, progress)
router.put('/me/library/:gameId', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { status, installProgress, lastPlayed } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const gameEntry = user.ownedGames.find(g => g.game.toString() === gameId);
    if (!gameEntry) return res.status(404).json({ error: 'Game not in library' });
    if (status) gameEntry.status = status;
    if (installProgress !== undefined) gameEntry.installProgress = installProgress;
    if (lastPlayed) gameEntry.lastPlayed = lastPlayed;
    await user.save();
    res.json({ message: 'Game status updated' });
  } catch (error) {
    console.error('Update game status error:', error);
    res.status(500).json({ error: 'Server error updating game status' });
  }
});



// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        avatar: req.user.avatar,
        isOnline: req.user.isOnline,
        lastSeen: req.user.lastSeen,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// Get public user profile by ID
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('username avatar isOnline lastSeen createdAt');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        avatar: user.avatar,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Server error fetching user profile' });
  }
});

// Update current user profile
router.put('/me/update', authMiddleware, [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('avatar')
    .optional()
    .isString()
    .withMessage('Avatar must be a string')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { username, email, avatar } = req.body;
    const updateData = {};

    // Check if username is being updated and if it's available
    if (username && username !== req.user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      updateData.username = username;
    }

    // Check if email is being updated and if it's available
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already taken' });
      }
      updateData.email = email;
    }

    // Update avatar if provided
    if (avatar !== undefined) {
      updateData.avatar = avatar;
    }

    // Always update lastSeen when user is active
    updateData.lastSeen = new Date();
    
    // Update online status if provided
    if (req.body.isOnline !== undefined) {
      updateData.isOnline = req.body.isOnline;
    }

    // If no updates provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No valid update data provided' });
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        isOnline: updatedUser.isOnline,
        lastSeen: updatedUser.lastSeen,
        createdAt: updatedUser.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});

// Search users by username (for friend requests)
router.get('/search/:username', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    
    if (!username || username.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters' });
    }

    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    })
    .select('username avatar isOnline lastSeen')
    .limit(10);

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ error: 'Server error searching users' });
  }
});

module.exports = router;
