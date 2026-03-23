const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

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

async function drop() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const malappuramDrop = new Chest({
      lat: 11.051,
      lng: 76.071,
      tier: 'gold',
      fileName: 'MALAPPURAM_COMMAND_CENTER.pdf',
      fileSize: '1.24MB',
      fileUrl: 'https://res.cloudinary.com/dw7wcsate/image/upload/v1711132000/dummy.pdf', // Using a placeholder URL if any, or just a dummy
      droppedBy: 'ANTIGRAVITY_AI',
      hasPin: true,
      pin: '313',
      requiresRequest: true,
      currentOpens: 0
    });

    await malappuramDrop.save();
    console.log("Successfully dropped intelligence in Malappuram, Kerala! 🚀");
    process.exit(0);
  } catch (err) {
    console.error("Drop failed:", err);
    process.exit(1);
  }
}

drop();
