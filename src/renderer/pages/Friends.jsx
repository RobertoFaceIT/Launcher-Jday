import { useState, useEffect, useCallback } from 'react';
import { friendsAPI, usersAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useOnlineStatus } from '../context/OnlineStatusContext';
import EmptyState from '../components/EmptyState';

// Constants
const TABS = {
  FRIENDS: 'friends',
  REQUESTS: 'requests',
  ADD: 'add'
};

const SEARCH_MIN_LENGTH = 2;

// Tab Button Component
const TabButton = ({ id, label, isActive, onClick, count }) => (
  <button
    onClick={() => onClick(id)}
    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg'
        : 'bg-white/10 hover:bg-white/20 text-white/80 hover:text-white'
    }`}
  >
    {label}
    {count !== undefined && ` (${count})`}
  </button>
);

// User Avatar Component
const UserAvatar = ({ user, size = 'md' }) => {
  const { getStatusDisplay } = useOnlineStatus();
  const statusInfo = getStatusDisplay(user);
  
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-24 h-24'
  };
  
  const indicatorSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6'
  };

  return (
    <div className="relative">
      <div className={`${sizeClasses[size]} rounded-full bg-white/10 flex items-center justify-center overflow-hidden`}>
        {user.avatar ? (
          <img src={user.avatar} alt={`${user.username}'s avatar`} className="w-full h-full object-cover" />
        ) : (
          <span className={size === 'lg' ? 'text-4xl' : 'text-lg'}>👤</span>
        )}
      </div>
      {statusInfo.status === 'online' && (
        <div className={`absolute -bottom-1 -right-1 ${indicatorSizes[size]} bg-green-500 rounded-full border-2 ${size === 'lg' ? 'border-neutral-800' : 'border-neutral-900'}`}></div>
      )}
    </div>
  );
};

// User Info Component
const UserInfo = ({ user, showFriendshipDate = false }) => {
  const { getStatusDisplay } = useOnlineStatus();
  const statusInfo = getStatusDisplay(user);

  return (
    <div>
      <h3 className="font-medium text-white">{user.username}</h3>
      <p className={`text-sm ${statusInfo.color}`}>
        {statusInfo.indicator} {statusInfo.text}
      </p>
      {showFriendshipDate && user.friendsSince && (
        <p className="text-xs text-white/50 mt-1">
          Friends since {new Date(user.friendsSince).toLocaleDateString()}
        </p>
      )}
    </div>
  );
};

// User Card Component
const UserCard = ({ user, actions, onClick, isClickable = false }) => {
  const handleClick = (e) => {
    if (isClickable && onClick && !e.target.closest('button')) {
      onClick(user);
    }
  };

  return (
    <div 
      className={`flex items-center justify-between p-4 bg-white/5 rounded-lg transition-all duration-200 ${
        isClickable ? 'hover:bg-white/10 cursor-pointer hover:shadow-md' : 'hover:bg-white/8'
      }`}
      onClick={handleClick}
    >
      <div className="flex items-center space-x-3">
        <UserAvatar user={user} size="md" />
        <UserInfo user={user} showFriendshipDate={isClickable} />
      </div>
      <div className="flex items-center space-x-2">
        {actions}
      </div>
    </div>
  );
};

