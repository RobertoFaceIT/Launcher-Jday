import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminFriendRequests = () => {
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRequests: 0
  });
  const { showToast } = useToast();

  const fetchFriendRequests = async (page = 1, status = 'pending') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status
      });

      const response = await api.get(`/admin/friend-requests?${params}`);
      setFriendRequests(response.data.friendRequests);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch friend requests:', error);
      showToast('Failed to load friend requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    fetchFriendRequests(1, status);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    fetchFriendRequests(page, statusFilter);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'accepted':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'declined':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading && friendRequests.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading friend requests...</p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Friend Requests</h1>
            <p className="text-white/70">Monitor friend connections</p>
          </div>
        </div>

        {/* Status Filter */}
        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 mb-6">
          <div className="flex gap-4">
            <label className="block text-white/70 text-sm font-medium mb-2">Filter by Status</label>
            <div className="flex gap-2">
              {['pending', 'accepted', 'declined'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-700 text-white/70 hover:bg-neutral-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Friend Requests Table */}
        <div className="bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-750 border-b border-neutral-700">
                <tr>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Requester</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Recipient</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Date</th>
                  <th className="text-left py-4 px-6 text-white/70 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody>
                {friendRequests.map((request) => (
                  <tr key={request._id} className="border-b border-neutral-700 hover:bg-neutral-750">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                          {request.requester?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {request.requester?.username || 'Unknown User'}
                          </div>
                          <div className="text-white/50 text-sm">
                            {request.requester?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mr-3">
                          {request.recipient?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {request.recipient?.username || 'Unknown User'}
                          </div>
                          <div className="text-white/50 text-sm">
                            {request.recipient?.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-white/70 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-white/70 text-sm">
                      {new Date(request.updatedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {friendRequests.length === 0 && !loading && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👫</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Friend Requests</h3>
              <p className="text-white/70">
                No {statusFilter} friend requests found.
              </p>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between py-4 px-6 border-t border-neutral-700">
              <div className="text-white/70 text-sm">
                Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalRequests} total requests
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
    </div>
  );
};

export default AdminFriendRequests;