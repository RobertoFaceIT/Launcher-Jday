import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { chatAPI } from '../services/api';

const ChatContext = createContext();

// Export hook with better HMR compatibility
const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};

export { useChat };

export const ChatProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [messagesByThread, setMessagesByThread] = useState(new Map());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [typingByThread, setTypingByThread] = useState({});
  const [activeThreadId, setActiveThreadId] = useState(null);
  const userIdRef = useRef(null);
  const activeThreadIdRef = useRef(null);

  useEffect(() => {
    userIdRef.current = user?.id || null;
  }, [user?.id]);

  useEffect(() => {
    activeThreadIdRef.current = activeThreadId || null;
  }, [activeThreadId]);

  // Connect socket
  useEffect(() => {
    if (!isAuthenticated) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('authToken');
    const socket = io(import.meta.env.VITE_API_URL, {
      transports: ['websocket'],
      auth: { token }
    });
    socketRef.current = socket;

    const handleConnect = () => {
      console.log('🔌 Socket connected');
      setConnected(true);
    };
    const handleDisconnect = () => {
      console.log('🔌 Socket disconnected');
      setConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('chat:new', ({ message }) => {
      console.log('📩 New message received:', message);
      
      // Skip messages from current user (they're handled by chat:delivered)
      const fromMe = String(message.senderId) === String(userIdRef.current || '');
      if (fromMe) {
        console.log('📩 Skipping own message, handled by chat:delivered');
        return;
      }
      
      setMessagesByThread(prev => {
        const next = new Map(prev);
        const list = next.get(String(message.friendshipId)) || [];
        next.set(String(message.friendshipId), [...list, message]);
        return next;
      });

      // Update unread count if message from other user and thread not active
      const isActive = String(activeThreadIdRef.current || '') === String(message.friendshipId);
      console.log('📩 Message check - fromMe:', fromMe, 'isActive:', isActive, 'senderId:', message.senderId, 'userId:', userIdRef.current);
      if (!isActive) {
        console.log('📩 Updating unread count for:', message.friendshipId);
        setUnreadCounts(prev => {
          const newCount = (prev[String(message.friendshipId)] || 0) + 1;
          console.log('📩 New unread count:', newCount, 'for friendship:', message.friendshipId);
          return {
            ...prev,
            [String(message.friendshipId)]: newCount
          };
        });
      }
    });

    // Unread updates from server (global)
    const handleUnreadDelta = ({ friendshipId, delta }) => {
      console.log('📊 Unread delta received:', { friendshipId, delta });
      setUnreadCounts(prev => ({
        ...prev,
        [String(friendshipId)]: Math.max(0, (prev[String(friendshipId)] || 0) + (delta || 0))
      }));
    };
    const handleUnreadSet = ({ friendshipId, count }) => {
      console.log('📊 Unread set received:', { friendshipId, count });
      setUnreadCounts(prev => ({ ...prev, [String(friendshipId)]: Math.max(0, count || 0) }));
    };
    socket.on('chat:unread:update', handleUnreadDelta);
    socket.on('chat:unread:set', handleUnreadSet);

    socket.on('chat:delivered', ({ tempId, messageId, createdAt }) => {
      console.log('📤 Message delivered:', { tempId, messageId });
      // Just update the optimistic message with real ID and remove optimistic flag
      setMessagesByThread(prev => {
        const next = new Map(prev);
        for (const [threadId, list] of next.entries()) {
          const idx = list.findIndex(m => m._id === tempId && m.optimistic);
          if (idx >= 0) {
            const updated = [...list];
            updated[idx] = { ...updated[idx], _id: messageId, createdAt, optimistic: false };
            next.set(threadId, updated);
            break;
          }
        }
        return next;
      });
    });

    socket.on('chat:typing', ({ friendshipId, userId, isTyping }) => {
      console.log('⌨️ Typing event received:', { friendshipId, userId, isTyping, currentUserId: userIdRef.current });
      // Only show typing indicator for other users, not ourselves
      if (String(userId) !== String(userIdRef.current)) {
        console.log('⌨️ Setting typing indicator for friendship:', friendshipId, 'isTyping:', isTyping);
        setTypingByThread(prev => ({ ...prev, [friendshipId]: isTyping }));
      } else {
        console.log('⌨️ Ignoring own typing event');
      }
    });

    socket.on('chat:read', ({ friendshipId }) => {
      setUnreadCounts(prev => ({ ...prev, [friendshipId]: 0 }));
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat:unread:update', handleUnreadDelta);
      socket.off('chat:unread:set', handleUnreadSet);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated]);

  // Expose socket subscribe helpers
  const on = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socketRef.current?.off(event, handler);
  }, []);

  // Initial unread counts fetch and setup
  useEffect(() => {
    if (!isAuthenticated || !socketRef.current) return;
    
    const initialize = async () => {
      try {
        // Fetch initial unread counts
        const res = await chatAPI.getUnreadCounts();
        console.log('📊 Initial unread counts:', res.data.counts);
        setUnreadCounts(res.data.counts || {});
      } catch (e) {
        console.error('Failed to fetch unread counts:', e);
      }
    };
    
    initialize();
  }, [isAuthenticated, connected]);

  // removed duplicate unread listeners (now attached on connect)

  const joinThread = useCallback((friendshipId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:join', { friendshipId });
  }, []);

  const leaveThread = useCallback((friendshipId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:leave', { friendshipId });
  }, []);

  const sendMessage = useCallback(async (friendshipId, text) => {
    if (!socketRef.current) return;
    const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Optimistic add
    setMessagesByThread(prev => {
      const next = new Map(prev);
      const list = next.get(String(friendshipId)) || [];
      next.set(String(friendshipId), [...list, { _id: tempId, friendshipId, senderId: user?.id, text, createdAt: new Date().toISOString(), optimistic: true }]);
      return next;
    });

    socketRef.current.emit('chat:send', { friendshipId, text, tempId });
  }, [user?.id]);

  const markRead = useCallback(async (friendshipId, upToMessageId) => {
    try {
      await chatAPI.markRead(friendshipId, upToMessageId || undefined);
      if (socketRef.current) socketRef.current.emit('chat:read', { friendshipId, upToMessageId: upToMessageId || null });
      setUnreadCounts(prev => ({ ...prev, [friendshipId]: 0 }));
    } catch (e) {
      console.error('markRead failed', e);
    }
  }, []);

  const loadHistory = useCallback(async (friendshipId, params = {}) => {
    const res = await chatAPI.getMessages(friendshipId, params);
    const messages = res.data.messages || [];
    setMessagesByThread(prev => {
      const next = new Map(prev);
      const list = next.get(String(friendshipId)) || [];
      // Merge ensuring uniqueness by _id
      const byId = new Map();
      [...list, ...messages].forEach(m => byId.set(String(m._id), m));
      const merged = Array.from(byId.values()).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      next.set(String(friendshipId), merged);
      return next;
    });
    return messages;
  }, []);

  // Typing events
  const typingTimeoutsRef = useRef({});
  const emitTyping = useCallback((friendshipId, isTyping) => {
    if (!socketRef.current) return;
    socketRef.current.emit('chat:typing', { friendshipId, isTyping: !!isTyping });
    if (isTyping) {
      // Auto stop after 1.5s of inactivity
      const key = String(friendshipId);
      if (typingTimeoutsRef.current[key]) clearTimeout(typingTimeoutsRef.current[key]);
      typingTimeoutsRef.current[key] = setTimeout(() => {
        if (socketRef.current) socketRef.current.emit('chat:typing', { friendshipId, isTyping: false });
      }, 1500);
    }
  }, []);

  const value = useMemo(() => ({
    connected,
    on,
    off,
    joinThread,
    leaveThread,
    sendMessage,
    markRead,
    loadHistory,
    emitTyping,
    messagesByThread,
    unreadCounts,
    typingByThread,
    activeThreadId,
    setActiveThreadId,
  }), [connected, on, off, joinThread, leaveThread, sendMessage, markRead, loadHistory, emitTyping, messagesByThread, unreadCounts, typingByThread, activeThreadId, setActiveThreadId]);

  // Expose lightweight global helpers for non-context pages if needed
  useEffect(() => {
    window.__chatOn = on;
    window.__chatOff = off;
    return () => {
      if (window.__chatOn === on) window.__chatOn = undefined;
      if (window.__chatOff === off) window.__chatOff = undefined;
    };
  }, [on, off]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};


