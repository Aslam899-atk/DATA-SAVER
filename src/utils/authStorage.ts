import type { UserProfile, OfflinePlayerAvatar } from '../types/game';

const CURRENT_USER_KEY = 'vicedrop_current_user';
const OFFLINE_USERS_KEY = 'vicedrop_offline_users';

const DEFAULT_OFFLINE_PLAYERS: OfflinePlayerAvatar[] = [
  {
    id: 'user_rahul',
    name: 'Rahul_KL',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rahul',
    x: 18,
    z: -12,
    rotation: 1.2,
    lastSeen: Date.now() - 1000 * 60 * 35, // 35 mins ago
  },
  {
    id: 'user_priya',
    name: 'Priya_Tech',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Priya',
    x: -24,
    z: 22,
    rotation: -0.8,
    lastSeen: Date.now() - 1000 * 60 * 120, // 2 hours ago
  },
  {
    id: 'user_favas',
    name: 'Favas_Malabar',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Favas',
    x: 8,
    z: 32,
    rotation: 2.4,
    lastSeen: Date.now() - 1000 * 60 * 15, // 15 mins ago
  },
];

export function getCurrentUser(): UserProfile {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (raw) {
      const user = JSON.parse(raw);
      // Give players ample cash to buy and customize any car
      if (typeof user.cash !== 'number' || user.cash < 1000000) {
        user.cash = 2500000;
      }
      if (!Array.isArray(user.ownedCarIds)) {
        user.ownedCarIds = ['starter_car_player'];
      } else if (!user.ownedCarIds.includes('starter_car_player')) {
        user.ownedCarIds.push('starter_car_player');
      }
      saveCurrentUser(user);
      return user;
    }
  } catch (e) {}

  // Default guest player with $2.5M starter balance
  const defaultUser: UserProfile = {
    id: 'guest_' + Math.random().toString(36).substring(2, 8),
    name: 'Player One',
    email: 'guest@vicedrop.local',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PlayerOne',
    cash: 2500000,
    ownedCarIds: ['starter_car_player'],
    x: 0,
    z: 0,
    rotation: 0,
    lastSeen: Date.now(),
    isOnline: true,
  };
  saveCurrentUser(defaultUser);
  return defaultUser;
}

export function saveCurrentUser(user: UserProfile): void {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (e) {}
}

export function getOfflinePlayers(): OfflinePlayerAvatar[] {
  try {
    const raw = localStorage.getItem(OFFLINE_USERS_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {}

  // Seed defaults
  saveOfflinePlayers(DEFAULT_OFFLINE_PLAYERS);
  return DEFAULT_OFFLINE_PLAYERS;
}

export function saveOfflinePlayers(players: OfflinePlayerAvatar[]): void {
  try {
    localStorage.setItem(OFFLINE_USERS_KEY, JSON.stringify(players));
  } catch (e) {}
}

export function recordUserOffline(user: UserProfile): void {
  const offlineList = getOfflinePlayers().filter((p) => p.id !== user.id);
  offlineList.push({
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    x: user.x,
    z: user.z,
    rotation: user.rotation,
    lastSeen: Date.now(),
  });
  saveOfflinePlayers(offlineList);
}

export function recordUserOnline(userId: string): void {
  const offlineList = getOfflinePlayers().filter((p) => p.id !== userId);
  saveOfflinePlayers(offlineList);
}
