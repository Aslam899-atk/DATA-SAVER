const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    const Chest = mongoose.model('Chest', new mongoose.Schema({
      lat: Number, lng: Number, title: String, message: String, tier: String,
      droppedBy: String, fileName: String, fileSize: String, fileUrl: String,
      files: [mongoose.Schema.Types.Mixed],
      hasPin: Boolean, pin: String, maxOpens: Number,
      silverTimer: Number, currentOpens: Number, expiresAt: Number,
      requiresRequest: Boolean, requests: [mongoose.Schema.Types.Mixed],
      createdAt: Date
    }));

    const chests = await Chest.find();
    console.log(`\nFound ${chests.length} chests. Fixing data...\n`);

    let fixed = 0;
    for (const chest of chests) {
      let changed = false;

      // Fix 1: If files[] is empty/missing but fileUrl exists, populate files array
      if ((!chest.files || chest.files.length === 0) && chest.fileUrl) {
        chest.files = [{
          fileUrl: chest.fileUrl,
          fileName: chest.fileName || 'file',
          fileSize: chest.fileSize || '',
          mimeType: ''
        }];
        changed = true;
        console.log(`[FIX files[]] ${chest.title || chest.fileName} -> added fileUrl to files array`);
      }

      // Fix 2: Ensure currentOpens is not null/undefined
      if (chest.currentOpens === null || chest.currentOpens === undefined) {
        chest.currentOpens = 0;
        changed = true;
      }

      // Fix 3: Ensure requiresRequest is not null
      if (chest.requiresRequest === null || chest.requiresRequest === undefined) {
        chest.requiresRequest = false;
        changed = true;
      }

      if (changed) {
        await chest.save();
        fixed++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} chests out of ${chests.length}`);

    // Print final state
    console.log('\n=== FINAL DATABASE STATE ===');
    const all = await Chest.find().lean();
    all.forEach((c, i) => {
      console.log(`${i+1}. [${c.tier?.toUpperCase()}] "${c.title || c.fileName}"`);
      console.log(`   📍 lat:${c.lat?.toFixed(4)} lng:${c.lng?.toFixed(4)}`);
      console.log(`   📁 files: ${c.files?.length || 0} | fileUrl: ${c.fileUrl ? 'yes' : 'no'}`);
      console.log(`   👤 by: ${c.droppedBy} | opens: ${c.currentOpens}/${c.maxOpens || '∞'}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  })
  .catch(err => console.error('❌ Error:', err.message));
