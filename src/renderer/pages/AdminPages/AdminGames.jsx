import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AdminGames = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameForm, setGameForm] = useState({
    title: '',
    description: '',
    image: '',
    screenshots: ['', '', '', ''],
    price: '',
    originalPrice: '',
    discount: 0,
    features: [''],
    developer: '',
    publisher: '',
    releaseDate: '',
    genre: [''],
    downloadLink: '',
    platform: 'Windows',
    isActive: true,
    systemRequirements: {
      minimum: {
        os: 'Windows 10',
        processor: 'Intel Core i3',
        memory: '4 GB RAM',
        graphics: 'DirectX 11 compatible',
        storage: '5 GB available space'
      },
      recommended: {
        os: 'Windows 11',
        processor: 'Intel Core i5',
        memory: '8 GB RAM',
        graphics: 'DirectX 12 compatible',
        storage: '10 GB available space'
      }
    }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalGames: 0
  });
  const { showToast } = useToast();

  const fetchGames = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (search) params.append('search', search);

      const response = await api.get(`/admin/games?${params}`);
      setGames(response.data.games);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch games:', error);
      showToast('Failed to load games', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const resetForm = () => {
    setGameForm({
      title: '',
      description: '',
      image: '',
      screenshots: ['', '', '', ''],
      price: '',
      originalPrice: '',
      discount: 0,
      features: [''],
      developer: '',
      publisher: '',
      releaseDate: '',
      genre: [''],
      downloadLink: '',
      platform: 'Windows',
      isActive: true,
      systemRequirements: {
        minimum: {
          os: 'Windows 10',
          processor: 'Intel Core i3',
          memory: '4 GB RAM',
          graphics: 'DirectX 11 compatible',
          storage: '5 GB available space'
        },
        recommended: {
          os: 'Windows 11',
          processor: 'Intel Core i5',
          memory: '8 GB RAM',
          graphics: 'DirectX 12 compatible',
          storage: '10 GB available space'
        }
      }
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGames(1, searchTerm);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page) => {
    fetchGames(page, searchTerm);
  };

  const handleEditGame = (game) => {
    navigate(`/admin/games/edit/${game._id}`, { state: { game } });
  };

  const handleUpdateGame = async (e) => {
    e.preventDefault();
    try {
      const gameData = {
        ...gameForm,
        price: parseFloat(gameForm.price) || 0,
        originalPrice: parseFloat(gameForm.originalPrice) || parseFloat(gameForm.price) || 0,
        discount: parseFloat(gameForm.discount) || 0,
        screenshots: gameForm.screenshots.filter(url => url.trim()),
        features: gameForm.features.filter(feature => feature.trim()),
        genre: gameForm.genre.filter(g => g.trim())
      };

      await api.put(`/admin/games/${selectedGame._id}`, gameData);
      showToast('Game updated successfully', 'success');
      setShowEditModal(false);
      fetchGames(pagination.currentPage, searchTerm);
    } catch (error) {
      console.error('Failed to update game:', error);
      showToast(error.response?.data?.error || 'Failed to update game', 'error');
    }
  };

  const handleToggleFeatured = async (game) => {
    try {
      const isFeatured = game.rating >= 4.5;
      await api.patch(`/admin/games/${game._id}/visibility`, { featured: !isFeatured });
      // Optimistic UI update so button/badge reflect immediately
      setGames(prev => prev.map(g => 
        g._id === game._id 
          ? { ...g, rating: !isFeatured ? 4.5 : 3.0 }
          : g
      ));
      showToast(`Game ${!isFeatured ? 'featured' : 'unfeatured'} successfully`, 'success');
      // Refresh in background to ensure state is in sync with server
      fetchGames(pagination.currentPage, searchTerm);
    } catch (error) {
      console.error('Failed to toggle featured status:', error);
      showToast('Failed to update game status', 'error');
    }
  };

  const handleDeleteGame = async () => {
    try {
      await api.delete(`/admin/games/${selectedGame._id}`);
      showToast('Game deleted successfully', 'success');
      setShowDeleteModal(false);
      fetchGames(pagination.currentPage, searchTerm);
    } catch (error) {
      console.error('Failed to delete game:', error);
      showToast(error.response?.data?.error || 'Failed to delete game', 'error');
    }
  };

  if (loading && games.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading games...</p>
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
            <h1 className="text-3xl font-bold text-white mb-2">Game Management</h1>
            <p className="text-white/70">Manage games in the store</p>
          </div>
          <Link
            to="/admin/games/add"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-block"
          >
            Add New Game
          </Link>
        </div>

        {/* Search */}
        <div className="bg-neutral-800 rounded-lg p-6 border border-neutral-700 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-white/70 text-sm font-medium mb-2">Search Games</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, developer, or publisher..."
                className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white placeholder-white/50 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Search
            </button>
          </form>
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-8">
          {games.map((game) => (
            <div key={game._id} className="bg-neutral-800 rounded-lg border border-neutral-700 overflow-hidden h-[540px] flex flex-col">
              <div className="h-56 bg-neutral-700 relative flex-shrink-0">
                {game.image || game.coverImage ? (
                  <img 
                    src={game.image || game.coverImage} 
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/50">
                    <div className="text-4xl">🎮</div>
                  </div>
                )}
                {game.rating >= 4.5 && (
                  <div className="absolute top-2 right-4 bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold">
                    FEATURED
                  </div>
                )}
              </div>
              <div className="p-5 flex-1 flex flex-col gap-2">
                <h3 className="text-white font-semibold truncate text-base h-[28px]">{game.title}</h3>
                <p className="text-white/70 text-sm line-clamp-3 h-[66px]">{game.description}</p>
                <div className="flex items-center justify-between h-[28px]">
                  <span className="text-green-400 font-bold">
                    ${game.price?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-white/50 text-sm line-clamp-1">{Array.isArray(game.genre) ? game.genre.join(', ') : game.genre}</span>
                </div>
                <div className="text-white/50 text-xs space-y-1 h-[40px]">
                  <div className="truncate">Developer: {game.developer}</div>
                  <div className="truncate">Publisher: {game.publisher}</div>
                </div>
                <div className="flex gap-3 mt-auto h-[40px]">
                  <button
                    onClick={() => handleEditGame(game)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleFeatured(game)}
                    className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                      game.rating >= 4.5
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {game.rating >= 4.5 ? 'Unfeature' : 'Feature'}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedGame(game);
                      setShowDeleteModal(true);
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <div className="text-white/70 text-sm">
              Page {pagination.currentPage} of {pagination.totalPages} • {pagination.totalGames} total games
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

      {/* Delete Game Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-800 rounded-lg p-6 w-full max-w-md border border-neutral-700">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Game</h3>
            <p className="text-white/70 mb-6">
              Are you sure you want to delete <strong>{selectedGame?.title}</strong>? 
              This action cannot be undone and will remove the game from all user libraries.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGame}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors"
              >
                Delete Game
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGames;