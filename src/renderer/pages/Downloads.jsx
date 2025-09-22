import { useState, useEffect } from 'react';

const Downloads = () => {
  const [downloads, setDownloads] = useState([]);
  const [downloadQueue, setDownloadQueue] = useState([]);

  // Placeholder data - will be replaced with real download management
  useEffect(() => {
    // Mock some download data for now
    setDownloads([
      {
        id: 1,
        name: 'Super Mario Odyssey',
        progress: 85,
        speed: '12.5 MB/s',
        timeRemaining: '2 min',
        status: 'downloading'
      },
      {
        id: 2,
        name: 'The Legend of Zelda: Breath of the Wild',
        progress: 100,
        speed: '0 MB/s',
        timeRemaining: 'Complete',
        status: 'completed'
      }
    ]);

    setDownloadQueue([
      {
        id: 3,
        name: 'Pokémon Sword',
        size: '9.8 GB',
        status: 'queued'
      },
      {
        id: 4,
        name: 'Animal Crossing: New Horizons',
        size: '6.2 GB',
        status: 'queued'
      }
    ]);
  }, []);

  const ProgressBar = ({ progress }) => (
    <div className="w-full bg-white/10 rounded-full h-2">
      <div 
        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );

  const getStatusIcon = (status) => {
    switch (status) {
      case 'downloading':
        return '⬇️';
      case 'completed':
        return '✅';
      case 'queued':
        return '⏳';
      case 'paused':
        return '⏸️';
      default:
        return '📁';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Downloads & Queue</h1>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
            ⏸️ Pause All
          </button>
          <button className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors">
            ▶️ Resume All
          </button>
          <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
            🗑️ Clear Completed
          </button>
        </div>
      </div>

      {/* Active Downloads */}
      <div className="bg-white/5 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>📥</span>
          Active Downloads ({downloads.filter(d => d.status === 'downloading').length})
        </h2>
        
        {downloads.length > 0 ? (
          <div className="space-y-4">
            {downloads.map((download) => (
              <div key={download.id} className="bg-white/5 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getStatusIcon(download.status)}</span>
                    <div>
                      <h3 className="font-medium">{download.name}</h3>
                      <p className="text-sm text-white/60">
                        {download.status === 'downloading' ? `${download.speed} • ${download.timeRemaining} remaining` : download.timeRemaining}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{download.progress}%</span>
                    <button className="p-1 hover:bg-white/10 rounded">
                      {download.status === 'downloading' ? '⏸️' : '▶️'}
                    </button>
                    <button className="p-1 hover:bg-white/10 rounded text-red-400">
                      ❌
                    </button>
                  </div>
                </div>
                <ProgressBar progress={download.progress} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/60">
            <div className="text-4xl mb-2">📭</div>
            <p>No active downloads</p>
          </div>
        )}
      </div>

      {/* Download Queue */}
      <div className="bg-white/5 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>⏳</span>
          Download Queue ({downloadQueue.length})
        </h2>
        
        {downloadQueue.length > 0 ? (
          <div className="space-y-3">
            {downloadQueue.map((item, index) => (
              <div key={item.id} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60 w-6">#{index + 1}</span>
                  <span className="text-lg">{getStatusIcon(item.status)}</span>
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    <p className="text-sm text-white/60">{item.size}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-1 hover:bg-white/10 rounded">
                    ⬆️
                  </button>
                  <button className="p-1 hover:bg-white/10 rounded">
                    ⬇️
                  </button>
                  <button className="p-1 hover:bg-white/10 rounded text-red-400">
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/60">
            <div className="text-4xl mb-2">📋</div>
            <p>Download queue is empty</p>
          </div>
        )}
      </div>

      {/* Download Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">2</div>
          <div className="text-sm text-white/60">Total Downloads</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">12.5 MB/s</div>
          <div className="text-sm text-white/60">Download Speed</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">15.7 GB</div>
          <div className="text-sm text-white/60">Total Downloaded</div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
