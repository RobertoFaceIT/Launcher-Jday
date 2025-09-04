const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Game = require('../models/Game');
const Friend = require('../models/Friend');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Configure multer for game uploads
const createUploadDir = (dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`Processing file: ${file.fieldname}, mimetype: ${file.mimetype}`);
    let uploadPath;
    if (file.fieldname === 'coverImage') {
      uploadPath = path.join(__dirname, '..', 'uploads', 'games');
    } else if (file.fieldname.startsWith('screenshot')) {
      uploadPath = path.join(__dirname, '..', 'uploads', 'screenshots');
    } else {
      console.error(`Unknown fieldname: ${file.fieldname}`);
      return cb(new Error(`Unknown field: ${file.fieldname}`), null);
    }
    
    console.log(`Upload path: ${uploadPath}`);
    createUploadDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + fileExtension;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter
});

// Apply auth and admin role middleware to all admin routes
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

// Dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      totalGames,
      activeFriendRequests,
      recentLogins
    ] = await Promise.all([
      User.countDocuments(),
      Game.countDocuments(),
      Friend.countDocuments({ status: 'pending' }),
      User.find({ lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
        .select('username lastSeen')
        .sort({ lastSeen: -1 })
        .limit(10)
    ]);

    res.json({
      totalUsers,
      totalGames,
      activeFriendRequests,
      recentLogins: recentLogins.length,
      recentLoginUsers: recentLogins
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// User Management Routes
router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter if provided
    if (status === 'online') {
      query.isOnline = true;
    } else if (status === 'offline') {
      query.isOnline = false;
    }

    const [users, totalUsers] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUsers / limit),
        totalUsers,
        hasNext: skip + users.length < totalUsers,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user details
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('ownedGames.game', 'title coverImage');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's friend count
    const friendCount = await Friend.countDocuments({
      $or: [
        { requester: user._id, status: 'accepted' },
        { recipient: user._id, status: 'accepted' }
      ]
    });

    res.json({
      ...user.toJSON(),
      friendCount
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user
router.put('/users/:id', [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { username, email, role } = req.body;
    const userId = req.params.id;

    // Check if trying to update admin's own role
    if (req.user._id.toString() === userId && role && role !== req.user.role) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Check for duplicate username/email
    if (username || email) {
      const duplicateQuery = { _id: { $ne: userId } };
      if (username) duplicateQuery.username = username;
      if (email) duplicateQuery.email = email;

      const existingUser = await User.findOne(duplicateQuery);
      if (existingUser) {
        const field = existingUser.username === username ? 'username' : 'email';
        return res.status(400).json({ error: `User with this ${field} already exists` });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Ban/Unban user (toggle online status)
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const userId = req.params.id;
    const { banned } = req.body;

    // Prevent admin from banning themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: 'Cannot ban yourself' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, we'll use isOnline field to represent ban status
    // In a real app, you'd want a separate 'banned' field
    user.isOnline = !banned;
    if (banned) {
      user.lastSeen = new Date();
    }
    await user.save();

    res.json({
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      user
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to update user ban status' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user's friend relationships
    await Friend.deleteMany({
      $or: [
        { requester: userId },
        { recipient: userId }
      ]
    });

    // Delete the user
    await User.findByIdAndDelete(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Game Management Routes
router.get('/games', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build search query
    let query = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { developer: { $regex: search, $options: 'i' } },
        { publisher: { $regex: search, $options: 'i' } }
      ];
    }

    const [games, totalGames] = await Promise.all([
      Game.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Game.countDocuments(query)
    ]);

    res.json({
      games,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalGames / limit),
        totalGames,
        hasNext: skip + games.length < totalGames,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Get single game by ID
router.get('/games/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({ game });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ error: 'Failed to fetch game' });
  }
});

// Create new game with file uploads
router.post('/games', (req, res, next) => {
  upload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'screenshot0', maxCount: 1 },
    { name: 'screenshot1', maxCount: 1 },
    { name: 'screenshot2', maxCount: 1 },
    { name: 'screenshot3', maxCount: 1 }
  ])(req, res, (error) => {
    if (error) {
      console.error('Multer error:', error);
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }
      if (error.message === 'Only image files are allowed!') {
        return res.status(400).json({ error: 'Only image files are allowed.' });
      }
      return res.status(400).json({ error: 'File upload error: ' + error.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('Files received:', req.files);
    console.log('Body received:', req.body);
    
    // Parse the game data from the form
    const gameData = JSON.parse(req.body.gameData);
    
    // Handle file uploads
    const imageUrls = {
      coverImage: null,
      screenshots: []
    };

    if (req.files) {
      console.log('Processing files...');
      // Handle cover image
      if (req.files.coverImage && req.files.coverImage[0]) {
        const file = req.files.coverImage[0];
        console.log('Cover image file:', file);
        imageUrls.coverImage = `${req.protocol}://${req.get('host')}/uploads/games/${file.filename}`;
      }

      // Handle screenshots
      for (let i = 0; i < 4; i++) {
        const fieldName = `screenshot${i}`;
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          console.log(`Screenshot ${i} file:`, file);
          imageUrls.screenshots.push(`${req.protocol}://${req.get('host')}/uploads/screenshots/${file.filename}`);
        }
      }
    } else {
      console.log('No files received');
    }

    // Create the game with uploaded images
    const game = new Game({
      title: gameData.title,
      description: gameData.description,
      price: parseFloat(gameData.price),
      originalPrice: gameData.originalPrice ? parseFloat(gameData.originalPrice) : parseFloat(gameData.price),
      discount: parseFloat(gameData.discount) || 0,
      developer: gameData.developer,
      publisher: gameData.publisher,
      genre: gameData.genre.filter(g => g.trim() !== ''),
      features: gameData.features.filter(f => f.trim() !== ''),
      releaseDate: new Date(gameData.releaseDate),
      platform: gameData.platform || 'Windows',
      downloadLink: gameData.downloadLink || '',
      isActive: gameData.isActive !== false,
      image: imageUrls.coverImage || 'https://via.placeholder.com/300x400',
      screenshots: imageUrls.screenshots,
      rating: 0,
      reviewCount: 0,
      systemRequirements: gameData.systemRequirements || {
        minimum: {
          os: 'Windows 10',
          processor: 'Intel Core i3',
          memory: '4 GB RAM',
          graphics: 'DirectX 11 compatible',
          storage: '5 GB available space'
        },
        recommended: {
          os: 'Windows 11',
          processor: 'Intel Core i5',
          memory: '8 GB RAM',
          graphics: 'DirectX 12 compatible',
          storage: '10 GB available space'
        }
      }
    });

    await game.save();

    res.status(201).json({
      message: 'Game created successfully',
      game: game
    });
  } catch (error) {
    console.error('Create game error:', error);
    
    // Clean up uploaded files if game creation fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to create game',
      message: error.message 
    });
  }
});

// Update game
router.put('/games/:id', (req, res, next) => {
  // Check if the request contains files (multipart/form-data)
  if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
    upload.fields([
      { name: 'coverImage', maxCount: 1 },
      { name: 'screenshot0', maxCount: 1 },
      { name: 'screenshot1', maxCount: 1 },
      { name: 'screenshot2', maxCount: 1 },
      { name: 'screenshot3', maxCount: 1 }
    ])(req, res, (error) => {
      if (error) {
        console.error('Multer error in update:', error);
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
        }
        if (error.message === 'Only image files are allowed!') {
          return res.status(400).json({ error: 'Only image files are allowed.' });
        }
        return res.status(400).json({ error: 'File upload error: ' + error.message });
      }
      next();
    });
  } else {
    next();
  }
}, [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty'),
  body('price')
    .optional()
    .isNumeric()
    .withMessage('Price must be a number'),
  body('developer')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Developer cannot be empty'),
  body('publisher')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Publisher cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const gameId = req.params.id;
    let updateData;

    // Check if we have form data (with files) or JSON data
    if (req.body.gameData) {
      // Parse game data from FormData
      updateData = JSON.parse(req.body.gameData);
      console.log('Update with files - parsed game data:', updateData);
      console.log('Update files received:', req.files);
    } else {
      // Use direct JSON data
      updateData = { ...req.body };
      console.log('Update without files - JSON data:', updateData);
    }

    if (updateData.price) {
      updateData.price = parseFloat(updateData.price);
      // Also update originalPrice if not explicitly set
      if (!updateData.originalPrice) {
        updateData.originalPrice = updateData.price;
      }
    }

    if (updateData.genre && typeof updateData.genre === 'string') {
      updateData.genre = [updateData.genre]; // Convert to array
    }

    // Handle file uploads for images
    if (req.files) {
      console.log('Processing file uploads for update...');
      
      // Handle cover image
      if (req.files.coverImage && req.files.coverImage[0]) {
        const file = req.files.coverImage[0];
        console.log('New cover image file:', file);
        updateData.image = `${req.protocol}://${req.get('host')}/uploads/games/${file.filename}`;
      }

      // Handle screenshots
      const newScreenshots = [];
      for (let i = 0; i < 4; i++) {
        const fieldName = `screenshot${i}`;
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          console.log(`New screenshot ${i} file:`, file);
          newScreenshots.push(`${req.protocol}://${req.get('host')}/uploads/screenshots/${file.filename}`);
        }
      }

      // Only update screenshots if we have new ones
      if (newScreenshots.length > 0) {
        updateData.screenshots = newScreenshots;
      }
    }

    // Handle tags properly
    if (updateData.tags) {
      updateData.tags = Array.isArray(updateData.tags) ? updateData.tags : updateData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    }

    // Ensure system requirements are properly structured
    if (updateData.systemRequirements) {
      updateData.systemRequirements = {
        minimum: {
          os: updateData.systemRequirements?.minimum?.os || 'Windows 10',
          processor: updateData.systemRequirements?.minimum?.processor || 'Intel Core i3',
          memory: updateData.systemRequirements?.minimum?.memory || '4 GB RAM',
          graphics: updateData.systemRequirements?.minimum?.graphics || 'DirectX 11 compatible',
          storage: updateData.systemRequirements?.minimum?.storage || '5 GB available space'
        },
        recommended: {
          os: updateData.systemRequirements?.recommended?.os || 'Windows 11',
          processor: updateData.systemRequirements?.recommended?.processor || 'Intel Core i5',
          memory: updateData.systemRequirements?.recommended?.memory || '8 GB RAM',
          graphics: updateData.systemRequirements?.recommended?.graphics || 'DirectX 12 compatible',
          storage: updateData.systemRequirements?.recommended?.storage || '10 GB available space'
        }
      };
    }

    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      message: 'Game updated successfully',
      game: updatedGame
    });
  } catch (error) {
    console.error('Update game error:', error);
    
    // Clean up uploaded files if game update fails
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    res.status(500).json({ error: 'Failed to update game' });
  }
});

// Delete game
router.delete('/games/:id', async (req, res) => {
  try {
    const gameId = req.params.id;

    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Remove game from all users' owned games
    await User.updateMany(
      { 'ownedGames.game': gameId },
      { $pull: { ownedGames: { game: gameId } } }
    );

    // Delete the game
    await Game.findByIdAndDelete(gameId);

    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ error: 'Failed to delete game' });
  }
});

