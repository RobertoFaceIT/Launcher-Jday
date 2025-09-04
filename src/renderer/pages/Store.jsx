import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesAPI } from '../services/api';

export default function Store() {
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const [sortBy, setSortBy] = useState('rating');
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });
    
    // Refs for debouncing and request cancellation
    const searchTimeoutRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Available genres for filtering
    const genres = ['RPG', 'Survival', 'Adventure', 'Building', 'Action', 'Indie', 'Simulation', 'Strategy', 'Tower Defense', 'Cyberpunk'];

    // Main function to fetch games
    const fetchGames = async (page = 1, searchTerm = '', genre = '', sort = 'rating', isInitialLoad = false) => {
        try {
            // Cancel any existing request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            
            // Create new abort controller for this request
            abortControllerRef.current = new AbortController();
            
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setSearchLoading(true);
            }
            
            setError(null);
            
            const params = {
                page,
                limit: 12,
                sortBy: sort,
                sortOrder: 'desc'
            };

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (genre) {
                params.genre = genre;
            }

            const response = await gamesAPI.getAllGames(params);
            
            // Only update state if request wasn't cancelled
            if (!abortControllerRef.current?.signal.aborted) {
                setGames(response.data.games);
                setPagination(response.data.pagination);
            }
        } catch (err) {
            // Don't show error if request was cancelled
            if (err.name !== 'AbortError' && !abortControllerRef.current?.signal.aborted) {
                console.error('Error fetching games:', err);
                setError(searchTerm ? 'No games found matching your search.' : 'Failed to load games. Please try again.');
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setLoading(false);
                setSearchLoading(false);
            }
        }
    };

    // Debounced search function
    const performDebouncedSearch = (searchValue, genre, sort) => {
        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // Set new timeout
        searchTimeoutRef.current = setTimeout(() => {
            fetchGames(1, searchValue, genre, sort, false);
        }, 300);
    };

    // Handle search input changes
    const handleSearchChange = (value) => {
        setSearchInput(value);
        performDebouncedSearch(value, selectedGenre, sortBy);
    };

    // Handle genre changes
    const handleGenreChange = (genre) => {
        setSelectedGenre(genre);
        performDebouncedSearch(searchInput, genre, sortBy);
    };

    // Handle sort changes
    const handleSortChange = (sort) => {
        setSortBy(sort);
        performDebouncedSearch(searchInput, selectedGenre, sort);
    };

    useEffect(() => {
        // Initial load
        fetchGames(1, '', '', 'rating', true);
        
        // Cleanup function
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const handleGameClick = (gameId) => {
        navigate(`/game/${gameId}`);
    };

    const handlePageChange = (newPage) => {
        fetchGames(newPage, searchInput, selectedGenre, sortBy, false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (loading && games.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-lg">Loading games...</p>
                </div>
            </div>
        );
    }

    if (error && games.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="text-red-400 text-xl mb-4">⚠️ {error}</div>
                <button 
                    onClick={() => fetchGames(1, searchInput, selectedGenre, sortBy, true)}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white/5 rounded-lg p-6">
                <div className="grid md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search games..."
                                value={searchInput}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="w-full px-6 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"  style={{backgroundColor: 'black'}}
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/70">
                                {searchLoading ? (
                                    <div className="animate-spin h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full"></div>
                                ) : (
                                    '🔍'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Genre Filter */}
                    <select
                        value={selectedGenre}
                        onChange={(e) => handleGenreChange(e.target.value)}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" style={{backgroundColor: 'black'}}
                    >
                        <option value="">All Genres</option>
                        {genres.map(genre => (
                            <option key={genre} value={genre}>{genre}</option>
                        ))}
                    </select>

                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"  style={{backgroundColor: 'black'}}
                    >
                        <option value="rating">Best Rated</option>
                        <option value="price">Price: Low to High</option>
                        <option value="releaseDate">Newest First</option>
                        <option value="title">Alphabetical</option>
                        <option value="reviewCount">Most Popular</option>
                    </select>
                </div>
            </div>

            {/* Games Grid */}
            {games.length === 0 ? (
                <div className="text-center py-12">
                    {searchInput || selectedGenre ? (
                        <>
                            <p className="text-xl mb-4">No games found</p>
                            <p className="text-white/70 mb-4">
                                {searchInput && selectedGenre 
                                    ? `No games match "${searchInput}" in ${selectedGenre} genre`
                                    : searchInput 
                                        ? `No games match "${searchInput}"`
                                        : `No games found in ${selectedGenre} genre`
                                }
                            </p>
                            <button 
                                onClick={() => {
                                    setSearchInput('');
                                    setSelectedGenre('');
                                    fetchGames(1, '', '', sortBy, false);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                            >
                                Clear Filters
                            </button>
                        </>
                    ) : (
                        <>
                            <p className="text-xl mb-4">No games available</p>
                            <p className="text-white/70">Check back later for new games</p>
                        </>
                    )}
                </div>
            ) : (
                <>
                    <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-10">
                        {games.map((game) => (
                            <div 
                                key={game._id} 
                                className="group bg-neutral-800 border border-neutral-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-transform duration-200 cursor-pointer hover:-translate-y-1 h-[540px] flex flex-col"
                                onClick={() => handleGameClick(game._id)}
                            >
                                <div className="relative h-64 flex-shrink-0 border-b border-white/10">
                                    {game.image ? (
                                        <img 
                                            src={game.image} 
                                            alt={game.title} 
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'flex';
                                            }}
                                        />
                                    ) : null}
                                    <div 
                                        className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white/70"
                                        style={{ display: game.image ? 'none' : 'flex' }}
                                    >
                                        <div className="text-center">
                                            <div className="text-5xl mb-2">🎮</div>
                                            <div className="text-sm">Game Image</div>
                                        </div>
                                    </div>
                                    {/* Top badges */}
                                    <div className="absolute top-3 left-3 bg-black backdrop-blur px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                                        ⭐ {game.rating.toFixed(1)}
                                    </div>
                                    {game.discount > 0 && (
                                        <div className="absolute top-3 right-3 bg-green-600 text-white text-xs px-2 py-1 rounded">
                                            -{game.discount}%
                                        </div>
                                    )}
                                    {/* Subtle gradient for polish */}
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                                </div>
                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    {/* Title prominently at top of content */}
                                    <h2 className="text-lg font-bold tracking-wide text-white line-clamp-1">{game.title}</h2>
                                    <p className="text-sm text-white/70 line-clamp-3 h-[66px]">{game.description}</p>
                                    {/* Divider */}
                                    <div className="border-t border-white/10" />
                                    {/* Genre Tags */}
                                    <div className="flex flex-wrap gap-2 h-[32px] overflow-hidden">
                                        {game.genre.slice(0, 3).map((genre, index) => (
                                            <span 
                                                key={index}
                                                className="text-xs bg-white/10 border border-white/10 px-2 py-1 rounded-full"
                                            >
                                                {genre}
                                            </span>
                                        ))}
                                        {game.genre.length > 3 && (
                                            <span className="text-xs text-white/50">
                                                +{game.genre.length - 3} more
                                            </span>
                                        )}
                                    </div>
                                    {/* Divider */}
                                    <div className="border-t border-white/10" />
                                    {/* Price + CTA */}
                                    <div className="mt-auto flex items-center justify-between">
                                        <div>
                                            {game.discount > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white/60 line-through text-sm" style={{ textDecoration: 'line-through' }}>
                                                        ${game.originalPrice.toFixed(2)}
                                                    </span>
                                                    <span className="text-green-400 font-bold">
                                                        ${game.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-white font-bold">
                                                    ${game.price.toFixed(2)}
                                                </span>
                                            )}
                                        </div>
                                        <button 
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors border border-white/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleGameClick(game._id);
                                            }}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="flex justify-center items-center gap-2 mt-8">
                            <button
                                onClick={() => handlePageChange(pagination.page - 1)}
                                disabled={pagination.page === 1}
                                className="px-4 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                            >
                                Previous
                            </button>
                            
                            <div className="flex gap-1">
                                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                    const page = i + 1;
                                    return (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`px-3 py-2 rounded-lg transition-colors ${
                                                page === pagination.page 
                                                    ? 'bg-blue-600 text-white' 
                                                    : 'bg-white/10 hover:bg-white/20'
                                            }`}
                                        >
                                            {page}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => handlePageChange(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                                className="px-4 py-2 bg-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/20 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Loading overlay for pagination */}
            {loading && games.length > 0 && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-neutral-800 rounded-lg p-6">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p>Loading...</p>
                    </div>
                </div>
            )}
        </div>
    );
  }
  