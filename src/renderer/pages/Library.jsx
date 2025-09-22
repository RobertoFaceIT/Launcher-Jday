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
  const [selectedGame, setSelectedGame] = useState(null);
  const [sidebarSections, setSidebarSections] = useState({
    installed: true, // Start expanded
    owned: false
  });
  const navigate = useNavigate();

  // Helper function to format file sizes
  const formatFileSize = (bytes) => {
    // Handle null, undefined, or 0
    if (!bytes || bytes === 0) return '0 B';
    
    // Convert to number if it's a string
    const numBytes = typeof bytes === 'string' ? parseInt(bytes) : bytes;
    
    // Handle invalid numbers
    if (isNaN(numBytes) || numBytes < 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(numBytes) / Math.log(1024));
    
    // Handle bytes (no decimal needed)
    if (i === 0) return numBytes + ' ' + sizes[i];
    
    // Ensure we don't exceed our sizes array
    const sizeIndex = Math.min(i, sizes.length - 1);
    const formattedSize = (numBytes / Math.pow(1024, sizeIndex)).toFixed(1);
    
    return formattedSize + ' ' + sizes[sizeIndex];
  };

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
            addedAt: entry.addedAt,
            gameFileSize: entry.game?.gameFileSize,
            formattedSize: entry.game?.gameFileSize ? formatFileSize(entry.game.gameFileSize) : 'N/A'
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
  const checkAllGamesInstallation = async (libraryGames) => {
    if (!window.electronAPI?.checkGameInstallation) return;
    
    const statusPromises = libraryGames.map(async entry => {
      if (entry.game.gameFileName) {
        const isInstalled = await window.electronAPI.checkGameInstallation(entry.game.gameFileName);
        return { gameId: entry.game._id, installed: isInstalled };
      }
      return { gameId: entry.game._id, installed: false };
    });

    const results = await Promise.all(statusPromises);
    
    const statusMap = {};
    results.forEach(result => {
      statusMap[result.gameId] = { installed: result.installed };
    });
    
    setInstalledGamesStatus(statusMap);
  };

  // Helper function to get game installation status
  const getGameStatus = (entry) => {
    // Check if downloading/installing (has download progress)
    if (downloadProgress[entry.game._id]) {
      return 'installing';
    }
    
    // Prioritize backend status
    if (entry.status) {
      switch(entry.status) {
        case 'installed': return 'installed';
        case 'installing': return 'installing';
        case 'not_installed': 
        default: return 'not_installed';
      }
    }
    
    // Check local installation status (for Electron)
    const installStatus = installedGamesStatus[entry.game._id];
    if (installStatus?.installed) return 'installed';
    
    return 'not_installed';
  };

  // Categorize games into installed and owned
  const categorizeGames = () => {
    const installed = [];
    const owned = [];

    library.forEach(entry => {
      const status = getGameStatus(entry);
      if (status === 'installed') {
        installed.push(entry);
      } else {
        owned.push(entry);
      }
    });

    return { installed, owned };
  };

  // Helper function to toggle sidebar sections
  const toggleSidebarSection = (section) => {
    setSidebarSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
      
      if (!installStatus?.installed) {
        alert('Game is not installed. Please install it first.');
        return;
      }

      if (game.gameFileName) {
        const result = await window.electronAPI?.launchGame?.(game.gameFileName);
        if (result?.success) {
          console.log('Game launched successfully');
        } else {
          console.error('Failed to launch game:', result?.error);
          alert(`Failed to launch game: ${result?.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Launch error:', error);
      alert('Failed to launch game');
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

      if (!game.gameFilePath) {
        alert('No download source available for this game');
        return;
      }

      console.log('Starting app library download...');
      
      // Test direct download from backend first
      console.log('Testing direct download from backend...');
      const token = localStorage.getItem('token');
      const downloadUrl = `http://192.168.22.161:3000/api/uploads/download-game/${game._id}`;
      const directResponse = await fetch(downloadUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('Direct download test response:', directResponse);
      
      if (!directResponse.ok) {
        throw new Error(`Backend download failed: ${directResponse.status} ${directResponse.statusText}`);
      }
      
      console.log('✅ Direct download test successful!');
      
      // Mark as installing in progress
      setDownloadProgress(prev => ({
        ...prev,
        [game._id]: { progress: 0, status: 'starting' }
      }));

      // Test simple IPC calls first
      console.log('🔗 Testing IPC connection...');
      
      const testResult = await window.electronAPI?.testIPC?.();
      console.log('✅ Simple IPC test result:', testResult);
      
      const pathsResult = await window.electronAPI?.getAppPaths?.();
      console.log('✅ IPC getAppPaths result:', pathsResult);
      
      // Try to download via Electron first, fall back to browser
      if (window.electronAPI && typeof window.electronAPI.downloadGameToLibrary === 'function') {
        console.log('🔧 Using Electron download...');
        
        const result = await window.electronAPI.downloadGameToLibrary({
          gameId: game._id,
          fileName: game.gameFileName || `${game.title}.${game.gameFilePath.split('.').pop()}`,
          token: localStorage.getItem('token')
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
        
      } else {
        console.log('🌐 Electron not available, using browser download...');
        
        try {
          const response = await fetch(downloadUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (!response.ok) {
            throw new Error(`Download failed: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = game.gameFileName || `${game.title}.${game.gameFilePath.split('.').pop()}`;
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
  const { installed, owned } = categorizeGames();

  // Game Detail Component
  const GameDetail = ({ entry }) => {
    const status = getGameStatus(entry);
    const progress = downloadProgress[entry.game._id];
    const installStatus = installedGamesStatus[entry.game._id];

    return (
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSelectedGame(null)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white">{entry.game.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                {status === 'installed' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-500/20 text-green-400 border border-green-500/30">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    Installed & Ready
                  </span>
                )}
                {status === 'installing' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                    Installing...
                  </span>
                )}
                {status === 'not_installed' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                    Ready to Install
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Game Image */}
          <div className="lg:col-span-1">
            <div className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-800 shadow-2xl">
              <img
                src={entry.game.image || 'https://via.placeholder.com/300x400'}
                alt={entry.game.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Game Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div>
              <h3 className="text-xl font-semibold text-white mb-3">About this game</h3>
              <p className="text-gray-300 leading-relaxed">
                {entry.game.description || "No description available for this game."}
              </p>
            </div>

            {/* Installation Progress */}
            {status === 'installing' && progress && (
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Installation Progress</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Installing...</span>
                    <span className="text-blue-400 font-medium">{progress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                      style={{ width: `${progress.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                  </div>
                  {progress.downloadedBytes && progress.totalBytes && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{formatFileSize(progress.downloadedBytes)} downloaded</span>
                      <span>{formatFileSize(progress.totalBytes)} total</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Game Information */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Game Details</h3>
                <div className="space-y-3">
                  {entry.game.gameFileSize && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Size</span>
                      <span className="text-white font-medium">
                        {formatFileSize(entry.game.gameFileSize)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Added to Library</span>
                    <span className="text-white font-medium">
                      {new Date(entry.addedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {installStatus?.installDate && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Installed</span>
                      <span className="text-white font-medium">
                        {new Date(installStatus.installDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  {status === 'installed' && (
                    <>
                      <button
                        onClick={() => launch(entry)}
                        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play Game
                      </button>
                      <button
                        onClick={() => handleUninstall(entry)}
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Uninstall
                      </button>
                    </>
                  )}

                  {status === 'installing' && (
                    <>
                      <button
                        onClick={() => handlePause(entry)}
                        className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Pause Download
                      </button>
                      <button
                        onClick={() => handleCancel(entry)}
                        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Download
                      </button>
                    </>
                  )}

                  {status === 'not_installed' && (
                    <button
                      onClick={() => handleInstall(entry)}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Install Game
                    </button>
                  )}

                  <button
                    onClick={() => handleRemove(entry)}
                    className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                    </svg>
                    Remove from Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-x-0 top-[120px] bottom-[20px] flex overflow-hidden bg-neutral-900">
      {/* Sidebar */}
      <div className="w-72 bg-gray-900/50 border-r border-gray-700/50 flex-shrink-0 flex flex-col overflow-hidden">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-gray-700/50 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Library</h2>
              <p className="text-sm text-gray-400 mt-1">{library.length} games total</p>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={refreshLibrary}
              className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button
              onClick={() => window.electronAPI?.openLibraryFolder?.()}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
              Folder
            </button>
          </div>
        </div>
        
        {/* Scrollable Games List */}
        <div className="flex-1 overflow-y-auto p-4">{/* Sidebar Sections */}
          
          {/* Installed Games Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSidebarSection('installed')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`transform transition-transform duration-200 ${sidebarSections.installed ? 'rotate-90' : ''}`}>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-semibold text-green-400">Installed</span>
                </div>
              </div>
              <span className="text-sm bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                {installed.length}
              </span>
            </button>
            
            {sidebarSections.installed && (
              <div className="mt-3 space-y-1 ml-3">
                {installed.map(entry => (
                  <button
                    key={entry.game._id}
                    onClick={() => setSelectedGame(entry)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                      selectedGame?.game._id === entry.game._id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                        : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                    }`}
                    title={entry.game.title}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{entry.game.title}</div>
                        <div className="text-xs text-gray-500 group-hover:text-gray-400">Ready to play</div>
                      </div>
                    </div>
                  </button>
                ))}
                {installed.length === 0 && (
                  <div className="text-sm text-gray-500 italic px-3 py-4 text-center">
                    No installed games
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Owned Games Section */}
          <div className="mb-6">
            <button
              onClick={() => toggleSidebarSection('owned')}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`transform transition-transform duration-200 ${sidebarSections.owned ? 'rotate-90' : ''}`}>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="font-semibold text-orange-400">Owned</span>
                </div>
              </div>
              <span className="text-sm bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
                {owned.length}
              </span>
            </button>
            
            {sidebarSections.owned && (
              <div className="mt-3 space-y-1 ml-3">
                {owned.map(entry => (
                  <button
                    key={entry.game._id}
                    onClick={() => setSelectedGame(entry)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                      selectedGame?.game._id === entry.game._id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                        : 'hover:bg-gray-800/50 text-gray-300 hover:text-white'
                    }`}
                    title={entry.game.title}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{entry.game.title}</div>
                        <div className="text-xs text-gray-500 group-hover:text-gray-400">Ready to install</div>
                      </div>
                    </div>
                  </button>
                ))}
                {owned.length === 0 && (
                  <div className="text-sm text-gray-500 italic px-3 py-4 text-center">
                    No owned games
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-gray-900/30 overflow-hidden">
        {isEmpty ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon="🎮"
              title="Your library is empty"
              description="Browse the store to discover and install amazing games to build your personal collection."
              action={() => navigate('/')}
              actionText="Browse Store"
            />
          </div>
        ) : !selectedGame ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md mx-auto px-6">
              <div className="text-6xl mb-6">📚</div>
              <h3 className="text-2xl font-bold text-white mb-3">Select a game from the sidebar</h3>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Choose a game to view details and manage installation
              </p>
              <div className="bg-gray-800/50 rounded-lg p-4 space-y-2">
                <div className="text-sm text-gray-300">
                  <span className="text-white font-medium">{library.length}</span> total games
                </div>
                <div className="text-sm text-gray-300">
                  <span className="text-green-400 font-medium">{installed.length}</span> installed • 
                  <span className="text-orange-400 font-medium ml-1">{owned.length}</span> not installed
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <GameDetail entry={selectedGame} />
          </div>
        )}
      </div>
    </div>
  );
}
