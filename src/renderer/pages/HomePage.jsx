import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function HomePage() {
  const [data, setData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState('fallback'); // 'api' or 'fallback'
  const navigate = useNavigate();

  useEffect(() => {
    console.log('HomePage: Component mounted, attempting to fetch data');
    
    const fetchHomePageData = async () => {
      try {
        console.log('Fetching homepage data from API...');
        const response = await api.get("/homepage");
        if (response.data) {
          console.log('✅ Homepage data received from API:', response.data);
          setData(response.data);
          setDataSource('api');
        } else {
          console.warn('⚠️ API returned no data, using fallback content');
          setData({});
          setDataSource('fallback');
        }
      } catch (error) {
        console.error("❌ HomePage API fetch error:", error);
        console.log('📄 Using fallback content for HomePage');
        setData({});
        setDataSource('fallback');
      } finally {
        setIsLoading(false);
      }
    };

    // Show content immediately, fetch data in background
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // Maximum 1 second loading for better UX

    fetchHomePageData().finally(() => {
      clearTimeout(timer);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-pink-500/10 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 p-6 animate-fade-in-down">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 animate-slide-in-left">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center transform hover:scale-110 hover:rotate-12 transition-all duration-300 shadow-lg hover:shadow-blue-500/50">
              <span className="text-xl font-bold">🎮</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-purple-400 hover:to-pink-400 transition-all duration-500">
                Real-G Launcher
              </h1>
              {dataSource === 'api' && (
                <div className="text-xs text-green-400 flex items-center gap-1 animate-pulse">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                  Live Content
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 animate-slide-in-right">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 font-medium border border-white/20 hover:border-white/40 backdrop-blur-sm transform hover:scale-105 hover:-translate-y-1 hover:shadow-lg"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-blue-500/25 transform hover:scale-105 hover:-translate-y-1"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 lg:py-32 px-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl animate-pulse-slow"></div>
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent leading-tight animate-fade-in-up animation-delay-500">
            <span className="inline-block animate-slide-in-left animation-delay-700">Your Ultimate</span>
            <span className="block mt-2 animate-slide-in-right animation-delay-1000">Gaming Hub</span>
          </h2>
          <p className="text-xl md:text-2xl text-white/80 mb-12 leading-relaxed max-w-3xl mx-auto animate-fade-in-up animation-delay-1200" style={{ padding: '25px' }}>
            <span className="inline-block animate-typewriter">Discover, download, and play thousands of amazing games.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-fade-in-up animation-delay-1500">
            <button
              onClick={() => navigate('/register')}
              className="w-80 py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl transition-all duration-500 font-semibold text-lg shadow-xl hover:shadow-blue-500/50 transform hover:scale-110 hover:-translate-y-2 hover:rotate-1 animate-pulse-glow"
            >
              🚀 Start Gaming Now
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-80 py-5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all duration-500 font-semibold text-lg border border-white/30 hover:border-white/50 backdrop-blur-sm hover:-translate-y-2 transform hover:scale-110 hover:-rotate-1"
            >
              Already a member? Sign In
            </button>
          </div>
          
          {/* Scroll Animation */}
          <div className="flex flex-col items-center mt-16 animate-fade-in-up animation-delay-2000">
            <div className="animate-bounce text-white/60 mb-4 hover:text-white/80 transition-colors duration-300">
              <svg className="w-6 h-6 transform hover:scale-125 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <p className="text-white/50 text-sm font-medium tracking-wide hover:tracking-widest transition-all duration-300">SCROLL TO EXPLORE</p>
          </div>
        </div>
      </section>
      
      {/* Separator Line */}
      <div className="relative animate-fade-in animation-delay-2200">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
        </div>
        <div className="relative flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center backdrop-blur-sm animate-spin-slow">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Apps Section */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-fade-in-up animation-delay-300">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-7 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent hover:from-purple-400 hover:to-pink-400 transition-all duration-1000 transform hover:scale-105">
              Why Choose Real-G?
            </h2>
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-500" style={{ padding: '25px' }}>Everything you need for the ultimate gaming experience</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {data.featuresApps && data.featuresApps.length > 0 ? (
              data.featuresApps.map((feature, index) => {
                // Define icon and color variations for dynamic features
                const icons = ['🎮', '⚡', '👥', '🚀', '🎯', '💎', '🔥', '⭐', '🏆'];
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
                const hoverColors = [
                  'group-hover:text-blue-300',
                  'group-hover:text-green-300',
                  'group-hover:text-purple-300',
                  'group-hover:text-red-300',
                  'group-hover:text-cyan-300',
                  'group-hover:text-pink-300',
                  'group-hover:text-orange-300',
                  'group-hover:text-indigo-300',
                  'group-hover:text-yellow-300'
                ];
                const shadowColors = [
                  'hover:shadow-blue-500/10',
                  'hover:shadow-green-500/10',
                  'hover:shadow-purple-500/10',
                  'hover:shadow-red-500/10',
                  'hover:shadow-cyan-500/10',
                  'hover:shadow-pink-500/10',
                  'hover:shadow-orange-500/10',
                  'hover:shadow-indigo-500/10',
                  'hover:shadow-yellow-500/10'
                ];

  return (
                  <div key={index} className={`group relative p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl ${shadowColors[index % shadowColors.length]}`}>
                    {/* Simple gradient header instead of icon */}
                    <div className={`w-full h-4 bg-gradient-to-r ${gradients[index % gradients.length]} rounded-lg mb-6`}></div>
                    <h3 className={`text-2xl font-bold mb-4 text-white ${hoverColors[index % hoverColors.length]} transition-colors duration-300`}>{feature.title}</h3>
                    <p className="text-white/70 leading-relaxed text-lg">{feature.content}</p>
                  </div>
                );
              })
            ) : (
              // Fallback content when no dynamic data is available
              <>
                <div className="group relative p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-500/10">
                  <div className="w-full h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-6"></div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-blue-300 transition-colors duration-300">Massive Game Library</h3>
                  <p className="text-white/70 leading-relaxed text-lg">Access thousands of games from indie gems to AAA blockbusters. Something for every gamer!</p>
                </div>
                
                <div className="group relative p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-500/10">
                  <div className="w-full h-4 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mb-6"></div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-green-300 transition-colors duration-300">Lightning Fast Downloads</h3>
                  <p className="text-white/70 leading-relaxed text-lg">Ultra-fast download speeds and intelligent file management. Get into the action quicker!</p>
                </div>
                
                <div className="group relative p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-500 hover:bg-white/10 hover:scale-105 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-500/10">
                  <div className="w-full h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-6"></div>
                  <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-purple-300 transition-colors duration-300">Gaming Community</h3>
                  <p className="text-white/70 leading-relaxed text-lg">Connect with friends, join gaming communities, and share your achievements with fellow gamers.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Featured Games Section - TODO: Implement API endpoint */}
      <section className="py-20 lg:py-24 px-6 bg-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
              Featured Games
            </h2>
            <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto leading-relaxed">Discover the hottest games in our collection</p>
          </div>
          
          {/* Placeholder for featured games - will be replaced with API data */}
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎮</span>
            </div>
            <h3 className="text-2xl font-bold mb-4">Coming Soon!</h3>
            <p className="text-white/70 text-lg">Featured games will be displayed here once the API endpoint is implemented.</p>
            </div>
        </div>
      </section>

      {/* About Us & Info Sections */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
      {/* About Us */}
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {data.aboutUs?.title || "About Real-G Launcher"}
              </h2>
              <p className="text-lg text-white/80 leading-relaxed">
                {data.aboutUs?.content || "Welcome to Real-G Launcher, your ultimate gaming platform. We provide access to the best games and create an amazing community for gamers worldwide. Our mission is to make gaming accessible, enjoyable, and social for everyone."}
              </p>
              <div className="flex items-center gap-4 pt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">10K+</div>
                  <div className="text-sm text-white/60">Active Gamers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">500+</div>
                  <div className="text-sm text-white/60">Games Available</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">24/7</div>
                  <div className="text-sm text-white/60">Support</div>
                </div>
              </div>
            </div>

          {/* System Requirements */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <span className="text-2xl">💻</span>
              {data.pcSpecs?.title || "System Requirements"}
            </h3>
            
            {/* Dynamic requirements from admin */}
            <div className="space-y-4">
              {(() => {
                let requirements = [];
                try {
                  requirements = JSON.parse(data.pcSpecs?.content || "[]");
                } catch {
                  // Fallback to default requirements
                  requirements = [
                    { key: "Operating System", value: "Windows 10 or higher" },
                    { key: "Processor", value: "Intel Core i3 or equivalent" },
                    { key: "Memory (RAM)", value: "4GB minimum" },
                    { key: "Graphics", value: "DirectX 11 compatible" },
                    { key: "Network", value: "Broadband connection" },
                    { key: "Storage", value: "10GB available space" }
                  ];
                }
                
                return requirements.map((req, index) => (
                  <div key={index} className={`flex justify-between items-center py-3 ${index < requirements.length - 1 ? 'border-b border-white/10' : ''}`}>
                    <span className="text-white/70 font-medium">{req.key}</span>
                    <span className="text-white font-medium">{req.value}</span>
                  </div>
                ));
              })()}
            </div>
            
            <p className="text-sm text-white/60 mt-4">
              * Recommended specs may vary depending on the games you want to play.
            </p>
          </div>
          </div>
        </div>
      </section>

      {/* Getting Started Guide */}
      <section className="py-20 lg:py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {data.guide?.title || "Getting Started is Easy!"}
            </h2>
            {(() => {
              let description = "";
              try {
                const guideData = JSON.parse(data.guide?.content || "{}");
                description = guideData.description || "";
              } catch {
                description = "";
              }
              
              return description && (
                <p className="text-xl text-white/70 max-w-3xl mx-auto leading-relaxed" style={{ padding: '25px' }}>
                  {description}
                </p>
              );
            })()}
          </div>
          
          {/* Dynamic steps from admin */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
            {(() => {
              let steps = [];
              try {
                const guideData = JSON.parse(data.guide?.content || "{}");
                steps = guideData.steps || [];
              } catch {
                steps = [];
              }
              
              // Fallback to default steps if none exist
              if (steps.length === 0) {
                steps = [
                  { title: "Create Account", description: "Register with your email and create your gaming profile in seconds." },
                  { title: "Browse Games", description: "Explore our vast library of games across all genres and platforms." },
                  { title: "Start Playing", description: "Download, install, and dive into your favorite games instantly!" }
                ];
              }
              
              const gradients = [
                'from-blue-500 to-purple-500',
                'from-purple-500 to-pink-500', 
                'from-pink-500 to-red-500',
                'from-red-500 to-orange-500',
                'from-orange-500 to-yellow-500',
                'from-yellow-500 to-green-500',
                'from-green-500 to-blue-500'
              ];
              
              return steps.map((step, index) => (
                <div key={index} className="text-center space-y-6 group">
                  <div className={`w-20 h-20 bg-gradient-to-br ${gradients[index % gradients.length]} rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    {index + 1}
                  </div>
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                  <p className="text-white/70 text-lg leading-relaxed" >{step.description}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      </section>


      {/* Footer */}
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
