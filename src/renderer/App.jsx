import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { OnlineStatusProvider } from './context/OnlineStatusContext';
import { ChatProvider } from './context/ChatContext';
import { ToastContainer } from './components/ToastContainer';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import ChatManager from './components/ChatManager';
import Footer from './components/Footer';
import Store from './pages/Store.jsx';
import Library from './pages/Library.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Friends from './pages/Friends.jsx';
import Downloads from './pages/Downloads.jsx';
import Chat from './pages/Chat.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import GameDetails from './pages/GameDetails.jsx';
import AdminDashboard from './pages/AdminPages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminPages/AdminUsers.jsx';
import AdminGames from './pages/AdminPages/AdminGames.jsx';
import AdminFriendRequests from './pages/AdminPages/AdminFriendRequests.jsx';
import AddGames from './pages/AdminPages/AddGames.jsx';

const NavBtn = ({ to, children }) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      `px-3 py-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-white/10 hover:bg-white/20'}`
    }
  >
    {children}
  </NavLink>
);

const UserDropdown = ({ user, logout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when navigating
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm">👤</span>
          )}
        </div>
        <span className="text-sm font-medium">{user?.username}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-neutral-800 rounded-lg shadow-lg border border-white/10 py-2 z-50">
          <NavLink
            to="/profile"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                isActive ? 'text-blue-400' : 'text-white'
              }`
            }
          >
            <span>👤</span>
            Profile
          </NavLink>
          <NavLink
            to="/settings"
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                isActive ? 'text-blue-400' : 'text-white'
              }`
            }
          >
            <span>⚙️</span>
            Settings
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2 text-sm hover:bg-white/10 transition-colors ${
                  isActive ? 'text-blue-400' : 'text-white'
                }`
              }
            >
              <span>🛡️</span>
              Admin Panel
            </NavLink>
          )}
          <hr className="my-2 border-white/10" />
          <button
            onClick={() => {
              handleLinkClick();
              logout();
            }}
            className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

const AppContent = () => {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex flex-col">
      <div className="flex-1 p-6 pb-24">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">🚀 Real-G Launcher</h1>
          <div className="flex items-center gap-4">
            <nav className="flex gap-3">
              <NavBtn to="/">Store</NavBtn>
              <NavBtn to="/library">Library</NavBtn>
              <NavBtn to="/friends">Friends</NavBtn>
            </nav>
            <div className="pl-4 border-l border-white/20">
              <UserDropdown user={user} logout={logout} />
            </div>
          </div>
        </header>

        <Routes>
          <Route path="/" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <Store />
            </main>
          } />
          <Route path="/game/:gameId" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <GameDetails />
            </main>
          } />
          <Route path="/library" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <Library />
            </main>
          } />
          <Route path="/friends" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <Friends />
            </main>
          } />
          <Route path="/downloads" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <Downloads />
            </main>
          } />
          <Route path="/chat" element={<Chat />} />
          <Route path="/profile" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <Profile />
            </main>
          } />
          <Route path="/settings" element={
            <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
              <Settings />
            </main>
          } />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <ProtectedAdminRoute>
              <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
                <AdminDashboard />
              </main>
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/users" element={
            <ProtectedAdminRoute>
              <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
                <AdminUsers />
              </main>
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/games" element={
            <ProtectedAdminRoute>
              <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
                <AdminGames />
              </main>
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/games/add" element={
            <ProtectedAdminRoute>
              <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
                <AddGames />
              </main>
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/games/edit/:id" element={
            <ProtectedAdminRoute>
              <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
                <AddGames />
              </main>
            </ProtectedAdminRoute>
          } />
          <Route path="/admin/friend-requests" element={
            <ProtectedAdminRoute>
              <main className="container mx-auto pt-4" style={{ paddingRight: '30px' }}>
                <AdminFriendRequests />
              </main>
            </ProtectedAdminRoute>
          } />
          
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <ChatProvider>
            <OnlineStatusProvider>
              <AppContent />
              <ToastContainer />
              <ChatManager />
            </OnlineStatusProvider>
          </ChatProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  );
}
