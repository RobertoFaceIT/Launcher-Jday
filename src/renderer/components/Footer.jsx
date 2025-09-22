import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCounts } = useChat();
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef(null);

  // Calculate total unread messages
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  // Scroll detection for auto-hide footer
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY.current);
      
      // Only react to significant scroll movements (more than 5px)
      if (scrollDifference < 5) return;

      // Clear any existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Determine scroll direction
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Scrolling down and past 100px from top - hide footer
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        // Scrolling up - show footer
        setIsVisible(true);
      }

      // Always show footer when near the top
      if (currentScrollY < 50) {
        setIsVisible(true);
      }

      // Show footer after user stops scrolling for 2 seconds
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 2000);

      lastScrollY.current = currentScrollY;
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, []);

  const handleChatToggle = () => {
    navigate('/chat');
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  const actionButtons = [
    {
      key: 'chat',
      label: 'Chat',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
      onClick: handleChatToggle,
      isActive: isActive('/chat'),
      badge: totalUnread,
      color: 'green'
    },
    {
      key: 'downloads',
      label: 'Downloads',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        </svg>
      ),
      onClick: () => handleNavigation('/downloads'),
      isActive: isActive('/downloads'),
      badge: 0,
      color: 'blue'
    }
  ];

  return (
    <footer className={`
      fixed bottom-0 left-0 right-0 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 
      border-t border-white/10 shadow-2xl backdrop-blur-sm z-40 transition-transform duration-300 ease-in-out
      ${isVisible ? 'translate-y-0' : 'translate-y-full'}
    `}>
      <div className="w-full px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Left Section - Brand & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">R</span>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">Real-G</div>
                <div className="text-xs text-white/50">v1.0.0</div>
              </div>
            </div>
          </div>

          {/* Center Section - Action Buttons */}
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white/5 rounded-xl p-1 backdrop-blur-sm border border-white/10 gap-1">
              {actionButtons.map((button) => (
                <button
                  key={button.key}
                  onClick={button.onClick}
                  className={`
                    relative flex items-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 font-medium
                    ${button.isActive
                      ? `bg-${button.color}-500 text-white shadow-lg shadow-${button.color}-500/25 scale-105`
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                    }
                  `}
                >
                  {button.icon}
                  <span className="text-sm">{button.label}</span>
                  
                  {/* Badge for notifications */}
                  {button.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-[20px] flex items-center justify-center font-bold shadow-lg">
                      {button.badge > 99 ? '99+' : button.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Section - User & System Status */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden border border-white/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                )}
              </div>
              <div className="hidden lg:block">
                <div className="text-xs font-medium text-white">{user?.username}</div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white/60">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
