const mongoose = require('mongoose');
const Friend = require('../models/Friend');
const User = require('../models/User');
require('dotenv').config();

// Script to clean up orphaned friend requests where users have been deleted
async function cleanupOrphanedFriendRequests() {
  try {
    console.log('🧹 Starting cleanup of orphaned friend requests...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📊 Connected to database');
    
    // Find all friend requests
    const allFriendRequests = await Friend.find({});
    console.log(`📋 Found ${allFriendRequests.length} friend requests to check`);
    
    let orphanedCount = 0;
    
    for (const friendRequest of allFriendRequests) {
      // Check if requester exists
      const requesterExists = await User.findById(friendRequest.requester);
      
      // Check if receiver exists
      const receiverExists = await User.findById(friendRequest.receiver);
      
      // If either user doesn't exist, delete the friend request
      if (!requesterExists || !receiverExists) {
        console.log(`🗑️  Deleting orphaned friend request: ${friendRequest._id}`);
        console.log(`   Requester exists: ${!!requesterExists}, Receiver exists: ${!!receiverExists}`);
        
        await Friend.findByIdAndDelete(friendRequest._id);
        orphanedCount++;
      }
    }
    
    console.log(`✅ Cleanup complete! Removed ${orphanedCount} orphaned friend requests`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📊 Disconnected from database');
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupOrphanedFriendRequests();
}

module.exports = cleanupOrphanedFriendRequests;
