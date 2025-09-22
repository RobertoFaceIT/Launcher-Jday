import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useChat } from './ChatContext';
import { useAuth } from './AuthContext';
import { activityAPI } from '../services/api';

const OnlineStatusContext = createContext();

// Export hook as a function component for better HMR compatibility
const useOnlineStatus = () => {
  const context = useContext(OnlineStatusContext);
  if (!context) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
};

export { useOnlineStatus };

export const OnlineStatusProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // Changed to Map for better user data storage
  const [userStatuses, setUserStatuses] = useState(new Map()); // Store user status data
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);
  const lastPingRef = useRef(0);
  const { on, off } = useChat?.() || {};

  // Track user activity (heartbeat handled by scheduled pings and visibility)
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

  // Set up ping interval (reduce frequency to 60s)
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
    pingServer().finally(() => { lastPingRef.current = Date.now(); });

    // Then ping every 30 seconds while active
    intervalRef.current = setInterval(() => {
      pingServer().finally(() => { lastPingRef.current = Date.now(); });
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthenticated, pingServer]);

  // Listen to presence updates via sockets - REAL-TIME UPDATES
  useEffect(() => {
    if (!on) return;
    
    const handler = ({ userId, isOnline, lastSeen }) => {
      console.log('🔄 Presence update received:', { userId, isOnline, lastSeen });
      
      // Update user status in real-time
      setUserStatuses(prev => {
        const next = new Map(prev);
        next.set(String(userId), {
          isOnline: !!isOnline,
          lastSeen: lastSeen || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        return next;
      });
      
      // Update online users set
      setOnlineUsers(prev => {
        const next = new Map(prev);
        if (isOnline) {
          next.set(String(userId), { lastSeen, isOnline: true });
        } else {
          next.delete(String(userId));
        }
        return next;
      });
    };
    
    const cleanup = on('presence:update', handler);
    return () => { 
      if (typeof cleanup === 'function') cleanup(); 
    };
  }, [on]);

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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Immediately ping when tab becomes visible
        pingServer().finally(() => { lastPingRef.current = Date.now(); });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibility);
      // Mark offline when component unmounts
      if (isAuthenticated) {
        activityAPI.setOffline().catch(console.error);
      }
    };
  }, [isAuthenticated, pingServer]);

  // Check if a user is online (based on real-time data + last activity)
  const isUserOnline = useCallback((userData) => {
    if (!userData) return false;
    
    const userId = String(userData.id || userData._id || userData.userId);
    
    // First check real-time status from socket updates
    const realtimeStatus = userStatuses.get(userId);
    if (realtimeStatus) {
      // If we have real-time data, use it
      if (realtimeStatus.isOnline === false) return false;
      if (realtimeStatus.isOnline === true) {
        // Check if the real-time data is recent (within 3 minutes)
        const statusAge = Date.now() - new Date(realtimeStatus.updatedAt).getTime();
        if (statusAge < 3 * 60 * 1000) return true;
      }
    }
    
    // Fallback to userData if no real-time status or it's stale
    if (userData.isOnline === false) return false;
    
    // Check if last seen is within 2 minutes
    const lastSeen = new Date(userData.lastSeen);
    const now = new Date();
    const diffMinutes = (now - lastSeen) / (1000 * 60);
    
    return diffMinutes < 2;
  }, [userStatuses]);

  // Get online status with relative time (enhanced with real-time data)
  const getStatusDisplay = useCallback((userData) => {
    if (!userData) return { status: 'offline', text: 'Offline', color: 'text-gray-400', indicator: '⚫' };
    
    const userId = String(userData.id || userData._id || userData.userId);
    const online = isUserOnline(userData);
    
    // Get the most recent timestamp (real-time vs userData)
    const realtimeStatus = userStatuses.get(userId);
    let lastSeen = userData.lastSeen;
    
    if (realtimeStatus && realtimeStatus.lastSeen) {
      const realtimeTime = new Date(realtimeStatus.lastSeen).getTime();
      const userDataTime = new Date(userData.lastSeen || 0).getTime();
      if (realtimeTime > userDataTime) {
        lastSeen = realtimeStatus.lastSeen;
      }
    }
    
    if (online) {
      return { 
        status: 'online', 
        text: 'Online', 
        color: 'text-green-400',
        indicator: '🟢'
      };
    }
    
    // Show relative time for offline users
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
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
  }, [isUserOnline, userStatuses]);

  const value = {
    onlineUsers,
    userStatuses,
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
