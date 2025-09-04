
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, friendsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useOnlineStatus } from '../context/OnlineStatusContext';


export default function Profile() {
  const { user, updateUser } = useAuth();
  const { success, error } = useToast();
  const { getStatusDisplay } = useOnlineStatus();
  const fileInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
  });

  // Friends count state
  const [friendsCount, setFriendsCount] = useState(0);

  // Fetch friends count on mount or when user changes
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await friendsAPI.getFriends();
        setFriendsCount(res.data.friends.length);
      } catch (err) {
        setFriendsCount(0);
      }
    };
    if (user) fetchFriends();
  }, [user]);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        email: user.email,
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      error('Profile picture must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      error('Please select an image file');
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await usersAPI.uploadProfilePicture(formData);
      updateUser(response.data.data.user);
      success('Profile picture updated successfully! ✨');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!user.profilePicture && !user.avatar) return;

    setUploadingImage(true);
    try {
      await usersAPI.deleteProfilePicture();
      const updatedUser = { ...user, profilePicture: null, avatar: null };
      updateUser(updatedUser);
      success('Profile picture removed successfully');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to remove profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {};
      
      if (formData.username !== user.username) {
        updateData.username = formData.username;
      }
      
      if (formData.email !== user.email) {
        updateData.email = formData.email;
      }

      if (Object.keys(updateData).length === 0) {
        setIsEditing(false);
        return;
      }

      const response = await usersAPI.updateProfile(updateData);
      updateUser(response.data.user);
      success('Profile updated successfully! ✨');
      setIsEditing(false);
    } catch (err) {
      error(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  const getProfileImage = () => {
    return user?.profilePicture || user?.avatar;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-lg">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusDisplay(user);

  return (
    <div className="min-h-screen text-white overflow-hidden">
      {/* Hero Section with Profile Header */}
      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
        
        {/* Content */}
        <div className="relative px-8 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Profile Header */}
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8 mb-8">
              {/* Avatar Section */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 p-1 shadow-2xl">
                  <div className="w-full h-full rounded-full bg-gray-800 overflow-hidden flex items-center justify-center">
                    {getProfileImage() ? (
                      <img
                        src={getProfileImage()}
                        alt={user.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-4xl">👤</div>
                    )}
                  </div>
                </div>
                
                {/* Camera Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="absolute -bottom-2 -right-2 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-xl"
                >
                  {uploadingImage ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* User Info */}
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    {user.username}
                  </h1>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${statusInfo.color} bg-white/10`}>
                    {statusInfo.indicator}
                    {statusInfo.text}
                  </span>
                </div>
                
                <p className="text-xl text-white/70 mb-4">{user.email}</p>
                
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-white/60">Joined {formatDate(user.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-white/60">
                      Last seen {statusInfo.status === 'online' ? 'now' : formatTime(user.lastSeen)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {!isEditing ? (
                  <>
                    {(user.profilePicture || user.avatar) && (
                      <button
                        onClick={handleRemoveImage}
                        disabled={uploadingImage}
                        className="px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 text-red-400 disabled:opacity-50"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Photo
                      </button>
                    )}
                  </>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-white/10 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'settings', label: 'Account Settings', icon: '⚙️' },
              { id: 'security', label: 'Security', icon: '🔒' },
              { id: 'activity', label: 'Activity', icon: '🎮' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSection(tab.id);
                  if (isEditing && tab.id !== 'settings') setIsEditing(false);
                }}
                className={`flex items-center gap-2 px-4 py-4 font-medium border-b-2 transition-all duration-200 ${
                  activeSection === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-white/60 hover:text-white hover:border-white/20'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/30 border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🎮</span>
                  </div>
                  <span className="text-3xl font-bold text-blue-400">0</span>
                </div>
                <h3 className="font-medium text-blue-300 mb-1">Games Played</h3>
                <p className="text-blue-200/60 text-sm">Total gaming sessions</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-green-600/30 border border-green-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <span className="text-3xl font-bold text-green-400">{friendsCount}</span>
                </div>
                <h3 className="font-medium text-green-300 mb-1">Friends</h3>
                <p className="text-green-200/60 text-sm">Connected players</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/30 border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⭐</span>
                  </div>
                  <span className="text-3xl font-bold text-purple-400">0</span>
                </div>
                <h3 className="font-medium text-purple-300 mb-1">Achievements</h3>
                <p className="text-purple-200/60 text-sm">Unlocked rewards</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/30 border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">⏱️</span>
                  </div>
                  <span className="text-3xl font-bold text-yellow-400">0h</span>
                </div>
                <h3 className="font-medium text-yellow-300 mb-1">Play Time</h3>
                <p className="text-yellow-200/60 text-sm">Hours logged</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  📈
                </span>
                Recent Activity
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                      <span className="text-green-400">✓</span>
                    </div>
                    <div>
                      <p className="font-medium">Account Created</p>
                      <p className="text-white/60 text-sm">Welcome to NSP Launcher!</p>
                    </div>
                  </div>
                  <span className="text-white/60 text-sm">{formatTime(user.createdAt)}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <span className="text-blue-400">📝</span>
                    </div>
                    <div>
                      <p className="font-medium">Profile Updated</p>
                      <p className="text-white/60 text-sm">Last profile modification</p>
                    </div>
                  </div>
                  <span className="text-white/60 text-sm">{formatTime(user.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Settings Section */}
        {activeSection === 'settings' && (
          <div className="max-w-4xl">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  ⚙️
                </span>
                Account Settings
              </h2>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label htmlFor="username" className="block text-sm font-medium mb-3 text-white/80">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-white/40"
                        placeholder="Enter your username"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-3 text-white/80">
                        Email Address
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-white placeholder-white/40"
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-white/10">
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:hover:scale-100 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={loading}
                      className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <label className="block text-sm text-white/60 mb-2">Username</label>
                        <p className="text-xl font-medium">{user.username}</p>
                      </div>
                      
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <label className="block text-sm text-white/60 mb-2">Account ID</label>
                        <p className="text-sm font-mono text-white/80 bg-white/5 px-3 py-2 rounded-lg">{user._id}</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <label className="block text-sm text-white/60 mb-2">Email Address</label>
                        <p className="text-xl font-medium">{user.email}</p>
                      </div>
                      
                      <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                        <label className="block text-sm text-white/60 mb-2">Account Status</label>
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Active
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Security Section */}
        {activeSection === 'security' && (
          <div className="max-w-4xl space-y-8">
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">🔑</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-yellow-400 mb-2">Password Security</h3>
                  <p className="text-white/70 mb-6">
                    Keep your account secure by using a strong, unique password. We recommend updating your password regularly.
                  </p>
                  <button className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-xl font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                  🔒
                </span>
                Account Security
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                    </svg>
                    Last Login
                  </h4>
                  <p className="text-white/80">{formatTime(user.lastSeen)}</p>
                </div>
                
                <div className="p-6 bg-white/5 rounded-xl border border-white/10">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Account Created
                  </h4>
                  <p className="text-white/80">{formatDate(user.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Section */}
        {activeSection === 'activity' && (
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <span className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  🎮
                </span>
                Gaming Activity
              </h2>
              
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🎮</span>
                </div>
                <h3 className="text-xl font-medium mb-2">No Gaming Activity Yet</h3>
                <p className="text-white/60 mb-6">Start playing games to see your activity here</p>
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-medium transition-all duration-200 hover:scale-105">
                  Browse Games
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
