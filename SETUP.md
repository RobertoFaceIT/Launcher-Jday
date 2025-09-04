# NSP Launcher - Full Stack Setup Guide

This guide will help you set up the complete authentication and social system for your Electron + React launcher app.

## 🎯 Overview

You now have a fully functional authentication and social system with:

✅ **Backend (Node.js + Express + MongoDB)**
- JWT authentication with bcrypt password hashing
- User registration and login
- Profile management with avatar upload
- Friend system (send/accept/decline requests)
- Protected API routes

✅ **Frontend (React + Tailwind + Context API)**
- Login/Register pages with validation
- Authentication context and token management
- Protected routing
- Profile page with editing capabilities
- Friends page with search and management
- Auto-logout on token expiration
- **Toast notification system** for user feedback
- **Real-time online status tracking** with activity monitoring
- **Enhanced empty states** with calls-to-action
- **Improved UX** with visual online indicators

## 🎉 New Features Added

### 🔔 Toast Notifications
- Success/error/warning/info messages
- Auto-dismiss after 4 seconds
- Manual dismiss option
- Elegant animations and icons

### 👥 Online Status System
- Real-time activity tracking
- Automatic heartbeat every 30 seconds
- Visual online/offline indicators
- "Last seen" timestamps for offline users
- Activity-based status updates

### 🎨 Enhanced Empty States
- Engaging visuals with emojis
- Descriptive text and calls-to-action
- Context-aware suggestions
- Improved user guidance

## 🚀 Quick Start

### 1. Install Backend Dependencies

```bash
npm run setup:backend
```

### 2. Set up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB locally and start it
mongod
```

**Option B: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string
4. Update `.env` file in server directory

### 3. Configure Environment

Create `server/.env` file:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/launcher_app
JWT_SECRET=your_super_secure_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

### 4. Install Frontend Dependencies

```bash
npm install
```

### 5. Run Full Stack Application

```bash
# Run everything (frontend + backend + electron)
npm run dev:full
```

Or run components separately:
```bash
# Terminal 1: Backend server
npm run dev:backend

# Terminal 2: Frontend + Electron
npm run dev
```

## 📱 How to Use

1. **Start the app** - It will open to the login screen
2. **Register** - Create a new account with username, email, password  
3. **Login** - Use your credentials to sign in
4. **Explore Enhanced Features:**
   - **Profile**: View/edit your profile, upload avatar, see online status
   - **Friends**: Search for users, send friend requests, manage friends with real-time status
   - **Store/Library**: Your existing launcher functionality with improved empty states
   - **Notifications**: Receive instant feedback for all actions
   - **Activity Tracking**: Automatic online/offline status based on user activity

## 🔧 API Testing

Test the backend with curl or Postman:

```bash
# Health check
curl http://localhost:3000/api/health

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## 🛡️ Security Features

- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Tokens**: 7-day expiration, stored in localStorage
- **Protected Routes**: Both frontend and backend validation
- **Input Validation**: Express-validator for API endpoints
- **CORS**: Configured for your Electron app
- **Auto-logout**: On token expiration or invalid tokens

## 📁 Project Structure

```
launcher-app/
├── server/                 # Backend API
│   ├── models/            # MongoDB schemas
│   ├── routes/            # Express routes
│   ├── middleware/        # Auth middleware
│   ├── package.json       # Backend dependencies
│   └── index.js           # Server entry point
├── src/renderer/          # Frontend React app
│   ├── components/        # Reusable components
│   ├── context/           # React Context (Auth)
│   ├── pages/             # Page components
│   ├── services/          # API service layer
│   └── App.jsx            # Main app component
└── package.json           # Main project dependencies
```

## 🎛️ Available Scripts

```bash
npm run dev:full          # Run frontend + backend + electron
npm run dev               # Run frontend + electron only
npm run dev:backend       # Run backend server only
npm run setup:backend     # Install backend dependencies
```

## 🔗 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get public user profile  
- `PUT /api/users/me/update` - Update profile (includes online status)
- `GET /api/users/search/:username` - Search users

### Friends
- `GET /api/friends` - Get friends list
- `GET /api/friends/requests` - Get friend requests
- `POST /api/friends/send-request` - Send friend request
- `POST /api/friends/respond` - Accept/decline request
- `DELETE /api/friends/:friendshipId` - Remove friend

### Activity (New!)
- `POST /api/activity/heartbeat` - Update user activity
- `POST /api/activity/offline` - Mark user as offline
- `GET /api/activity/online-count` - Get total online users

## 🐛 Troubleshooting

**Backend won't start:**
- Check MongoDB is running
- Verify `.env` file exists in server directory
- Run `npm install` in server directory

**Frontend auth not working:**
- Ensure backend is running on http://localhost:3000
- Check browser console for errors
- Verify axios requests in Network tab

**Database connection failed:**
- Check MongoDB connection string
- Ensure database server is running
- Check firewall settings for MongoDB port

## 🚀 Next Steps

Your authentication and social system is now complete! You can:

1. **Add game launcher functionality** - Integrate with your existing store/library
2. **Real-time features** - Add WebSocket for live friend status
3. **Additional social features** - Groups, chat, achievements
4. **Enhanced security** - Rate limiting, 2FA, password reset
5. **Production deployment** - Docker, cloud hosting, CDN

## 📚 Technologies Used

- **Backend**: Node.js, Express, MongoDB, JWT, bcrypt
- **Frontend**: React 19, React Router, Axios, Tailwind CSS
- **Desktop**: Electron
- **Build**: Vite

The system is production-ready and follows security best practices. All components are modular and can be easily extended with additional features.
