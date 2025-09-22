
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import { usersAPI, gamesAPI } from '../services/api';

export default function Library() {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [installedGamesStatus, setInstalledGamesStatus] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    usersAPI.getLibrary()
      .then(res => {
        console.log('📚 Library data received:', res.data);
        console.log('📚 Library games count:', res.data.library?.length || 0);
        
        // Log each game entry to see its status
        res.data.library?.forEach((entry, index) => {
          console.log(`📚 Game ${index}:`, {
            id: entry.game?._id,
            title: entry.game?.title,
            status: entry.status,
            installProgress: entry.installProgress,
            addedAt: entry.addedAt
          });
        });
        
        setLibrary(res.data.library || []);
        setLoading(false);
        
        // Check installation status for each game
        checkAllGamesInstallation(res.data.library || []);
      })
      .catch(err => {
        console.error('❌ Failed to load library:', err);
        setError('Failed to load library');
        setLoading(false);
      });

    // Set up download progress listener
    const handleProgress = (data) => {
      setDownloadProgress(prev => ({
        ...prev,
        [data.gameId]: data
      }));
    };

    if (window.electronAPI?.onDownloadProgress) {
      window.electronAPI.onDownloadProgress(handleProgress);
    }

    return () => {
      if (window.electronAPI?.removeDownloadProgressListener) {
        window.electronAPI.removeDownloadProgressListener(handleProgress);
      }
    };
  }, []);

  // Check installation status for all games
  const checkAllGamesInstallation = async (gamesList) => {
    const statusMap = {};
    
    for (const entry of gamesList) {
      if (entry.game?.gameFileName) {
        try {
          const status = await window.electronAPI?.checkGameInstalled?.(entry.game.gameFileName);
          statusMap[entry.game._id] = status;
        } catch (error) {
          console.error('Error checking game installation:', error);
          statusMap[entry.game._id] = { installed: false };
        }
      }
    }
    
    setInstalledGamesStatus(statusMap);
  };

  // Categorize games by status (prioritize backend status)
  const getGameStatus = (entry) => {
    const gameId = entry.game._id;
    const progressData = downloadProgress[gameId];
    const localInstallStatus = installedGamesStatus[gameId];
    
    // Check if currently downloading
    if (progressData && progressData.progress < 100) {
      return 'installing';
    }
    
    // Prioritize backend status from library entry
    if (entry.status) {
      switch(entry.status) {
        case 'installed':
          return 'installed';
        case 'installing':
          return 'installing';
        case 'not_installed':
        default:
          return 'not_installed';
      }
    }
    
    // Fallback to local status (for backward compatibility)
    if (localInstallStatus?.installed) {
      return 'installed';
    }
    
    return 'not_installed';
  };

  const installedGames = library.filter(g => getGameStatus(g) === 'installed');
  const notInstalledGames = library.filter(g => getGameStatus(g) === 'not_installed');
  const installingGames = library.filter(g => getGameStatus(g) === 'installing');


  // Action handlers
  const refreshLibrary = () => {
    setLoading(true);
    usersAPI.getLibrary()
      .then(res => {
        setLibrary(res.data.library || []);
        setLoading(false);
        checkAllGamesInstallation(res.data.library || []);
      })
      .catch(() => setLoading(false));
  };

  const launch = async (entry) => {
    try {
      const game = entry.game;
      const installStatus = installedGamesStatus[game._id];
      
      if (installStatus?.installed && game.gameFileName) {
        // Launch from app library
        const result = await window.electronAPI?.launchGame?.({
          fileName: game.gameFileName,
          gameId: game._id
        });
        
        if (result?.success) {
          console.log('Game launched successfully:', result.message);
        } else {
          console.error('Launch failed:', result?.error);
        }
      } else if (game?.downloadLink) {
        // Fallback to external download link
        window.open(game.downloadLink, '_blank');
      } else {
        console.error('Game not installed and no download link available');
      }
    } catch (error) {
      console.error('Launch error:', error);
    }
  };

  const handleInstall = async (entry) => {
    try {
      const game = entry.game;
      console.log('Installing game:', game.title);
      console.log('Game data:', game);
      
      // Check if game is already installed
      const currentStatus = getGameStatus(entry);
      if (currentStatus === 'installed') {
        alert('This game is already installed!');
        return;
      }
      
      if (currentStatus === 'installing') {
        alert('This game is currently being installed!');
        return;
      }
      
      // Check if game has a file to download
      if (!game.gameFilePath || !game.gameFileName) {
        if (game.downloadLink) {
          console.log('Using external download link:', game.downloadLink);
          window.open(game.downloadLink, '_blank');
          return;
        } else {
          throw new Error('No download source available for this game');
        }
      }

      // Get authentication token
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Starting app library download...');
      
      // For debugging: Test direct download from backend first
      try {
        console.log('Testing direct download from backend...');
        const testResponse = await fetch(`http://192.168.22.161:3000/api/uploads/download-game/${game._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Direct download test response:', {
          status: testResponse.status,
          statusText: testResponse.statusText,
          headers: Object.fromEntries(testResponse.headers.entries())
        });
        
        if (!testResponse.ok) {
          const errorText = await testResponse.text();
          console.error('Direct download failed:', errorText);
          throw new Error(`Direct download failed: ${testResponse.status} - ${errorText}`);
        }
        console.log('✅ Direct download test successful!');
      } catch (directError) {
        console.error('❌ Direct download test failed:', directError);
        throw directError;
      }
      
      // Test IPC connection first
      console.log('🔗 Testing IPC connection...');
      try {
        const testResult = await window.electronAPI?.testIPC?.();
        console.log('✅ Simple IPC test result:', testResult);
        
        const pathsTest = await window.electronAPI?.getAppPaths?.();
        console.log('✅ IPC getAppPaths result:', pathsTest);
      } catch (ipcError) {
        console.error('❌ IPC connection failed:', ipcError);
        throw new Error('IPC connection failed');
      }
      
      // Check if running in Electron mode
      if (window.electronAPI && typeof window.electronAPI.downloadGameToLibrary === 'function') {
        console.log('🚀 Using Electron download mode...');
        
        try {
          const result = await window.electronAPI.downloadGameToLibrary({
            gameId: game._id,
            fileName: game.gameFileName,
            token: token
          });

          console.log('Download result:', result);

          if (result?.success) {
            console.log('✅ Electron download completed:', result.message);
            
            // Mark as installed in backend
            try {
              console.log('📡 Marking game as installed in backend...', {
                gameId: game._id,
                filePath: result.filePath,
                fileSize: game.gameFileSize || 0
              });
              
              const markResponse = await gamesAPI.markGameInstalled(game._id, {
                filePath: result.filePath,
                fileSize: game.gameFileSize || 0
              });
              
              console.log('✅ Backend response:', markResponse.data);
              console.log('✅ Game marked as installed in backend');
            } catch (backendError) {
              console.error('⚠️ Failed to mark game as installed in backend:', backendError);
              console.error('⚠️ Backend error details:', {
                status: backendError.response?.status,
                statusText: backendError.response?.statusText,
                data: backendError.response?.data,
                message: backendError.message
              });
              // Don't fail the whole process if backend update fails
            }
            
            // Update local installation status
            setInstalledGamesStatus(prev => ({
              ...prev,
              [game._id]: { 
                installed: true, 
                filePath: result.filePath,
                fileSize: game.gameFileSize || 0,
                installDate: new Date()
              }
            }));
            
            // Clear download progress
            setDownloadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[game._id];
              return newProgress;
            });
            
            // Refresh library to get updated status
            refreshLibrary();
            
          } else {
            throw new Error(result?.error || 'Electron download failed');
          }
        } catch (electronError) {
          console.error('❌ Electron download error:', electronError);
          throw electronError;
        }
        
      } else {
        console.log('🌐 Electron not available, using browser download...');
        
        // Fallback: Browser download with link
        try {
          const downloadUrl = `http://192.168.22.161:3000/api/uploads/download-game/${game._id}`;
          
          // Create download link
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = game.gameFileName || `${game.title}.zip`;
          link.style.display = 'none';
          
          // Add authorization header by creating a new request
          const response = await fetch(downloadUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (!response.ok) {
            throw new Error(`Download failed: ${response.status}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          link.href = url;
          
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          console.log('✅ Browser download initiated');
          
          // Mark as installed in backend
          try {
            console.log('📡 Marking browser download as installed in backend...', {
              gameId: game._id,
              filePath: 'Downloaded to browser downloads folder',
              fileSize: game.gameFileSize || 0
            });
            
            const markResponse = await gamesAPI.markGameInstalled(game._id, {
              filePath: 'Downloaded to browser downloads folder',
              fileSize: game.gameFileSize || 0
            });
            
            console.log('✅ Backend response:', markResponse.data);
            console.log('✅ Game marked as installed in backend');
          } catch (backendError) {
            console.error('⚠️ Failed to mark game as installed in backend:', backendError);
            console.error('⚠️ Backend error details:', {
              status: backendError.response?.status,
              statusText: backendError.response?.statusText,
              data: backendError.response?.data,
              message: backendError.message
            });
          }
          
          // Update local installation status
          setInstalledGamesStatus(prev => ({
            ...prev,
            [game._id]: { 
              installed: true, 
              filePath: 'Downloaded to browser downloads folder',
              fileSize: game.gameFileSize || 0,
              installDate: new Date()
            }
          }));
          
          // Refresh library to get updated status
          refreshLibrary();
          
        } catch (browserError) {
          console.error('❌ Browser download error:', browserError);
          throw browserError;
        }
      }
      
    } catch (error) {
      console.error('Installation failed:', error);
      
      // Clear download progress on error
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[entry.game._id];
        return newProgress;
      });
      
      // Show error to user (you might want to add a toast notification here)
      alert(`Installation failed: ${error.message}`);
    }
  };

  const handleUninstall = async (entry) => {
    try {
      const game = entry.game;
      
      if (game.gameFileName) {
        // Remove from app library (Electron)
        const result = await window.electronAPI?.uninstallGame?.(game.gameFileName);
        
        if (result?.success) {
          console.log('Game uninstalled successfully:', result.message);
        } else {
          console.error('Uninstall failed:', result?.error);
        }
      }
      
      // Mark as uninstalled in backend
      try {
        await gamesAPI.markGameUninstalled(game._id);
        console.log('✅ Game marked as uninstalled in backend');
      } catch (backendError) {
        console.error('⚠️ Failed to mark game as uninstalled in backend:', backendError);
      }
      
      // Update local installation status
      setInstalledGamesStatus(prev => ({
        ...prev,
        [game._id]: { installed: false }
      }));
      
      // Refresh library to get updated status
      refreshLibrary();
      
    } catch (error) {
      console.error('Uninstall error:', error);
    }
  };

  const handleRemove = async (entry) => {
    // Remove from server library
    await usersAPI.removeFromLibrary(entry.game._id);
    
    // Also uninstall locally if installed
    if (entry.game.gameFileName) {
      await window.electronAPI?.uninstallGame?.(entry.game.gameFileName);
    }
    
    // Update local state
    setInstalledGamesStatus(prev => {
      const newStatus = { ...prev };
      delete newStatus[entry.game._id];
      return newStatus;
    });
    
    refreshLibrary();
  };

  const handlePause = async (entry) => {
    console.log('🛑 Pausing download for:', entry.game.title);
    
    // TODO: Implement actual download pause in Electron
    // For now, just clear the progress display
    setDownloadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[entry.game._id];
      return newProgress;
    });
    
    // Try to mark as not_installed in backend
    try {
      await gamesAPI.markGameUninstalled(entry.game._id);
      console.log('✅ Game marked as paused/not_installed in backend');
    } catch (error) {
      console.error('⚠️ Failed to update pause status in backend:', error);
    }
    
    refreshLibrary();
  };

  const handleCancel = async (entry) => {
    console.log('❌ Cancelling download for:', entry.game.title);
    
    // Clear download progress
    setDownloadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[entry.game._id];
      return newProgress;
    });
    
    // Try to remove any partial files (Electron)
    if (entry.game.gameFileName) {
      await window.electronAPI?.uninstallGame?.(entry.game.gameFileName);
    }
    
    // Mark as not_installed in backend
    try {
      await gamesAPI.markGameUninstalled(entry.game._id);
      console.log('✅ Game marked as cancelled/not_installed in backend');
    } catch (error) {
      console.error('⚠️ Failed to update cancel status in backend:', error);
    }
    
    // Update local status
    setInstalledGamesStatus(prev => ({
      ...prev,
      [entry.game._id]: { installed: false }
    }));
    
    refreshLibrary();
  };

  if (loading) return <div className="text-center py-12 text-white/60">Loading library...</div>;
  if (error) return <div className="text-center py-12 text-red-400">{error}</div>;

  const isEmpty = library.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Library</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.electronAPI?.openLibraryFolder?.()}
            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm transition-colors flex items-center gap-2"
          >
            📁 Open Library Folder
          </button>
          <div className="text-sm text-white/60">
            {installedGames.length} installed • {notInstalledGames.length} not installed • {installingGames.length} installing
          </div>
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
                {installedGames.map(entry => {
                  const installStatus = installedGamesStatus[entry.game._id];
                  return (
                    <div key={entry.game._id} className="rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{entry.game.title}</div>
                          <div className="text-sm text-green-400 mt-1">
                            ✅ Ready to play
                          </div>
                          {installStatus?.fileSize && (
                            <div className="text-xs text-white/60 mt-1">
                              Size: {(installStatus.fileSize / 1024 / 1024).toFixed(1)} MB
                            </div>
                          )}
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
                  );
                })}
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
                {installingGames.map(entry => {
                  const progress = downloadProgress[entry.game._id];
                  return (
                    <div key={entry.game._id} className="rounded-lg p-4 bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{entry.game.title}</div>
                          <div className="text-sm text-blue-400 mt-1">
                            {progress ? (
                              <div>
                                <div>Installing... {progress.progress}%</div>
                                <div className="text-xs text-white/60">
                                  {(progress.downloadedBytes / 1024 / 1024).toFixed(1)} MB / {(progress.totalBytes / 1024 / 1024).toFixed(1)} MB
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                    style={{ width: `${progress.progress}%` }}
                                  ></div>
                                </div>
                              </div>
                            ) : (
                              'Starting download...'
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
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
                  );
                })}
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
  