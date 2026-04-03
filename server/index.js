const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const db = require('./db');
const { notifyDrop } = require('./telegram');

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

app.post('/api/chests', upload.array('files', 15), async (req, res) => {
  try {
    const { lat, lng, title, tier, droppedBy, pin, maxOpens, expiresAt } = req.body;
    
    let uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      uploadedFiles = req.files.map(f => ({
        fileUrl: f.path,
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
      hasPin: pin ? true : false
    });

    res.status(201).json(savedChest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/chests/:id/open', async (req, res) => {
  try {
    const { pin } = req.body;
    const allData = await db.read();
    const chest = allData.chests.find(c => c._id === req.params.id);
    if (!chest) return res.status(404).json({ message: "NOT FOUND" });
    
    if (chest.hasPin && chest.pin !== pin) return res.status(401).json({ message: "INVALID PIN" });
    if (chest.maxOpens && chest.currentOpens >= chest.maxOpens) return res.status(403).json({ message: "LIMIT REACHED" });

    chest.currentOpens += 1;
    await db.write(allData);
    res.json(chest);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/chests/:id', async (req, res) => {
  try { 
    const allData = await db.read();
    allData.chests = allData.chests.filter(c => c._id !== req.params.id);
    await db.write(allData);
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
    let { title, imageUrl, videoUrl, link } = req.body;
    if (req.file) {
      if (req.file.mimetype.startsWith('video/')) videoUrl = req.file.path;
      else imageUrl = req.file.path;
    }
    const newAd = await db.saveAd({ title, imageUrl, videoUrl, link, createdAt: new Date().toISOString() });
    res.status(201).json(newAd);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = app;
