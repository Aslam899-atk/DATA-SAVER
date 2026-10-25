// Game Types for City Life, File Dropper, Car Dealership, and In-Game Advertising

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  cash: number;
  ownedCarIds: string[];
  x: number;
  z: number;
  rotation: number;
  lastSeen: number;
  isOnline: boolean;
}

export interface OfflinePlayerAvatar {
  id: string;
  name: string;
  avatar: string;
  x: number;
  z: number;
  rotation: number;
  lastSeen: number;
  meshGroup?: any; // THREE.Group
}

export interface CarCatalogItem {
  id: string;
  name: string;
  brand: string;
  category: 'Hypercar' | 'Supercar' | 'Luxury' | 'SUV' | 'Electric' | 'Classic';
  topSpeed: number;
  acceleration: number;
  defaultPrice: number;
  colorHex: string;
  colorInt: number;
  description: string;
}

export interface SpawnedCar {
  id: string;
  catalogId: string;
  name: string;
  price: number;
  x: number;
  y: number;
  z: number;
  rotation: number;
  speed: number;
  color: number;
  isPlayerInside: boolean;
  ownerId: string | null; // null means for sale
  ownerName?: string;
  mesh?: any; // THREE.Group
}

export interface DroppedFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  textContent?: string;
  x: number;
  y: number;
  z: number;
  timestamp: number;
  isPaid: boolean;
  price: number;
  creatorId: string;
  creatorName: string;
  maxClaims: number; // 0 for unlimited
  claimedCount: number;
  expiresAt: number | null; // null for no expiry
  isDescending?: boolean;
  fallSpeed?: number;
}

export interface BuildingCollisionBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  isDoorway?: boolean;
}

export interface BillboardSlot {
  id: string;
  title: string;
  locationName: string;
  zone: 'Rooftop' | 'Roadside' | 'Field' | 'Showroom' | 'Junction';
  width: number;
  height: number;
  aspectRatioText: string;
  recommendedResolution: string;
  imageUrl: string;
  sponsorName: string;
  headline: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
}

export interface CityAnalytics {
  totalVisitors: number;
  activeOnline: number;
  registeredUsers: number;
  totalCarsSpawned: number;
  totalAirdrops: number;
  totalEconomyVolume: number;
}
