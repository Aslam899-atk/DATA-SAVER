const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

// --- Cloudinary Config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'data_saver_drops',
    resource_type: 'auto', 
  },
});
const upload = multer({ storage: storage });

// --- MongoDB Setup ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error: ", err));

// --- Schemas & Models ---
const UserSchema = new mongoose.Schema({
  googleId: String,
  email: String,
  username: String,
  lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

const ChestSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  tier: { type: String, enum: ['gold', 'silver', 'bronze'] },
  fileName: String,
  fileSize: String,
  fileUrl: String,   
  droppedBy: String,
  hasPin: Boolean,
  pin: String,
  maxOpens: Number,
  currentOpens: { type: Number, default: 0 },
  expiresAt: Number, 
  requiresRequest: { type: Boolean, default: false },
  requests: [{
    from: String,
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' }
  }],
  createdAt: { type: Date, default: Date.now },
});

const Chest = mongoose.model('Chest', ChestSchema);

const AdSchema = new mongoose.Schema({
  title: String,
  imageUrl: String,
  videoUrl: String,
  link: String,
  createdAt: { type: Date, default: Date.now },
});

const Ad = mongoose.model('Ad', AdSchema);

// --- Routes ---

app.post('/api/users/login', async (req, res) => {
  try {
    const { googleId, email, username } = req.body;
    let user = await User.findOne({ googleId });
    if (user) {
      user.lastLogin = Date.now();
      await user.save();
    } else {
      user = new User({ googleId, email, username });
      await user.save();
    }
    res.json(user);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ lastLogin: -1 });
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});
app.get('/api/chests', async (req, res) => {
  try {
    const chests = await Chest.find();
    // Auto-cleanup expired
    const validChests = chests.filter(c => !c.expiresAt || c.expiresAt > Date.now());
    res.json(validChests);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/chests', upload.single('file'), async (req, res) => {
  try {
    const { lat, lng, tier, droppedBy, pin, maxOpens, expiresAt, requiresRequest } = req.body;
    let fileUrl = '';
    let fileName = 'DATA.DAT';
    let fileSize = 'UNKNOWN';

    if (req.file) {
      fileUrl = req.file.path;
      fileName = req.file.originalname;
      fileSize = (req.file.size / (1024*1024)).toFixed(2) + 'MB'; 
    }

    const newChest = new Chest({
      lat: Number(lat), lng: Number(lng), tier, fileName, fileSize, fileUrl, droppedBy,
      hasPin: pin ? true : false,
      pin: pin || '',
      maxOpens: maxOpens ? Number(maxOpens) : undefined,
      expiresAt: expiresAt ? Number(expiresAt) : undefined,
      requiresRequest: requiresRequest === 'true',
      currentOpens: 0
    });

    const savedChest = await newChest.save();
    res.status(201).json(savedChest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Update Opens
app.patch('/api/chests/:id/open', async (req, res) => {
  try {
    const chest = await Chest.findById(req.params.id);
    if (!chest) return res.status(404).json({ message: "Not found" });
    if (chest.maxOpens && chest.currentOpens >= chest.maxOpens) return res.status(403).json({ message: "Limit Reached" });
    if (chest.expiresAt && Date.now() > chest.expiresAt) return res.status(403).json({ message: "Expired" });

    chest.currentOpens += 1;
    await chest.save();
    res.json(chest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Send Request
app.post('/api/chests/:id/request', async (req, res) => {
  try {
    const { from } = req.body;
    const chest = await Chest.findById(req.params.id);
    if (!chest.requests.find(r => r.from === from)) {
       chest.requests.push({ from, status: 'pending' });
       await chest.save();
    }
    res.json(chest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Response to Request
app.patch('/api/chests/:id/requests', async (req, res) => {
  try {
    const { from, status } = req.body;
    const chest = await Chest.findById(req.params.id);
    const reqIndex = chest.requests.findIndex(r => r.from === from);
    if (reqIndex > -1) {
       chest.requests[reqIndex].status = status;
       await chest.save();
    }
    res.json(chest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/chests/:id', async (req, res) => {
  try { await Chest.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); 
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/ads', async (req, res) => {
  try {
    const ads = await Ad.find().sort({ createdAt: -1 });
    res.json(ads);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ads', async (req, res) => {
  try {
    const { title, imageUrl, videoUrl, link } = req.body;
    const newAd = new Ad({ title, imageUrl, videoUrl, link });
    await newAd.save();
    res.status(201).json(newAd);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/ads/:id', async (req, res) => {
  try {
    await Ad.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/admin/migrate-tiers', async (req, res) => {
  try {
     const result = await Chest.updateMany({ tier: 'bronze' }, { $set: { tier: 'platinum' } });
     res.json({ message: 'Migration successful', modifiedCount: result.modifiedCount });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
