const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const activityRoutes = require('./routes/activity');
const gameRoutes = require('./routes/games');
const uploadRoutes = require('./routes/uploads');
const adminRoutes = require('./routes/admin');
const chatRoutes = require('./routes/chat');
const Friend = require('./models/Friend');
const Message = require('./models/Message');
const User = require('./models/User');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite dev server and production
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Increased limit for base64 avatars
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/launcher_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error);
  process.exit(1);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Socket.IO setup with JWT auth
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  }
});

// Make io accessible in routes
app.set('io', io);

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers['authorization']?.replace('Bearer ', '');
    if (!token) return next(new Error('No token'));
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.userId;
    next();
  } catch (err) {
    next(err);
  }
});

io.on('connection', (socket) => {
  // Join per-user room for targeted events
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
    // Mark user online immediately and broadcast presence
    (async () => {
      try {
        const now = new Date();
        await User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: now });
        io.emit('presence:update', { userId: String(socket.userId), isOnline: true, lastSeen: now.toISOString() });
        
        // Auto-join all friendship rooms for this user to receive messages and updates
        const friendships = await Friend.find({
          $or: [
            { requester: socket.userId },
            { receiver: socket.userId }
          ]
        });
        
        console.log(`🔗 User ${socket.userId} joining ${friendships.length} friendship rooms`);
        friendships.forEach(friendship => {
          socket.join(String(friendship._id));
          console.log(`🔗 Joined room: ${friendship._id}`);
        });
        
      } catch (e) {
        console.error('connection setup error', e);
      }
    })();
  }
  // Join a friendship room
  socket.on('chat:join', async ({ friendshipId }) => {
    try {
      const friendship = await Friend.findById(friendshipId);
      if (!friendship) return;
      const isMember = [friendship.requester.toString(), friendship.receiver.toString()].includes(String(socket.userId));
      if (!isMember) return;
      socket.join(friendshipId);
    } catch {}
  });

  socket.on('chat:leave', ({ friendshipId }) => {
    socket.leave(friendshipId);
  });

  // Typing indicator
  socket.on('chat:typing', ({ friendshipId, isTyping }) => {
    socket.to(friendshipId).emit('chat:typing', { friendshipId, userId: socket.userId, isTyping: !!isTyping });
  });

  // Send message
  socket.on('chat:send', async ({ friendshipId, text, tempId }) => {
    try {
      console.log(`💬 Sending message to friendship ${friendshipId} from user ${socket.userId}`);
      const friendship = await Friend.findById(friendshipId);
      if (!friendship) {
        console.log(`❌ Friendship ${friendshipId} not found`);
        return;
      }
      const isMember = [friendship.requester.toString(), friendship.receiver.toString()].includes(String(socket.userId));
      if (!isMember) {
        console.log(`❌ User ${socket.userId} not member of friendship ${friendshipId}`);
        return;
      }

      const message = await Message.create({
        friendshipId,
        senderId: socket.userId,
        text,
        readBy: [socket.userId]
      });

      console.log(`💬 Message created with ID: ${message._id}`);

      // Acknowledge to sender for optimistic UI
      socket.emit('chat:delivered', { tempId, messageId: message._id, createdAt: message.createdAt });
      
      // Broadcast to friendship room
      console.log(`📡 Broadcasting message to room: ${friendshipId}`);
      io.to(friendshipId).emit('chat:new', { message });

      // Notify recipient user room to update unread
      const sender = String(socket.userId);
      const requester = String(friendship.requester);
      const receiver = String(friendship.receiver);
      const recipient = sender === requester ? receiver : requester;
      console.log(`📊 Updating unread count for user: ${recipient}`);
      io.to(`user:${recipient}`).emit('chat:unread:update', { friendshipId, delta: 1 });
    } catch (e) {
      console.error('socket send error', e);
    }
  });

  // Read receipts
  socket.on('chat:read', async ({ friendshipId, upToMessageId }) => {
    try {
      const friendship = await Friend.findById(friendshipId);
      if (!friendship) return;
      const isMember = [friendship.requester.toString(), friendship.receiver.toString()].includes(String(socket.userId));
      if (!isMember) return;

      const criteria = { friendshipId };
      if (upToMessageId) {
        const upTo = await Message.findById(upToMessageId).select('createdAt');
        if (upTo) criteria.createdAt = { $lte: upTo.createdAt };
      }
      await Message.updateMany(criteria, { $addToSet: { readBy: socket.userId } });
      socket.to(friendshipId).emit('chat:read', { friendshipId, readerId: socket.userId, upToMessageId: upToMessageId || null });
      // Sync unread reset across reader's other sessions
      io.to(`user:${String(socket.userId)}`).emit('chat:unread:set', { friendshipId, count: 0 });
    } catch (e) {
      console.error('socket read error', e);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const now = new Date();
      if (socket.userId) {
        await User.findByIdAndUpdate(socket.userId, { isOnline: false, lastSeen: now });
        io.emit('presence:update', { userId: String(socket.userId), isOnline: false, lastSeen: now.toISOString() });
      }
    } catch (e) {
      console.error('presence disconnect error', e);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ Database connection closed');
  process.exit(0);
});
