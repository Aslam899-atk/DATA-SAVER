import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Building, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, PlusCircle } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import { ThreeDGameScene } from './ThreeDGameScene';

import type { Chest } from '../App';
interface IndiaGameMapProps {
  chests: Chest[];
  playerPos: { lat: number; lng: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  onOpenBox: (chest: Chest) => void;
  
  currentCityName: string;
  onMapClickDrop?: (lat: number, lng: number) => void;
  onlinePlayers?: { socketId: string; googleId: string; name: string; lat: number; lng: number }[];
  allUsers?: any[];
  isFirstSpawn?: boolean;
  onFirstSpawnSet?: (lat: number, lng: number) => void;
  user?: any;
  onCoinTransfer?: (targetId: string, amount: number) => Promise<void>;
}

// Custom Leaflet DivIcon for the Avatar Character
const createAvatarDivIcon = (
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT',
  isMoving: boolean,
  isRunning: boolean,
  skin: 'pava' | 'pubg' | 'ninja' | 'gta' = 'pava'
) => {
  const skinTitle = skin === 'pubg' ? '🪂 PUBG Commando' :
                    skin === 'ninja' ? '🥷 Cyber Ninja' :
                    skin === 'gta' ? '🕶️ GTA Heister' : '🧍 Pava Explorer';

  const skinShirtColor = skin === 'pubg' ? '#15803d' :
                         skin === 'ninja' ? '#7e22ce' :
                         skin === 'gta' ? '#dc2626' : (isRunning ? '#f59e0b' : '#06b6d4');

  return L.divIcon({
    className: 'custom-avatar-marker-icon',
    html: `
      <div id="avatar-leaflet-container" style="transform: translate(-50%, -50%);">
        <div class="relative flex flex-col items-center justify-center">
          <div class="absolute -top-7 px-2 py-0.5 rounded-full bg-black/80 border border-cyan-400/60 text-[10px] text-cyan-300 font-mono font-bold whitespace-nowrap shadow-lg flex items-center gap-1 backdrop-blur-md">
            <span class="w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}"></span>
            ${skinTitle} ${isRunning ? '⚡RUN' : ''}
          </div>
          ${isRunning ? '<div class="absolute w-12 h-12 rounded-full bg-amber-500/30 blur-sm animate-pulse"></div>' : ''}
          <div class="relative w-10 h-10 ${isMoving ? (isRunning ? 'animate-bounce' : 'animate-pulse') : ''}">
            <svg viewBox="0 0 64 64" class="w-full h-full drop-shadow-[0_0_10px_rgba(6,182,212,0.8)] ${direction === 'LEFT' ? 'style="transform: scaleX(-1);"' : ''}">
              <circle cx="32" cy="18" r="11" fill="${skin === 'pubg' ? '#d97706' : skin === 'ninja' ? '#581c87' : '#fcd34d'}" stroke="#d97706" stroke-width="2" />
              <path d="M 23 14 Q 32 8 41 14 Q 32 12 23 14 Z" fill="${skin === 'pubg' ? '#166534' : skin === 'gta' ? '#1e293b' : '#92400e'}" />
              <circle cx="28" cy="18" r="2" fill="#000" />
              <circle cx="36" cy="18" r="2" fill="#000" />
              <path d="M 28 23 Q 32 26 36 23" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" />
              <path d="M 20 29 C 20 26, 44 26, 44 29 L 42 45 C 42 47, 22 47, 22 45 Z" fill="${skinShirtColor}" stroke="#0891b2" stroke-width="2" />
              <circle cx="32" cy="35" r="3" fill="#ffffff" />
              <rect x="24" y="45" width="6" height="13" rx="3" fill="#1e293b" />
              <rect x="34" y="45" width="6" height="13" rx="3" fill="#1e293b" />
              <ellipse cx="26" cy="59" rx="4" ry="2.5" fill="#ef4444" />
              <ellipse cx="36" cy="59" rx="4" ry="2.5" fill="#ef4444" />
            </svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [40, 50],
    iconAnchor: [20, 45]
  });
};

// Custom Chest Icon Generator
const createChestDivIcon = (_tier: string, _boxType?: string, coinCost?: number) => {
  const costColor = coinCost && coinCost > 0 
    ? 'from-amber-400 to-orange-600 border-pink-400 shadow-pink-500/50' 
    : 'from-[#eab308] to-[#b45309] border-[#fef08a] shadow-yellow-800/50';

  return L.divIcon({
    className: 'custom-chest-marker-icon',
    html: `
      <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
        ${coinCost && coinCost > 0 ? `
          <div class="absolute -top-6 px-1.5 py-0.5 rounded bg-amber-500 text-[8px] text-slate-950 font-bold font-mono shadow-md z-30">
            🪙${coinCost}
          </div>
        ` : ''}
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${costColor} border-2 flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-115 animate-bounce">
          <svg class="w-6 h-6 text-slate-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
        </div>
        <div class="absolute -bottom-1 w-6 h-1.5 bg-black/60 rounded-full blur-[1px]"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

const createOnlinePlayerDivIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-online-player-marker-icon',
    html: `
      <div class="relative flex flex-col items-center justify-center" style="transform: translate(-50%, -50%);">
        <div class="absolute -top-7 px-2 py-0.5 rounded-full bg-slate-900 border border-[#ff007f] text-[9px] text-[#ff007f] font-mono font-bold whitespace-nowrap shadow-lg flex items-center gap-1 backdrop-blur-md">
          <span class="w-1.5 h-1.5 rounded-full bg-[#ff007f] animate-ping"></span>
          ${name}
        </div>
        <div class="w-8 h-8 rounded-full border-2 border-[#ff007f] bg-slate-800 flex items-center justify-center text-xs shadow-[0_0_10px_rgba(255,0,127,0.8)]">
          🧍
        </div>
      </div>
    `,
    iconSize: [30, 40],
    iconAnchor: [15, 35]
  });
};

// Map Recenter Helper Component
const MapController: React.FC<{ center: { lat: number; lng: number } }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo(center, { animate: true, duration: 0.2 });
  }, [center, map]);
  return null;
};

