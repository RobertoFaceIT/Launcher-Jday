const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  friendshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Friend',
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }]
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

messageSchema.index({ friendshipId: 1, createdAt: -1 });
messageSchema.index({ friendshipId: 1, _id: 1 });

module.exports = mongoose.model('Message', messageSchema);


