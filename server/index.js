const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

require('dotenv').config();

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
    resource_type: 'auto', // Accept any file type
  },
});
const upload = multer({ storage: storage });

// --- MongoDB Setup ---
mongoose.connect(process.env.MONGODB_URI).then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error: ", err));

// --- Schemas & Models ---
const ChestSchema = new mongoose.Schema({
  lat: Number,
  lng: Number,
  tier: String,
  fileName: String,
  fileSize: String,
  fileUrl: String,   // Cloudinary secure_url
  droppedBy: String,
  hasPin: Boolean,
  pin: String,
  isMystery: { type: Boolean, default: false },
  maxOpens: Number,
  currentOpens: { type: Number, default: 0 },
  expiresAt: Number, // Timestamp
  createdAt: { type: Date, default: Date.now },
});

const Chest = mongoose.model('Chest', ChestSchema);

// --- Routes ---
// Get all active chests
app.get('/api/chests', async (req, res) => {
  try {
    const chests = await Chest.find();
    
    // Filter out expired chests on read (optional, can also run cleanups)
    const validChests = chests.filter(c => {
      return !c.expiresAt || c.expiresAt > Date.now();
    });
    
    res.json(validChests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Drop a new chest (with file upload)
app.post('/api/chests', upload.single('file'), async (req, res) => {
  try {
    const { lat, lng, tier, droppedBy, pin, maxOpens, expiresAt } = req.body;
    let fileUrl = '';
    let fileName = 'OP_INTEL.DAT';
    let fileSize = 'UNKNOWN';

    if (req.file) {
      fileUrl = req.file.path;
      fileName = req.file.originalname;
      // Convert bytes to readable
      fileSize = req.file.size ? (req.file.size / (1024*1024)).toFixed(2) + 'MB' : '1.2MB'; 
    }

    const newChest = new Chest({
      lat: Number(lat),
      lng: Number(lng),
      tier,
      fileName,
      fileSize,
      fileUrl,
      droppedBy,
      hasPin: pin ? true : false,
      pin: pin || '',
      maxOpens: maxOpens ? Number(maxOpens) : undefined,
      expiresAt: expiresAt ? Number(expiresAt) : undefined,
      currentOpens: 0
    });

    const savedChest = await newChest.save();
    res.status(201).json(savedChest);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Increment current opens (when someone successfully decrypts)
app.patch('/api/chests/:id/open', async (req, res) => {
  try {
    const chest = await Chest.findById(req.params.id);
    if (!chest) return res.status(404).json({ message: "Not found" });

    // Validate limit and expiry
    if (chest.maxOpens && chest.currentOpens >= chest.maxOpens) {
      return res.status(403).json({ message: "Limit Reached" });
    }
    if (chest.expiresAt && Date.now() > chest.expiresAt) {
      return res.status(403).json({ message: "Expired" });
    }

    chest.currentOpens += 1;
    await chest.save();
    res.json(chest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a chest
app.delete('/api/chests/:id', async (req, res) => {
  try {
    await Chest.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
