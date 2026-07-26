import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Building, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, PlusCircle } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

export interface Chest {
  id?: string;
  _id?: string;
  lat: number;
  lng: number;
  title: string;
  message?: string;
  tier: 'gold' | 'silver' | 'bronze' | 'platinum';
  fileName: string;
  fileSize: string;
  fileUrl?: string;
  files?: { fileUrl: string; fileName: string; fileSize?: string; mimeType?: string }[];
  droppedBy: string;
  hasPin?: boolean;
  pin?: string;
  boxType?: 'free' | 'password' | 'timer' | 'task';
  taskType?: 'memory' | 'cipher' | 'pattern';
  timerSeconds?: number;
}

interface IndiaGameMapProps {
  chests: Chest[];
  playerPos: { lat: number; lng: number };
  setPlayerPos: React.Dispatch<React.SetStateAction<{ lat: number; lng: number }>>;
  onOpenBox: (chest: Chest) => void;
  setEnergy: React.Dispatch<React.SetStateAction<number>>;
  currentCityName: string;
  onMapClickDrop?: (lat: number, lng: number) => void;
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
const createChestDivIcon = (tier: string, boxType?: string) => {
  const isGold = tier === 'gold' || boxType === 'password';
  const isSilver = tier === 'silver' || boxType === 'timer';
  const isTask = boxType === 'task';

  const colorClass = isTask ? 'from-emerald-500 to-teal-600 border-emerald-300 shadow-emerald-500/50' :
    isGold ? 'from-amber-400 to-yellow-600 border-amber-200 shadow-amber-500/50' :
    isSilver ? 'from-purple-400 to-indigo-600 border-purple-200 shadow-purple-500/50' :
    'from-cyan-400 to-blue-600 border-cyan-200 shadow-cyan-500/50';

  return L.divIcon({
    className: 'custom-chest-marker-icon',
    html: `
      <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br ${colorClass} border-2 flex items-center justify-center shadow-lg transition-transform duration-200 hover:scale-115 animate-bounce">
          <svg class="w-5 h-5 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 w-6 h-1.5 bg-black/60 rounded-full blur-[1px]"></div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
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
const MapClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
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
  setEnergy,
  currentCityName,
  onMapClickDrop
}) => {
  // Tile layer style & Character skins (PUBG, FreeFire, GTA themes)
  const [tileStyle, setTileStyle] = useState<'STREET' | 'GTA' | 'PUBG' | 'FREEFIRE' | 'SATELLITE'>('GTA');
  const [characterSkin, setCharacterSkin] = useState<'pava' | 'pubg' | 'ninja' | 'gta'>('pava');
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('DOWN');
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [nearbyChest, setNearbyChest] = useState<Chest | null>(null);

  // Quick Drop Mode Toggle
  const [isDropModeActive, setIsDropModeActive] = useState(false);

  // Interior Building View toggle
  const [isInsideBuilding, setIsInsideBuilding] = useState(false);

  // Key state tracking
  const keysPressed = useRef<{ [key: string]: boolean }>({});

  const tileUrls = {
    STREET: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    GTA: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    PUBG: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    FREEFIRE: 'https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
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
            setEnergy((prev) => Math.max(0, prev - 0.2));
          }
        }
      } else {
        setIsMoving(false);
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [direction, setPlayerPos, setEnergy]);

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

        {/* Tile Layer (GTA, PUBG, FreeFire, Street, Satellite) & Skins */}
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md">
          <button
            onClick={() => setIsDropModeActive(!isDropModeActive)}
            className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold flex items-center gap-1 transition-all ${
              isDropModeActive ? 'bg-amber-400 text-slate-950 animate-pulse shadow-lg' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {isDropModeActive ? 'CLICK MAP TO DROP BOX' : 'CLICK-DROP MODE'}
          </button>

          {(['GTA', 'PUBG', 'FREEFIRE', 'STREET', 'SATELLITE'] as const).map((style) => (
            <button
              key={style}
              onClick={() => setTileStyle(style)}
              className={`px-3 py-1 rounded-xl text-[11px] font-mono font-bold transition-all ${
                tileStyle === style
                  ? style === 'PUBG' ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold' :
                    style === 'FREEFIRE' ? 'bg-orange-500 text-slate-950 shadow-md font-extrabold' :
                    style === 'GTA' ? 'bg-amber-400 text-slate-950 shadow-md font-extrabold' :
                    'bg-cyan-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {style === 'GTA' ? '🏎️ GTA MAP' :
               style === 'PUBG' ? '🪂 PUBG WARZONE' :
               style === 'FREEFIRE' ? '🔥 FREEFIRE MAP' :
               style === 'STREET' ? '🗺️ STREET' : '🛰️ SATELLITE'}
            </button>
          ))}

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
          <MapContainer
            center={[playerPos.lat, playerPos.lng]}
            zoom={17}
            zoomControl={false}
            className="w-full h-full z-0"
          >
            <TileLayer url={tileUrls[tileStyle]} />
            <MapController center={playerPos} />
            <MapClickHandler onMapClick={handleMapClick} />

            {/* AVATAR CHARACTER MARKER ON REAL STREETS */}
            <Marker
              position={[playerPos.lat, playerPos.lng]}
              icon={createAvatarDivIcon(direction, isMoving, isRunning, characterSkin)}
            />

            {/* REAL MAP CHEST DROPS */}
            {chests.map((chest) => (
              <Marker
                key={chest.id || chest._id || `${chest.lat}-${chest.lng}`}
                position={[chest.lat, chest.lng]}
                icon={createChestDivIcon(chest.tier, chest.boxType)}
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
