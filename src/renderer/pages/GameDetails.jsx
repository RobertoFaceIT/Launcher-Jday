import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { gamesAPI, usersAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function GameDetails() {
  const { success } = useToast();
  const { gameId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await gamesAPI.getGameById(gameId);
        setGame(response.data);
      } catch (err) {
        console.error('Error fetching game:', err);
        if (err.response?.status === 404) {
          setError('Game not found');
        } else {
          setError('Failed to load game details');
        }
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGame();
    }
  }, [gameId]);

  const handleBuyNow = () => {
    // In a real app, this would handle the purchase flow
    alert(`Purchasing ${game.title} for $${game.price.toFixed(2)}`);
  };


  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [inLibrary, setInLibrary] = useState(false);

  // Check if game is in library
  useEffect(() => {
    if (!game?._id) return;
    usersAPI.getLibrary().then(res => {
      const found = (res.data.library || []).some(entry => entry.game && entry.game._id === game._id);
      setInLibrary(found);
    });
  }, [game?._id]);

  const handleAddToLibrary = async () => {
    if (!game?._id) return;
    setAdding(true);
    try {
      await usersAPI.addToLibrary(game._id);
      setInLibrary(true);
      success && success('Game added to your library!');
    } catch (err) {
      alert('Failed to add to library.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromLibrary = async () => {
    if (!game?._id) return;
    setRemoving(true);
    try {
      await usersAPI.removeFromLibrary(game._id);
      setInLibrary(false);
      success && success('Game removed from your library.');
    } catch (err) {
      alert('Failed to remove from library.');
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <div className="text-lg">Loading game details...</div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">
          {error === 'Game not found' ? 'Game Not Found' : 'Error Loading Game'}
        </h2>
        <p className="text-white/70 mb-6">
          {error === 'Game not found' 
            ? "The game you're looking for doesn't exist." 
            : error || "Something went wrong while loading the game details."
          }
        </p>
        <div className="space-x-4">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Back to Store
          </button>
          {error !== 'Game not found' && (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/')}
        className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Store
      </button>

      {/* Main Game Info */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        {/* Game Image */}
        <div className="lg:col-span-2">
          {game.image ? (
            <img
              src={game.image}
              alt={game.title}
              className="w-full rounded-lg shadow-lg"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          <div 
            className="w-full h-96 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow-lg flex items-center justify-center text-white/70"
            style={{ display: game.image ? 'none' : 'flex' }}
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🎮</div>
              <div className="text-xl">Game Cover</div>
            </div>
          </div>
        </div>

        {/* Purchase Section */}
        <div className="bg-white/5 rounded-lg p-6">
          <h1 className="text-3xl font-bold mb-2">{game.title}</h1>
          <p className="text-white/70 mb-4">{game.description}</p>
          
          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${i < Math.floor(game.rating) ? 'text-yellow-400' : 'text-gray-600'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-white/70">
              {game.rating}/5 ({game.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="mb-6">
            {game.discount > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-green-600 text-white text-sm px-2 py-1 rounded">
                    -{game.discount}%
                  </span>
                  <span className="text-white/70 line-through text-lg">
                    ${game.originalPrice.toFixed(2)}
                  </span>
                </div>
                <div className="text-3xl font-bold text-green-400">
                  ${game.price.toFixed(2)}
                </div>
              </div>
            ) : (
              <div className="text-3xl font-bold">${game.price.toFixed(2)}</div>
            )}
          </div>

          {/* Purchase Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleBuyNow}
              className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors"
            >
              Buy Now
            </button>
            {inLibrary ? (
              <button
                onClick={handleRemoveFromLibrary}
                className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors border border-white/20 disabled:opacity-60"
                disabled={removing}
              >
                {removing ? 'Removing...' : 'Remove from Library'}
              </button>
            ) : (
              <button
                onClick={handleAddToLibrary}
                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-colors border border-white/20 disabled:opacity-60"
                disabled={adding}
              >
                {adding ? 'Adding...' : 'Add to Library'}
              </button>
            )}
          </div>

          {/* Game Info */}
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-white/70">Developer:</span>
              <span>{game.developer}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Publisher:</span>
              <span>{game.publisher}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Release Date:</span>
              <span>{new Date(game.releaseDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/70">Genres:</span>
              <span>{game.genre.join(', ')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Screenshots */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Screenshots</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {game.screenshots && game.screenshots.length > 0 ? (
            game.screenshots.map((screenshot, index) => (
              <div key={index} className="relative">
                {screenshot ? (
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div 
                  className="w-full h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow flex items-center justify-center text-white/50"
                  style={{ display: screenshot ? 'none' : 'flex' }}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">📷</div>
                    <div className="text-xs">Screenshot {index + 1}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            // Default placeholders if no screenshots
            [...Array(4)].map((_, index) => (
              <div key={index} className="w-full h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg shadow flex items-center justify-center text-white/50">
                <div className="text-center">
                  <div className="text-2xl mb-1">📷</div>
                  <div className="text-xs">Screenshot {index + 1}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Features */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Key Features</h2>
        <div className="grid md:grid-cols-2 gap-2">
          {game.features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* System Requirements */}
      <div>
        <h2 className="text-2xl font-bold mb-4">System Requirements</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-yellow-400">Minimum</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-white/70">OS:</span> {game.systemRequirements.minimum.os}</div>
              <div><span className="text-white/70">Processor:</span> {game.systemRequirements.minimum.processor}</div>
              <div><span className="text-white/70">Memory:</span> {game.systemRequirements.minimum.memory}</div>
              <div><span className="text-white/70">Graphics:</span> {game.systemRequirements.minimum.graphics}</div>
              <div><span className="text-white/70">Storage:</span> {game.systemRequirements.minimum.storage}</div>
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-green-400">Recommended</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-white/70">OS:</span> {game.systemRequirements.recommended.os}</div>
              <div><span className="text-white/70">Processor:</span> {game.systemRequirements.recommended.processor}</div>
              <div><span className="text-white/70">Memory:</span> {game.systemRequirements.recommended.memory}</div>
              <div><span className="text-white/70">Graphics:</span> {game.systemRequirements.recommended.graphics}</div>
              <div><span className="text-white/70">Storage:</span> {game.systemRequirements.recommended.storage}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}