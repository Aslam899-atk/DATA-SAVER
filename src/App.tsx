import React, { useState, useEffect } from 'react';
import { 
  User, 
  Lock, 
  LogOut, 
  Download, 
  Gift, 
  HelpCircle,
  Bell,
  X,
  Mail,
  Camera,
  Crown,
  Play,
  Trash2,
  Shield,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Types ---

interface Chest {
  id: string;
  lat: number;
  lng: number;
  tier: 'gold' | 'silver' | 'bronze';
  fileName: string;
  fileSize: string;
  droppedBy: string;
  hasPin: boolean;
  pin?: string;
  isMystery?: boolean;
  maxOpens?: number; // Limit number of users
  currentOpens: number;
  expiresAt?: number; // Timestamp for expiration
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  password?: string;
  isAdmin: boolean;
}

interface Request {
  id: string;
  chestId: string;
  from: string;
  status: 'pending' | 'accepted' | 'rejected';
}

// --- Components ---

const StarField = () => {
  const [stars, setStars] = useState<{ x: number, y: number, size: number, duration: number }[]>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 3 + 2
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="star-field">
      {stars.map((star, i) => (
        <div 
          key={i} 
          className="star" 
          style={{ 
            left: `${star.x}%`, 
            top: `${star.y}%`, 
            width: `${star.size}px`, 
            height: `${star.size}px`, 
            '--duration': `${star.duration}s` 
          } as any} 
        />
      ))}
    </div>
  );
};

const LoginScreen = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'gmail' | 'password'>('gmail');

  const handleGmailClick = () => {
    if (!email.includes('@gmail.com')) {
      alert('USE SECURE GMAIL ADDRESS');
      return;
    }
    const extractedUsername = email.split('@')[0];
    setUsername(extractedUsername);
    setStep('password');
  };

  const handleFinalSignup = () => {
    if (password.length < 4) {
      alert('ENCRYPTION KEY TOO SHORT');
      return;
    }
    const newUser: UserProfile = {
      id: Math.random().toString(),
      email,
      username,
      password,
      isAdmin: email === 'admin@gmail.com' || email.includes('admin')
    };
    onLogin(newUser);
  };

  return (
    <div className="flex items-center justify-center h-screen relative overflow-hidden bg-slate-950">
      <StarField />
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="tactical-panel p-12 w-full max-w-md z-10 border-t-4 border-t-amber-500"
      >
        <div className="text-center mb-10">
          <h1 className="logo-tactical mb-1">TACTICAL WORLD</h1>
          <p className="logo-tagline">BATTLE ROYALE FILE PROTOCOL</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'gmail' ? (
            <motion.div 
              key="gmail"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-[3px]">COMMUNICATIONS ACCESS</label>
                <input 
                  type="email" 
                  className="tactical-input" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ID@GMAIL.COM"
                />
              </div>
              <button className="tactical-btn primary w-full" onClick={handleGmailClick}>
                <Mail size={18} /> INITIALIZE SEQUENCE
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="password"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <p className="text-amber-500 font-bold uppercase tracking-widest mb-1">WELCOME, AGENT {username}</p>
                <p className="text-[10px] text-slate-500">ESTABLISH SECURE ENCRYPTION KEY</p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-500 tracking-[3px]">ENCRYPTION KEY</label>
                <input 
                  type="password" 
                  className="tactical-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <button className="tactical-btn primary w-full" onClick={handleFinalSignup}>
                ENTER THE SECTOR
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// --- Leaflet Icons & Helpers ---
const getPlayerIcon = (charType: string, isMoving: boolean) => L.divIcon({
  className: 'transparent-icon',
  html: `<div class="player-sprite ${charType} ${isMoving ? 'walking' : ''}" style="position:absolute; left:0; top:0; transform: translate(-50%, -50%) scale(1.1);"></div>`,
  iconSize: [0, 0]
});

const getChestIcon = (tier: string, hasPin: boolean) => {
  const iconHtml = renderToStaticMarkup(
    <div className={`chest-marker chest-${tier}`} style={{ position: 'absolute', transform: 'translate(-50%, -50%)' }}>
      {hasPin && <Crown className="crown-icon absolute -top-4" size={18} color="#fbbf24" />}
      {tier === 'gold' ? <Play size={18} color="white" /> : tier === 'silver' ? <Camera size={18} color="white" /> : <Gift size={18} color="white" />}
    </div>
  );
  return L.divIcon({
    className: 'transparent-icon',
    html: iconHtml,
    iconSize: [0, 0]
  });
};

const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng)
  });
  return null;
};

