import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    role: 'user'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0
  });
  const { showToast } = useToast();

  const fetchUsers = async (page = 1, search = '', status = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const response = await api.get(`/admin/users?${params}`);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers(1, searchTerm, statusFilter);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    fetchUsers(page, searchTerm, statusFilter);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${selectedUser._id}`, editForm);
      showToast('User updated successfully', 'success');
      setShowEditModal(false);
      fetchUsers(pagination.currentPage, searchTerm, statusFilter);
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast(error.response?.data?.error || 'Failed to update user', 'error');
    }
  };

  const handleBanUser = async (user) => {
    try {
      const action = user.isOnline ? 'ban' : 'unban';
      await api.patch(`/admin/users/${user._id}/ban`, { banned: user.isOnline });
      showToast(`User ${action}ned successfully`, 'success');
      fetchUsers(pagination.currentPage, searchTerm, statusFilter);
    } catch (error) {
      console.error('Failed to ban/unban user:', error);
      showToast(error.response?.data?.error || 'Failed to update user status', 'error');
    }
  };

  const handleDeleteUser = async () => {
    try {
      await api.delete(`/admin/users/${selectedUser._id}`);
      showToast('User deleted successfully', 'success');
      setShowDeleteModal(false);
      fetchUsers(pagination.currentPage, searchTerm, statusFilter);
    } catch (error) {
      console.error('Failed to delete user:', error);
      showToast(error.response?.data?.error || 'Failed to delete user', 'error');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link to="/admin" className="text-blue-400 hover:text-blue-300 text-sm mb-2 block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-white/70">Manage user accounts and permissions</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-white/70 text-sm font-medium mb-2">Search Users</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username or email..."
                className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-white/70 text-sm font-medium mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Users</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Users Table */}
        <div className="bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-750 border-b border-neutral-700">
                <tr>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">User</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Email</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Role</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Last Seen</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} className="border-b border-neutral-700 hover:bg-neutral-750">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.username}</div>
                          <div className="text-white/50 text-sm">ID: {user._id.slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-white/70">{user.email}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`flex items-center gap-2 ${
                        user.isOnline ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          user.isOnline ? 'bg-green-400' : 'bg-gray-400'
                        }`}></div>
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-white/70 text-sm">
                      {new Date(user.lastSeen).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleBanUser(user)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            user.isOnline
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {user.isOnline ? 'Ban' : 'Unban'}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteModal(true);
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-4 px-6 border-t border-neutral-700">
              <div className="text-white/70 text-sm">
                Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalUsers} total users
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Edit User</h3>
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Delete User</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete <strong>{selectedUser?.username}</strong>? 
              This action cannot be undone and will remove all associated data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;