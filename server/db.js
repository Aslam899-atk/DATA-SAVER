const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB DATA ENGINE ACTIVE'))
  .catch(err => console.error('❌ MONGODB CONNECTION ERROR:', err));

// --- SCHEMAS ---

const chestSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  title: String,
  tier: String,
  droppedBy: String,
  fileName: String,
  fileSize: String,
  fileUrl: String,
  files: [mongoose.Schema.Types.Mixed],
  hasPin: Boolean,
  pin: String,
  maxOpens: Number,
  currentOpens: { type: Number, default: 0 },
  expiresAt: Number,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  picture: String,
  tier: { type: String, default: 'bronze' },
  lastLogin: { type: Date, default: Date.now }
});

const adSchema = new mongoose.Schema({
  title: String,
  imageUrl: String,
  videoUrl: String,
  link: String,
  createdAt: { type: Date, default: Date.now }
});

// --- MODELS ---
const Chest = mongoose.model('Chest', chestSchema);
const User = mongoose.model('User', userSchema);
const Ad = mongoose.model('Ad', adSchema);

// --- DB INTERFACE ---

module.exports = {
  // Common read/write if needed for entire DB object (Legacy support)
  read: async () => {
    const chests = await Chest.find();
    const users = await User.find();
    const ads = await Ad.find();
    return { chests, users, ads };
  },
  
  write: async (data) => {
    // Legacy support for directly writing state back
    if (data.chests) {
      for (const c of data.chests) {
        if (c._id && mongoose.Types.ObjectId.isValid(c._id)) {
           await Chest.findByIdAndUpdate(c._id, c, { upsert: true });
        }
      }
    }
  },

  // Helpers
  getChests: async () => await Chest.find(),
  saveChest: async (chest) => {
    const newChest = new Chest(chest);
    return await newChest.save();
  },
  
  getUsers: async () => await User.find(),
  saveUser: async (userData) => {
    let user = await User.findOne({ googleId: userData.googleId });
    if (user) {
      user.lastLogin = Date.now();
      user.name = userData.name;
      user.picture = userData.picture;
      return await user.save();
    } else {
      user = new User({ ...userData, lastLogin: Date.now() });
      return await user.save();
    }
  },

  getAds: async () => await Ad.find(),
  saveAd: async (adData) => {
    const newAd = new Ad(adData);
    return await newAd.save();
  }
};
