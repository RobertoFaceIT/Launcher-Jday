const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Friend = require('../models/Friend');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Send friend request
router.post('/send-request', authMiddleware, [
  body('targetUsername')
    .trim()
    .notEmpty()
    .withMessage('Target username is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { targetUsername } = req.body;

    // Find target user
    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if trying to add themselves
    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friend.findFriendship(req.user._id, targetUser._id);
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ error: 'You are already friends with this user' });
      }
      if (existingFriendship.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
    }

    // Create friend request
    const friendRequest = new Friend({
      requester: req.user._id,
      receiver: targetUser._id,
      status: 'pending'
    });

    await friendRequest.save();

    res.status(201).json({
      message: 'Friend request sent successfully',
      request: {
        id: friendRequest._id,
        targetUser: {
          id: targetUser._id,
          username: targetUser.username,
          avatar: targetUser.avatar
        },
        status: 'pending',
        createdAt: friendRequest.createdAt
      }
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Server error sending friend request' });
  }
});

// Respond to friend request (accept/decline)
router.post('/respond', authMiddleware, [
  body('requestId')
    .notEmpty()
    .withMessage('Request ID is required'),
  body('accept')
    .isBoolean()
    .withMessage('Accept must be a boolean value')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { requestId, accept } = req.body;

    // Find the friend request
    const friendRequest = await Friend.findById(requestId).populate('requester', 'username avatar');
    
    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Check if current user is the receiver
    if (friendRequest.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only respond to requests sent to you' });
    }

    // Check if request is still pending
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been responded to' });
    }

    // Update request status
    friendRequest.status = accept ? 'accepted' : 'declined';
    await friendRequest.save();

    const message = accept ? 'Friend request accepted' : 'Friend request declined';
    
    res.json({
      message,
      request: {
        id: friendRequest._id,
        requester: {
          id: friendRequest.requester._id,
          username: friendRequest.requester.username,
          avatar: friendRequest.requester.avatar
        },
        status: friendRequest.status,
        updatedAt: friendRequest.updatedAt
      }
    });
  } catch (error) {
    console.error('Respond to friend request error:', error);
    res.status(500).json({ error: 'Server error responding to friend request' });
  }
});

// Get accepted friends list
router.get('/', authMiddleware, async (req, res) => {
  try {
    const friendships = await Friend.getFriends(req.user._id);
    
    const friends = friendships.map(friendship => {
      // Determine which user is the friend (not the current user)
      const friend = friendship.requester._id.toString() === req.user._id.toString() 
        ? friendship.receiver 
        : friendship.requester;
      
      return {
        id: friend._id,
        username: friend.username,
        avatar: friend.avatar,
        isOnline: friend.isOnline,
        lastSeen: friend.lastSeen,
        friendshipId: friendship._id,
        friendsSince: friendship.createdAt
      };
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Server error fetching friends' });
  }
});

// Get pending friend requests (incoming and outgoing)
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const requests = await Friend.getPendingRequests(req.user._id);
    
    const incomingRequests = requests.incoming.map(request => ({
      id: request._id,
      requester: {
        id: request.requester._id,
        username: request.requester.username,
        avatar: request.requester.avatar
      },
      status: request.status,
      createdAt: request.createdAt
    }));

    const outgoingRequests = requests.outgoing.map(request => ({
      id: request._id,
      receiver: {
        id: request.receiver._id,
        username: request.receiver.username,
        avatar: request.receiver.avatar
      },
      status: request.status,
      createdAt: request.createdAt
    }));

    res.json({
      incoming: incomingRequests,
      outgoing: outgoingRequests
    });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Server error fetching friend requests' });
  }
});

// Remove friend (optional bonus feature)
router.delete('/:friendshipId', authMiddleware, async (req, res) => {
  try {
    const { friendshipId } = req.params;

    const friendship = await Friend.findById(friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Check if current user is part of this friendship
    const isRequester = friendship.requester.toString() === req.user._id.toString();
    const isReceiver = friendship.receiver.toString() === req.user._id.toString();
    
    if (!isRequester && !isReceiver) {
      return res.status(403).json({ error: 'You can only remove your own friendships' });
    }

    await Friend.findByIdAndDelete(friendshipId);

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ error: 'Server error removing friend' });
  }
});

module.exports = router;