// Toggle game visibility/featured status
router.patch('/games/:id/visibility', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { featured, isActive } = req.body;

    const updateData = {};
    if (typeof featured !== 'undefined') {
      // For featured status, we'll use rating as a proxy since there's no featured field
      // Games with rating >= 4.5 will be considered featured
      updateData.rating = featured ? 4.5 : 3.0;
    }
    if (typeof isActive !== 'undefined') {
      updateData.isActive = !!isActive;
    }

    const updatedGame = await Game.findByIdAndUpdate(
      gameId,
      updateData,
      { new: true }
    );

    if (!updatedGame) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      message: `Game ${featured ? 'featured' : 'unfeatured'} successfully`,
      game: updatedGame
    });
  } catch (error) {
    console.error('Toggle game visibility error:', error);
    res.status(500).json({ error: 'Failed to update game visibility' });
  }
});

// Friend Requests Management
router.get('/friend-requests', async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'pending' } = req.query;
    const skip = (page - 1) * limit;

    const [friendRequests, totalRequests] = await Promise.all([
      Friend.find({ status })
        .populate('requester', 'username email avatar')
        .populate('recipient', 'username email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Friend.countDocuments({ status })
    ]);

    res.json({
      friendRequests,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
        hasNext: skip + friendRequests.length < totalRequests,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

module.exports = router;