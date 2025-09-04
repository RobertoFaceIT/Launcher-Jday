# NSP Launcher Backend

## Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or MongoDB Atlas)

## Setup Instructions

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file in the server directory with the following content:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/launcher_app
   JWT_SECRET=your_super_secure_jwt_secret_key_here_change_in_production
   NODE_ENV=development
   ```

3. **Start MongoDB:**
   - For local MongoDB: `mongod`
   - For MongoDB Atlas: Update the `MONGODB_URI` in your `.env` file

4. **Run the server:**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users/:id` - Get public user profile
- `PUT /api/users/me/update` - Update current user profile
- `GET /api/users/search/:username` - Search users by username

### Friends
- `GET /api/friends` - Get accepted friends list
- `GET /api/friends/requests` - Get pending friend requests
- `POST /api/friends/send-request` - Send friend request
- `POST /api/friends/respond` - Accept/decline friend request
- `DELETE /api/friends/:friendshipId` - Remove friend

### Health Check
- `GET /api/health` - Server health check

## Security Features

- Password hashing with bcrypt (12 rounds)
- JWT authentication with 7-day expiration
- Protected routes with middleware
- Input validation and sanitization
- CORS configuration for frontend access

## Database Models

### User
- username (unique, 3-30 chars)
- email (unique, validated)
- password (bcrypt hashed)
- avatar (base64 string, optional)
- isOnline (boolean)
- lastSeen (timestamp)

### Friend
- requester (User ref)
- receiver (User ref)
- status (pending/accepted/declined)
- timestamps (createdAt/updatedAt)
