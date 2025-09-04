// migrateGames.js
// This script copies all games from the 'launcher-app' database to the 'launcher_app' database.
// Usage: node migrateGames.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// Game schema definition (must match your Game.js)
const systemRequirementsSchema = new mongoose.Schema({
  os: String,
  processor: String,
  memory: String,
  graphics: String,
  storage: String
}, { _id: false });

const gameSchema = new mongoose.Schema({
  title: String,
  description: String,
  image: String,
  gameImageFile: String,
  screenshots: [String],
  screenshotFiles: [String],
  price: Number,
  originalPrice: Number,
  discount: Number,
  features: [String],
  systemRequirements: {
    minimum: systemRequirementsSchema,
    recommended: systemRequirementsSchema
  },
  rating: Number,
  reviewCount: Number,
  developer: String,
  publisher: String,
  releaseDate: Date,
  genre: [String],
  downloadLink: String,
  platform: String,
  isActive: Boolean
}, { timestamps: true });

async function migrateGames() {
  // Connect to source DB (launcher-app)
  const sourceConn = await mongoose.createConnection('mongodb://localhost:27017/launcher-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const SourceGame = sourceConn.model('Game', gameSchema);

  // Connect to target DB (launcher_app)
  const targetConn = await mongoose.createConnection(process.env.MONGODB_URI || 'mongodb://localhost:27017/launcher_app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const TargetGame = targetConn.model('Game', gameSchema);

  try {
    const games = await SourceGame.find({});
    console.log(`Found ${games.length} games in source DB.`);
    if (games.length === 0) {
      console.log('No games to migrate.');
      return;
    }

    // Remove _id to avoid duplicate key error
    const gamesToInsert = games.map(game => {
      const obj = game.toObject();
      delete obj._id;
      return obj;
    });

    // Insert into target DB
    const result = await TargetGame.insertMany(gamesToInsert);
    console.log(`Migrated ${result.length} games to target DB.`);
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await sourceConn.close();
    await targetConn.close();
    console.log('Connections closed.');
  }
}

migrateGames();
