import axios from 'axios';

console.log('🔍 All environment variables:', import.meta.env);
console.log('🔍 VITE_API_URL specifically:', import.meta.env.VITE_API_URL);
console.log('🔍 NODE_ENV:', import.meta.env.NODE_ENV);
console.log('🔍 MODE:', import.meta.env.MODE);

// Force the API URL for now
const API_BASE_URL = import.meta.env.VITE_API_URL;
const FINAL_BASE_URL = API_BASE_URL + '/api';

console.log('🔗 Final API Base URL:', FINAL_BASE_URL);
console.log('🔗 Using forced URL:', !import.meta.env.VITE_API_URL);

// Create axios instance
const api = axios.create({
  baseURL: FINAL_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    console.log('🚀 Making API request to:', config.baseURL + config.url);
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle auth errors globally
api.interceptors.response.use(
  (response) => {
    console.log('✅ API response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API response error:', error.config?.url, error.response?.status, error.message);
    if (error.response?.status === 401) {
      // Only redirect to login if we actually had a token (user was authenticated)
      const hadToken = localStorage.getItem('authToken');
      localStorage.removeItem('authToken');
      
      // Temporarily disable automatic redirect to debug the issue
      console.warn('401 error detected, but NOT redirecting to prevent loops');
      /*
      // Only redirect if the user was actually logged in (had a token)
      // This prevents redirecting to login on public endpoints
      if (hadToken) {
        window.location.hash = '#/login';
      }
      */
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
  downloadGame: (gameId) => api.get(`/uploads/download-game/${gameId}`, { responseType: 'blob' }),
  markGameInstalled: (gameId, data = {}) => api.post(`/uploads/mark-installed/${gameId}`, data),
  markGameUninstalled: (gameId) => api.post(`/uploads/mark-uninstalled/${gameId}`),
};

// Chat API
export const chatAPI = {
  getMessages: (friendshipId, params = {}) => api.get(`/chat/${friendshipId}/messages`, { params }),
  sendMessage: (friendshipId, text) => api.post(`/chat/${friendshipId}/messages`, { text }),
  markRead: (friendshipId, upToMessageId) => api.post(`/chat/${friendshipId}/read`, { upToMessageId }),
  getUnreadCounts: () => api.get('/chat/unread/counts'),
};

export default api;
