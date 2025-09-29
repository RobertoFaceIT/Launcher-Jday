import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Remove error state management since we'll use toasts

  // Restore user session on app load
  useEffect(() => {
    console.log('AuthContext: Starting session restore');
    
    const restoreSession = async () => {
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.log('No auth token found, showing HomePage');
        setLoading(false);
        return;
      }

      try {
        console.log('Verifying existing token...');
        const response = await authAPI.verify();
        console.log('Token verification successful:', response.data);
        setUser(response.data.user);
      } catch (error) {
        console.error('Session restore failed:', error);
        localStorage.removeItem('authToken');
        // Don't redirect here, just clear the token and show HomePage
      } finally {
        console.log('Auth verification complete, setting loading to false');
        setLoading(false);
      }
    };

    // Immediately set loading to false if no token (for faster initial load)
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No token found, immediately showing HomePage');
      setLoading(false);
      return;
    }

    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth verification timed out, setting loading to false');
      setLoading(false);
    }, 3000); // Reduced to 3 seconds

    restoreSession().finally(() => {
      clearTimeout(timeoutId);
    });
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('authToken', token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      
      const response = await authAPI.register(userData);
      const { token, user: newUser } = response.data;
      
      localStorage.setItem('authToken', token);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Remove default export to fix HMR issues
