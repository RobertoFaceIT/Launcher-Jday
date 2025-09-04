const mongoose = require('mongoose');
const Game = require('../models/Game');

// Script to rebuild search indexes
async function rebuildIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/launcher_app');
    
    console.log('Dropping existing indexes...');
    await Game.collection.dropIndexes();
    
    console.log('Creating new indexes...');
    await Game.syncIndexes();
    
    console.log('Indexes rebuilt successfully!');
    console.log('Available indexes:');
    const indexes = await Game.collection.listIndexes().toArray();
    indexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
  } catch (error) {
    console.error('Error rebuilding indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

if (require.main === module) {
  rebuildIndexes();
}

module.exports = rebuildIndexes;