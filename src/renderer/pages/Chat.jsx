import { useState, useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { friendsAPI } from '../services/api';
import { useOnlineStatus } from '../context/OnlineStatusContext';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

const Chat = () => {
  const { user } = useAuth();
  const { 
    messagesByThread, 
    unreadCounts, 
    sendMessage, 
    markRead, 
    loadHistory, 
    activeThreadId, 
    setActiveThreadId,
    typingByThread,
    emitTyping,
    joinThread,
    leaveThread
  } = useChat();
  const { userStatuses } = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success, error } = useToast();
  
  const [friends, setFriends] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  // Load friends/conversations
  useEffect(() => {
    const loadFriends = async () => {
      try {
        const response = await friendsAPI.getFriends();
        const friendsList = response.data.friends || [];
        setFriends(friendsList);
        console.log('📝 Loaded friends:', friendsList);
        
        // Load last message for each friendship to show in sidebar
        for (const friend of friendsList) {
          const chatId = friend.friendshipId || friend._id;
          try {
            await loadHistory(chatId, { limit: 1 }); // Just load the last message
            console.log('📤 Loaded last message for:', friend.username);
          } catch (err) {
            console.log('⚠️ No messages yet for:', friend.username);
          }
        }
        
        // Check if there's a friendshipId in URL params to auto-select
        const friendshipId = searchParams.get('friendshipId');
        if (friendshipId && friendsList.length > 0) {
          // Look for friendship by friendshipId (not _id)
          const friend = friendsList.find(f => f.friendshipId === friendshipId || f._id === friendshipId);
          if (friend) {
            setSelectedChat(friend);
            // Clear the URL parameter after selecting
            setSearchParams({});
          }
        }
      } catch (error) {
        console.error('Failed to load friends:', error);
        error('Failed to load friends');
      }
    };
    loadFriends();
  }, [searchParams, setSearchParams, error, loadHistory]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByThread, selectedChat]);

  // Handle escape key for closing friends modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showFriendsModal) {
        setShowFriendsModal(false);
      }
    };
    
    if (showFriendsModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showFriendsModal]);

  // Load messages when selecting a chat
  useEffect(() => {
    if (selectedChat) {
      const initChat = async () => {
        try {
          setLoadingChat(true);
          // Use friendshipId for chat operations, fallback to _id
          const chatId = selectedChat.friendshipId || selectedChat._id;
          console.log('🔄 Initializing chat with friendshipId:', chatId);
          
          joinThread(chatId);
          setActiveThreadId(chatId);
          await loadHistory(chatId, { limit: 50 });
          await markRead(chatId);
          
          console.log('✅ Chat initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize chat:', error);
          error('Failed to load chat');
        } finally {
          setLoadingChat(false);
        }
      };
      initChat();
      
      return () => {
        const chatId = selectedChat.friendshipId || selectedChat._id;
        leaveThread(chatId);
        setActiveThreadId(null);
      };
    }
  }, [selectedChat, loadHistory, setActiveThreadId, markRead, joinThread, leaveThread, error]);

  const handleChatSelect = (friend) => {
    console.log('🎯 Selecting chat:', friend);
    setSelectedChat(friend);
    // Update URL to reflect selected chat using friendshipId
    const chatId = friend.friendshipId || friend._id;
    setSearchParams({ friendshipId: chatId });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedChat) return;

    try {
      const messageToSend = messageText.trim();
      const chatId = selectedChat.friendshipId || selectedChat._id;
      await sendMessage(chatId, messageToSend);
      setMessageText('');
      setIsTyping(false);
      emitTyping(chatId, false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      error('Failed to send message');
    }
  };

  const handleInputChange = (e) => {
    setMessageText(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
    
    if (selectedChat) {
      const chatId = selectedChat.friendshipId || selectedChat._id;
      
      // Only emit typing start if not already typing
      if (!isTyping) {
        setIsTyping(true);
        emitTyping(chatId, true);
        console.log('🔤 Started typing for chat:', chatId);
      }

      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout - longer duration for better UX
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        emitTyping(chatId, false);
        console.log('🔤 Stopped typing for chat:', chatId);
      }, 3000); // Increased to 3 seconds
    }
  };

  const getLastMessage = (friendshipId) => {
    const messages = messagesByThread.get(String(friendshipId)) || [];
    return messages[messages.length - 1];
  };

  const getFriendInfo = (friend) => {
    // Handle the new flattened friend structure from API
    if (!friend || !friend.username || !user?.id) {
      return null;
    }
    // The friend object already contains the friend's info directly
    return {
      _id: friend.id,
      username: friend.username,
      avatar: friend.avatar,
      isOnline: friend.isOnline,
      lastSeen: friend.lastSeen
    };
  };

  const isUserOnline = (userId, friendData = null) => {
    // First check real-time status from userStatuses
    const realtimeStatus = userStatuses.get(String(userId))?.isOnline;
    if (realtimeStatus !== undefined) {
      return realtimeStatus;
    }
    // Fallback to friend data if available
    if (friendData && friendData.isOnline !== undefined) {
      return friendData.isOnline;
    }
    return false;
  };

  const getLastSeen = (userId) => {
    const status = userStatuses.get(String(userId));
    if (status?.isOnline) return 'Online';
    if (status?.lastSeen) {
      const lastSeen = new Date(status.lastSeen);
      const now = new Date();
      const diffMinutes = Math.floor((now - lastSeen) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
      return `${Math.floor(diffMinutes / 1440)}d ago`;
    }
    return 'Offline';
  };

  const filteredFriends = friends
    .filter(friend => {
      const friendInfo = getFriendInfo(friend);
      return friendInfo && friendInfo.username && friendInfo.username.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      // Sort by last message time, most recent first
      const chatIdA = a.friendshipId || a._id;
      const chatIdB = b.friendshipId || b._id;
      const lastMessageA = getLastMessage(chatIdA);
      const lastMessageB = getLastMessage(chatIdB);
      
      if (!lastMessageA && !lastMessageB) return 0;
      if (!lastMessageA) return 1;
      if (!lastMessageB) return -1;
      
      return new Date(lastMessageB.createdAt) - new Date(lastMessageA.createdAt);
    });

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt);
    const previousDate = new Date(previousMessage.createdAt);
    
    return currentDate.toDateString() !== previousDate.toDateString();
  };

  const formatDateSeparator = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 bottom-0 flex bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white overflow-hidden z-10" style={{ top: '120px', bottom: '96px' }}>
      {/* Main Content Container - Fixed height between header and footer */}
      <div className="flex flex-1 h-full">
        {/* Sidebar - Friends List */}
        <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                💬 Chats
              </h1>
              <button
                onClick={() => setShowFriendsModal(true)}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-lg group"
                title="Start new chat"
              >
                <svg className="w-5 h-5 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-200"
              />
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-white/60 text-sm mb-4">Add friends to start chatting!</p>
                <button
                  onClick={() => window.location.hash = '#/friends'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                >
                  Go to Friends
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {filteredFriends.map((friend) => {
                  const friendInfo = getFriendInfo(friend);
                  if (!friendInfo) return null;
                  
                  const chatId = friend.friendshipId || friend._id;
                  const lastMessage = getLastMessage(chatId);
                  const unreadCount = unreadCounts[chatId] || 0;
                  const isOnline = isUserOnline(friendInfo._id, friend);
                  // Fix: Use more precise comparison to avoid multiple selections
                  const isSelected = selectedChat && (
                    (selectedChat.friendshipId && friend.friendshipId && selectedChat.friendshipId === friend.friendshipId) ||
                    (!selectedChat.friendshipId && !friend.friendshipId && selectedChat._id === friend._id)
                  );

                  return (
                    <div
                      key={friend._id}
                      onClick={() => handleChatSelect(friend)}
                      className={`
                        relative p-4 rounded-xl cursor-pointer transition-all duration-300 group
                        ${isSelected 
                          ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 shadow-lg shadow-blue-500/20 border border-blue-500/30 scale-[0.98]' 
                          : unreadCount > 0
                          ? 'bg-white/10 hover:bg-white/15 border-l-4 border-blue-500/50'
                          : 'hover:bg-white/10 bg-white/5 hover:scale-[0.99]'
                        }
                      `}
                    >
                      {/* Glow effect for selected chat */}
                      {isSelected && (
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl"></div>
                      )}
                      
                      <div className="relative flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-white/20">
                            {friendInfo.avatar ? (
                              <img src={friendInfo.avatar} alt={friendInfo.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-bold">{friendInfo.username[0].toUpperCase()}</span>
                            )}
                          </div>
                          {/* Online indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-black ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className={`text-sm truncate ${unreadCount > 0 ? 'font-bold text-white' : 'font-semibold'}`}>{friendInfo.username}</h3>
                            {lastMessage && (
                              <span className="text-xs text-white/60">{formatMessageTime(lastMessage.createdAt)}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white/70 truncate max-w-[180px]">
                              {lastMessage ? (
                                <>
                                  {String(lastMessage.senderId) === String(user?.id) && (
                                    <span className="text-white/50 mr-1">You: </span>
                                  )}
                                  {lastMessage.text}
                                </>
                              ) : (
                                <span className="text-white/50 italic">Start a conversation...</span>
                              )}
                            </p>
                            {unreadCount > 0 && (
                              <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full font-bold min-w-[20px] text-center flex-shrink-0">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const friendInfo = getFriendInfo(selectedChat);
                    if (!friendInfo) return null;
                    
                    return (
                      <>
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-white/20">
                            {friendInfo.avatar ? (
                              <img src={friendInfo.avatar} alt={friendInfo.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold">{friendInfo.username[0]?.toUpperCase() || '?'}</span>
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-black ${isUserOnline(friendInfo._id, selectedChat) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                        </div>
                        <div>
                          <h2 className="font-semibold">{friendInfo.username}</h2>
                          <p className="text-xs text-white/60">{getLastSeen(friendInfo._id)}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => success('Voice call feature coming soon! 📞')}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 group"
                    title="Voice call"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                  <button 
                    onClick={() => success('Video call feature coming soon! 📹')}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200 group"
                    title="Video call"
                  >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-black/10">
              {loadingChat ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/60">Loading chat...</p>
                  </div>
                </div>
              ) : (() => {
                const chatId = selectedChat.friendshipId || selectedChat._id;
                const messages = messagesByThread.get(String(chatId)) || [];
                
                if (messages.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-full text-center">
                      <div>
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-10 h-10 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
                        <p className="text-white/60 text-sm">Start the conversation by sending a message!</p>
                      </div>
                    </div>
                  );
                }

                return messages.map((message, index) => {
                  const isOwn = String(message.senderId) === String(user?.id);
                  const showAvatar = index === 0 || (messages[index - 1]?.senderId !== message.senderId);
                  const friendInfo = getFriendInfo(selectedChat);
                  const showDateSeparator = shouldShowDateSeparator(message, messages[index - 1]);

                  return (
                    <div key={message._id || `temp-${index}`}>
                      {/* Date separator */}
                      {showDateSeparator && (
                        <div className="flex justify-center my-4">
                          <div className="px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full text-xs text-white/70 border border-white/10">
                            {formatDateSeparator(message.createdAt)}
                          </div>
                        </div>
                      )}
                      
                      {/* Message */}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}>
                      {!isOwn && showAvatar && friendInfo && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-2 mt-auto">
                          {friendInfo.avatar ? (
                            <img src={friendInfo.avatar} alt={friendInfo.username} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <span className="text-xs font-bold">{friendInfo.username[0]?.toUpperCase() || '?'}</span>
                          )}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-10"></div>}
                      
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                        isOwn 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm' 
                          : 'bg-white/10 backdrop-blur-sm text-white rounded-bl-sm border border-white/20'
                      } ${message.optimistic ? 'opacity-70' : ''}`}>
                        {/* Message glow effect */}
                        {!message.optimistic && (
                          <div className={`absolute inset-0 rounded-2xl ${isOwn ? 'bg-blue-500/20' : 'bg-white/5'} blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
                        )}
                        
                        <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className={`text-xs ${isOwn ? 'text-blue-100' : 'text-white/60'}`}>
                            {formatMessageTime(message.createdAt)}
                          </span>
                          {isOwn && (
                            <div className="flex items-center">
                              {message.optimistic ? (
                                <svg className="w-3 h-3 text-blue-200 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 text-blue-100" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Typing indicator */}
              {!loadingChat && selectedChat && (() => {
                const chatId = selectedChat.friendshipId || selectedChat._id;
                const isTyping = typingByThread[chatId];
                const friendInfo = getFriendInfo(selectedChat);
                
                if (!isTyping || !friendInfo) return null;
                
                return (
                  <div className="flex justify-start mb-8 px-4 animate-fade-in">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg">
                      {friendInfo.avatar ? (
                        <img src={friendInfo.avatar} alt={friendInfo.username} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-sm font-bold text-white">{friendInfo.username[0]?.toUpperCase() || '?'}</span>
                      )}
                    </div>
                    <div className="bg-white/15 backdrop-blur-sm px-5 py-4 rounded-2xl rounded-bl-sm border border-white/30 relative overflow-hidden shadow-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm text-white/80 font-medium">{friendInfo.username} is typing</span>
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                      </div>
                      {/* Subtle glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-60"></div>
                    </div>
                  </div>
                );
              })()}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-xl">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={messageText}
                    onChange={handleInputChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage(e);
                      }
                      if (e.key === 'Escape') {
                        setMessageText('');
                        setIsTyping(false);
                        if (selectedChat) {
                          const chatId = selectedChat.friendshipId || selectedChat._id;
                          emitTyping(chatId, false);
                        }
                      }
                    }}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent backdrop-blur-sm transition-all duration-200 resize-none max-h-32 min-h-[48px]"
                    rows={1}
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={!messageText.trim()}
                  className={`p-3 rounded-full transition-all duration-200 group ${
                    messageText.trim()
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transform hover:scale-105' 
                      : 'bg-white/10 cursor-not-allowed'
                  }`}
                  title={messageText.trim() ? 'Send message (Enter)' : 'Type a message'}
                >
                  {messageText.trim() ? (
                    <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-8">
                <svg className="w-16 h-16 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Welcome to Real-G Chat
              </h2>
              <p className="text-white/60 max-w-md">
                Select a conversation to start chatting with your friends in style! 
                Experience next-level gaming communication.
              </p>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Friends Modal */}
      {showFriendsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowFriendsModal(false)}>
          <div 
            className="bg-neutral-800 rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden shadow-2xl border border-white/10"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  👥 Start New Chat
                </h2>
                <button 
                  onClick={() => setShowFriendsModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="Close"
                >
                  <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Friends List */}
            <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
              {friends.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-white">No friends yet</h3>
                  <p className="text-white/60 text-sm">Go to Friends page to add friends!</p>
                </div>
              ) : (
                <div className="p-4 space-y-2">
                  {friends.map((friend) => {
                    const friendInfo = getFriendInfo(friend);
                    if (!friendInfo) return null;
                    
                    const isOnline = isUserOnline(friendInfo._id, friend);
                    const chatId = friend.friendshipId || friend._id;
                    const lastMessage = getLastMessage(chatId);
                    
                    return (
                      <div
                        key={friend._id}
                        onClick={() => {
                          handleChatSelect(friend);
                          setShowFriendsModal(false);
                        }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all duration-200 group"
                      >
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden border-2 border-white/20">
                            {friendInfo.avatar ? (
                              <img src={friendInfo.avatar} alt={friendInfo.username} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg font-bold">{friendInfo.username[0].toUpperCase()}</span>
                            )}
                          </div>
                          {/* Online indicator */}
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-neutral-800 ${isOnline ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{friendInfo.username}</h3>
                          <p className="text-sm text-white/60 truncate">
                            {lastMessage ? (
                              <>
                                {String(lastMessage.senderId) === String(user?.id) && "You: "}
                                {lastMessage.text}
                              </>
                            ) : (
                              "Start a conversation..."
                            )}
                          </p>
                        </div>

                        {/* Arrow */}
                        <div className="text-white/40 group-hover:text-white/60 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Scrollbar and Animation Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes smooth-bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-8px);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        
        .animate-bounce {
          animation: smooth-bounce 1.4s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Chat;