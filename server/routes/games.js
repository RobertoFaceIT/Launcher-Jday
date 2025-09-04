const express = require('express');
const { body, param, validationResult } = require('express-validator');
const Game = require('../models/Game');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /api/games - Get all games (public)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      genre,
      minPrice,
      maxPrice,
      search,
      sortBy = 'rating',
      sortOrder = 'desc'
    } = req.query;

    // Use the enhanced search method from the model
    let query;
    if (search || genre || minPrice || maxPrice) {
      query = Game.searchGames(search, {
        genre,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      });
    } else {
      // Build filter object for non-search queries
      const filter = { isActive: true };
      
      // Build sort object
      const sort = {};
      const validSortFields = ['rating', 'price', 'releaseDate', 'title', 'reviewCount'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'rating';
      sort[sortField] = sortOrder === 'asc' ? 1 : -1;
      
      query = Game.find(filter).sort(sort);
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const games = await query
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    let totalQuery;
    if (search || genre || minPrice || maxPrice) {
      totalQuery = Game.searchGames(search, { genre, minPrice, maxPrice });
    } else {
      totalQuery = Game.find({ isActive: true });
    }
    const total = await totalQuery.countDocuments();

    res.json({
      games,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({
      error: 'Failed to fetch games',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/games/:id - Get single game (public)
router.get('/:id', [
  param('id').isMongoId().withMessage('Invalid game ID')
], handleValidationErrors, async (req, res) => {
  try {
    const game = await Game.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).select('-__v');

    if (!game) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    res.json(game);
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      error: 'Failed to fetch game',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// POST /api/games - Add new game (admin only)
router.post('/', authMiddleware, [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
  body('screenshots').optional().isArray({ min: 0, max: 4 }).withMessage('Screenshots must be an array of 0-4 URLs'),
  body('screenshots.*').optional().isURL().withMessage('Each screenshot must be a valid URL'),
  body('price').isFloat({ min: 0, max: 999.99 }).withMessage('Price must be between 0 and 999.99'),
  body('originalPrice').isFloat({ min: 0, max: 999.99 }).withMessage('Original price must be between 0 and 999.99'),
  body('discount').optional().isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('features').isArray({ min: 1 }).withMessage('Features must be a non-empty array'),
  body('features.*').trim().isLength({ min: 1, max: 100 }).withMessage('Each feature must be 1-100 characters'),
  body('systemRequirements.minimum.os').trim().notEmpty().withMessage('Minimum OS is required'),
  body('systemRequirements.minimum.processor').trim().notEmpty().withMessage('Minimum processor is required'),
  body('systemRequirements.minimum.memory').trim().notEmpty().withMessage('Minimum memory is required'),
  body('systemRequirements.minimum.graphics').trim().notEmpty().withMessage('Minimum graphics is required'),
  body('systemRequirements.minimum.storage').trim().notEmpty().withMessage('Minimum storage is required'),
  body('systemRequirements.recommended.os').trim().notEmpty().withMessage('Recommended OS is required'),
  body('systemRequirements.recommended.processor').trim().notEmpty().withMessage('Recommended processor is required'),
  body('systemRequirements.recommended.memory').trim().notEmpty().withMessage('Recommended memory is required'),
  body('systemRequirements.recommended.graphics').trim().notEmpty().withMessage('Recommended graphics is required'),
  body('systemRequirements.recommended.storage').trim().notEmpty().withMessage('Recommended storage is required'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('reviewCount').optional().isInt({ min: 0 }).withMessage('Review count must be a non-negative integer'),
  body('developer').trim().isLength({ min: 1, max: 100 }).withMessage('Developer must be 1-100 characters'),
  body('publisher').trim().isLength({ min: 1, max: 100 }).withMessage('Publisher must be 1-100 characters'),
  body('releaseDate').isISO8601().withMessage('Release date must be a valid ISO date'),
  body('genre').isArray({ min: 1 }).withMessage('Genre must be a non-empty array'),
  body('genre.*').trim().isLength({ min: 1, max: 50 }).withMessage('Each genre must be 1-50 characters'),
  body('downloadLink').optional().isURL().withMessage('Download link must be a valid URL'),
  body('platform').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Platform must be 1-50 characters')
], handleValidationErrors, async (req, res) => {
  try {
    // Check if user is admin (you may want to implement role-based access)
    // For now, any authenticated user can add games
    
    const gameData = req.body;
    
    // Ensure price <= originalPrice
    if (gameData.price > gameData.originalPrice) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Price cannot be greater than original price', param: 'price' }]
      });
    }

    const game = new Game(gameData);
    await game.save();

    res.status(201).json({
      message: 'Game created successfully',
      game
    });
  } catch (error) {
    console.error('Error creating game:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => ({
          msg: err.message,
          param: err.path
        }))
      });
    }

    res.status(500).json({
      error: 'Failed to create game',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/games/:id - Update game (admin only)
router.put('/:id', authMiddleware, [
  param('id').isMongoId().withMessage('Invalid game ID'),
  body('title').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('image').optional().isURL().withMessage('Image must be a valid URL'),
  body('screenshots').optional().isArray({ min: 0, max: 4 }).withMessage('Screenshots must be an array of 0-4 URLs'),
  body('screenshots.*').optional().isURL().withMessage('Each screenshot must be a valid URL'),
  body('price').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Price must be between 0 and 999.99'),
  body('originalPrice').optional().isFloat({ min: 0, max: 999.99 }).withMessage('Original price must be between 0 and 999.99'),
  body('discount').optional().isInt({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('features').optional().isArray({ min: 1 }).withMessage('Features must be a non-empty array'),
  body('features.*').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Each feature must be 1-100 characters'),
  body('rating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating must be between 0 and 5'),
  body('reviewCount').optional().isInt({ min: 0 }).withMessage('Review count must be a non-negative integer'),
  body('developer').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Developer must be 1-100 characters'),
  body('publisher').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Publisher must be 1-100 characters'),
  body('releaseDate').optional().isISO8601().withMessage('Release date must be a valid ISO date'),
  body('genre').optional().isArray({ min: 1 }).withMessage('Genre must be a non-empty array'),
  body('genre.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Each genre must be 1-50 characters'),
  body('downloadLink').optional().isURL().withMessage('Download link must be a valid URL'),
  body('platform').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Platform must be 1-50 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
], handleValidationErrors, async (req, res) => {
  try {
    const updateData = req.body;
    
    // Validate price vs originalPrice if both are being updated
    if (updateData.price && updateData.originalPrice && updateData.price > updateData.originalPrice) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Price cannot be greater than original price', param: 'price' }]
      });
    }

    const game = await Game.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

    if (!game) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    res.json({
      message: 'Game updated successfully',
      game
    });
  } catch (error) {
    console.error('Error updating game:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors).map(err => ({
          msg: err.message,
          param: err.path
        }))
      });
    }

    res.status(500).json({
      error: 'Failed to update game',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// DELETE /api/games/:id - Delete game (admin only)
router.delete('/:id', authMiddleware, [
  param('id').isMongoId().withMessage('Invalid game ID')
], handleValidationErrors, async (req, res) => {
  try {
    // Soft delete by setting isActive to false
    const game = await Game.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!game) {
      return res.status(404).json({
        error: 'Game not found'
      });
    }

    res.json({
      message: 'Game deleted successfully',
      gameId: req.params.id
    });
  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      error: 'Failed to delete game',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/games/featured - Get featured games (public)
router.get('/featured', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const games = await Game.findFeatured().limit(limit).select('-__v');
    res.json(games);
  } catch (error) {
    console.error('Error fetching featured games:', error);
    res.status(500).json({
      error: 'Failed to fetch featured games',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/games/genres/:genre - Get games by genre (public)
router.get('/genres/:genre', [
  param('genre').trim().isLength({ min: 1, max: 50 }).withMessage('Invalid genre')
], handleValidationErrors, async (req, res) => {
  try {
    const { genre } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const games = await Game.findByGenre(genre)
      .skip(skip)
      .limit(limit)
      .select('-__v');

    const total = await Game.countDocuments({ 
      isActive: true,
      genre: { $in: [genre] }
    });

    res.json({
      games,
      genre,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching games by genre:', error);
    res.status(500).json({
      error: 'Failed to fetch games by genre',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;