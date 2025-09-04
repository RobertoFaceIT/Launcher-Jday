const mongoose = require('mongoose');
const Game = require('./models/Game');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Sample games data
const sampleGames = [
  {
    title: "Skydom Origins",
    description: "A magical open-world sky survival RPG where you build floating islands, tame sky creatures, and explore endless cloudscapes. Master the art of sky magic while defending your realm from aerial threats in this breathtaking adventure that combines building, survival, and exploration elements.",
    image: null, // Will use placeholder div
    screenshots: [null, null, null, null], // Will use placeholder divs
    price: 29.99,
    originalPrice: 39.99,
    features: [
      "Open-world sky exploration",
      "Island building mechanics", 
      "Sky creature taming",
      "Magical combat system",
      "Multiplayer co-op support",
      "Dynamic weather system",
      "Crafting and resource management",
      "Epic boss battles"
    ],
    systemRequirements: {
      minimum: {
        os: "Windows 10 64-bit",
        processor: "Intel i5-4430 / AMD FX-6300",
        memory: "8 GB RAM",
        graphics: "NVIDIA GTX 960 / AMD R9 280",
        storage: "25 GB available space"
      },
      recommended: {
        os: "Windows 11 64-bit", 
        processor: "Intel i7-8700K / AMD Ryzen 5 3600",
        memory: "16 GB RAM",
        graphics: "NVIDIA GTX 1070 / AMD RX 580",
        storage: "25 GB available space (SSD recommended)"
      }
    },
    rating: 4.7,
    reviewCount: 2847,
    developer: "SkyForge Studios",
    publisher: "Celestial Games",
    releaseDate: new Date("2024-03-15"),
    genre: ["RPG", "Survival", "Adventure", "Building"]
  },
  {
    title: "Pixel Pirates",
    description: "Sail the seven seas in this charming pixel-art adventure! Build your crew, customize your ship, and search for legendary treasure in a world full of danger and wonder. Experience the golden age of piracy with modern gameplay mechanics.",
    image: null,
    screenshots: [null, null, null, null],
    price: 19.99,
    originalPrice: 24.99,
    features: [
      "Retro pixel-art graphics",
      "Ship customization system",
      "Crew management mechanics",
      "Naval combat battles",
      "Treasure hunting quests",
      "Story-driven campaign",
      "Multiple islands to explore",
      "Trading and economy system"
    ],
    systemRequirements: {
      minimum: {
        os: "Windows 7 64-bit",
        processor: "Intel i3-2100 / AMD A8-6600K", 
        memory: "4 GB RAM",
        graphics: "DirectX 11 compatible",
        storage: "2 GB available space"
      },
      recommended: {
        os: "Windows 10 64-bit",
        processor: "Intel i5-4590 / AMD FX-8350",
        memory: "8 GB RAM", 
        graphics: "DirectX 11 compatible",
        storage: "2 GB available space (SSD recommended)"
      }
    },
    rating: 4.3,
    reviewCount: 1256,
    developer: "Indie Sea Studios",
    publisher: "Retro Games Inc",
    releaseDate: new Date("2024-01-20"),
    genre: ["Adventure", "Action", "Indie", "Simulation"]
  },
  {
    title: "TechRush 2088",
    description: "Defend the last human city in this cyberpunk tower-defense game. Use advanced technology, deploy cyber soldiers, and hack enemy systems in a neon-soaked future where humanity's survival depends on your strategic decisions.",
    image: null,
    screenshots: [null, null, null, null],
    price: 24.99,
    originalPrice: 24.99,
    features: [
      "Cyberpunk aesthetic design",
      "Strategic tower defense gameplay",
      "Advanced hacking mechanics",
      "Comprehensive upgrade systems",
      "Epic boss battle encounters",
      "Endless survival mode",
      "Futuristic weapons and tech",
      "Multiple difficulty levels"
    ],
    systemRequirements: {
      minimum: {
        os: "Windows 8.1 64-bit",
        processor: "Intel i5-6500 / AMD Ryzen 3 1200",
        memory: "6 GB RAM",
        graphics: "NVIDIA GTX 750 Ti / AMD R7 260X",
        storage: "8 GB available space"
      },
      recommended: {
        os: "Windows 10 64-bit",
        processor: "Intel i7-7700K / AMD Ryzen 5 2600", 
        memory: "12 GB RAM",
        graphics: "NVIDIA GTX 1060 / AMD RX 570",
        storage: "8 GB available space (SSD recommended)"
      }
    },
    rating: 4.5,
    reviewCount: 892,
    developer: "Neon Defense",
    publisher: "Future Games",
    releaseDate: new Date("2024-06-10"),
    genre: ["Strategy", "Tower Defense", "Cyberpunk", "Action"]
  },
  {
    title: "Mystic Realms",
    description: "Embark on an epic fantasy RPG journey through mystical realms filled with magic, monsters, and ancient secrets. Create your hero, master powerful spells, and forge alliances in this immersive fantasy world.",
    image: null,
    screenshots: [null, null, null, null],
    price: 34.99,
    originalPrice: 49.99,
    features: [
      "Immersive fantasy world",
      "Character customization",
      "Magic spell system",
      "Dragon companions",
      "Guild alliance system",
      "PvP combat arenas",
      "Dungeon exploration",
      "Crafting and enchanting"
    ],
    systemRequirements: {
      minimum: {
        os: "Windows 10 64-bit",
        processor: "Intel i5-8400 / AMD Ryzen 5 2600",
        memory: "8 GB RAM", 
        graphics: "NVIDIA GTX 1050 / AMD RX 560",
        storage: "35 GB available space"
      },
      recommended: {
        os: "Windows 11 64-bit",
        processor: "Intel i7-10700K / AMD Ryzen 7 3700X",
        memory: "16 GB RAM",
        graphics: "NVIDIA GTX 1660 Ti / AMD RX 6600",
        storage: "35 GB available space (SSD recommended)"
      }
    },
    rating: 4.6,
    reviewCount: 4521,
    developer: "Arcane Studios",
    publisher: "Fantasy Interactive",
    releaseDate: new Date("2024-02-14"),
    genre: ["RPG", "Fantasy", "Adventure", "Action"]
  },
  {
    title: "Space Frontier",
    description: "Explore the vast cosmos in this space exploration and trading simulator. Build your fleet, establish trade routes, and discover new planets while navigating the dangers of deep space.",
    image: "https://via.placeholder.com/800x450.png?text=Space+Frontier",
    screenshots: [
      "https://via.placeholder.com/400x225.png?text=Space+Station",
      "https://via.placeholder.com/400x225.png?text=Planet+Surface",
      "https://via.placeholder.com/400x225.png?text=Fleet+Management",
      "https://via.placeholder.com/400x225.png?text=Space+Battle"
    ],
    price: 27.99,
    originalPrice: 27.99,
    features: [
      "Galaxy exploration",
      "Fleet management system",
      "Planetary colonization",
      "Trade route optimization",
      "Space combat mechanics",
      "Resource mining operations",
      "Diplomatic negotiations",
      "Technology research tree"
    ],
    systemRequirements: {
      minimum: {
        os: "Windows 10 64-bit",
        processor: "Intel i5-7600K / AMD Ryzen 5 1600",
        memory: "8 GB RAM",
        graphics: "NVIDIA GTX 1060 / AMD RX 580",
        storage: "20 GB available space"
      },
      recommended: {
        os: "Windows 11 64-bit",
        processor: "Intel i7-9700K / AMD Ryzen 7 2700X",
        memory: "16 GB RAM",
        graphics: "NVIDIA GTX 1070 Ti / AMD RX 6700 XT",
        storage: "20 GB available space (SSD recommended)"
      }
    },
    rating: 4.2,
    reviewCount: 1673,
    developer: "Cosmic Games",
    publisher: "Stellar Entertainment",
    releaseDate: new Date("2024-05-03"),
    genre: ["Simulation", "Strategy", "Space", "Trading"]
  },
  {
    title: "Urban Legends",
    description: "Investigate paranormal mysteries in this thrilling horror adventure. Uncover dark secrets, solve supernatural puzzles, and survive encounters with otherworldly entities in atmospheric urban environments.",
    image: "https://via.placeholder.com/800x450.png?text=Urban+Legends",
    screenshots: [
      "https://via.placeholder.com/400x225.png?text=Dark+Alley",
      "https://via.placeholder.com/400x225.png?text=Investigation",
      "https://via.placeholder.com/400x225.png?text=Supernatural+Entity",
      "https://via.placeholder.com/400x225.png?text=Urban+Environment"
    ],
    price: 22.99,
    originalPrice: 29.99,
    features: [
      "Atmospheric horror experience",
      "Investigation mechanics",
      "Supernatural puzzle solving",
      "Multiple story paths",
      "Psychological thriller elements",
      "Urban exploration",
      "Choice-driven narrative",
      "Immersive sound design"
    ],
    systemRequirements: {
      minimum: {
        os: "Windows 10 64-bit",
        processor: "Intel i5-6600K / AMD Ryzen 5 1500X",
        memory: "8 GB RAM",
        graphics: "NVIDIA GTX 970 / AMD RX 570",
        storage: "15 GB available space"
      },
      recommended: {
        os: "Windows 11 64-bit",
        processor: "Intel i7-8700K / AMD Ryzen 7 2700X",
        memory: "16 GB RAM",
        graphics: "NVIDIA GTX 1660 Super / AMD RX 6600",
        storage: "15 GB available space (SSD recommended)"
      }
    },
    rating: 4.4,
    reviewCount: 987,
    developer: "Shadow Interactive",
    publisher: "Dark Mystery Games",
    releaseDate: new Date("2024-04-12"),
    genre: ["Horror", "Adventure", "Mystery", "Thriller"]
  }
];

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/launcher_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing games
    await Game.deleteMany({});
    console.log('🗑️ Cleared existing games');

    // Insert sample games
    const insertedGames = await Game.insertMany(sampleGames);
    console.log(`✅ Successfully seeded ${insertedGames.length} games to the database`);

    // Display seeded games
    insertedGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.title} - $${game.price} (${game.genre.join(', ')})`);
    });

    console.log('\n🎮 Database seeded successfully!');
    console.log(`📊 Total games in database: ${await Game.countDocuments()}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the seed function
seedDatabase();