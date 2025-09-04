import { useState, useEffect, useCallback } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { friendsAPI } from '../services/api';
import ChatTab from './ChatTab';
import ChatWindow from './ChatWindow';

/**
 * Gmail-style Chat Manager
 * Manages multiple chat windows with bottom tabs
 */
export default function ChatManager() {
  // State for managing multiple open chats
  const [openChats, setOpenChats] = useState(new Map()); // Map<friendshipId, {friend, isExpanded, lastActivity}>
  const [chatPositions, setChatPositions] = useState([]); // Array of friendshipIds for ordering
  
  const { unreadCounts, messagesByThread, on } = useChat();
  const { user } = useAuth();

  // Store friend information for quick lookup
  const [friendsCache, setFriendsCache] = useState(new Map()); // Map<friendshipId, friend>

  // Auto-open chat tab when new message arrives (minimized state)
  const autoOpenChatOnMessage = useCallback((friend, friendshipId) => {
    setOpenChats(prev => {
      const newChats = new Map(prev);
      if (!newChats.has(friendshipId)) {
        // New message from friend not in open chats - open minimized
        newChats.set(friendshipId, {
          friend,
          isExpanded: false, // Start minimized as notification
          lastActivity: Date.now()
        });
        
        // Add to positions (rightmost)
        setChatPositions(prevPos => [...prevPos.filter(id => id !== friendshipId), friendshipId]);
      }
      // If chat already exists, don't change its expanded state
      return newChats;
    });
  }, []);

  // Enhanced open chat that caches friend information
  const openChat = useCallback((friend, friendshipId) => {
    // Cache friend information for later use
    setFriendsCache(prev => new Map(prev).set(friendshipId, friend));
    setOpenChats(prev => {
      const newChats = new Map(prev);
      if (!newChats.has(friendshipId)) {
        // New chat - add expanded by default
        newChats.set(friendshipId, {
          friend,
          isExpanded: true,
          lastActivity: Date.now()
        });
        
        // Add to positions (rightmost)
        setChatPositions(prevPos => [...prevPos.filter(id => id !== friendshipId), friendshipId]);
      } else {
        // Existing chat - expand it
        const existing = newChats.get(friendshipId);
        newChats.set(friendshipId, {
          ...existing,
          isExpanded: true,
          lastActivity: Date.now()
        });
      }
      return newChats;
    });
  }, []);

  // Close a chat completely
  const closeChat = useCallback((friendshipId) => {
    setOpenChats(prev => {
      const newChats = new Map(prev);
      newChats.delete(friendshipId);
      return newChats;
    });
    setChatPositions(prev => prev.filter(id => id !== friendshipId));
  }, []);

  // Toggle expand/collapse state
  const toggleChat = useCallback((friendshipId) => {
    setOpenChats(prev => {
      const newChats = new Map(prev);
      const existing = newChats.get(friendshipId);
      if (existing) {
        newChats.set(friendshipId, {
          ...existing,
          isExpanded: !existing.isExpanded,
          lastActivity: Date.now()
        });
      }
      return newChats;
    });
  }, []);

  // Fetch friend information when needed
  const fetchFriendInfo = useCallback(async (friendshipId) => {
    try {
      // Try to get friend info from Friends API
      const response = await friendsAPI.getFriends();
      const friends = response.data.friends || [];
      const friend = friends.find(f => String(f.friendshipId) === String(friendshipId));
      
      if (friend) {
        setFriendsCache(prev => new Map(prev).set(friendshipId, friend));
        return friend;
      }
    } catch (error) {
      console.error('Failed to fetch friend info:', error);
    }
    return null;
  }, []);

  // Listen for new messages to auto-open chat tabs
  useEffect(() => {
    console.log('🎯 ChatManager: Setting up message listener, on:', !!on);
    if (!on) return;

    const handleNewMessage = async ({ message }) => {
      console.log('🎯 ChatManager: New message received:', message);
      // Only auto-open for messages from others, not sent by current user
      if (String(message.senderId) !== String(user?.id)) {
        console.log('🎯 ChatManager: Message from other user, auto-opening chat');
        // Try to get friend from cache first
        let friend = friendsCache.get(message.friendshipId);
        
        if (!friend) {
          console.log('🎯 ChatManager: Friend not in cache, fetching...');
          // Try to fetch friend information
          friend = await fetchFriendInfo(message.friendshipId);
        }
        
        if (!friend) {
          console.log('🎯 ChatManager: Creating minimal friend object');
          // Create minimal friend object as fallback
          friend = {
            id: message.senderId,
            username: `User ${message.senderId.slice(-6)}`, // Show last 6 chars of ID
            friendshipId: message.friendshipId
          };
        }
        
        console.log('🎯 ChatManager: Auto-opening chat for friend:', friend);
        autoOpenChatOnMessage(friend, message.friendshipId);
      } else {
        console.log('🎯 ChatManager: Message from current user, ignoring');
      }
    };

    const cleanup = on('chat:new', handleNewMessage);
    return cleanup;
  }, [on, autoOpenChatOnMessage, user?.id, friendsCache, fetchFriendInfo]);

  // Expose methods globally for other components to use
  useEffect(() => {
    window.__openChat = openChat;
    window.__closeChat = closeChat;
    window.__toggleChat = toggleChat;
    // Also expose friend caching for other components
    window.__cacheFriend = (friendshipId, friend) => {
      setFriendsCache(prev => new Map(prev).set(friendshipId, friend));
    };
    
    return () => {
      if (window.__openChat === openChat) {
        window.__openChat = undefined;
      }
      if (window.__closeChat === closeChat) {
        window.__closeChat = undefined;
      }
      if (window.__toggleChat === toggleChat) {
        window.__toggleChat = undefined;
      }
      if (window.__cacheFriend) {
        window.__cacheFriend = undefined;
      }
    };
  }, [openChat, closeChat, toggleChat]);

  // Handle window resize for responsive positioning
  useEffect(() => {
    const handleResize = () => {
      // Force re-render to recalculate positions
      setOpenChats(prev => new Map(prev));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Shift + C to close all chats
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setOpenChats(new Map());
        setChatPositions([]);
      }
      
      // Ctrl/Cmd + Shift + M to minimize all chats
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        setOpenChats(prev => {
          const newChats = new Map();
          prev.forEach((chat, id) => {
            newChats.set(id, { ...chat, isExpanded: false });
          });
          return newChats;
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-close excess windows on small screens
  useEffect(() => {
    const viewportWidth = window.innerWidth;
    const maxWindows = Math.floor((viewportWidth - 32) / 408); // 400px + 8px gap
    
    const expandedChats = chatPositions.filter(id => openChats.get(id)?.isExpanded);
    if (expandedChats.length > maxWindows) {
      // Close oldest chats beyond the limit
      const toClose = expandedChats.slice(0, expandedChats.length - maxWindows);
      toClose.forEach(friendshipId => {
        setOpenChats(prev => {
          const newChats = new Map(prev);
          const existing = newChats.get(friendshipId);
          if (existing) {
            newChats.set(friendshipId, { ...existing, isExpanded: false });
          }
          return newChats;
        });
      });
    }
  }, [chatPositions, openChats]);

  // Calculate positions for chat windows (responsive)
  const getWindowPositions = () => {
    const positions = [];
    const windowWidth = 400; // Width of each chat window
    const tabHeight = 40; // Height of tabs
    const gap = 8; // Gap between windows
    const rightMargin = 16; // Margin from screen edge
    
    const viewportWidth = window.innerWidth;
    const maxWindows = Math.floor((viewportWidth - rightMargin * 2) / (windowWidth + gap));
    
    let expandedCount = 0;
    chatPositions.forEach(friendshipId => {
      const chat = openChats.get(friendshipId);
      if (chat?.isExpanded && expandedCount < maxWindows) {
        positions.push({
          friendshipId,
          right: expandedCount * (windowWidth + gap) + rightMargin,
          bottom: tabHeight + 8 // Above tabs with gap
        });
        expandedCount++;
      }
    });
    
    return positions;
  };

  const windowPositions = getWindowPositions();

  return (
    <>
      {/* Bottom Tab Bar */}
      <div className="fixed bottom-0 right-0 flex items-end gap-1 p-2 z-[100] max-w-full overflow-x-auto">
        {chatPositions.map(friendshipId => {
          const chat = openChats.get(friendshipId);
          if (!chat) return null;
          
          return (
            <ChatTab
              key={friendshipId}
              friend={chat.friend}
              friendshipId={friendshipId}
              isExpanded={chat.isExpanded}
              unreadCount={unreadCounts[String(friendshipId)] || 0}
              onToggle={() => toggleChat(friendshipId)}
              onClose={() => closeChat(friendshipId)}
            />
          );
        })}
      </div>

      {/* Chat Windows */}
      {windowPositions.map(({ friendshipId, right, bottom }) => {
        const chat = openChats.get(friendshipId);
        if (!chat || !chat.isExpanded) return null;

        return (
          <ChatWindow
            key={friendshipId}
            friend={chat.friend}
            friendshipId={friendshipId}
            style={{
              right: `${right}px`,
              bottom: `${bottom}px`
            }}
            onMinimize={() => toggleChat(friendshipId)}
            onClose={() => closeChat(friendshipId)}
          />
        );
      })}

      {/* Mobile overlay for expanded chats */}
      {window.innerWidth <= 768 && windowPositions.length > 0 && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-[80]" onClick={() => {
          // Minimize all chats on mobile when clicking overlay
          setOpenChats(prev => {
            const newChats = new Map();
            prev.forEach((chat, id) => {
              newChats.set(id, { ...chat, isExpanded: false });
            });
            return newChats;
          });
        }} />
      )}
    </>
  );
}