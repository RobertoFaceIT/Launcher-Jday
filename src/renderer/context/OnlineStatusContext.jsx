import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { activityAPI } from '../services/api';

const OnlineStatusContext = createContext();

export const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
};

export const OnlineStatusProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });
    };
  }, [isAuthenticated, updateActivity]);

  // Ping server to update online status
  const pingServer = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    try {
      // Only ping if user has been active in the last 5 minutes
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const shouldPing = timeSinceActivity < 5 * 60 * 1000; // 5 minutes

      if (shouldPing) {
        await activityAPI.heartbeat();
      }
    } catch (error) {
      console.error('Failed to ping server:', error);
    }
  }, [isAuthenticated, user]);

  // Set up ping interval
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Ping immediately
    pingServer();

    // Then ping every 30 seconds
    intervalRef.current = setInterval(pingServer, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, pingServer]);

  // Cleanup on logout or window close
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleBeforeUnload = async () => {
      try {
        // Mark user as offline when leaving
        await activityAPI.setOffline();
      } catch (error) {
        console.error('Failed to update offline status:', error);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Mark offline when component unmounts
      if (isAuthenticated) {
        activityAPI.setOffline().catch(console.error);
      }
    };
  }, [isAuthenticated]);

  // Check if a user is online (based on last activity)
  const isUserOnline = useCallback((userData) => {
    if (!userData) return false;
    
    // If explicitly marked offline, return false
    if (userData.isOnline === false) return false;
    
    // Check if last seen is within 2 minutes
    const lastSeen = new Date(userData.lastSeen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / (1000 * 60);
    
    return diffMinutes < 2;
  }, []);

  // Get online status with relative time
  const getStatusDisplay = useCallback((userData) => {
    if (!userData) return { status: 'offline', text: 'Offline', color: 'text-gray-400' };
    
    const online = isUserOnline(userData);
    
    if (online) {
      return { 
        status: 'online', 
        text: 'Online', 
        color: 'text-green-400',
        indicator: '🟢'
      };
    }
    
    // Show relative time for offline users
    const lastSeen = new Date(userData.lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    let timeText;
    if (diffMinutes < 1) {
      timeText = 'Just now';
    } else if (diffMinutes < 60) {
      timeText = `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      timeText = `${diffHours}h ago`;
    } else {
      timeText = `${diffDays}d ago`;
    }
    
    return { 
      status: 'offline', 
      text: timeText, 
      color: 'text-gray-400',
      indicator: '⚫'
    };
  }, [isUserOnline]);

  const value = {
    onlineUsers,
    isUserOnline,
    getStatusDisplay,
    updateActivity,
  };

  return (
    <OnlineStatusContext.Provider value={value}>
      {children}
    </OnlineStatusContext.Provider>
  );
};
