import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    activeFriendRequests: 0,
    recentLogins: 0,
    recentLoginUsers: []
  });
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/admin/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        showToast('Failed to load dashboard statistics', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-blue-500',
      link: '/admin/users'
    },
    {
      title: 'Total Games',
      value: stats.totalGames,
      icon: '🎮',
      color: 'bg-green-500',
      link: '/admin/games'
    },
    {
      title: 'Friend Requests',
      value: stats.activeFriendRequests,
      icon: '👫',
      color: 'bg-yellow-500',
      link: '/admin/friend-requests'
    },
    {
      title: 'Recent Logins (24h)',
      value: stats.recentLogins,
      icon: '🔥',
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
          <p className="text-white/70">Manage your launcher application</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg ${card.color} flex items-center justify-center text-2xl`}>
                  {card.icon}
                </div>
                {card.link && (
                  <Link
                    to={card.link}
                    className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                  >
                    View →
                  </Link>
                )}
              </div>
              <h3 className="text-white/70 text-sm font-medium mb-1">{card.title}</h3>
              <p className="text-2xl font-bold text-white">{card.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            to="/admin/users"
            className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 hover:border-blue-500 transition-colors group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                👥
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-blue-400">User Management</h3>
            </div>
            <p className="text-white/70 text-sm">
              Manage user accounts, roles, and permissions
            </p>
          </Link>

          <Link
            to="/admin/games"
            className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 hover:border-green-500 transition-colors group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                🎮
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-green-400">Game Management</h3>
            </div>
            <p className="text-white/70 text-sm">
              Add, edit, and manage games in the store
            </p>
          </Link>

          <Link
            to="/admin/homepage"
            className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 hover:border-purple-500 transition-colors group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                🏠
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-purple-400">HomePage Editor</h3>
            </div>
            <p className="text-white/70 text-sm">
              Edit homepage content, features, and sections
            </p>
          </Link>

          <Link
            to="/admin/friend-requests"
            className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 hover:border-yellow-500 transition-colors group"
          >
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center mr-3">
                👫
              </div>
              <h3 className="text-lg font-semibold text-white group-hover:text-yellow-400">Friend Requests</h3>
            </div>
            <p className="text-white/70 text-sm">
              Monitor and manage friend connections
            </p>
          </Link>
        </div>

        {/* Recent Activity */}
        {stats.recentLoginUsers.length > 0 && (
          <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Logins (Last 24 Hours)</h3>
            <div className="space-y-3">
              {stats.recentLoginUsers.slice(0, 5).map((user, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-neutral-700 last:border-b-0">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{user.username}</span>
                  </div>
                  <span className="text-white/70 text-sm">
                    {new Date(user.lastSeen).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;