// Friend Profile Modal Component
const FriendProfileModal = ({ friend, onClose, onRemove }) => {
  const { getStatusDisplay } = useOnlineStatus();
  
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!friend) return null;

  const statusInfo = getStatusDisplay(friend);

  const handleRemove = () => {
    onRemove(friend.friendshipId, friend.username);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-neutral-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Friend Profile</h2>
          <button 
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl leading-none p-1"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        
        {/* Profile Section */}
        <div className="text-center mb-6">
          <UserAvatar user={friend} size="lg" />
          <h3 className="text-2xl font-bold text-white mt-4 mb-2">{friend.username}</h3>
          <p className={`text-sm ${statusInfo.color} mb-4`}>
            {statusInfo.indicator} {statusInfo.text}
          </p>
        </div>

        {/* Info Sections */}
        <div className="space-y-4">
          {/* Friendship Info */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="font-medium text-white/90 mb-3">Friendship</h4>
            <div className="text-sm text-white/70 space-y-1">
              {friend.friendsSince && (
                <p>Friends since: {new Date(friend.friendsSince).toLocaleDateString()}</p>
              )}
              <p>Friendship ID: {friend.friendshipId}</p>
            </div>
          </div>

          {/* User Stats */}
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="font-medium text-white/90 mb-3">User Details</h4>
            <div className="text-sm text-white/70 space-y-1">
              <p>User ID: {friend.id}</p>
              <p>Username: {friend.username}</p>
              {friend.lastSeen && (
                <p>Last seen: {new Date(friend.lastSeen).toLocaleString()}</p>
              )}
            </div>
          </div>

          {/* Bio Section */}
          {friend.bio && (
            <div className="bg-white/5 rounded-lg p-4">
              <h4 className="font-medium text-white/90 mb-3">About</h4>
              <p className="text-sm text-white/70">{friend.bio}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handleRemove}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
          >
            Remove Friend
          </button>
        </div>
      </div>
    </div>
  );
};

// Action Button Component
const ActionButton = ({ onClick, variant, disabled, children, ...props }) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white',
    success: 'bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white',
    danger: 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white',
    warning: 'bg-yellow-600/20 text-yellow-300 cursor-default',
    secondary: 'bg-white/10 hover:bg-white/20 text-white'
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      disabled={disabled}
      className={`px-3 py-1 text-sm rounded transition-colors font-medium ${variants[variant]} ${disabled ? 'cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Main Friends Component
export default function Friends() {
  // State Management
  const [activeTab, setActiveTab] = useState(TABS.FRIENDS);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Hooks
  const { success, error } = useToast();

  // Data Loading Functions
  const loadFriends = useCallback(async () => {
    try {
      const response = await friendsAPI.getFriends();
      setFriends(response.data.friends || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
      error('Failed to load friends');
    }
  }, [error]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const response = await friendsAPI.getFriendRequests();
      setFriendRequests(response.data || { incoming: [], outgoing: [] });
    } catch (err) {
      console.error('Failed to load friend requests:', err);
      error('Failed to load friend requests');
    }
  }, [error]);

  const searchUsers = useCallback(async (username) => {
    if (!username || username.length < SEARCH_MIN_LENGTH) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await usersAPI.searchUsers(username);
      setSearchResults(response.data.users || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([]);
    }
  }, []);

  // Action Functions
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId !== TABS.ADD) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, []);

  const handleFriendClick = useCallback((friend) => {
    setSelectedFriend(friend);
  }, []);

  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  }, [searchUsers]);

  const sendFriendRequest = useCallback(async (username) => {
    try {
      setLoading(true);
      await friendsAPI.sendFriendRequest(username);
      success(`Friend request sent to ${username}! 🚀`);
      setSearchQuery('');
      setSearchResults([]);
      await loadFriendRequests();
    } catch (err) {
      error(err.response?.data?.error || 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  }, [success, error, loadFriendRequests]);

  const respondToRequest = useCallback(async (requestId, accept) => {
    try {
      setLoading(true);
      await friendsAPI.respondToRequest(requestId, accept);
      success(accept ? 'Friend request accepted! 🎉' : 'Friend request declined');
      await Promise.all([loadFriends(), loadFriendRequests()]);
    } catch (err) {
      error(err.response?.data?.error || 'Failed to respond to request');
    } finally {
      setLoading(false);
    }
  }, [success, error, loadFriends, loadFriendRequests]);

  const removeFriend = useCallback(async (friendshipId, friendName) => {
    if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) {
      return;
    }

    try {
      setLoading(true);
      await friendsAPI.removeFriend(friendshipId);
      success(`${friendName} removed from friends`);
      await loadFriends();
    } catch (err) {
      error(err.response?.data?.error || 'Failed to remove friend');
    } finally {
      setLoading(false);
    }
  }, [success, error, loadFriends]);

  // Initial Data Loading
  useEffect(() => {
    const loadInitialData = async () => {
      setInitialLoading(true);
      await Promise.all([loadFriends(), loadFriendRequests()]);
      setInitialLoading(false);
    };
    
    loadInitialData();
  }, [loadFriends, loadFriendRequests]);

  // Render Functions
  const renderFriendsList = () => {
    if (initialLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (friends.length === 0) {
      return (
        <EmptyState
          icon="👥"
          title="No friends yet"
          description="Start building your social circle! Use the 'Add Friend' tab to search for users and send friend requests."
          action={() => setActiveTab(TABS.ADD)}
          actionText="Add Your First Friend"
        />
      );
    }

    return (
      <div className="space-y-3">
        {friends.map((friend) => (
          <UserCard
            key={`friend-${friend.id}`}
            user={friend}
            isClickable={true}
            onClick={handleFriendClick}
            actions={
              <ActionButton
                variant="danger"
                onClick={() => removeFriend(friend.friendshipId, friend.username)}
                disabled={loading}
              >
                Remove
              </ActionButton>
            }
          />
        ))}
      </div>
    );
  };

  const renderRequestsList = () => {
    const { incoming, outgoing } = friendRequests;

    return (
      <div className="space-y-8">
        {/* Incoming Requests */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Incoming Requests</h3>
          {incoming.length === 0 ? (
            <EmptyState
              icon="📬"
              title="No incoming requests"
              description="When someone sends you a friend request, it will appear here."
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {incoming.map((request) => (
                <UserCard
                  key={`incoming-${request.id}`}
                  user={request.requester}
                  actions={
                    <>
                      <ActionButton
                        variant="success"
                        onClick={() => respondToRequest(request.id, true)}
                        disabled={loading}
                      >
                        Accept
                      </ActionButton>
                      <ActionButton
                        variant="danger"
                        onClick={() => respondToRequest(request.id, false)}
                        disabled={loading}
                      >
                        Decline
                      </ActionButton>
                    </>
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Outgoing Requests */}
        <div>
          <h3 className="text-lg font-medium text-white mb-4">Outgoing Requests</h3>
          {outgoing.length === 0 ? (
            <EmptyState
              icon="📤"
              title="No pending requests"
              description="Friend requests you've sent will be displayed here while they're pending."
              className="py-8"
            />
          ) : (
            <div className="space-y-3">
              {outgoing.map((request) => (
                <UserCard
                  key={`outgoing-${request.id}`}
                  user={request.receiver}
                  actions={
                    <ActionButton variant="warning">
                      Pending
                    </ActionButton>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAddFriend = () => (
    <div className="space-y-6">
      {/* Search Input */}
      <div>
        <label htmlFor="search" className="block text-sm font-medium text-white mb-2">
          Search for users
        </label>
        <input
          type="text"
          id="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Enter username to search..."
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/60 transition-all"
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Search Results</h3>
          <div className="space-y-3">
            {searchResults.map((user) => (
              <UserCard
                key={`search-${user.id}`}
                user={user}
                actions={
                  <ActionButton
                    variant="primary"
                    onClick={() => sendFriendRequest(user.username)}
                    disabled={loading}
                  >
                    Add Friend
                  </ActionButton>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty States */}
      {searchQuery.length >= SEARCH_MIN_LENGTH && searchResults.length === 0 && (
        <EmptyState
          icon="🔍"
          title="No users found"
          description={`No users found matching "${searchQuery}". Try a different username or check the spelling.`}
          className="py-8"
        />
      )}

      {searchQuery.length === 0 && (
        <EmptyState
          icon="🔍"
          title="Search for friends"
          description={`Enter a username above to search for users and send friend requests. You need at least ${SEARCH_MIN_LENGTH} characters to start searching.`}
          className="py-12"
        />
      )}
    </div>
  );

  // Main Render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-white">Friends</h2>
        <div className="flex space-x-2">
          <TabButton
            id={TABS.FRIENDS}
            label="Friends"
            count={friends.length}
            isActive={activeTab === TABS.FRIENDS}
            onClick={handleTabChange}
          />
          <TabButton
            id={TABS.REQUESTS}
            label="Requests"
            count={friendRequests.incoming.length}
            isActive={activeTab === TABS.REQUESTS}
            onClick={handleTabChange}
          />
          <TabButton
            id={TABS.ADD}
            label="Add Friend"
            isActive={activeTab === TABS.ADD}
            onClick={handleTabChange}
          />
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === TABS.FRIENDS && renderFriendsList()}
        {activeTab === TABS.REQUESTS && renderRequestsList()}
        {activeTab === TABS.ADD && renderAddFriend()}
      </div>

      {/* Friend Profile Modal */}
      {selectedFriend && (
        <FriendProfileModal 
          friend={selectedFriend} 
          onClose={() => setSelectedFriend(null)}
          onRemove={removeFriend}
        />
      )}
    </div>
  );
}