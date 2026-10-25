import type { UserProfile, OfflinePlayerAvatar } from '../types/game';

const ACCOUNTS_DB_KEY = 'vicedrop_accounts_db';
const SESSION_USER_ID_KEY = 'vicedrop_session_user_id';
const GLOBAL_ACTIVE_USER_ID_KEY = 'vicedrop_active_user_id';
const OFFLINE_USERS_KEY = 'vicedrop_offline_users';

function getAllStoredAccounts(): { [idOrEmail: string]: UserProfile } {
  try {
    const raw = localStorage.getItem(ACCOUNTS_DB_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {}
  return {};
}

function saveAllStoredAccounts(accounts: { [idOrEmail: string]: UserProfile }): void {
  try {
    localStorage.setItem(ACCOUNTS_DB_KEY, JSON.stringify(accounts));
  } catch (e) {}
}

export function getCurrentUser(): UserProfile {
  const accounts = getAllStoredAccounts();

  // 1. Check sessionStorage (allows different accounts in different tabs of same browser)
  let activeId = sessionStorage.getItem(SESSION_USER_ID_KEY);
  if (!activeId) {
    activeId = localStorage.getItem(GLOBAL_ACTIVE_USER_ID_KEY);
  }

  if (activeId && accounts[activeId]) {
    const u = accounts[activeId];
    // Rule: Cash is NOT free. Reset test inflated balance ($2.5M) to $0
    if (u.cash >= 2500000) {
      u.cash = 0;
      accounts[activeId] = u;
      saveAllStoredAccounts(accounts);
    }
    return u;
  }

  // 2. Default Initial Account (Starting cash: $0, Cash is earned through file sales)
  const defaultUser: UserProfile = {
    id: 'user_' + Math.random().toString(36).substring(2, 9),
    name: 'Citizen_One',
    email: 'player1@vicedrop.net',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Citizen1',
    cash: 0, // No free money
    ownedCarIds: ['starter_car_player'],
    x: 0,
    z: 0,
    rotation: 0,
    lastSeen: Date.now(),
    isOnline: true,
  };

  accounts[defaultUser.id] = defaultUser;
  accounts[defaultUser.email] = defaultUser;
  saveAllStoredAccounts(accounts);

  sessionStorage.setItem(SESSION_USER_ID_KEY, defaultUser.id);
  localStorage.setItem(GLOBAL_ACTIVE_USER_ID_KEY, defaultUser.id);

  return defaultUser;
}

export function saveCurrentUser(user: UserProfile): void {
  try {
    const accounts = getAllStoredAccounts();
    accounts[user.id] = user;
    accounts[user.email] = user;
    saveAllStoredAccounts(accounts);
    sessionStorage.setItem(SESSION_USER_ID_KEY, user.id);
  } catch (e) {}
}

// Switch or Login with a new Email / Account
export function switchUserAccount(email: string, name?: string, avatar?: string): UserProfile {
  const accounts = getAllStoredAccounts();
  const cleanEmail = email.trim().toLowerCase();

  // Find by email or existing ID
  let targetUser = accounts[cleanEmail];

  if (!targetUser) {
    // Search values by email match
    for (const u of Object.values(accounts)) {
      if (u.email && u.email.toLowerCase() === cleanEmail) {
        targetUser = u;
        break;
      }
    }
  }

  if (!targetUser) {
    // Create new account with $0 starting balance
    const nick = name?.trim() || cleanEmail.split('@')[0] || 'Citizen';
    targetUser = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      name: nick,
      email: cleanEmail,
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(nick)}`,
      cash: 0, // Zero starting cash
      ownedCarIds: ['starter_car_player'],
      x: Math.round((Math.random() - 0.5) * 16),
      z: Math.round((Math.random() - 0.5) * 16),
      rotation: 0,
      lastSeen: Date.now(),
      isOnline: true,
    };
  } else {
    if (name && name.trim()) targetUser.name = name.trim();
    if (avatar) targetUser.avatar = avatar;
    targetUser.isOnline = true;
    targetUser.lastSeen = Date.now();
  }

  accounts[targetUser.id] = targetUser;
  accounts[cleanEmail] = targetUser;
  saveAllStoredAccounts(accounts);

  sessionStorage.setItem(SESSION_USER_ID_KEY, targetUser.id);
  localStorage.setItem(GLOBAL_ACTIVE_USER_ID_KEY, targetUser.id);

  return targetUser;
}

// Credit cash to a file seller or prize recipient
export function creditUserCash(userIdOrEmail: string, amount: number): number {
  if (amount <= 0) return 0;
  const accounts = getAllStoredAccounts();
  let user = accounts[userIdOrEmail];

  if (!user) {
    for (const u of Object.values(accounts)) {
      if (u.id === userIdOrEmail || (u.email && u.email.toLowerCase() === userIdOrEmail.toLowerCase())) {
        user = u;
        break;
      }
    }
  }

  if (user) {
    user.cash = (user.cash || 0) + amount;
    accounts[user.id] = user;
    if (user.email) accounts[user.email] = user;
    saveAllStoredAccounts(accounts);
    return user.cash;
  }
  return 0;
}

// Deduct cash from buyer
export function deductUserCash(userId: string, amount: number): boolean {
  if (amount <= 0) return true;
  const accounts = getAllStoredAccounts();
  const user = accounts[userId];
  if (!user || user.cash < amount) return false;

  user.cash -= amount;
  accounts[user.id] = user;
  if (user.email) accounts[user.email] = user;
  saveAllStoredAccounts(accounts);
  return true;
}

export function getOfflinePlayers(): OfflinePlayerAvatar[] {
  const accounts = getAllStoredAccounts();
  const list: OfflinePlayerAvatar[] = [];
  const seenIds = new Set<string>();

  // Read registered users who are offline
  Object.values(accounts).forEach((u) => {
    if (!seenIds.has(u.id)) {
      seenIds.add(u.id);
      list.push({
        id: u.id,
        name: u.name,
        avatar: u.avatar,
        x: u.x || 0,
        z: u.z || 0,
        rotation: u.rotation || 0,
        lastSeen: u.lastSeen || Date.now(),
      });
    }
  });

  return list;
}

export function saveOfflinePlayers(players: OfflinePlayerAvatar[]): void {
  try {
    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(players));
  } catch (e) {}
}

export function recordUserOffline(user: UserProfile): void {
  const accounts = getAllStoredAccounts();
  if (accounts[user.id]) {
    accounts[user.id].isOnline = false;
    accounts[user.id].x = user.x;
    accounts[user.id].z = user.z;
    accounts[user.id].rotation = user.rotation;
    accounts[user.id].lastSeen = Date.now();
    if (user.email) accounts[user.email] = accounts[user.id];
    saveAllStoredAccounts(accounts);
  }
}

export function recordUserOnline(userId: string): void {
  const accounts = getAllStoredAccounts();
  if (accounts[userId]) {
    accounts[userId].isOnline = true;
    accounts[userId].lastSeen = Date.now();
    saveAllStoredAccounts(accounts);
  }
}
