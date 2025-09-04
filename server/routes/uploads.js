const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Game = require('../models/Game');
const authMiddleware = require('../middleware/authMiddleware');
const { 
  uploadProfile, 
  uploadGameImage, 
  uploadGameScreenshots, 
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

module.exports = router;