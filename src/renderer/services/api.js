import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verify: () => api.get('/auth/verify'),
};

// Users API
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  getUserById: (id) => api.get(`/users/${id}`),
  updateProfile: (updateData) => api.put('/users/me/update', updateData),
  searchUsers: (username) => api.get(`/users/search/${username}`),
  uploadProfilePicture: (formData) => {
    return api.post('/uploads/profile-picture', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteProfilePicture: () => api.delete('/uploads/profile-picture'),

  // --- User Library API ---
  getLibrary: () => api.get('/users/me/library'),
  addToLibrary: (gameId) => api.post('/users/me/library', { gameId }),
  removeFromLibrary: (gameId) => api.delete(`/users/me/library/${gameId}`),
  updateLibraryGame: (gameId, data) => api.put(`/users/me/library/${gameId}`, data),
};

// Friends API
export const friendsAPI = {
  getFriends: () => api.get('/friends'),
  getFriendRequests: () => api.get('/friends/requests'),
  sendFriendRequest: (targetUsername) => api.post('/friends/send-request', { targetUsername }),
  respondToRequest: (requestId, accept) => api.post('/friends/respond', { requestId, accept }),
  removeFriend: (friendshipId) => api.delete(`/friends/${friendshipId}`),
};

// Activity API
export const activityAPI = {
  heartbeat: () => api.post('/activity/heartbeat'),
  setOffline: () => api.post('/activity/offline'),
  getOnlineCount: () => api.get('/activity/online-count'),
};

// Games API
export const gamesAPI = {
  getAllGames: (params = {}) => api.get('/games', { params }),
  getGameById: (id) => api.get(`/games/${id}`),
  createGame: (gameData) => api.post('/games', gameData),
  updateGame: (id, gameData) => api.put(`/games/${id}`, gameData),
  deleteGame: (id) => api.delete(`/games/${id}`),
  getFeaturedGames: (limit = 10) => api.get('/games/featured', { params: { limit } }),
  getGamesByGenre: (genre, params = {}) => api.get(`/games/genres/${genre}`, { params }),
  searchGames: (searchTerm, params = {}) => api.get('/games', { 
    params: { 
      search: searchTerm, 
      ...params 
    } 
  }),
};

export default api;
