const mongoose = require('mongoose');

const systemRequirementsSchema = new mongoose.Schema({
  os: {
    type: String,
    required: true,
    trim: true
  },
  processor: {
    type: String,
    required: true,
    trim: true
  },
  memory: {
    type: String,
    required: true,
    trim: true
  },
  graphics: {
    type: String,
    required: true,
    trim: true
  },
  storage: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });

const gameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  image: {
    type: String,
    required: true,
    trim: true
  },
  gameImageFile: {
    type: String,
    default: null // File URL for uploaded game image
  },
  screenshots: [{
    type: String,
    trim: true
  }],
  screenshotFiles: [{
    type: String,
    trim: true // File URLs for uploaded screenshots
  }],
  price: {
    type: Number,
    required: true,
    min: 0,
    max: 999.99
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0,
    max: 999.99
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  features: [{
    type: String,
    trim: true,
    maxlength: 100
  }],
  systemRequirements: {
    minimum: {
      type: systemRequirementsSchema,
      required: true
    },
    recommended: {
      type: systemRequirementsSchema,
      required: true
    }
  },
  rating: {
    type: Number,
    required: true,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  developer: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  publisher: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  releaseDate: {
    type: Date,
    required: true
  },
  genre: [{
    type: String,
    trim: true,
    maxlength: 50
  }],
  downloadLink: {
    type: String,
    trim: true,
    default: null
  },
  gameFilePath: {
    type: String,
    trim: true,
    default: null // Path to the actual game file (.NSP or .docx for testing)
  },
  gameFileSize: {
    type: Number,
    default: 0 // File size in bytes
  },
  gameFileName: {
    type: String,
    trim: true,
    default: null // Original filename of the uploaded game file
  },
  platform: {
    type: String,
    trim: true,
    default: 'Windows'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
gameSchema.index({ title: 'text', description: 'text', developer: 'text', publisher: 'text' });
gameSchema.index({ genre: 1 });
gameSchema.index({ price: 1 });
gameSchema.index({ rating: -1 });
gameSchema.index({ releaseDate: -1 });
gameSchema.index({ isActive: 1 });
gameSchema.index({ title: 1, developer: 1, publisher: 1 }); // Compound index for better search performance

// Virtual for formatted release date
gameSchema.virtual('formattedReleaseDate').get(function() {
  return this.releaseDate.toLocaleDateString();
});

// Virtual for discount calculation
gameSchema.virtual('discountAmount').get(function() {
  return this.originalPrice - this.price;
});

// Method to calculate if game is on sale
gameSchema.methods.isOnSale = function() {
  return this.discount > 0 && this.price < this.originalPrice;
};

// Static method to find featured games
gameSchema.statics.findFeatured = function() {
  return this.find({ 
    isActive: true,
    rating: { $gte: 4.0 }
  }).sort({ rating: -1, reviewCount: -1 });
};

// Static method to find games by genre
gameSchema.statics.findByGenre = function(genreName) {
  return this.find({ 
    isActive: true,
    genre: { $in: [genreName] }
  }).sort({ rating: -1 });
};

// Static method for enhanced search
gameSchema.statics.searchGames = function(searchTerm, options = {}) {
  const { genre, minPrice, maxPrice, sortBy = 'rating', sortOrder = 'desc' } = options;
  
  const filter = { isActive: true };
  
  if (searchTerm) {
    const searchRegex = new RegExp(searchTerm.split(' ').join('|'), 'i');
    filter.$or = [
      { $text: { $search: searchTerm } },
      { title: searchRegex },
      { description: searchRegex },
      { developer: searchRegex },
      { publisher: searchRegex },
      { genre: { $in: [searchRegex] } }
    ];
  }
  
  if (genre) {
    filter.genre = { $in: [genre] };
  }
  
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = parseFloat(minPrice);
    if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
  }
  
  const sort = {};
  const validSortFields = ['rating', 'price', 'releaseDate', 'title', 'reviewCount'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'rating';
  sort[sortField] = sortOrder === 'asc' ? 1 : -1;
  
  return this.find(filter).sort(sort);
};

// Pre-save middleware to validate screenshots array
gameSchema.pre('save', function(next) {
  // Keep only valid URLs and cap to 10
  if (Array.isArray(this.screenshots)) {
    this.screenshots = this.screenshots
      .filter(url => typeof url === 'string' && url.trim() && url.startsWith('http'))
      .slice(0, 10);
  } else {
    this.screenshots = [];
  }

  // Ensure discount matches price difference
  if (this.originalPrice && this.price) {
    const calculatedDiscount = Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    this.discount = Math.max(0, Math.min(100, calculatedDiscount));
  }

  next();
});

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;