const PlayerTracker = ({ pos }: { pos: {lat: number, lng: number} }) => {
  const map = useMap();
  useEffect(() => {
    map.panTo([pos.lat, pos.lng], { animate: false });
  }, [pos, map]);
  return null;
};

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([
    { id: 'u1', email: 'admin@gmail.com', username: 'admin', isAdmin: true },
    { id: 'u2', email: 'alex@gmail.com', username: 'alex', isAdmin: false }
  ]);
  const [chests, setChests] = useState<Chest[]>([
    { id: '1', lat: 10.0215, lng: 76.3265, tier: 'bronze', fileName: 'INTEL_MAP.PDF', fileSize: '2.4MB', droppedBy: 'alex', hasPin: false, currentOpens: 0 },
    { id: '2', lat: 10.0220, lng: 76.3250, tier: 'silver', fileName: 'SECRET_OPS.ZIP', fileSize: '142MB', droppedBy: 'admin', hasPin: true, pin: '1234', currentOpens: 0, maxOpens: 10 },
    { id: '3', lat: 10.0210, lng: 76.3270, tier: 'gold', fileName: 'CLASSIFIED.DAT', fileSize: '8.1MB', droppedBy: 'alex', hasPin: false, isMystery: true, currentOpens: 0 },
  ]);
  const [selectedChest, setSelectedChest] = useState<Chest | null>(null);
  const [isDropping, setIsDropping] = useState<{lat: number, lng: number} | null>(null);
  const [dropStep, setDropStep] = useState<'tier' | 'settings'>('tier');
  const [tempTier, setTempTier] = useState<'gold' | 'silver' | 'bronze' | null>(null);
  const [maxOpensInput, setMaxOpensInput] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  
  const [pinInput, setPinInput] = useState('');
  const [requests] = useState<Request[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [adTimer, setAdTimer] = useState<number | null>(null);

  // Character Movement (Lat/Lng)
  const [playerPos, setPlayerPos] = useState({ lat: 10.021, lng: 76.326 });
  const [isMoving, setIsMoving] = useState(false);
  const [charType, setCharType] = useState<'man' | 'woman'>('man');

  useEffect(() => {
    if (adTimer !== null && adTimer > 0) {
      const timer = setTimeout(() => setAdTimer(adTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (adTimer === 0) {
      setAdTimer(null);
    }
  }, [adTimer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return; // Don't move while typing
      const step = 0.0002;
      let newPos = { ...playerPos };
      let moved = false;

      if (['w', 'arrowup'].includes(e.key.toLowerCase())) { newPos.lat += step; moved = true; }
      if (['s', 'arrowdown'].includes(e.key.toLowerCase())) { newPos.lat -= step; moved = true; }
      if (['a', 'arrowleft'].includes(e.key.toLowerCase())) { newPos.lng -= step; moved = true; }
      if (['d', 'arrowright'].includes(e.key.toLowerCase())) { newPos.lng += step; moved = true; }

      if (moved) {
        setIsMoving(true);
        setPlayerPos(newPos);
      }
    };

    const handleKeyUp = () => setIsMoving(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playerPos]);

  const handleChestClick = (chest: Chest) => {
    // Check if expired or limit reached
    const isExpired = chest.expiresAt && Date.now() > chest.expiresAt;
    const isLimitReached = chest.maxOpens && chest.currentOpens >= chest.maxOpens;
    
    if (!isExpired && !isLimitReached) {
       if (chest.tier === 'gold' || chest.tier === 'silver') {
        setAdTimer(15);
      }
      // Increment opens (simulate)
      setChests(prev => prev.map(c => c.id === chest.id ? { ...c, currentOpens: c.currentOpens + 1 } : c));
    }
    
    setSelectedChest(chest);
  };

  const finalizeDrop = () => {
    if (!isDropping || !currentUser || !tempTier) return;

    const newChest: Chest = {
      id: Math.random().toString(),
      lat: isDropping.lat,
      lng: isDropping.lng,
      tier: tempTier,
      fileName: `OP_INTEL_${Math.floor(Math.random()*1000)}.DAT`,
      fileSize: '1.2MB',
      droppedBy: currentUser.username,
      hasPin: tempTier === 'silver' || tempTier === 'gold',
      pin: '0000',
      currentOpens: 0,
      maxOpens: maxOpensInput ? parseInt(maxOpensInput) : undefined,
      expiresAt: expiryInput ? Date.now() + parseInt(expiryInput) * 60000 : undefined
    };
    setChests([...chests, newChest]);
    setIsDropping(null);
    setTempTier(null);
    setDropStep('tier');
    setMaxOpensInput('');
    setExpiryInput('');
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (selectedChest || adTimer !== null || !currentUser || isDropping) return;
    setIsDropping({ lat, lng });
  };

  const deleteChest = (targetId: string) => {
    setChests(prev => prev.filter(c => c.id !== targetId));
    setSelectedChest(null);
  };

  const deleteUser = (targetId: string) => {
    const userToDelete = users.find(u => u.id === targetId);
    if (!userToDelete) return;
    setUsers(prev => prev.filter(u => u.id !== targetId));
    setChests(prev => prev.filter(c => c.droppedBy !== userToDelete.username));
  };

  if (!currentUser) {
    return <LoginScreen onLogin={(user) => { setCurrentUser(user); setUsers(prev => [...prev, user]); }} />;
  }

  const isExpired = selectedChest?.expiresAt && Date.now() > selectedChest.expiresAt;
  const isLimitReached = selectedChest?.maxOpens && selectedChest.currentOpens >= selectedChest.maxOpens; // Using >= because we incremented on click

  return (
    <div className="world-map">
      <MapContainer 
        center={[playerPos.lat, playerPos.lng]} 
        zoom={17} 
        zoomControl={false} 
        style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 0 }}
      >
        <TileLayer
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
        />
        <MapClickHandler onMapClick={handleMapClick} />
        <PlayerTracker pos={playerPos} />
        
        {/* Player Sprite as Leaflet Marker */}
        <Marker position={[playerPos.lat, playerPos.lng]} icon={getPlayerIcon(charType, isMoving)} zIndexOffset={100} />

        {/* Chests as Leaflet Markers */}
        {chests.map(chest => (
          <Marker 
            key={chest.id}
            position={[chest.lat, chest.lng]}
            icon={getChestIcon(chest.tier, chest.hasPin)}
            eventHandlers={{ click: () => handleChestClick(chest) }}
          />
        ))}
      </MapContainer>

      {/* Crosshair Overlay */}
      <div className="absolute top-1/2 left-1/2 w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 border-2 border-amber-500 rounded-full opacity-50" />

      {/* Character Selector */}
      <div className="player-selection z-50">
        <button 
          className={`tactical-btn ${charType === 'man' ? 'primary' : ''}`} 
          onClick={() => setCharType('man')}
        >AGENT (M)</button>
        <button 
          className={`tactical-btn ${charType === 'woman' ? 'primary' : ''}`} 
          onClick={() => setCharType('woman')}
        >AGENT (F)</button>
      </div>

      {/* HUD Header */}
      <div className="fixed top-6 left-6 z-50 flex items-center gap-4">
        <div className="tactical-panel p-2 flex items-center gap-4 bg-slate-900/80 border-l-4 border-l-amber-500">
          <div className="w-12 h-12 bg-slate-800 rounded flex items-center justify-center border border-white/10">
            <User size={24} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1">Active Personnel</p>
            <p className="text-lg font-black text-white leading-none uppercase">{currentUser.username}</p>
          </div>
        </div>
        {currentUser.isAdmin && (
          <button 
            className={`tactical-btn ${isAdminMode ? 'primary' : ''}`}
            onClick={() => setIsAdminMode(!isAdminMode)}
          >
            <Shield size={18} /> MISSION CONTROL
          </button>
        )}
      </div>

      <div className="fixed top-6 right-6 z-50 flex gap-4">
        <button className="tactical-panel p-3 relative bg-slate-900/80" onClick={() => setShowRequests(!showRequests)}>
          <Bell size={24} className="text-slate-400" />
          {requests.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold flex items-center justify-center">!</span>}
        </button>
        <button className="tactical-panel p-3 bg-red-950/40 text-red-500 border-red-900/50" onClick={() => setCurrentUser(null)}><LogOut size={24} /></button>
      </div>

      {/* Interaction Modals */}
      <AnimatePresence>
        {isDropping && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[110] bg-slate-950/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="tactical-panel p-8 w-full max-w-sm flex flex-col gap-8 border-t-8 border-t-amber-500"
            >
              <div className="text-center">
                <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">
                  {dropStep === 'tier' ? 'SELECT DROP TIER' : 'CONGRESSIONAL PROTOCOL'}
                </h3>
                <p className="text-[10px] text-slate-500 mt-2 font-bold tracking-[2px]">AUTHORIZED DEPLOYMENT ONLY</p>
              </div>
              
              {dropStep === 'tier' ? (
                <div className="flex flex-col gap-4">
                  <button className="tactical-btn h-14" style={{ borderLeft: '4px solid var(--mc-gold)' }} onClick={() => { setTempTier('gold'); setDropStep('settings'); }}>GOLD SECTOR (ENCRYPTED)</button>
                  <button className="tactical-btn h-14" style={{ borderLeft: '4px solid var(--mc-silver)' }} onClick={() => { setTempTier('silver'); setDropStep('settings'); }}>SILVER SECTOR (WATCH AD)</button>
                  <button className="tactical-btn h-14" style={{ borderLeft: '4px solid var(--mc-bronze)' }} onClick={() => { setTempTier('bronze'); finalizeDrop(); }}>BRONZE SECTOR (UNLOCKED)</button>
                  <button className="text-slate-500 font-bold text-xs mt-4 uppercase hover:text-white transition-colors" onClick={() => setIsDropping(null)}>ABORT MISSION</button>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                   <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">PERSONNEL LIMIT</label>
                    <input type="number" className="tactical-input" value={maxOpensInput} onChange={(e) => setMaxOpensInput(e.target.value)} placeholder="NO LIMIT" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">SELF-DESTRUCT (MINS)</label>
                    <input type="number" className="tactical-input" value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} placeholder="INFINITE" />
                  </div>
                  <div className="flex gap-4 mt-4">
                    <button className="tactical-btn flex-1 bg-slate-800" onClick={() => setDropStep('tier')}>BACK</button>
                    <button className="tactical-btn primary flex-1" onClick={finalizeDrop}>DEPLOY</button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ad Overlay */}
      <AnimatePresence>
        {adTimer !== null && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="ad-overlay"
          >
             <div className="relative">
              <div className="w-24 h-24 border-8 border-amber-500/20 rounded-full flex items-center justify-center">
                <span className="text-4xl font-black text-amber-500">{adTimer}</span>
              </div>
              <svg className="absolute top-0 left-0 w-24 h-24 rotate-[-90deg]">
                <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-amber-500" strokeDasharray="251" strokeDashoffset={251 - (251 * adTimer / 15)} />
              </svg>
            </div>
            <div className="mt-8 text-center">
              <h2 className="text-4xl font-black italic text-white uppercase tracking-tighter">ESTABLISHING ENCRYPTED LINK</h2>
              <p className="text-slate-500 font-bold text-[10px] mt-2 tracking-[4px]">PLEASE REMAIN POSITIONED • {selectedChest?.tier} PROTOCOL</p>
            </div>
            <div className="mt-12 w-[600px] aspect-video bg-black/40 border border-white/5 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <Play size={80} className="text-white/20 group-hover:text-amber-500/40 transition-colors" />
              <div className="absolute bottom-6 left-6 flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold tracking-widest">LIVE TRANSMISSION</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chest Inspector Modal */}
      <AnimatePresence>
        {selectedChest && adTimer === null && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[100] bg-slate-950/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="tactical-panel w-full max-w-lg p-10 border-t-8 border-t-slate-700"
            >
              <button className="absolute top-6 right-6 text-slate-500 hover:text-white" onClick={() => setSelectedChest(null)}>
                <X size={24} />
              </button>

              <div className="grid grid-cols-[160px_1fr] gap-10">
                <div className="flex flex-col items-center gap-6">
                  <div className="w-40 h-40 bg-slate-900 border border-white/5 rounded-sm flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {(isExpired || isLimitReached) ? <X size={64} className="text-red-500" /> : selectedChest.hasPin ? <Lock size={64} className="text-amber-500" /> : <Gift size={64} className="text-blue-500" />}
                    {selectedChest.hasPin && <Crown className="absolute top-2 right-2 text-amber-500" size={20} />}
                  </div>
                  <div className="flex flex-col items-center w-full">
                    <span className={`px-3 py-1 text-[10px] font-black rounded-full mb-4 uppercase ${selectedChest.tier === 'gold' ? 'bg-amber-500 text-black' : selectedChest.tier === 'silver' ? 'bg-slate-400 text-black' : 'bg-amber-800 text-white'}`}>
                      {selectedChest.tier} SECTOR
                    </span>
                    {(isExpired || isLimitReached) && <span className="text-red-500 font-black text-xs uppercase italic tracking-widest animate-pulse">! DATA EXPIRED</span>}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-4xl font-black italic uppercase text-white mb-2 leading-none">{selectedChest.isMystery ? '???' : selectedChest.fileName}</h2>
                    <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-4">Origin: {selectedChest.droppedBy}</p>
                    <div className="flex gap-8 p-4 bg-slate-900/50 rounded-sm border border-white/5">
                      <div>
                        <p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Personnel</p>
                        <p className="font-mono text-sm">{selectedChest.currentOpens} / {selectedChest.maxOpens || '∞'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase text-slate-500 font-bold mb-1">Link Status</p>
                        <p className="font-mono text-sm text-green-500">ACTIVE</p>
                      </div>
                    </div>
                  </div>

                  {(selectedChest.hasPin || isExpired || isLimitReached) ? (
                    <div className="flex flex-col gap-4">
                      {!(isExpired || isLimitReached) && (
                        <input type="password" className="tactical-input" maxLength={4} placeholder="ENCRYPTION KEY" value={pinInput} onChange={(e) => setPinInput(e.target.value)} />
                      )}
                      <div className="flex gap-2">
                        {!(isExpired || isLimitReached) && <button className="tactical-btn primary flex-1" onClick={() => { if (pinInput === selectedChest.pin) alert('UPLINK ESTABLISHED'); else alert('ENCRYPTION ERROR'); }}>DECRYPT</button>}
                        <button className="tactical-btn flex-1 bg-slate-800">REQUEST LINK</button>
                      </div>
                    </div>
                  ) : (
                    <button className="tactical-btn primary w-full h-14">
                      <Download size={20} /> RETRIEVE INTEL
                    </button>
                  )}

                  {(selectedChest.droppedBy === currentUser.username || isAdminMode) && (
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5">
                      <button className="tactical-btn text-xs h-10 bg-slate-800">EDIT META</button>
                      <button className="tactical-btn danger text-xs h-10" onClick={() => deleteChest(selectedChest.id)}>TERMINATE</button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Command Console */}
      <AnimatePresence>
        {isAdminMode && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="admin-overlay grid grid-rows-[auto_1fr] gap-8 bg-slate-950 border-4 border-slate-900 border-t-amber-500"
          >
            <div className="flex justify-between items-center bg-slate-900/50 p-6 -m-10 mb-0 border-b border-white/5">
              <div>
                <h2 className="text-3xl font-black italic text-white uppercase italic tracking-tighter">MISSION CONTROL CONSOLE</h2>
                <p className="text-[10px] text-slate-500 font-bold tracking-[4px]">AUTHORIZED PERSONNEL: {currentUser.username}</p>
              </div>
              <button className="tactical-btn danger" onClick={() => setIsAdminMode(false)}><X size={20} /> CLOSE CONSOLE</button>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-10">
              <div className="tactical-panel bg-slate-900/30">
                <h3 className="text-lg font-black text-slate-400 mb-6 flex items-center gap-2 uppercase italic tracking-tighter"><User size={20} className="text-amber-500" /> Ground Units ({users.length})</h3>
                <table className="admin-table">
                  <thead><tr className="text-slate-500 uppercase text-[10px] tracking-widest"><th className="pb-4">Agent ID</th><th className="pb-4">Communications</th><th className="pb-4">Role</th><th className="pb-4">Action</th></tr></thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-mono text-xs">{u.username.toUpperCase()}</td>
                        <td className="text-xs text-slate-400">{u.email}</td>
                        <td className="text-[10px] font-bold"><span className={`px-2 py-0.5 rounded ${u.isAdmin ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-400'}`}>{u.isAdmin ? 'COMMAND' : 'UNIT'}</span></td>
                        <td>
                          {!u.isAdmin && <button className="text-red-500 hover:scale-110 transition-transform" onClick={() => deleteUser(u.id)}><Trash2 size={18} /></button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="tactical-panel bg-slate-900/30">
                <h3 className="text-lg font-black text-slate-400 mb-6 flex items-center gap-2 uppercase italic tracking-tighter"><Gift size={20} className="text-amber-500" /> Active Intel ({chests.length})</h3>
                <table className="admin-table">
                  <thead><tr className="text-slate-500 uppercase text-[10px] tracking-widest"><th className="pb-4">Meta Data</th><th className="pb-4">Dropper</th><th className="pb-4">Security</th><th className="pb-4">Action</th></tr></thead>
                  <tbody>
                    {chests.map(c => (
                      <tr key={c.id}>
                        <td className="font-mono text-xs">{c.fileName.split('.')[0]}</td>
                        <td className="font-mono text-xs text-slate-400">{c.droppedBy.toUpperCase()}</td>
                        <td className="text-[10px] font-bold">
                          <span className={`px-2 py-0.5 rounded ${c.tier === 'gold' ? 'bg-amber-500 text-black' : 'bg-slate-700 text-white'}`}>
                            {c.tier.toUpperCase()}
                          </span>
                        </td>
                        <td className="flex gap-4">
                          <button className="text-green-500" onClick={() => handleChestClick(c)}><Play size={18} /></button>
                          <button className="text-red-500" onClick={() => deleteChest(c.id)}><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Status */}
      <div className="fixed bottom-6 left-6 tactical-panel py-2 px-4 flex items-center gap-4 bg-slate-900/80 border-b-2 border-b-amber-500 z-50">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <p className="text-[10px] font-bold tracking-[3px] text-slate-400 uppercase">
          System Status: Optimal • Link: Encrypted • L: {playerPos.lat.toFixed(3)}, {playerPos.lng.toFixed(3)}
        </p>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600 tracking-[5px] uppercase pointer-events-none">
        WASD to Move • Deploy Intel anywhere
      </div>
    </div>
  );
}
