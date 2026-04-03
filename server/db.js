const fs = require('fs-extra');
const path = require('path');

const DB_PATH = process.env.NODE_ENV === 'production' 
  ? path.join('/tmp', 'db.json')
  : path.join(__dirname, 'data', 'db.json');

// Ensure db exists
if (!fs.existsSync(DB_PATH)) {
  fs.outputJsonSync(DB_PATH, { chests: [], users: [], ads: [] });
}

module.exports = {
  read: async () => fs.readJson(DB_PATH),
  write: async (data) => fs.writeJson(DB_PATH, data, { spaces: 2 }),
  
  // Helpers
  getChests: async () => (await fs.readJson(DB_PATH)).chests,
  saveChest: async (chest) => {
    const data = await fs.readJson(DB_PATH);
    data.chests.push({ ...chest, _id: Date.now().toString() });
    await fs.writeJson(DB_PATH, data, { spaces: 2 });
    return chest;
  },
  
  getUsers: async () => (await fs.readJson(DB_PATH)).users,
  saveUser: async (user) => {
    const data = await fs.readJson(DB_PATH);
    const existingIdx = data.users.findIndex(u => u.googleId === user.googleId);
    if (existingIdx > -1) {
      data.users[existingIdx] = { ...data.users[existingIdx], ...user, lastLogin: Date.now() };
    } else {
      data.users.push({ ...user, lastLogin: Date.now() });
    }
    await fs.writeJson(DB_PATH, data, { spaces: 2 });
    return user;
  },

  getAds: async () => (await fs.readJson(DB_PATH)).ads,
  saveAd: async (ad) => {
    const data = await fs.readJson(DB_PATH);
    data.ads.push({ ...ad, _id: Date.now().toString() });
    await fs.writeJson(DB_PATH, data, { spaces: 2 });
    return ad;
  }
};
