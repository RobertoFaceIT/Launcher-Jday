
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { usersAPI } from '../services/api';

export default function Library() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    usersAPI.getLibrary()
      .then(res => {
        setLibrary(res.data.library || []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load library');
        setLoading(false);
      });
  }, []);

  // Categorize games by status
  const installedGames = library.filter(g => g.status === 'installed');
  const notInstalledGames = library.filter(g => g.status === 'not_installed');
  const installingGames = library.filter(g => g.status === 'installing');
  const needUpdateGames = library.filter(g => g.status === 'need_update');


  // Action handlers
  const refreshLibrary = () => {
    setLoading(true);
    usersAPI.getLibrary()
      .then(res => {
        setLibrary(res.data.library || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const launch = (game) => {
    if (game?.game?.downloadLink) {
      window.electronAPI?.launchGame?.(game.game.downloadLink);
    }
  };

  const handleInstall = async (entry) => {
    await usersAPI.updateLibraryGame(entry.game._id, { status: 'installing', installProgress: 0 });
    refreshLibrary();
  };

  const handleUninstall = async (entry) => {
    await usersAPI.updateLibraryGame(entry.game._id, { status: 'not_installed', installProgress: 0 });
    refreshLibrary();
  };

  const handleRemove = async (entry) => {
    await usersAPI.removeFromLibrary(entry.game._id);
    refreshLibrary();
  };

  const handlePause = async (entry) => {
    await usersAPI.updateLibraryGame(entry.game._id, { status: 'not_installed' });
    refreshLibrary();
  };

  const handleCancel = async (entry) => {
    await usersAPI.updateLibraryGame(entry.game._id, { status: 'not_installed', installProgress: 0 });
    refreshLibrary();
  };

  const handleUpdate = async (entry) => {
    await usersAPI.updateLibraryGame(entry.game._id, { status: 'installing', installProgress: 0 });
    refreshLibrary();
  };

  if (loading) return <div className="text-center py-12 text-white/60">Loading library...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  const isEmpty = library.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Library</h2>
        <div className="text-sm text-white/60">
          {installedGames.length} installed • {notInstalledGames.length} not installed • {installingGames.length} installing • {needUpdateGames.length} need update
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          icon="🎮"
          title="Your library is empty"
          description="Browse the store to discover and install amazing games to build your personal collection."
          action={() => navigate('/')}
          actionText="Browse Store"
        />
      ) : (
        <div className="space-y-6">
          {/* Installed Games */}
          {installedGames.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-green-400">
                🟢 Installed Games ({installedGames.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installedGames.map(entry => (
                  <div key={entry.game._id} className="rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{entry.game.title}</div>
                        <div className="text-sm text-green-400 mt-1">
                          ✅ Ready to play
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => launch(entry)}
                          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 font-medium transition-colors"
                        >
                          🚀 Launch
                        </button>
                        <button
                          onClick={() => handleUninstall(entry)}
                          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm transition-colors"
                        >
                          Uninstall
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Installing Games */}
          {installingGames.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-blue-400">
                ⏳ Installing ({installingGames.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installingGames.map(entry => (
                  <div key={entry.game._id} className="rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{entry.game.title}</div>
                        <div className="text-sm text-blue-400 mt-1">
                          {entry.installProgress ? `Installing... ${entry.installProgress}%` : 'Installing...'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="p-2 rounded-lg bg-gray-700 hover:bg-gray-800 transition-colors"
                          title="Pause"
                          onClick={() => handlePause(entry)}
                        >
                          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><rect x="4" y="4" width="4" height="12" rx="1" fill="white"/><rect x="12" y="4" width="4" height="12" rx="1" fill="white"/></svg>
                        </button>
                        <button
                          className="p-2 rounded-lg bg-red-700 hover:bg-red-800 transition-colors"
                          title="Cancel"
                          onClick={() => handleCancel(entry)}
                        >
                          <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M6 6l8 8M6 14L14 6" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Need Update Games */}
          {needUpdateGames.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-orange-400">
                🛠️ Need Update ({needUpdateGames.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needUpdateGames.map(entry => (
                  <div key={entry.game._id} className="rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{entry.game.title}</div>
                        <div className="text-sm text-orange-400 mt-1">
                          🛠️ Update required
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 font-medium transition-colors"
                          onClick={() => handleUpdate(entry)}
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Installed Games */}
          {notInstalledGames.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-4 text-yellow-400">
                ⏳ Not Installed ({notInstalledGames.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notInstalledGames.map(entry => (
                  <div key={entry.game._id} className="rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{entry.game.title}</div>
                        <div className="text-sm text-yellow-400 mt-1">
                          ⏳ Not installed
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-medium transition-colors"
                          onClick={() => handleInstall(entry)}
                        >
                          📥 Install
                        </button>
                        <button
                          className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-sm transition-colors"
                          onClick={() => handleRemove(entry)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for no installed games */}
          {installedGames.length === 0 && notInstalledGames.length > 0 && (
            <div className="mt-8">
              <EmptyState
                icon="⏳"
                title="No games installed yet"
                description="You have games in your library but they're not installed. Install them to start playing!"
                className="py-8"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
  