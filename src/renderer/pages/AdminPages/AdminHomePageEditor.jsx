import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../services/api";

export default function AdminHomePageEditor() {
  const [form, setForm] = useState({ 
    whyChooseUs: [],
    aboutUs: { 
      title: "About Real-G Launcher", 
      content: "",
      stats: [
        { value: "10K+", label: "Active Gamers" },
        { value: "500+", label: "Games Available" },
        { value: "24/7", label: "Support" }
      ]
    }, 
    pcSpecs: { 
      title: "System Requirements",
      requirements: [
        { key: "Operating System", value: "Windows 10 or higher" },
        { key: "Processor", value: "Intel Core i3 or equivalent" },
        { key: "Memory (RAM)", value: "4GB minimum" },
        { key: "Graphics", value: "DirectX 11 compatible" },
        { key: "Network", value: "Broadband connection" },
        { key: "Storage", value: "10GB available space" }
      ]
    }, 
    guide: { 
      title: "Getting Started Guide", 
      content: "",
      steps: [
        { title: "Create Account", description: "Register with your email and create your gaming profile in seconds." },
        { title: "Browse Games", description: "Explore our vast library of games across all genres and platforms." },
        { title: "Start Playing", description: "Download, install, and dive into your favorite games instantly!" }
      ]
    } 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/homepage");
        if (response.data) {
          // Convert backend data to our editor format
          const backendData = response.data;
          
          const convertedForm = {
            whyChooseUs: backendData.featuresApps || [],
            aboutUs: {
              title: backendData.aboutUs?.title || "About Real-G Launcher",
              content: backendData.aboutUs?.content || "",
              stats: [
                { value: "10K+", label: "Active Gamers" },
                { value: "500+", label: "Games Available" },
                { value: "24/7", label: "Support" }
              ]
            },
            pcSpecs: {
              title: backendData.pcSpecs?.title || "System Requirements",
              requirements: (() => {
                try {
                  return JSON.parse(backendData.pcSpecs?.content || "[]");
                } catch {
                  return [
                    { key: "Operating System", value: "Windows 10 or higher" },
                    { key: "Processor", value: "Intel Core i3 or equivalent" },
                    { key: "Memory (RAM)", value: "4GB minimum" },
                    { key: "Graphics", value: "DirectX 11 compatible" },
                    { key: "Network", value: "Broadband connection" },
                    { key: "Storage", value: "10GB available space" }
                  ];
                }
              })()
            },
            guide: {
              title: backendData.guide?.title || "Getting Started Guide",
              ...(() => {
                try {
                  const guideData = JSON.parse(backendData.guide?.content || "{}");
                  return {
                    content: guideData.description || "",
                    steps: guideData.steps || [
                      { title: "Create Account", description: "Register with your email and create your gaming profile in seconds." },
                      { title: "Browse Games", description: "Explore our vast library of games across all genres and platforms." },
                      { title: "Start Playing", description: "Download, install, and dive into your favorite games instantly!" }
                    ]
                  };
                } catch {
                  return {
                    content: "",
                    steps: [
                      { title: "Create Account", description: "Register with your email and create your gaming profile in seconds." },
                      { title: "Browse Games", description: "Explore our vast library of games across all genres and platforms." },
                      { title: "Start Playing", description: "Download, install, and dive into your favorite games instantly!" }
                    ]
                  };
                }
              })()
            }
          };
          
          setForm(convertedForm);
        }
      } catch (err) {
        console.error("Failed to fetch homepage data:", err);
        error("Failed to load homepage data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [error]);

  const handleSave = async () => {
    // Basic validation
    if (!form.aboutUs?.title?.trim()) {
      error("About Us title is required");
      return;
    }
    if (!form.pcSpecs?.title?.trim()) {
      error("System Requirements title is required");
      return;
    }
    if (!form.guide?.title?.trim()) {
      error("Guide title is required");
      return;
    }

    // Validate Why Choose Us cards
    for (let i = 0; i < form.whyChooseUs.length; i++) {
      const card = form.whyChooseUs[i];
      if (!card.title?.trim()) {
        error(`Why Choose Us card ${i + 1} title is required`);
        return;
      }
      if (!card.content?.trim()) {
        error(`Why Choose Us card ${i + 1} content is required`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Clean up the data before sending - convert to old format for backend compatibility
      const cleanedForm = {
        featuresApps: form.whyChooseUs.filter(f => f.title?.trim() && f.content?.trim()),
        aboutUs: {
          title: form.aboutUs.title,
          content: form.aboutUs.content || ""
        },
        pcSpecs: {
          title: form.pcSpecs.title,
          content: JSON.stringify(form.pcSpecs.requirements) // Store requirements as JSON
        },
        guide: {
          title: form.guide.title,
          content: JSON.stringify({
            description: form.guide.content,
            steps: form.guide.steps
          })
        }
      };

      console.log("Saving homepage data:", cleanedForm);
      const response = await api.put("/homepage", cleanedForm);
      if (response.data) {
        success("Homepage updated successfully! 🎉");
        
        // Parse the response back to our format
        const parsed = {
          whyChooseUs: response.data.featuresApps || form.whyChooseUs,
          aboutUs: {
            ...form.aboutUs,
            title: response.data.aboutUs?.title || form.aboutUs.title,
            content: response.data.aboutUs?.content || form.aboutUs.content
          },
          pcSpecs: {
            title: response.data.pcSpecs?.title || form.pcSpecs.title,
            requirements: form.pcSpecs.requirements // Keep current requirements
          },
          guide: {
            title: response.data.guide?.title || form.guide.title,
            content: form.guide.content,
            steps: form.guide.steps
          }
        };
        setForm(parsed);
      }
    } catch (err) {
      console.error("Failed to save homepage:", err);
      const errorMessage = err.response?.data?.error || "Failed to save homepage changes";
      error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Why Choose Us functions
  const updateWhyChooseUs = (index, field, value) => {
    const updated = [...form.whyChooseUs];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, whyChooseUs: updated });
  };

  const addWhyChooseUsCard = () => {
    setForm({
      ...form,
      whyChooseUs: [...form.whyChooseUs, { title: "", content: "" }]
    });
  };

  const removeWhyChooseUsCard = (index) => {
    setForm({
      ...form,
      whyChooseUs: form.whyChooseUs.filter((_, i) => i !== index)
    });
  };

  // About Us Stats functions
  const updateStat = (index, field, value) => {
    const updated = [...form.aboutUs.stats];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, aboutUs: { ...form.aboutUs, stats: updated } });
  };

  const addStat = () => {
    setForm({
      ...form,
      aboutUs: {
        ...form.aboutUs,
        stats: [...form.aboutUs.stats, { value: "", label: "" }]
      }
    });
  };

  const removeStat = (index) => {
    setForm({
      ...form,
      aboutUs: {
        ...form.aboutUs,
        stats: form.aboutUs.stats.filter((_, i) => i !== index)
      }
    });
  };

  // System Requirements functions
  const updateRequirement = (index, field, value) => {
    const updated = [...form.pcSpecs.requirements];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, pcSpecs: { ...form.pcSpecs, requirements: updated } });
  };

  const addRequirement = () => {
    setForm({
      ...form,
      pcSpecs: {
        ...form.pcSpecs,
        requirements: [...form.pcSpecs.requirements, { key: "", value: "" }]
      }
    });
  };

  const removeRequirement = (index) => {
    setForm({
      ...form,
      pcSpecs: {
        ...form.pcSpecs,
        requirements: form.pcSpecs.requirements.filter((_, i) => i !== index)
      }
    });
  };

  // Getting Started Steps functions
  const updateStep = (index, field, value) => {
    const updated = [...form.guide.steps];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, guide: { ...form.guide, steps: updated } });
  };

  const addStep = () => {
    setForm({
      ...form,
      guide: {
        ...form.guide,
        steps: [...form.guide.steps, { title: "", description: "" }]
      }
    });
  };

  const removeStep = (index) => {
    setForm({
      ...form,
      guide: {
        ...form.guide,
        steps: form.guide.steps.filter((_, i) => i !== index)
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading homepage data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Admin Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/admin"
                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                ← Back to Admin
              </Link>
              <div className="h-6 border-l border-white/20"></div>
              <h1 className="text-xl font-bold">HomePage Editor</h1>
              <div className="px-3 py-1 bg-purple-600/20 rounded-full text-sm">EDIT MODE</div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors text-white text-sm"
              >
                🏠 Preview
              </Link>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  "💾 Save All Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation (Static) */}
      <nav className="relative z-10 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-xl font-bold">🎮</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Real-G Launcher
              </h1>
              <div className="text-xs text-purple-400 flex items-center gap-1">
                <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                Admin Edit Mode
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-6 py-2.5 bg-white/10 text-white rounded-xl text-sm opacity-50">Login</div>
            <div className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl text-sm opacity-50">Get Started</div>
          </div>
        </div>
      </nav>

      {/* Hero Section (Static) */}
      <section className="relative py-24 lg:py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight">
            Your Ultimate
            <span className="block mt-2">Gaming Hub</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto">
            Discover, download, and play thousands of amazing games.
            <span className="block mt-3 text-lg text-white/70">Join the gaming revolution today!</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <div className="px-10 py-5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl font-semibold text-lg opacity-50">🚀 Start Gaming Now</div>
            <div className="px-10 py-5 bg-white/10 text-white rounded-2xl font-semibold text-lg border border-white/30 opacity-50">Already a member? Sign In</div>
          </div>
        </div>
      </section>

      {/* Why Choose Real-G Section - EDITABLE */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Why Choose Real-G?
            </h2>
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">Everything you need for the ultimate gaming experience</p>
          </div>
          
          {/* Add Card Button */}
          <div className="mb-8 text-center">
            <button
              onClick={addWhyChooseUsCard}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              + Add Why Choose Us Card
            </button>
          </div>

          {/* Why Choose Us Cards - Dynamic */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {form.whyChooseUs.length > 0 ? (
              form.whyChooseUs.map((card, index) => {
                const gradients = [
                  'from-blue-500 to-purple-500', 
                  'from-green-500 to-blue-500', 
                  'from-purple-500 to-pink-500',
                  'from-red-500 to-orange-500',
                  'from-cyan-500 to-blue-500',
                  'from-pink-500 to-purple-500',
                  'from-orange-500 to-red-500',
                  'from-indigo-500 to-purple-500',
                  'from-yellow-500 to-orange-500'
                ];
                
                return (
                  <div key={index} className="group relative p-8 bg-white/5 backdrop-blur-sm rounded-3xl border-2 border-purple-500/50 hover:border-purple-400 transition-all duration-500">
                    {/* Edit indicator */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs">✏️</div>
                    
                    {/* Remove button */}
                    <button
                      onClick={() => removeWhyChooseUsCard(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-xs transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                    
                    {/* Simple gradient header instead of icon */}
                    <div className={`w-full h-4 bg-gradient-to-r ${gradients[index % gradients.length]} rounded-lg mb-6`}></div>
                    
                    <input
                      type="text"
                      placeholder={`Card ${index + 1} title... *`}
                      value={card.title || ""}
                      onChange={(e) => updateWhyChooseUs(index, 'title', e.target.value)}
                      className={`w-full text-2xl font-bold mb-4 bg-transparent border-b-2 focus:outline-none transition-colors ${
                        !card.title?.trim() ? 'border-red-500 text-red-300' : 'border-transparent hover:border-white/20 focus:border-blue-400 text-white'
                      }`}
                      required
                    />
                    
                    <textarea
                      placeholder={`Card ${index + 1} description... *`}
                      value={card.content || ""}
                      onChange={(e) => updateWhyChooseUs(index, 'content', e.target.value)}
                      className={`w-full bg-transparent border-2 rounded-lg p-3 focus:outline-none transition-colors resize-none ${
                        !card.content?.trim() ? 'border-red-500/50 text-red-300' : 'border-white/10 hover:border-white/20 focus:border-blue-400 text-white/70'
                      }`}
                      rows={4}
                      required
                    />
                  </div>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12">
                <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">📝</span>
                </div>
                <p className="text-white/70 text-lg mb-4">No cards added yet</p>
                <p className="text-white/50 text-sm">Click "Add Why Choose Us Card" to get started</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Games Section (Static Placeholder) */}
      <section className="py-20 lg:py-24 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Featured Games
            </h2>
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">Discover the hottest games in our collection</p>
          </div>
          
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎮</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Coming Soon!</h3>
            <p className="text-white/70 text-lg">Featured games will be displayed here once the API endpoint is implemented.</p>
          </div>
        </div>
      </section>

      {/* About Us & System Requirements - EDITABLE */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* About Us */}
            <div className="space-y-6 p-6 bg-white/5 rounded-2xl border-2 border-blue-500/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">✏️</span>
                <span className="text-sm text-blue-400 font-medium">EDITABLE SECTION</span>
              </div>
              
              <input
                type="text"
                placeholder="Section title... *"
                value={form.aboutUs?.title || ""}
                onChange={(e) => setForm({ ...form, aboutUs: { ...form.aboutUs, title: e.target.value } })}
                className={`w-full text-3xl md:text-4xl font-bold bg-transparent border-b-2 focus:outline-none transition-colors bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text ${
                  !form.aboutUs?.title?.trim() ? 'border-red-500' : 'border-transparent hover:border-white/20 focus:border-blue-400'
                }`}
                required
              />
              
              <textarea
                placeholder="About us content..."
                value={form.aboutUs?.content || ""}
                onChange={(e) => setForm({ ...form, aboutUs: { ...form.aboutUs, content: e.target.value } })}
                className="w-full text-lg text-white/80 leading-relaxed bg-transparent border-2 border-white/10 hover:border-white/20 focus:border-blue-400 rounded-lg p-4 focus:outline-none transition-colors resize-none"
                rows={6}
              />
              
              {/* Editable Stats */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-blue-400">Statistics</h4>
                  <button
                    onClick={addStat}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                  >
                    + Add Stat
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-6">
                  {form.aboutUs.stats.map((stat, index) => {
                    const colors = ['text-blue-400', 'text-purple-400', 'text-green-400', 'text-yellow-400', 'text-red-400'];
                    return (
                      <div key={index} className="text-center group relative">
                        <button
                          onClick={() => removeStat(index)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-xs transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ✕
                        </button>
                        <input
                          type="text"
                          placeholder="Value"
                          value={stat.value || ""}
                          onChange={(e) => updateStat(index, 'value', e.target.value)}
                          className={`text-2xl font-bold ${colors[index % colors.length]} bg-transparent border-b border-white/20 focus:border-blue-400 focus:outline-none text-center w-20 mb-1`}
                        />
                        <input
                          type="text"
                          placeholder="Label"
                          value={stat.label || ""}
                          onChange={(e) => updateStat(index, 'label', e.target.value)}
                          className="text-sm text-white/60 bg-transparent border-b border-white/10 focus:border-blue-400 focus:outline-none text-center w-24"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* System Requirements */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border-2 border-green-500/50">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xl">✏️</span>
                <span className="text-sm text-green-400 font-medium">EDITABLE REQUIREMENTS</span>
              </div>
              
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">💻</span>
                <input
                  type="text"
                  placeholder="Section title... *"
                  value={form.pcSpecs?.title || ""}
                  onChange={(e) => setForm({ ...form, pcSpecs: { ...form.pcSpecs, title: e.target.value } })}
                  className={`flex-1 text-2xl font-bold bg-transparent border-b-2 focus:outline-none transition-colors ${
                    !form.pcSpecs?.title?.trim() ? 'border-red-500 text-red-300' : 'border-transparent hover:border-white/20 focus:border-blue-400 text-white'
                  }`}
                  required
                />
              </div>
              
              {/* Editable system requirements */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-green-400">Requirements</h4>
                  <button
                    onClick={addRequirement}
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm transition-colors"
                  >
                    + Add Requirement
                  </button>
                </div>
                
                {form.pcSpecs.requirements.map((req, index) => (
                  <div key={index} className="group relative flex items-center gap-4 py-3 border-b border-white/10">
                    <button
                      onClick={() => removeRequirement(index)}
                      className="w-5 h-5 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-xs transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                    <input
                      type="text"
                      placeholder="Requirement name"
                      value={req.key || ""}
                      onChange={(e) => updateRequirement(index, 'key', e.target.value)}
                      className="flex-1 text-white/70 font-medium bg-transparent border-b border-white/10 focus:border-blue-400 focus:outline-none p-1"
                    />
                    <input
                      type="text"
                      placeholder="Requirement value"
                      value={req.value || ""}
                      onChange={(e) => updateRequirement(index, 'value', e.target.value)}
                      className="flex-1 text-white font-medium bg-transparent border-b border-white/10 focus:border-blue-400 focus:outline-none p-1"
                    />
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-white/60 mt-4">
                * Recommended specs may vary depending on the games you want to play.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Guide - EDITABLE */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 p-6 bg-white/5 rounded-2xl border-2 border-yellow-500/50">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xl">✏️</span>
              <span className="text-sm text-yellow-400 font-medium">EDITABLE SECTION</span>
            </div>
            
            <input
              type="text"
              placeholder="Section title... *"
              value={form.guide?.title || ""}
              onChange={(e) => setForm({ ...form, guide: { ...form.guide, title: e.target.value } })}
              className={`w-full text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text bg-transparent border-b-2 focus:outline-none transition-colors text-center py-4 leading-tight ${
                !form.guide?.title?.trim() ? 'border-red-500' : 'border-transparent hover:border-white/20 focus:border-blue-400'
              }`}
              style={{ minHeight: '80px', lineHeight: '1.1' }}
              required
            />
            
            <textarea
              placeholder="Optional description for the getting started section..."
              value={form.guide?.content || ""}
              onChange={(e) => setForm({ ...form, guide: { ...form.guide, content: e.target.value } })}
              className="w-full text-xl text-white/70 max-w-3xl mx-auto leading-relaxed bg-transparent border-2 border-white/10 hover:border-white/20 focus:border-blue-400 rounded-lg p-4 focus:outline-none transition-colors resize-none"
              rows={3}
            />
          </div>
          
          {/* Editable Steps */}
          <div className="mb-8 text-center">
            <button
              onClick={addStep}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              + Add Step
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {form.guide.steps.map((step, index) => {
              const gradients = [
                'from-blue-500 to-purple-500',
                'from-purple-500 to-pink-500', 
                'from-pink-500 to-red-500',
                'from-red-500 to-orange-500',
                'from-orange-500 to-yellow-500',
                'from-yellow-500 to-green-500',
                'from-green-500 to-blue-500'
              ];
              
              return (
                <div key={index} className="text-center space-y-6 group relative p-6 bg-white/5 rounded-2xl border-2 border-yellow-500/50">
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center text-xs">✏️</div>
                  {form.guide.steps.length > 1 && (
                    <button
                      onClick={() => removeStep(index)}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-xs transition-colors opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  )}
                  
                  <div className={`w-20 h-20 bg-gradient-to-br ${gradients[index % gradients.length]} rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {index + 1}
                  </div>
                  
                  <input
                    type="text"
                    placeholder={`Step ${index + 1} title... *`}
                    value={step.title || ""}
                    onChange={(e) => updateStep(index, 'title', e.target.value)}
                    className={`w-full text-2xl font-bold bg-transparent border-b-2 focus:outline-none transition-colors text-center ${
                      !step.title?.trim() ? 'border-red-500 text-red-300' : 'border-transparent hover:border-white/20 focus:border-blue-400 text-white'
                    }`}
                    required
                  />
                  
                  <textarea
                    placeholder={`Step ${index + 1} description... *`}
                    value={step.description || ""}
                    onChange={(e) => updateStep(index, 'description', e.target.value)}
                    className={`w-full bg-transparent border-2 rounded-lg p-3 focus:outline-none transition-colors resize-none ${
                      !step.description?.trim() ? 'border-red-500/50 text-red-300' : 'border-white/10 hover:border-white/20 focus:border-blue-400 text-white/70'
                    }`}
                    rows={3}
                    required
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer (Static) */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold">🎮</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Real-G Launcher
              </span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-white/60 text-sm">
                © 2024 Real-G Launcher. All rights reserved.
              </p>
              <p className="text-white/40 text-xs mt-1">
                Made for gamers, by gamers
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
