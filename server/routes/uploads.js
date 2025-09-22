const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game');
const authMiddleware = require('../middleware/authMiddleware');
const { 
  uploadProfile, 
  uploadGameImage, 
  uploadGameScreenshots,
  uploadGameFile,
  handleUploadError,
  getFileUrl,
  deleteFile 
} = require('../middleware/uploadMiddleware');
const path = require('path');

// Upload profile picture
router.post('/profile-picture', authMiddleware, (req, res) => {
  uploadProfile(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        // Delete uploaded file if user not found
        deleteFile(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete old profile picture if it exists
      if (user.profilePicture) {
        const oldFilePath = path.join(__dirname, '..', 'uploads', 'profiles', path.basename(user.profilePicture));
        deleteFile(oldFilePath);
      }

      // Update user with new profile picture URL
      const fileUrl = getFileUrl(req, req.file.filename, 'profiles');
      user.profilePicture = fileUrl;
      await user.save();

      res.json({
        success: true,
        message: 'Profile picture uploaded successfully',
        data: {
          profilePicture: fileUrl,
          user: user
        }
      });

    } catch (error) {
      console.error('Error uploading profile picture:', error);
      // Delete uploaded file on error
      deleteFile(req.file.path);
      res.status(500).json({
        success: false,
        message: 'Error uploading profile picture'
      });
    }
  });
});

// Upload game image
router.post('/game-image/:gameId', authMiddleware, (req, res) => {
  uploadGameImage(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    try {
      const game = await Game.findById(req.params.gameId);
      if (!game) {
        deleteFile(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }

      // Delete old game image if it exists
      if (game.gameImageFile) {
        const oldFilePath = path.join(__dirname, '..', 'uploads', 'games', path.basename(game.gameImageFile));
        deleteFile(oldFilePath);
      }

      // Update game with new image URL
      const fileUrl = getFileUrl(req, req.file.filename, 'games');
      game.gameImageFile = fileUrl;
      await game.save();

      res.json({
        success: true,
        message: 'Game image uploaded successfully',
        data: {
          gameImageFile: fileUrl,
          game: game
        }
      });

    } catch (error) {
      console.error('Error uploading game image:', error);
      deleteFile(req.file.path);
      res.status(500).json({
        success: false,
        message: 'Error uploading game image'
      });
    }
  });
});

// Upload game screenshots
router.post('/game-screenshots/:gameId', authMiddleware, (req, res) => {
  uploadGameScreenshots(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    try {
      const game = await Game.findById(req.params.gameId);
      if (!game) {
        // Delete uploaded files if game not found
        req.files.forEach(file => deleteFile(file.path));
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }

      // Delete old screenshots if they exist
      if (game.screenshotFiles && game.screenshotFiles.length > 0) {
        game.screenshotFiles.forEach(screenshot => {
          if (screenshot) {
            const oldFilePath = path.join(__dirname, '..', 'uploads', 'screenshots', path.basename(screenshot));
            deleteFile(oldFilePath);
          }
        });
      }

      // Update game with new screenshot URLs
      const screenshotUrls = req.files.map(file => getFileUrl(req, file.filename, 'screenshots'));
      game.screenshotFiles = screenshotUrls;
      await game.save();

      res.json({
        success: true,
        message: 'Game screenshots uploaded successfully',
        data: {
          screenshotFiles: screenshotUrls,
          game: game
        }
      });

    } catch (error) {
      console.error('Error uploading game screenshots:', error);
      // Delete uploaded files on error
      req.files.forEach(file => deleteFile(file.path));
      res.status(500).json({
        success: false,
        message: 'Error uploading game screenshots'
      });
    }
  });
});

// Upload game file (.NSP or .docx for testing)
router.post('/game-file/:gameId', authMiddleware, (req, res) => {
  uploadGameFile(req, res, async (err) => {
    if (err) {
      return handleUploadError(err, req, res, () => {});
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No game file uploaded'
      });
    }

    try {
      const game = await Game.findById(req.params.gameId);
      if (!game) {
        deleteFile(req.file.path);
        return res.status(404).json({
          success: false,
          message: 'Game not found'
        });
      }

      // Delete old game file if it exists
      if (game.gameFilePath) {
        const oldFilePath = path.join(__dirname, '..', 'uploads', 'GameFiles', path.basename(game.gameFilePath));
        deleteFile(oldFilePath);
      }

      // Update game with new file information
      const fileUrl = getFileUrl(req, req.file.filename, 'GameFiles');
      game.gameFilePath = fileUrl;
      game.gameFileSize = req.file.size;
      game.gameFileName = req.file.originalname;
      await game.save();

      res.json({
        success: true,
        message: 'Game file uploaded successfully',
        data: {
          gameFilePath: fileUrl,
          gameFileSize: req.file.size,
          gameFileName: req.file.originalname,
          game: game
        }
      });

    } catch (error) {
      console.error('Error uploading game file:', error);
      deleteFile(req.file.path);
      res.status(500).json({
        success: false,
        message: 'Error uploading game file'
      });
    }
  });
});

// Test endpoint to verify routing works
router.get('/test', (req, res) => {
  res.json({ message: 'Upload routes are working', timestamp: new Date().toISOString() });
});

// Special auth middleware for file downloads that accepts token in query params
const fileDownloadAuth = async (req, res, next) => {
  try {
    let token = null;
    
    // Try to get token from Authorization header first
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    
    // If no token in header, try query parameter
    if (!token && req.query.token) {
      token = req.query.token;
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'Access denied. No valid token provided.' 
      });
    }

    const jwt = require('jsonwebtoken');
    const User = require('../models/User');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Token is valid but user no longer exists.' 
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired.' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
};

