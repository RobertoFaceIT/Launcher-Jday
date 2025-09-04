import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

const AddGames = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingGame, setExistingGame] = useState(null);
  
  const [gameForm, setGameForm] = useState({
    title: '',
    description: '',
    price: '',
    originalPrice: '',
    discount: 0,
    releaseDate: '',
    platform: 'Windows',
    developer: '',
    publisher: '',
    genre: [''],
    features: [''],
    downloadLink: '',
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

  const [imageFiles, setImageFiles] = useState({
    coverImage: null,
    screenshots: [null, null] // Start with 2 empty screenshot slots
  });

  const [imagePreviews, setImagePreviews] = useState({
    coverImage: null,
    screenshots: [null, null] // Start with 2 empty screenshot slots
  });

  // Check if we're in edit mode and load game data
  useEffect(() => {
    const checkEditMode = async () => {
      // Check URL params for edit mode
      if (id) {
        setIsEditMode(true);
        try {
          const response = await api.get(`/admin/games/${id}`);
          const game = response.data.game;
          setExistingGame(game);
          
          // Pre-populate form with existing game data
          setGameForm({
            title: game.title || '',
            description: game.description || '',
            price: game.price || '',
            originalPrice: game.originalPrice || '',
            discount: game.discount || 0,
            releaseDate: game.releaseDate ? new Date(game.releaseDate).toISOString().split('T')[0] : '',
            platform: game.platform || 'Windows',
            developer: game.developer || '',
            publisher: game.publisher || '',
            genre: game.genre?.length ? game.genre : [''],
            features: game.features?.length ? game.features : [''],
            downloadLink: game.downloadLink || '',
            isActive: game.isActive !== false,
            systemRequirements: game.systemRequirements || {
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

          // Set image previews for existing images
          if (game.image) {
            setImagePreviews(prev => ({ ...prev, coverImage: game.image }));
          }
          if (game.screenshots?.length) {
            // Initialize a fixed-size array of 10 slots, fill existing screenshots
            const screenshotPreviews = new Array(10).fill(null);
            game.screenshots.slice(0, 10).forEach((screenshot, index) => {
              screenshotPreviews[index] = screenshot;
            });
            setImagePreviews(prev => ({ ...prev, screenshots: screenshotPreviews }));
            // Initialize file array to match preview structure
            setImageFiles(prev => ({ ...prev, screenshots: new Array(10).fill(null) }));
          }
        } catch (error) {
          console.error('Failed to load game:', error);
          addToast('Failed to load game data', 'error');
          navigate('/admin/games');
        }
      } else {
        // Check if data was passed through location state
        if (location.state?.game) {
          setIsEditMode(true);
          const game = location.state.game;
          setExistingGame(game);
          
          // Same form population logic as above
          setGameForm({
            title: game.title || '',
            description: game.description || '',
            price: game.price || '',
            originalPrice: game.originalPrice || '',
            discount: game.discount || 0,
            releaseDate: game.releaseDate ? new Date(game.releaseDate).toISOString().split('T')[0] : '',
            platform: game.platform || 'Windows',
            developer: game.developer || '',
            publisher: game.publisher || '',
            genre: game.genre?.length ? game.genre : [''],
            features: game.features?.length ? game.features : [''],
            downloadLink: game.downloadLink || '',
            isActive: game.isActive !== false,
            systemRequirements: game.systemRequirements || {
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

          if (game.image) {
            setImagePreviews(prev => ({ ...prev, coverImage: game.image }));
          }
          if (game.screenshots?.length) {
            // Initialize a fixed-size array of 10 slots, fill existing screenshots
            const screenshotPreviews = new Array(10).fill(null);
            game.screenshots.slice(0, 10).forEach((screenshot, index) => {
              screenshotPreviews[index] = screenshot;
            });
            setImagePreviews(prev => ({ ...prev, screenshots: screenshotPreviews }));
            // Initialize file array to match preview structure
            setImageFiles(prev => ({ ...prev, screenshots: new Array(10).fill(null) }));
          }
        }
      }
    };

    checkEditMode();
  }, [id, location.state, addToast, navigate]);

  const handleImageChange = (e, type, index = null) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('Image size should be less than 5MB', 'error');
      return;
    }

    if (type === 'coverImage') {
      setImageFiles(prev => ({ ...prev, coverImage: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews(prev => ({ ...prev, coverImage: e.target.result }));
      };
      reader.readAsDataURL(file);
    } else if (type === 'screenshot') {
      if (index === null) return;
      if (index > 9) {
        addToast('Maximum of 10 screenshots allowed', 'error');
        return;
      }

      const newScreenshots = [...imageFiles.screenshots];
      // Ensure array is large enough
      while (newScreenshots.length <= index) newScreenshots.push(null);
      newScreenshots[index] = file;
      setImageFiles(prev => ({ ...prev, screenshots: newScreenshots }));

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPreviews = [...imagePreviews.screenshots];
        while (newPreviews.length <= index) newPreviews.push(null);
        newPreviews[index] = e.target.result;
        setImagePreviews(prev => ({ ...prev, screenshots: newPreviews }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (type, index = null) => {
    if (type === 'coverImage') {
      setImageFiles(prev => ({ ...prev, coverImage: null }));
      setImagePreviews(prev => ({ ...prev, coverImage: null }));
    } else if (type === 'screenshot') {
      if (index === null) return;
      
      // Instead of splice, set the specific index to null to maintain array structure
      const newScreenshots = [...imageFiles.screenshots];
      const newPreviews = [...imagePreviews.screenshots];
      
      if (index < newScreenshots.length) newScreenshots[index] = null;
      if (index < newPreviews.length) newPreviews[index] = null;
      
      setImageFiles(prev => ({ ...prev, screenshots: newScreenshots }));
      setImagePreviews(prev => ({ ...prev, screenshots: newPreviews }));
    }
  };

  const addScreenshotSlot = () => {
    const currentLength = imagePreviews.screenshots.length;
    if (currentLength >= 10) {
      addToast('Maximum of 10 screenshots reached', 'error');
      return;
    }
    
    // Add a new null slot to the end
    setImagePreviews(prev => ({ ...prev, screenshots: [...prev.screenshots, null] }));
    setImageFiles(prev => ({ ...prev, screenshots: [...prev.screenshots, null] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare game data
      const gameData = {
        ...gameForm,
        genre: gameForm.genre.filter(g => g.trim() !== ''),
        features: gameForm.features.filter(f => f.trim() !== ''),
        price: parseFloat(gameForm.price),
        originalPrice: gameForm.originalPrice ? parseFloat(gameForm.originalPrice) : parseFloat(gameForm.price),
        discount: parseFloat(gameForm.discount) || 0
      };

      // Check if we have any new images to upload
      const hasNewImages = imageFiles.coverImage || imageFiles.screenshots.some(file => file !== null);

      if (isEditMode && existingGame) {
        // Update existing game
        if (hasNewImages) {
          // Use FormData if we have new images to upload
          const formData = new FormData();
          formData.append('gameData', JSON.stringify(gameData));

          // Add cover image if selected
          if (imageFiles.coverImage) {
            console.log('Adding cover image for edit:', imageFiles.coverImage);
            formData.append('coverImage', imageFiles.coverImage);
          }

          // Add screenshots - preserve index mapping for updates
          imageFiles.screenshots.forEach((file, index) => {
            if (file) {
              console.log(`Adding screenshot ${index} for edit:`, file);
              formData.append(`screenshot${index}`, file);
            }
          });

          console.log('FormData entries for edit:');
          for (let pair of formData.entries()) {
            console.log(pair[0], pair[1]);
          }

          const response = await api.put(`/admin/games/${existingGame._id}`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        } else {
          // Use JSON data if no new images
          const response = await api.put(`/admin/games/${existingGame._id}`, gameData);
        }
        addToast('Game updated successfully!', 'success');
      } else {
        // Create new game
        const formData = new FormData();
        
        // Add game data
        const gameData = {
          ...gameForm,
          genre: gameForm.genre.filter(g => g.trim() !== ''),
          features: gameForm.features.filter(f => f.trim() !== ''),
          price: parseFloat(gameForm.price),
          originalPrice: gameForm.originalPrice ? parseFloat(gameForm.originalPrice) : parseFloat(gameForm.price),
          discount: parseFloat(gameForm.discount) || 0
        };

        formData.append('gameData', JSON.stringify(gameData));

        // Add cover image
        if (imageFiles.coverImage) {
          console.log('Adding cover image:', imageFiles.coverImage);
          formData.append('coverImage', imageFiles.coverImage);
        }

        // Add screenshots - preserve index mapping
        imageFiles.screenshots.forEach((file, index) => {
          if (file) {
            console.log(`Adding screenshot ${index}:`, file);
            formData.append(`screenshot${index}`, file);
          }
        });

        console.log('FormData entries:');
        for (let pair of formData.entries()) {
          console.log(pair[0], pair[1]);
        }

        const response = await api.post('/admin/games', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        addToast('Game created successfully!', 'success');
      }
      
      navigate('/admin/games');
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} game:`, error);
      addToast(error.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} game`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Game' : 'Add New Game'}</h1>
          <button
            onClick={() => navigate('/admin/games')}
            className="bg-neutral-700 hover:bg-neutral-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Back to Games
          </button>
        </div>

        <div className="bg-neutral-800 rounded-lg border border-neutral-700">
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column - Basic Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b border-neutral-700 pb-2">Basic Information</h3>
                
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={gameForm.title}
                    onChange={(e) => setGameForm({ ...gameForm, title: e.target.value })}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Description *</label>
                  <textarea
                    value={gameForm.description}
                    onChange={(e) => setGameForm({ ...gameForm, description: e.target.value })}
                    rows={4}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Developer *</label>
                    <input
                      type="text"
                      value={gameForm.developer}
                      onChange={(e) => setGameForm({ ...gameForm, developer: e.target.value })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Publisher *</label>
                    <input
                      type="text"
                      value={gameForm.publisher}
                      onChange={(e) => setGameForm({ ...gameForm, publisher: e.target.value })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Price ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={gameForm.price}
                      onChange={(e) => setGameForm({ ...gameForm, price: e.target.value })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Original Price ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={gameForm.originalPrice}
                      onChange={(e) => setGameForm({ ...gameForm, originalPrice: e.target.value })}
                      placeholder="Leave empty to use same as price"
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={gameForm.discount}
                      onChange={(e) => setGameForm({ ...gameForm, discount: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Release and Platform */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Release Date *</label>
                    <input
                      type="date"
                      value={gameForm.releaseDate}
                      onChange={(e) => setGameForm({ ...gameForm, releaseDate: e.target.value })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-white/70 text-sm font-medium mb-2">Platform</label>
                    <select
                      value={gameForm.platform}
                      onChange={(e) => setGameForm({ ...gameForm, platform: e.target.value })}
                      className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="Windows">Windows</option>
                      <option value="Mac">Mac</option>
                      <option value="Linux">Linux</option>
                      <option value="Cross-platform">Cross-platform</option>
                    </select>
                  </div>
                </div>

                {/* Genres */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Genres</label>
                  {gameForm.genre.map((g, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={g}
                        onChange={(e) => {
                          const newGenres = [...gameForm.genre];
                          newGenres[index] = e.target.value;
                          setGameForm({ ...gameForm, genre: newGenres });
                        }}
                        placeholder={`Genre ${index + 1}`}
                        className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                      {gameForm.genre.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newGenres = gameForm.genre.filter((_, i) => i !== index);
                            setGameForm({ ...gameForm, genre: newGenres });
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGameForm({ ...gameForm, genre: [...gameForm.genre, ''] })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Add Genre
                  </button>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Features</label>
                  {gameForm.features.map((feature, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...gameForm.features];
                          newFeatures[index] = e.target.value;
                          setGameForm({ ...gameForm, features: newFeatures });
                        }}
                        placeholder={`Feature ${index + 1}`}
                        className="flex-1 bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                      {gameForm.features.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newFeatures = gameForm.features.filter((_, i) => i !== index);
                            setGameForm({ ...gameForm, features: newFeatures });
                          }}
                          className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGameForm({ ...gameForm, features: [...gameForm.features, ''] })}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                  >
                    Add Feature
                  </button>
                </div>

                {/* Download Link and Status */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Download Link</label>
                  <input
                    type="url"
                    value={gameForm.downloadLink}
                    onChange={(e) => setGameForm({ ...gameForm, downloadLink: e.target.value })}
                    placeholder="https://example.com/download"
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={gameForm.isActive}
                      onChange={(e) => setGameForm({ ...gameForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-neutral-700 border-neutral-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-white/70 text-sm font-medium">Game is Active</span>
                  </label>
                </div>
              </div>

              {/* Right Column - Images and System Requirements */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold border-b border-neutral-700 pb-2">Images & Media</h3>
                
                {/* Cover Image */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Cover Image *</label>
                  <div className="border-2 border-dashed border-neutral-600 rounded-lg p-4">
                    {imagePreviews.coverImage ? (
                      <div className="relative">
                        <img 
                          src={imagePreviews.coverImage} 
                          alt="Cover preview" 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage('coverImage')}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageChange(e, 'coverImage')}
                          className="hidden"
                          id="coverImage"
                        />
                        <label
                          htmlFor="coverImage"
                          className="cursor-pointer inline-flex flex-col items-center justify-center w-full h-32 border border-neutral-600 rounded-lg hover:bg-neutral-700 transition-colors"
                        >
                          <svg className="w-8 h-8 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-neutral-400 text-sm">Click to upload cover image</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Screenshots */}
                <div>
                  <label className="block text-white/70 text-sm font-medium mb-2">Screenshots (up to 10)</label>
                  <div className="grid grid-cols-2 gap-4">
                    {imagePreviews.screenshots.map((preview, index) => (
                      <div key={index} className="border-2 border-dashed border-neutral-600 rounded-lg p-2">
                        {preview ? (
                          <div className="relative">
                            <img 
                              src={preview} 
                              alt={`Screenshot ${index + 1}`} 
                              className="w-full h-24 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage('screenshot', index)}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="text-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleImageChange(e, 'screenshot', index)}
                              className="hidden"
                              id={`screenshot${index}`}
                            />
                            <label
                              htmlFor={`screenshot${index}`}
                              className="cursor-pointer inline-flex flex-col items-center justify-center w-full h-24 border border-neutral-600 rounded hover:bg-neutral-700 transition-colors"
                            >
                              <svg className="w-6 h-6 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              <span className="text-neutral-400 text-xs">Screenshot {index + 1}</span>
                            </label>
                          </div>
                        )}
                      </div>
                    ))}
                    {imagePreviews.screenshots.length < 10 && (
                      <button
                        type="button"
                        onClick={addScreenshotSlot}
                        className="border-2 border-dashed border-neutral-600 rounded-lg p-2 h-24 flex items-center justify-center text-neutral-400 hover:bg-neutral-700"
                      >
                        + Add another screenshot
                      </button>
                    )}
                  </div>
                </div>

                {/* System Requirements */}
                <div>
                  <h4 className="text-white font-medium mb-4">Minimum System Requirements</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Operating System</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.minimum.os}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            minimum: {
                              ...gameForm.systemRequirements.minimum,
                              os: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Processor</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.minimum.processor}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            minimum: {
                              ...gameForm.systemRequirements.minimum,
                              processor: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Memory</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.minimum.memory}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            minimum: {
                              ...gameForm.systemRequirements.minimum,
                              memory: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Graphics</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.minimum.graphics}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            minimum: {
                              ...gameForm.systemRequirements.minimum,
                              graphics: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Storage</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.minimum.storage}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            minimum: {
                              ...gameForm.systemRequirements.minimum,
                              storage: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Recommended System Requirements */}
                <div>
                  <h4 className="text-white font-medium mb-4">Recommended System Requirements</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Operating System</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.recommended.os}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            recommended: {
                              ...gameForm.systemRequirements.recommended,
                              os: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Processor</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.recommended.processor}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            recommended: {
                              ...gameForm.systemRequirements.recommended,
                              processor: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Memory</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.recommended.memory}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            recommended: {
                              ...gameForm.systemRequirements.recommended,
                              memory: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Graphics</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.recommended.graphics}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            recommended: {
                              ...gameForm.systemRequirements.recommended,
                              graphics: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white/70 text-sm font-medium mb-2">Storage</label>
                      <input
                        type="text"
                        value={gameForm.systemRequirements.recommended.storage}
                        onChange={(e) => setGameForm({ 
                          ...gameForm, 
                          systemRequirements: {
                            ...gameForm.systemRequirements,
                            recommended: {
                              ...gameForm.systemRequirements.recommended,
                              storage: e.target.value
                            }
                          }
                        })}
                        className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-8 pt-6 border-t border-neutral-700">
              <div className="flex gap-4 justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/admin/games')}
                  className="bg-neutral-700 hover:bg-neutral-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading 
                    ? (isEditMode ? 'Updating Game...' : 'Creating Game...') 
                    : (isEditMode ? 'Update Game' : 'Create Game')
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddGames;