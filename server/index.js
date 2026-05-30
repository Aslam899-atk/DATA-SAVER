const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
const fs = require('fs');

if (fs.existsSync(path.join(__dirname, '.env'))) {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} else {
  require('dotenv').config(); // Fallback to host variables
}
const db = require('./db');
const { notifyDrop } = require('./telegram');

const app = express();
app.use(cors());

// Support large payloads (up to 50MB for JSON and urlencoded)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Statically serve local uploads with CORS
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure local uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// --- Cloudinary Config (Keep for legacy / Ads support) ---
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

// --- Local Storage Config (For chests up to 2GB) ---
const localDiskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const uploadLocal = multer({ 
  storage: localDiskStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB limit
});

// --- Routes ---

app.post('/api/users/login', async (req, res) => {
  try {
    const user = await db.saveUser(req.body);
    res.json(user);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/chests', async (req, res) => {
  try {
    const chests = await db.getChests();
    const validChests = chests.filter(c => !c.expiresAt || c.expiresAt > Date.now());
    res.json(validChests);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ADMIN: Get ALL chests with NO filtering (no expiry, no limits)
app.get('/api/admin/chests', async (req, res) => {
  try {
    const chests = await db.getChests();
    res.json(chests); // Return ALL — no expiry filter
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ADMIN: Open any chest bypassing PIN and open-limit checks
app.post('/api/admin/chests/:id/open', async (req, res) => {
  try {
    const chest = await db.Chest.findById(req.params.id);
    if (!chest) return res.status(404).json({ message: "NOT FOUND" });
    // No PIN check, no limit check — admin full bypass
    res.json(chest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/chests', uploadLocal.array('files', 15), async (req, res) => {
  try {
    const { lat, lng, title, tier, droppedBy, pin, maxOpens, expiresAt, silverTimer } = req.body;
    
    let uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      const baseUrl = req.protocol + '://' + req.get('host');
      uploadedFiles = req.files.map(f => ({
        fileUrl: `${baseUrl}/uploads/${f.filename}`,
        fileName: f.originalname,
        fileSize: (f.size / (1024*1024)).toFixed(2) + 'MB',
        mimeType: f.mimetype
      }));
    }

    const firstFile = uploadedFiles.length > 0 ? uploadedFiles[0] : { fileName: 'DATA.DAT', fileSize: 'UNKNOWN', fileUrl: '' };

    const newChest = {
      lat: Number(lat), lng: Number(lng), 
      title: title || droppedBy || 'SECURE DROP',
      tier, droppedBy,
      fileName: firstFile.fileName, 
      fileSize: firstFile.fileSize, 
      fileUrl: firstFile.fileUrl,
      files: uploadedFiles,
      hasPin: pin ? true : false,
      pin: pin || '',
      maxOpens: maxOpens ? Number(maxOpens) : undefined,
      silverTimer: silverTimer ? Number(silverTimer) : 15,
      expiresAt: expiresAt ? Number(expiresAt) : undefined,
      currentOpens: 0,
      createdAt: new Date().toISOString()
    };

    const savedChest = await db.saveChest(newChest);
    
    notifyDrop({
      tier,
      fileName: uploadedFiles.length > 1 ? `${uploadedFiles.length} FILES` : firstFile.fileName,
      fileSize: firstFile.fileSize,
      droppedBy,
      hasPin: pin ? true : false,
      fileUrl: firstFile.fileUrl
    });

    res.status(201).json(savedChest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.patch('/api/chests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const chest = await db.Chest.findById(id);
    if (!chest) return res.status(404).json({ message: "NOT FOUND" });
    
    if (updateData.tier !== undefined) {
      chest.tier = updateData.tier;
      if (updateData.tier === 'gold') {
        chest.hasPin = true;
        chest.pin = updateData.pin || chest.pin || '0000';
      } else {
        chest.hasPin = false;
        chest.pin = '';
      }
    }
    
    if (updateData.pin !== undefined && chest.tier === 'gold') {
      chest.pin = updateData.pin;
      chest.hasPin = true;
    }
    
    if (updateData.title !== undefined) chest.title = updateData.title;
    if (updateData.maxOpens !== undefined) chest.maxOpens = updateData.maxOpens ? Number(updateData.maxOpens) : undefined;
    if (updateData.expiresAt !== undefined) chest.expiresAt = updateData.expiresAt ? Number(updateData.expiresAt) : undefined;
    if (updateData.silverTimer !== undefined) chest.silverTimer = updateData.silverTimer ? Number(updateData.silverTimer) : 0;
    
    await chest.save();
    res.json(chest);
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

app.post('/api/chests/:id/open', async (req, res) => {
  try {
    const { id } = req.params;
    const { pin } = req.body;
    
    // Efficient Mongoose find
    const chest = await db.Chest.findById(id);
    if (!chest) return res.status(404).json({ message: "NOT FOUND" });
    
    if (chest.hasPin && chest.pin !== pin) return res.status(401).json({ message: "INVALID PIN" });
    if (chest.maxOpens && chest.currentOpens >= chest.maxOpens) return res.status(403).json({ message: "LIMIT REACHED" });

    // Atomic increment
    chest.currentOpens += 1;
    await chest.save();
    
    res.json(chest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/chests/:id', async (req, res) => {
  try { 
    const { id } = req.params;
    await db.Chest.findByIdAndDelete(id);
    res.json({ message: "Deleted" }); 
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.get('/api/ads', async (req, res) => {
  try {
    const ads = await db.getAds();
    res.json(ads);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/ads', upload.single('file'), async (req, res) => {
  try {
    console.log("Receiving ad broadcast request...");
    let { title, imageUrl, videoUrl, link } = req.body;
    console.log("Body:", { title, imageUrl, videoUrl, link });
    
    if (req.file) {
      console.log("File received:", req.file.originalname, req.file.mimetype);
      if (req.file.mimetype.startsWith('video/')) {
        // Force resource_type to video if cloudinary returns it as image in path
        videoUrl = req.file.path.replace('/image/upload/', '/video/upload/'); 
      } else {
        imageUrl = req.file.path;
      }
    }
    const newAd = { title, imageUrl, videoUrl, link, createdAt: new Date().toISOString() };
    const savedAd = await db.saveAd(newAd);
    console.log("Ad saved successfully:", savedAd._id);
    res.status(201).json(savedAd);
  } catch (error) {
    console.error("AD UPLOAD ERROR:", error);
    res.status(500).json({ error: error.message }); 
  }
});

app.delete('/api/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteAd(id);
    res.status(200).json({ message: "Ad deleted successfully" });
  } catch (error) {
    console.error("AD DELETE ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;
