import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCounts } = useChat();
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
    // TODO: This will open/close the chat sidebar when chat manager is integrated
  };

  const handleDownloadsClick = () => {
    navigate('/downloads');
  };

  const isDownloadsActive = location.pathname === '/downloads';

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-neutral-800 border-t border-white/10 px-6 py-3 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side - App info */}
        <div className="flex items-center gap-3">
          <div className="text-sm text-white/60">
            🚀 Real-G Launcher
          </div>
          <div className="w-px h-4 bg-white/20"></div>
          <div className="text-xs text-white/40">
            v1.0.0
          </div>
        </div>

        {/* Center - Quick actions */}
        <div className="flex items-center gap-4">
          {/* Downloads/Queue Button */}
          <button
            onClick={handleDownloadsClick}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
              ${isDownloadsActive 
                ? 'bg-blue-500 text-white shadow-lg' 
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
              }
            `}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" 
              />
            </svg>
            <span className="text-sm font-medium">Downloads</span>
          </button>

          {/* Chat Button */}
          <button
            onClick={handleChatToggle}
            className={`
              relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200
              ${isChatOpen 
                ? 'bg-green-500 text-white shadow-lg' 
                : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
              }
            `}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
              />
            </svg>
            <span className="text-sm font-medium">Chat</span>
            
            {/* Unread messages badge */}
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-bold">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
          </button>
        </div>

        {/* Right side - Status indicators */}
        <div className="flex items-center gap-3">
          {/* Online status indicator */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-white/60">Online</span>
          </div>
          
          {/* Quick settings */}
          <button className="p-1 rounded hover:bg-white/10 transition-colors">
            <svg 
              className="w-4 h-4 text-white/60 hover:text-white/80" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
              />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
