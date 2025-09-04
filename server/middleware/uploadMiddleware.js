const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Configure storage for different file types
const createStorage = (destination) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'uploads', destination);
      createUploadDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp and random string
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileExtension = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
  });
};

// File filter for images only
const imageFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer for different upload types
const uploadConfig = {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: imageFilter
};

// Create different upload middleware for different purposes
const uploadProfile = multer({
  storage: createStorage('profiles'),
  ...uploadConfig
}).single('profilePicture');

const uploadGameImage = multer({
  storage: createStorage('games'),
  ...uploadConfig
}).single('gameImage');

const uploadGameScreenshots = multer({
  storage: createStorage('screenshots'),
  ...uploadConfig
}).array('screenshots', 10); // Allow up to 10 screenshots

// Generic upload middleware that can handle any image
const uploadImage = multer({
  storage: createStorage('general'),
  ...uploadConfig
}).single('image');

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.'
    });
  }
  
  next(error);
};

// Helper function to get file URL
const getFileUrl = (req, filename, folder) => {
  return `${req.protocol}://${req.get('host')}/uploads/${folder}/${filename}`;
};

// Helper function to delete uploaded file
const deleteFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = {
  uploadProfile,
  uploadGameImage,
  uploadGameScreenshots,
  uploadImage,
  handleUploadError,
  getFileUrl,
  deleteFile
};