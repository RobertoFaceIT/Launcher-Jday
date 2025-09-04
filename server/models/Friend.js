const mongoose = require('mongoose');

const friendSchema = new mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Ensure no duplicate friend requests
friendSchema.index({ requester: 1, receiver: 1 }, { unique: true });

// Static method to check if friendship exists
friendSchema.statics.findFriendship = async function(userId1, userId2) {
  return this.findOne({
    $or: [
      { requester: userId1, receiver: userId2 },
      { requester: userId2, receiver: userId1 }
    ]
  });
};

// Static method to get all friends for a user
friendSchema.statics.getFriends = async function(userId) {
  return this.find({
    $or: [
      { requester: userId, status: 'accepted' },
      { receiver: userId, status: 'accepted' }
    ]
  }).populate('requester receiver', 'username avatar isOnline lastSeen');
};

// Static method to get pending friend requests
friendSchema.statics.getPendingRequests = async function(userId) {
  const incoming = await this.find({
    receiver: userId,
    status: 'pending'
  }).populate('requester', 'username avatar');

  const outgoing = await this.find({
    requester: userId,
    status: 'pending'
  }).populate('receiver', 'username avatar');

  return { incoming, outgoing };
};

module.exports = mongoose.model('Friend', friendSchema);
