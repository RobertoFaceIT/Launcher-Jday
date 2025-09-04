const express = require('express');
const { query, body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const Friend = require('../models/Friend');
const Message = require('../models/Message');

const router = express.Router();

// Helper: ensure user is part of friendship
async function ensureMembership(friendshipId, userId) {
  const friendship = await Friend.findById(friendshipId);
  if (!friendship) return { ok: false, code: 404, error: 'Friendship not found' };
  const isMember = [friendship.requester.toString(), friendship.receiver.toString()].includes(userId.toString());
  if (!isMember) return { ok: false, code: 403, error: 'Not allowed for this conversation' };
  return { ok: true, friendship };
}

// GET history
router.get('/:friendshipId/messages', authMiddleware, [
  query('before').optional().isISO8601().toDate(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { friendshipId } = req.params;
    const { before, limit = 50 } = req.query;

    const membership = await ensureMembership(friendshipId, req.user._id);
    if (!membership.ok) return res.status(membership.code).json({ error: membership.error });

    const criteria = { friendshipId };
    if (before) criteria.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(criteria)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

// POST send message
router.post('/:friendshipId/messages', authMiddleware, [
  body('text').isString().trim().isLength({ min: 1, max: 5000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { friendshipId } = req.params;
    const { text } = req.body;

    const membership = await ensureMembership(friendshipId, req.user._id);
    if (!membership.ok) return res.status(membership.code).json({ error: membership.error });

    const message = await Message.create({
      friendshipId,
      senderId: req.user._id,
      text,
      readBy: [req.user._id]
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({ error: 'Server error sending message' });
  }
});

// POST mark read
router.post('/:friendshipId/read', authMiddleware, [
  body('upToMessageId').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }

    const { friendshipId } = req.params;
    const { upToMessageId } = req.body;

    const membership = await ensureMembership(friendshipId, req.user._id);
    if (!membership.ok) return res.status(membership.code).json({ error: membership.error });

    const criteria = { friendshipId };
    if (upToMessageId) {
      const upTo = await Message.findById(upToMessageId).select('createdAt');
      if (upTo) criteria.createdAt = { $lte: upTo.createdAt };
    }

    await Message.updateMany(criteria, { $addToSet: { readBy: req.user._id } });
    res.json({ message: 'Read updated' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error marking read' });
  }
});

// GET unread counts for user
router.get('/unread/counts', authMiddleware, async (req, res) => {
  try {
    // Get friendships for this user
    const friendships = await Friend.find({
      $or: [
        { requester: req.user._id, status: 'accepted' },
        { receiver: req.user._id, status: 'accepted' }
      ]
    }).select('_id');

    const friendshipIds = friendships.map(f => f._id);
    if (friendshipIds.length === 0) return res.json({ counts: {} });

    const pipeline = [
      { $match: { friendshipId: { $in: friendshipIds } } },
      { $match: { readBy: { $ne: req.user._id } } },
      { $group: { _id: '$friendshipId', count: { $sum: 1 } } }
    ];
    const rows = await Message.aggregate(pipeline);
    const counts = Object.fromEntries(rows.map(r => [r._id.toString(), r.count]));
    res.json({ counts });
  } catch (error) {
    console.error('Unread counts error:', error);
    res.status(500).json({ error: 'Server error fetching unread counts' });
  }
});

module.exports = router;


