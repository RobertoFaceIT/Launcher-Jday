import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useOnlineStatus } from '../context/OnlineStatusContext';
import { useAuth } from '../context/AuthContext';

export default function ChatWindow({ friend, friendshipId, style, onMinimize, onClose }) {
  const { joinThread, leaveThread, loadHistory, sendMessage, markRead, messagesByThread, typingByThread, emitTyping, setActiveThreadId } = useChat();
  const { getStatusDisplay } = useOnlineStatus();
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const listRef = useRef(null);
  const [hasMore, setHasMore] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const messages = useMemo(() => messagesByThread.get(String(friendshipId)) || [], [messagesByThread, friendshipId]);
  const statusInfo = getStatusDisplay(friend || {});

  useEffect(() => {
    if (!friendshipId) return;
    joinThread(friendshipId);
    setActiveThreadId(friendshipId);
    const init = async () => {
      setLoadingHistory(true);
      const loaded = await loadHistory(friendshipId, { limit: 50 });
      if (!loaded || loaded.length < 50) setHasMore(false);
      await markRead(friendshipId);
      setLoadingHistory(false);
      setTimeout(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      }, 0);
    };
    init();
    return () => {
      leaveThread(friendshipId);
      setActiveThreadId(null);
    };
  }, [friendshipId, joinThread, leaveThread, loadHistory, markRead, setActiveThreadId]);

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    await sendMessage(friendshipId, text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      onMinimize();
    }
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    emitTyping(friendshipId, true);
  };

  const handleScroll = async (e) => {
    if (!hasMore || loadingHistory) return;
    const el = e.currentTarget;
    
    // Check if user is near the bottom to show/hide scroll to bottom button
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowScrollToBottom(!nearBottom);
    
    if (el.scrollTop <= 16) {
      setLoadingHistory(true);
      const first = messages[0];
      const prevHeight = el.scrollHeight;
      const loaded = await loadHistory(friendshipId, { limit: 50, before: first?.createdAt });
      if (!loaded || loaded.length < 50) setHasMore(false);
      setLoadingHistory(false);
      setTimeout(() => {
        const newHeight = el.scrollHeight;
        el.scrollTop = newHeight - prevHeight;
      }, 0);
    }
  };

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      setShowScrollToBottom(false);
    }
  };

  return (
    <div 
      className="fixed w-[400px] h-[480px] bg-neutral-800 border border-white/10 rounded-t-xl shadow-2xl flex flex-col overflow-hidden z-[90] transition-all duration-300 ease-out"
      style={{
        ...style,
        width: '500px',
        bottom: "65px",
        height: '500px',
      }

      }
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
            {friend?.avatar ? (
              <img src={friend.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs">👤</span>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{friend?.username}</div>
            <div className={`text-xs ${statusInfo.color}`}>{statusInfo.indicator} {statusInfo.text}</div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          {/* Minimize button */}
          <button 
            onClick={onMinimize}
            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          {/* Close button */}
          <button 
            onClick={onClose}
            className="w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages (scrollable) */}
      <div className="relative flex-1">
        <div 
          ref={listRef} 
          onScroll={handleScroll} 
          className="absolute inset-0 overflow-y-auto p-3 space-y-2 scroll-smooth scrollbar-thin scrollbar-track-neutral-800 scrollbar-thumb-neutral-600 hover:scrollbar-thumb-neutral-500"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#525252 #262626'
          }}
        >
          {loadingHistory && (
            <div className="text-center text-white/60 text-xs py-2 flex items-center justify-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
              Loading messages…
            </div>
          )}
          
          {/* Scroll indicator for more messages */}
          {hasMore && !loadingHistory && messages.length > 0 && (
            <div className="text-center text-white/40 text-[10px] py-1 opacity-60">
              ↑ Scroll up to load more messages
            </div>
          )}
          {messages.map((m) => {
            const isMine = String(m.senderId) === String(user?.id);
            return (
              <div key={m._id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}>
                  <div>{m.text}</div>
                  <div className="text-[10px] opacity-70 mt-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center text-white transition-all duration-200 animate-fade-in z-10"
            title="Scroll to bottom"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}
      </div>

      {/* Typing indicator */}
      {typingByThread[String(friendshipId)] && (
        <div className="px-3 pt-1 pb-2">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs">
            {friend?.username} is typing…
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="p-3 border-t border-white/10 bg-neutral-800">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1 h-10 resize-none bg-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 placeholder-white/40"
            rows={1}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <div className="text-xs text-white/40 mt-1">Press Enter to send</div>
      </div>
    </div>
  );
}