// Download game file for installation (temporarily without auth for debugging)
router.get('/download-game/:gameId', async (req, res) => {
  try {
    console.log('Download request for game ID:', req.params.gameId);
    
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      console.log('Game not found in database');
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    console.log('Game found:', {
      title: game.title,
      gameFilePath: game.gameFilePath,
      gameFileName: game.gameFileName,
      gameFileSize: game.gameFileSize
    });
    
    if (!game.gameFilePath) {
      console.log('Game has no file path');
      return res.status(404).json({
        success: false,
        message: 'Game file not found'
      });
    }

    // Get the file path from the gameFilePath URL
    const fileName = path.basename(game.gameFilePath);
    const filePath = path.join(__dirname, '..', 'uploads', 'GameFiles', fileName);
    
    console.log('Looking for file at:', filePath);
    
    // Check if file exists on disk
    const fs = require('fs');
    if (!fs.existsSync(filePath)) {
      console.log('File does not exist on disk');
      return res.status(404).json({
        success: false,
        message: 'Game file not found on disk'
      });
    }
    
    const fileStats = fs.statSync(filePath);
    console.log('File exists, size:', fileStats.size, 'bytes');

    // Set headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${game.gameFileName || fileName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', fileStats.size);

    console.log('Streaming file to client...');
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'File stream error' });
      }
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading game file:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Error downloading game file: ' + error.message
      });
    }
  }
});

// Delete profile picture
router.delete('/profile-picture', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.profilePicture) {
      // Delete the file
      const filePath = path.join(__dirname, '..', 'uploads', 'profiles', path.basename(user.profilePicture));
      deleteFile(filePath);

      // Remove from database
      user.profilePicture = null;
      await user.save();
    }

    res.json({
      success: true,
      message: 'Profile picture deleted successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting profile picture'
    });
  }
});

// Delete game image
router.delete('/game-image/:gameId', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.gameImageFile) {
      // Delete the file
      const filePath = path.join(__dirname, '..', 'uploads', 'games', path.basename(game.gameImageFile));
      deleteFile(filePath);

      // Remove from database
      game.gameImageFile = null;
      await game.save();
    }

    res.json({
      success: true,
      message: 'Game image deleted successfully',
      data: { game }
    });

  } catch (error) {
    console.error('Error deleting game image:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting game image'
    });
  }
});

// Delete game screenshots
router.delete('/game-screenshots/:gameId', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.screenshotFiles && game.screenshotFiles.length > 0) {
      // Delete the files
      game.screenshotFiles.forEach(screenshot => {
        if (screenshot) {
          const filePath = path.join(__dirname, '..', 'uploads', 'screenshots', path.basename(screenshot));
          deleteFile(filePath);
        }
      });

      // Remove from database
      game.screenshotFiles = [];
      await game.save();
    }

    res.json({
      success: true,
      message: 'Game screenshots deleted successfully',
      data: { game }
    });

  } catch (error) {
    console.error('Error deleting game screenshots:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting game screenshots'
    });
  }
});

// Delete game file
router.delete('/game-file/:gameId', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    if (game.gameFilePath) {
      // Delete the file
      const filePath = path.join(__dirname, '..', 'uploads', 'GameFiles', path.basename(game.gameFilePath));
      deleteFile(filePath);

      // Remove from database
      game.gameFilePath = null;
      game.gameFileSize = 0;
      game.gameFileName = null;
      await game.save();
    }

    res.json({
      success: true,
      message: 'Game file deleted successfully',
      data: { game }
    });

  } catch (error) {
    console.error('Error deleting game file:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting game file'
    });
  }
});

// Mark game as installed after successful download
router.post('/mark-installed/:gameId', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { filePath, fileSize } = req.body;
    
    console.log('Marking game as installed:', { gameId, userId: req.user._id });
    
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find the game in user's library
    const gameEntry = user.ownedGames.find(g => g.game.toString() === gameId);
    
    if (!gameEntry) {
      // Game not in library, add it first
      user.ownedGames.push({
        game: gameId,
        status: 'installed',
        installProgress: 100,
        addedAt: new Date()
      });
    } else {
      // Update existing entry
      gameEntry.status = 'installed';
      gameEntry.installProgress = 100;
    }
    
    await user.save();
    
    console.log('✅ Game marked as installed successfully');
    
    res.json({
      success: true,
      message: 'Game marked as installed',
      gameId: gameId,
      status: 'installed'
    });
    
  } catch (error) {
    console.error('Error marking game as installed:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating installation status'
    });
  }
});

// Mark game as uninstalled
router.post('/mark-uninstalled/:gameId', authMiddleware, async (req, res) => {
  try {
    const { gameId } = req.params;
    
    console.log('Marking game as uninstalled:', { gameId, userId: req.user._id });
    
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Find the game in user's library
    const gameEntry = user.ownedGames.find(g => g.game.toString() === gameId);
    
    if (gameEntry) {
      gameEntry.status = 'not_installed';
      gameEntry.installProgress = 0;
      await user.save();
    }
    
    console.log('✅ Game marked as uninstalled successfully');
    
    res.json({
      success: true,
      message: 'Game marked as uninstalled',
      gameId: gameId,
      status: 'not_installed'
    });
    
  } catch (error) {
    console.error('Error marking game as uninstalled:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating installation status'
    });
  }
});

module.exports = router;