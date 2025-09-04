import { useOnlineStatus } from '../context/OnlineStatusContext';
import { useChat } from '../context/ChatContext';
import { useEffect, useState } from 'react';

/**
 * Gmail-style Chat Tab
 * Bottom bar tab showing friend info and controls
 */
export default function ChatTab({ 
  friend, 
  friendshipId, 
  isExpanded, 
  unreadCount, 
  onToggle, 
  onClose 
}) {
  const { getStatusDisplay } = useOnlineStatus();
  const { typingByThread } = useChat();
  const [previousUnreadCount, setPreviousUnreadCount] = useState(unreadCount);
  const statusInfo = getStatusDisplay(friend || {});
  const isTyping = typingByThread[String(friendshipId)];

  // Play notification sound for new messages
  useEffect(() => {
    if (unreadCount > previousUnreadCount && !isExpanded) {
      // Play subtle notification sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAzBjCJzfPQgDIGHm7A7+OZRQ0PVanm77BdGAU+ltrzxnkpBSl+zPLZizkJGGS77emhUgwOUarm6LBhWgA=');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore if audio fails
      } catch (error) {
        // Ignore audio errors
      }
    }
    setPreviousUnreadCount(unreadCount);
  }, [unreadCount, previousUnreadCount, isExpanded]);

  const handleClose = (e) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className={`
        relative flex items-center gap-2 px-3 py-2 min-w-[200px] max-w-[240px]
        bg-neutral-800 border border-white/10 rounded-t-lg cursor-pointer
        transition-all duration-200 ease-out hover:bg-neutral-700
        ${isExpanded ? 'border-b-transparent shadow-lg' : 'border-b-white/10'}
        ${unreadCount > 0 && !isExpanded ? 'ring-2 ring-blue-500/50 animate-pulse' : ''}
      `}
      onClick={onToggle}
    >
      {/* Friend Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
          {friend?.avatar ? (
            <img src={friend.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs">👤</span>
          )}
        </div>
        
        {/* Online status indicator */}
        <div 
          className={`
            absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-neutral-800
            ${statusInfo.color === 'text-green-400' ? 'bg-green-400' : 
              statusInfo.color === 'text-yellow-400' ? 'bg-yellow-400' : 'bg-gray-500'}
          `}
        />
      </div>

      {/* Friend Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-white truncate">
            {friend?.username}
          </div>
          
          {/* Close button */}
          <button
            onClick={handleClose}
            className="flex-shrink-0 w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="text-xs text-white/60 truncate">
          {isTyping ? (
            <span className="text-blue-400 animate-pulse">typing...</span>
          ) : (
            statusInfo.text
          )}
        </div>
      </div>

      {/* Unread count badge */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white px-1.5 animate-pulse">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        </div>
      )}

      {/* Expand/Collapse indicator */}
      <div className={`
        flex-shrink-0 transition-transform duration-200 text-white/40
        ${isExpanded ? 'rotate-180' : 'rotate-0'}
      `}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>
    </div>
  );
}