// Map Click Listener Component for dropping boxes anywhere
const MapClickHandler: React.FC<{
  onMapClick?: (lat: number, lng: number) => void;
  isFirstSpawn?: boolean;
  onFirstSpawnSet?: (lat: number, lng: number) => void;
}> = ({ onMapClick, isFirstSpawn, onFirstSpawnSet }) => {
  useMapEvents({
    click(e) {
      if (isFirstSpawn && onFirstSpawnSet) {
        onFirstSpawnSet(e.latlng.lat, e.latlng.lng);
      } else if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
};

export const IndiaGameMap: React.FC<IndiaGameMapProps> = ({
  chests,
  playerPos,
  setPlayerPos,
  onOpenBox,
  
  currentCityName,
  onMapClickDrop,
  onlinePlayers = [],
  allUsers = [],
  isFirstSpawn = false,
  onFirstSpawnSet,
  user,
  onCoinTransfer
}) => {
  // Tile layer style & Character skins
  const [tileStyle] = useState<'SATELLITE'>('SATELLITE');
  const [characterSkin, setCharacterSkin] = useState<'pava' | 'pubg' | 'ninja' | 'gta'>('pava');
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('DOWN');
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [nearbyChest, setNearbyChest] = useState<Chest | null>(null);

  // Quick Drop Mode Toggle
  const [isDropModeActive, setIsDropModeActive] = useState(false);

  // 3D Sketchfab Map View & Interior Building View toggles
  const [is3DViewMode, setIs3DViewMode] = useState(!isFirstSpawn);
  const [isInsideBuilding, setIsInsideBuilding] = useState(false);

  // Auto-enter 3D mode after first spawn is set
  useEffect(() => {
    if (!isFirstSpawn) {
      setIs3DViewMode(true);
    }
  }, [isFirstSpawn]);

  // Key state tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const tileUrls = {
    SATELLITE: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  // Keyboard Movement Listener Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      keysPressed.current[e.key.toLowerCase()] = true;
      if (e.key === 'Shift') setIsRunning(true);

      if ((e.key === 'e' || e.key === 'E') && nearbyChest) {
        onOpenBox(nearbyChest);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
      if (e.key === 'Shift') setIsRunning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nearbyChest, onOpenBox]);

  // Main Movement Animation Game Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastStepTime = 0;

    const gameLoop = (timestamp: number) => {
      const isShift = keysPressed.current['shift'];
      const stepSpeed = isShift ? 0.00018 : 0.00008;

      let dx = 0;
      let dy = 0;
      let moving = false;
      let nextDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' = direction;

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) {
        dy += stepSpeed;
        nextDir = 'UP';
        moving = true;
      }
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) {
        dy -= stepSpeed;
        nextDir = 'DOWN';
        moving = true;
      }
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) {
        dx -= stepSpeed;
        nextDir = 'LEFT';
        moving = true;
      }
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) {
        dx += stepSpeed;
        nextDir = 'RIGHT';
        moving = true;
      }

      if (moving) {
        setIsMoving(true);
        setDirection(nextDir);
        setIsRunning(isShift);

        setPlayerPos((prev) => ({
          lat: prev.lat + dy,
          lng: prev.lng + dx
        }));

        if (timestamp - lastStepTime > (isShift ? 180 : 300)) {
          soundFx.playFootstep(isShift);
          lastStepTime = timestamp;
          
          if (isShift) {
            
          }
        }
      } else {
        setIsMoving(false);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [direction, setPlayerPos]);

  // Check Proximity to Chests
  useEffect(() => {
    let closest: Chest | null = null;
    let minDistance = 0.0006;

    chests.forEach((chest) => {
      const dLat = chest.lat - playerPos.lat;
      const dLng = chest.lng - playerPos.lng;
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);

      if (dist < minDistance) {
        minDistance = dist;
        closest = chest;
      }
    });

    setNearbyChest(closest);
  }, [playerPos, chests]);

  const handleMapClick = (lat: number, lng: number) => {
    if (isDropModeActive && onMapClickDrop) {
      soundFx.playSuccess();
      onMapClickDrop(lat, lng);
      setIsDropModeActive(false);
    }
  };

  const triggerMobileStep = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    const stepSpeed = isRunning ? 0.0002 : 0.0001;
    setDirection(dir);
    setIsMoving(true);
    soundFx.playFootstep(isRunning);

    setPlayerPos((prev) => {
      let dLat = 0;
      let dLng = 0;
      if (dir === 'UP') dLat = stepSpeed;
      if (dir === 'DOWN') dLat = -stepSpeed;
      if (dir === 'LEFT') dLng = -stepSpeed;
      if (dir === 'RIGHT') dLng = stepSpeed;

      return { lat: prev.lat + dLat, lng: prev.lng + dLng };
    });

    setTimeout(() => setIsMoving(false), 200);
  };

  if (is3DViewMode) {
    return (
      <ThreeDGameScene
        playerPos={playerPos}
        setPlayerPos={setPlayerPos}
        chests={chests}
        onOpenBox={onOpenBox}
        onlinePlayers={onlinePlayers}
        allUsers={allUsers}
        user={user}
        characterSkin={characterSkin}
        onExit3D={() => setIs3DViewMode(false)}
        onCoinTransfer={onCoinTransfer}
      />
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden select-none bg-slate-950">
      {/* Top Map HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* City Location Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md shadow-lg text-slate-100 text-xs font-mono">
          <MapPin className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <span className="text-[10px] text-slate-400 block">LOCATION:</span>
            <span className="font-bold text-cyan-300">{currentCityName}</span>
          </div>
        </div>

        {/* Satellite Map Indicator & Quick Drop / Skins & 3D Interactive Map Switcher */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <button
            onClick={() => setIs3DViewMode(!is3DViewMode)}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all ${
              is3DViewMode ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg animate-pulse' : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
            }`}
          >
            <span>🧊 {is3DViewMode ? 'RETURN TO SATELLITE MAP' : '3D SKETCHFAB INTERACTIVE MAP'}</span>
          </button>

          {!is3DViewMode && (
            <div className="px-3 py-1 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-extrabold flex items-center gap-1.5 shadow-md">
              <span>🛰️ SATELLITE MAP (REAL WORLD)</span>
            </div>
          )}

          <button
            onClick={() => setIsDropModeActive(!isDropModeActive)}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
              isDropModeActive ? 'bg-amber-400 text-slate-950 animate-pulse shadow-lg' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {isDropModeActive ? 'CLICK MAP TO DROP BOX' : 'CLICK-DROP MODE'}
          </button>

          {/* Skin Selector */}
          <select
            value={characterSkin}
            onChange={(e) => setCharacterSkin(e.target.value as any)}
            className="px-2 py-1 rounded-xl bg-slate-950 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold focus:outline-none"
          >
            <option value="pava">🧍 SKIN: PAVA RUNNER</option>
            <option value="pubg">🪂 SKIN: PUBG COMMANDO</option>
            <option value="ninja">🥷 SKIN: CYBER NINJA</option>
            <option value="gta">🕶️ SKIN: GTA HEISTER</option>
          </select>

          <button
            onClick={() => setIsInsideBuilding(!isInsideBuilding)}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all ${
              isInsideBuilding ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            {isInsideBuilding ? 'EXIT BUILDING' : 'ENTER BUILDING'}
          </button>
        </div>
      </div>

      {/* DROP MODE BANNER INSTRUCTION */}
      {isDropModeActive && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-xl animate-bounce">
          🎯 Click anywhere on the map to place a new Box Drop!
        </div>
      )}

      {/* PROXIMITY INTERACT PROMPT OVERLAY */}
      {nearbyChest && !isInsideBuilding && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <button
            onClick={() => onOpenBox(nearbyChest)}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-slate-950 font-extrabold text-sm shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-bounce border-2 border-white flex items-center gap-2 transform hover:scale-105 active:scale-95 transition-all"
          >
            <Zap className="w-5 h-5 fill-slate-950" />
            <span>APPROACHED BOX! PRESS [E] OR TAP TO UNLOCK</span>
          </button>
        </div>
      )}

      {/* BUILDING INTERIOR ROOM VIEW */}
      {isInsideBuilding ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
          <div className="max-w-xl w-full p-8 rounded-3xl bg-slate-900/90 border border-amber-500/30 text-center space-y-6 shadow-2xl backdrop-blur-md">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building className="w-10 h-10 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-100">{currentCityName} Intel Hub</h2>
              <p className="text-xs text-amber-400/80 font-mono mt-1">INDOOR STREET BUILDING INTERIOR VIEW</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
              {chests.slice(0, 4).map((c, idx) => (
                <div
                  key={c.id || c._id || idx}
                  onClick={() => onOpenBox(c)}
                  className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/20 hover:border-amber-400/60 cursor-pointer transition-all space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 group-hover:text-amber-300">
                      📦 Interior Box #{idx + 1}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono uppercase">
                      {c.boxType || c.tier}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-1">{c.title}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsInsideBuilding(false)}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              RETURN TO REAL STREET MAP
            </button>
          </div>
        </div>
      ) : (
        /* REAL STREET MAP CANVAS VIEW */
        <div className="relative w-full h-full">
          {isFirstSpawn && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
              <div className="text-center p-6 rounded-3xl bg-slate-900/90 border border-[#00f0ff]/50 max-w-sm w-full space-y-2 shadow-[0_0_50px_rgba(0,240,255,0.3)] backdrop-blur-md animate-pulse">
                <div className="text-4xl animate-bounce">📍</div>
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#ff007f]">
                  CHOOSE SPAWN POINT
                </h3>
                <p className="text-xs text-slate-300 font-mono font-bold">
                  Click anywhere on the map to land your character & enter 3D World!
                </p>
              </div>
            </div>
          )}

          <MapContainer
            center={[playerPos.lat, playerPos.lng]}
            zoom={17}
            zoomControl={false}
            className="w-full h-full z-0"
          >
            <TileLayer url={tileUrls[tileStyle]} />
            <MapController center={playerPos} />
            <MapClickHandler 
              onMapClick={handleMapClick} 
              isFirstSpawn={isFirstSpawn}
              onFirstSpawnSet={onFirstSpawnSet}
            />

            {/* AVATAR CHARACTER MARKER ON REAL STREETS */}
            {!isFirstSpawn && (
              <Marker
                position={[playerPos.lat, playerPos.lng]}
                icon={createAvatarDivIcon(direction, isMoving, isRunning, characterSkin)}
              />
            )}

            {/* ONLINE PLAYERS CHARACTER MARKERS */}
            {onlinePlayers.map((player) => (
              <Marker
                key={player.socketId}
                position={[player.lat, player.lng]}
                icon={createOnlinePlayerDivIcon(player.name)}
              />
            ))}

            {/* REAL MAP CHEST DROPS */}
            {chests.map((chest) => (
              <Marker
                key={chest.id || chest._id || `${chest.lat}-${chest.lng}`}
                position={[chest.lat, chest.lng]}
                icon={createChestDivIcon(chest.tier, chest.boxType, chest.coinCost)}
                eventHandlers={{
                  click: () => onOpenBox(chest)
                }}
              />
            ))}
          </MapContainer>

          {/* ON-SCREEN TOUCH JOYSTICK / D-PAD CONTROLLER FOR MOBILE & TABLET */}
          <div className="absolute bottom-6 left-6 z-20 pointer-events-auto flex flex-col items-center gap-1 sm:hidden">
            <button
              onClick={() => triggerMobileStep('UP')}
              className="w-12 h-12 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex items-center justify-center active:scale-95 shadow-lg"
            >
              <ArrowUp className="w-6 h-6" />
            </button>
            <div className="flex gap-4">
              <button
                onClick={() => triggerMobileStep('LEFT')}
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex items-center justify-center active:scale-95 shadow-lg"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => triggerMobileStep('DOWN')}
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex items-center justify-center active:scale-95 shadow-lg"
              >
                <ArrowDown className="w-6 h-6" />
              </button>
              <button
                onClick={() => triggerMobileStep('RIGHT')}
                className="w-12 h-12 rounded-xl bg-slate-900/90 border border-cyan-500/40 text-cyan-300 flex items-center justify-center active:scale-95 shadow-lg"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* SPRINT RUN TOGGLE FOR MOBILE */}
          <div className="absolute bottom-6 right-6 z-20 pointer-events-auto sm:hidden">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-xl transition-all ${
                isRunning
                  ? 'bg-amber-500 border-white text-slate-950 shadow-amber-500/50 scale-110'
                  : 'bg-slate-900/90 border-amber-500/50 text-amber-400'
              }`}
            >
              ⚡ RUN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
