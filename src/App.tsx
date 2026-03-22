import { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { 
  User, 
  Lock, 
  LogOut, 
  Download, 
  Gift, 
  Bell,
  X,
  Crown,
  Trash2,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Types ---

interface Chest {
  id?: string;
  _id?: string;
  lat: number;
  lng: number;
  tier: 'gold' | 'silver' | 'bronze';
  fileName: string;
  fileSize: string;
  fileUrl?: string; // Cloudinary secure_url
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
  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
       const decoded: any = jwtDecode(credentialResponse.credential);
       const newUser: UserProfile = {
         id: decoded.sub,
         email: decoded.email,
         username: decoded.given_name || decoded.email.split('@')[0],
         isAdmin: decoded.email === 'admin@gmail.com' || decoded.email.includes('admin')
       };
       onLogin(newUser);
    }
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
          <h1 className="text-4xl font-black italic text-amber-500 mb-2 uppercase tracking-tighter">DATA DROPPER</h1>
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">Drop & Find Files Anywhere on the Map</p>
        </div>

        <div className="flex flex-col gap-6 items-center">
            <div className="text-center mb-4">
               <p className="text-xs uppercase font-bold text-slate-500 tracking-widest mb-4">Sign in to Access the Map</p>
            </div>
            <GoogleLogin
               onSuccess={handleGoogleSuccess}
               onError={() => alert('AUTHORIZATION MISTMATCH')}
               theme="filled_black"
               shape="pill"
            />
        </div>
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
    <div className={`airdrop-container tier-${tier}`} style={{ position: 'absolute', transform: 'translate(-50%, -50%)' }}>
      <div className="crate-beam"></div>
      <div className="sci-fi-crate">
        <div className="face front"></div>
        <div className="face back"></div>
        <div className="face left"></div>
        <div className="face right"></div>
        <div className="face top">
          {hasPin && <Lock size={14} color="#f97316" style={{ transform: 'rotateX(-90deg)' }} />}
        </div>
        <div className="face bottom"></div>
      </div>
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

const PlayerTracker = ({ pos, zoom }: { pos: {lat: number, lng: number}, zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([pos.lat, pos.lng], zoom, { animate: true, duration: 1 });
  }, [pos, zoom, map]);
  return null;
};

const AdminLogin = ({ onLogin }: { onLogin: (u: UserProfile) => void }) => {
  const [uname, setUname] = useState('');
  const [pwd, setPwd] = useState('');
  return (
    <div className="flex items-center justify-center h-screen bg-slate-950">
      <div className="tactical-panel p-12 max-w-sm w-full text-center border-t-4 border-t-amber-500">
        <h2 className="text-2xl font-black text-white mb-6 italic tracking-tighter">ADMIN DIRECT ACCESS</h2>
        <input className="tactical-input mb-4" placeholder="USERNAME" value={uname} onChange={e=>setUname(e.target.value)} />
        <input className="tactical-input mb-4" type="password" placeholder="PASSWORD" value={pwd} onChange={e=>setPwd(e.target.value)} />
        <button className="tactical-btn primary w-full" onClick={() => {
          if (uname === 'admin' && pwd === 'admin123') {
            onLogin({ id: 'admin-local', email: 'admin@domain.com', username: 'admin', isAdmin: true });
          } else { alert('ACCESS DENIED'); }
        }}>AUTHORIZE SYSTEM</button>
      </div>
    </div>
  );
};

const locations = [
  { name: "KERALA, INDIA", lat: 10.8505, lng: 76.2711 },
  { name: "DUBAI, UAE", lat: 25.2048, lng: 55.2708 },
  { name: "LONDON, UK", lat: 51.5074, lng: -0.1278 },
  { name: "NEW YORK, USA", lat: 40.7128, lng: -74.0060 },
  { name: "TOKYO, JAPAN", lat: 35.6762, lng: 139.6503 }
];

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('dataDropperUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([
    { id: 'u1', email: 'admin@gmail.com', username: 'admin', isAdmin: true },
    { id: 'u2', email: 'alex@gmail.com', username: 'alex', isAdmin: false }
  ]);
  const [chests, setChests] = useState<Chest[]>([]);
  const [selectedChest, setSelectedChest] = useState<Chest | null>(null);
  const [isDropping, setIsDropping] = useState<{lat: number, lng: number} | null>(null);
  const [dropStep, setDropStep] = useState<'tier' | 'settings'>('tier');
  const [tempTier, setTempTier] = useState<'gold' | 'silver' | 'bronze' | null>(null);
  const [maxOpensInput, setMaxOpensInput] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [pinInput, setPinInput] = useState('');
  const [requests] = useState<Request[]>([]);
  const [showRequests, setShowRequests] = useState(false);
  const [adTimer, setAdTimer] = useState<number | null>(null);

  // Character Movement (Lat/Lng)
  const [playerPos, setPlayerPos] = useState({ lat: 20, lng: 0 }); // Global Start
  const [zoomLevel, setZoomLevel] = useState(2);
  const [isMoving, setIsMoving] = useState(false);
  const [charType, setCharType] = useState<'man' | 'woman'>('man');

  const [isExploding, setIsExploding] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    // Fetch live drops from Database
    axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);

    const checkInterval = setInterval(() => {
      axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);
    }, 30000); // Sync every 30s

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
      clearInterval(checkInterval);
    };
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
      });
    } else {
      alert("To install, use the 'Add to Home Screen' or 'Install App' option in your browser's menu (top right).");
    }
  };

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
      if (document.activeElement?.tagName === 'INPUT') return; 
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
    setSelectedChest(chest);
    setPinInput('');
  };

  const handleChestAction = async () => {
    if (!selectedChest) return;

    if (selectedChest.tier === 'gold') {
      if (pinInput !== (selectedChest.pin || '0000')) {
        alert('ACCESS DENIED: INCORRECT PIN');
        return;
      }
    }

    if (selectedChest.tier === 'silver' && adTimer === null) {
      setAdTimer(15);
      return; 
    }

    try {
      const res = await axios.patch(`${API_URL}/chests/${selectedChest._id || selectedChest.id}/open`);
      setChests(prev => prev.map(c => (c._id === selectedChest._id || c.id === selectedChest.id) ? res.data : c));
      
      setIsExploding(true);
      setTimeout(() => {
        setIsExploding(false);
        if (selectedChest.fileUrl) window.open(selectedChest.fileUrl, '_blank');
        else alert('DATA SEQUENCE COMPLETE');
        setSelectedChest(null);
      }, 800);
    } catch (e: any) {
      alert(e.response?.data?.message || 'Access Failed');
    }
  };

  const finalizeDrop = async () => {
    if (!isDropping || !currentUser || !tempTier) return;

    const formData = new FormData();
    formData.append('lat', isDropping.lat.toString());
    formData.append('lng', isDropping.lng.toString());
    formData.append('tier', tempTier);
    formData.append('droppedBy', currentUser.username);
    if (tempTier === 'gold') formData.append('pin', pinInput || '0000'); 
    if (maxOpensInput) formData.append('maxOpens', maxOpensInput);
    if (expiryInput) formData.append('expiresAt', (Date.now() + parseInt(expiryInput) * 60000).toString());
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_URL}/chests`, formData);
      setChests([...chests, res.data]);
      alert('DEPLOYMENT SUCCESSFUL');
    } catch (e) {
      console.error(e);
      alert('Failed to deploy intel');
    }

    setIsDropping(null);
    setTempTier(null);
    setDropStep('tier');
    setMaxOpensInput('');
    setExpiryInput('');
    setSelectedFile(null);
    setPinInput('');
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (selectedChest || adTimer !== null || !currentUser || isDropping) return;
    setIsDropping({ lat, lng });
  };

  const deleteChest = async (targetId: string) => {
    await axios.delete(`${API_URL}/chests/${targetId}`).catch(console.error);
    setChests(prev => prev.filter(c => c._id !== targetId && c.id !== targetId));
    setSelectedChest(null);
  };

  const deleteUser = (targetId: string) => {
    const userToDelete = users.find(u => u.id === targetId);
    if (!userToDelete) return;
    setUsers(prev => prev.filter(u => u.id !== targetId));
    setChests(prev => prev.filter(c => c.droppedBy !== userToDelete.username));
  };

  if (window.location.pathname === '/admin' && (!currentUser || !currentUser.isAdmin)) {
    return <AdminLogin onLogin={(user) => { 
      setCurrentUser(user); 
      localStorage.setItem('dataDropperUser', JSON.stringify(user)); 
      window.location.href = '/'; 
    }} />
  }

  if (!currentUser) {
    return (
      <GoogleOAuthProvider clientId="666413173667-kkf2ggvt3avkgpdcojhkg8koeljv7t3m.apps.googleusercontent.com">
        <LoginScreen onLogin={(user) => { 
          setCurrentUser(user); 
          localStorage.setItem('dataDropperUser', JSON.stringify(user));
          if (!users.find(u => u.id === user.id)) setUsers(prev => [...prev, user]); 
        }} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="world-map">
      {/* Cinematic Space Background */}
      <div className="absolute inset-0 bg-[#020617] pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vh] h-[150vh] bg-blue-500/10 rounded-full blur-[150px]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vh] h-[100vh] bg-orange-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-40"></div>
        <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-30"></div>
      </div>

      {/* Top Floating HUD Dashboard */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-6 px-8 py-3 tactical-panel w-[90%] max-w-4xl">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-800/50 rounded flex items-center justify-center border border-white/5 shadow-inner">
               <User size={20} className="text-orange-500" />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase">Authenticated Operator</span>
               <span className="text-sm font-black text-white tracking-widest italic">{currentUser?.username.toUpperCase()}</span>
            </div>
         </div>

         <div className="h-8 w-[1px] bg-white/10 ml-auto flex-shrink-0"></div>

         <div className="flex items-center gap-3">
            {currentUser?.isAdmin && (
               <button 
                  className={`tactical-btn h-10 px-4 ${isAdminMode ? 'primary' : 'bg-white/5'}`}
                  onClick={() => setIsAdminMode(!isAdminMode)}
               >
                  <Shield size={16} /> ADMIN
               </button>
            )}
            <button className="tactical-btn h-10 w-10 p-0 items-center justify-center bg-white/5 relative" onClick={() => setShowRequests(!showRequests)}>
               <Bell size={18} className={requests.length > 0 ? "text-orange-500 animate-bounce" : "text-slate-200"} />
               {requests.length > 0 && <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,1)]"></span>}
            </button>
            <button className="tactical-btn h-10 w-10 p-0 items-center justify-center bg-red-900/10 text-red-500 border-red-900/20 hover:bg-red-900/40 transition-all" onClick={() => { setCurrentUser(null); localStorage.removeItem('dataDropperUser'); }}>
               <LogOut size={18} />
            </button>
            <button className="tactical-btn primary h-10 px-6 font-black text-[10px]" onClick={handleInstallClick}>
               INSTALL
            </button>
         </div>
      </div>

      {/* Globe Map Sphere */}
      <div className="map-container-wrapper">
         <div className="absolute inset-0 bg-black/40 z-[5] pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
         <MapContainer 
            center={[playerPos.lat, playerPos.lng]} 
            zoom={zoomLevel} 
            zoomControl={false} 
            style={{ width: '100%', height: '100%', position: 'absolute', zIndex: 0 }}
         >
            <TileLayer
               url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
               attribution="&copy; Google Maps"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <PlayerTracker pos={playerPos} zoom={zoomLevel} />
            
            <Marker position={[playerPos.lat, playerPos.lng]} icon={getPlayerIcon(charType, isMoving)} zIndexOffset={100} />

            {chests.map((chest) => (
               <Marker 
                  key={chest._id || chest.id}
                  position={[chest.lat, chest.lng]} 
                  icon={getChestIcon(chest.tier, chest.hasPin)}
                  eventHandlers={{ click: () => handleChestClick(chest) }}
               />
            ))}
         </MapContainer>
      </div>

      {/* Bottom Left: Location Selectors */}
      <div className="fixed bottom-10 left-10 z-[150] flex flex-col gap-4">
         <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] pl-1 drop-shadow-lg">Targeting Vectors</p>
         <div className="flex gap-2 flex-wrap max-w-sm">
            {locations.map(loc => (
               <button key={loc.name} className="tactical-btn bg-slate-900/60 border-white/5 hover:border-orange-500/50 hover:bg-slate-800/80 transition-all font-black text-[9px]" onClick={() => {
                  setPlayerPos({ lat: loc.lat, lng: loc.lng });
                  setZoomLevel(15);
               }}>
                  {loc.name}
               </button>
            ))}
         </div>
      </div>

      {/* Bottom Right: Status Dashboard */}
      <div className="fixed bottom-10 right-10 z-[150] flex flex-col items-end gap-4">
          <div className="flex gap-2 p-1.5 bg-slate-900/60 backdrop-blur rounded-xl border border-white/5 shadow-2xl">
             <button className={`tactical-btn h-12 w-12 p-0 justify-center rounded-lg ${charType === 'man' ? 'primary' : 'bg-transparent border-0'}`} onClick={() => setCharType('man')}><User size={20} /></button>
             <button className={`tactical-btn h-12 w-12 p-0 justify-center rounded-lg ${charType === 'woman' ? 'primary' : 'bg-transparent border-0'}`} onClick={() => setCharType('woman')}><User size={20} /></button>
          </div>
          <div className="tactical-panel px-5 py-3 border-l-4 border-l-orange-500 bg-slate-900/90 shadow-2xl flex items-center gap-4">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">POSITIONING SYSTEM</span>
                <span className="text-[10px] font-mono font-black text-white tracking-widest uppercase">
                   {playerPos.lat.toFixed(4)} / {playerPos.lng.toFixed(4)}
                </span>
             </div>
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
      </div>

      <AnimatePresence>
        {isAdminMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="admin-overlay px-12 py-12">
            <div className="flex justify-between items-center mb-16 px-4">
              <div className="flex flex-col">
                <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter">Command Center</h2>
                <p className="text-orange-500 font-black text-[10px] tracking-[0.5em] mt-2 uppercase">Global Data Administration Protocol</p>
              </div>
              <button className="tactical-btn danger h-14 px-8" onClick={() => setIsAdminMode(false)}><X size={20} /> CLOSE SYSTEM</button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-[calc(100vh-250px)]">
              <div className="tactical-panel p-10 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[4px] mb-8 flex items-center gap-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div> DEPLOYED ORDNANCE ({chests.length})
                </h3>
                <div className="overflow-y-auto flex-1">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th className="text-[9px] uppercase text-slate-500 pb-4 font-black">Level</th>
                        <th className="text-[9px] uppercase text-slate-500 pb-4 font-black">Operator</th>
                        <th className="text-[9px] uppercase text-slate-500 pb-4 font-black">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chests.map(c => (
                        <tr key={c._id || c.id}>
                          <td className="py-4 font-black text-white uppercase text-xs tracking-tighter flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${c.tier === 'gold' ? 'bg-amber-400' : 'bg-slate-400'}`}></div>
                             {c.tier}
                          </td>
                          <td className="py-4 text-slate-400 text-xs tracking-widest uppercase font-bold">{c.droppedBy}</td>
                          <td className="py-4">
                            <button className="text-red-500/40 hover:text-red-500 p-2 transition-colors" onClick={() => deleteChest(c._id || c.id || '')}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="tactical-panel p-10 flex flex-col overflow-hidden">
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[4px] mb-8 flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div> PERSONNEL RECORDS ({users.length})
                </h3>
                <div className="overflow-y-auto flex-1">
                   <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th className="text-[9px] uppercase text-slate-500 pb-4 font-black">Codename</th>
                        <th className="text-[9px] uppercase text-slate-500 pb-4 font-black">Authorization</th>
                        <th className="text-[9px] uppercase text-slate-500 pb-4 font-black">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id}>
                          <td className="py-4 font-black text-white uppercase text-xs tracking-widest">{u.username}</td>
                          <td className="py-4">
                             <span className={`px-3 py-1 rounded text-[9px] font-black tracking-widest ${u.isAdmin ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-white/5 text-slate-400 border border-white/5'} uppercase`}>
                                {u.isAdmin ? 'LVL_4_ADMIN' : 'FIELD_OP'}
                             </span>
                          </td>
                          <td className="py-4">
                            {!u.isAdmin && <button className="text-red-500/40 hover:text-red-500 p-2" onClick={() => deleteUser(u.id)}><Trash2 size={16} /></button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showRequests && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="fixed top-24 right-10 w-96 tactical-panel p-8 z-[210] border-t-8 border-t-orange-500 shadow-3xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xs font-black text-white uppercase tracking-[4px]">Intelligence Feed</h3>
              <button onClick={() => setShowRequests(false)} className="tactical-btn h-10 w-10 p-0 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center py-20 opacity-30">
                 <Bell size={40} className="mb-4" />
                 <p className="text-center text-slate-600 font-bold text-[9px] uppercase tracking-[0.3em]">Buffer Empty</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {requests.map(r => (
                  <div key={r.id} className="p-5 bg-white/[0.03] rounded-xl border border-white/5 group hover:border-orange-500/40 transition-all">
                    <p className="text-xs text-white font-black mb-1 uppercase tracking-widest">{r.chestId}</p>
                    <p className="text-[9px] text-slate-500 font-black mb-4 uppercase tracking-[0.2em]">{r.status}</p>
                    <button className="w-full tactical-btn primary h-10 text-[9px] font-black tracking-[0.3em]">AUTHORIZE DECRYPT</button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {isDropping && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-[#020617]/95 backdrop-blur-2xl">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="tactical-panel p-10 w-full max-w-sm flex flex-col gap-10 shadow-[0_0_100px_rgba(249,115,22,0.15)] border-t-8 border-t-orange-500"
            >
               <div className="text-center">
                  <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-orange-500/20">
                     <Download size={32} className="text-orange-500 animate-bounce" />
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tighter italic uppercase">
                     {dropStep === 'tier' ? 'Deploy Intel' : 'Payload Spec'}
                  </h3>
               </div>
               
               {dropStep === 'tier' ? (
                 <div className="flex flex-col gap-3">
                   <button className="tactical-btn h-16 bg-white/[0.03] border-l-4 border-l-amber-400 text-xs" onClick={() => { setTempTier('gold'); setDropStep('settings'); }}>LEVEL: GOLD (BIOMETRIC)</button>
                   <button className="tactical-btn h-16 bg-white/[0.03] border-l-4 border-l-slate-400 text-xs" onClick={() => { setTempTier('silver'); setDropStep('settings'); }}>LEVEL: SILVER (AD-GATED)</button>
                   <button className="tactical-btn h-16 bg-white/[0.03] border-l-4 border-l-orange-900 text-xs" onClick={() => { setTempTier('bronze'); finalizeDrop(); }}>LEVEL: BRONZE (UNLOCKED)</button>
                   <button className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] mt-8 hover:text-red-500 transition-colors" onClick={() => setIsDropping(null)}>CANCEL SEQUENCE</button>
                 </div>
               ) : (
                 <div className="flex flex-col gap-6">
                   <div className="flex flex-col gap-2">
                     <label className="text-[8px] uppercase font-black text-slate-500 tracking-[0.4em] pl-1">Target Payload</label>
                     <input type="file" className="tactical-input text-[10px] font-mono p-4 h-auto" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-[8px] uppercase font-black text-slate-500 tracking-[0.2em] pl-1">Quota</label>
                        <input type="number" className="tactical-input text-center h-12" value={maxOpensInput} onChange={(e) => setMaxOpensInput(e.target.value)} placeholder="INF" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[8px] uppercase font-black text-slate-500 tracking-[0.2em] pl-1">Timer (MIN)</label>
                        <input type="number" className="tactical-input text-center h-12" value={expiryInput} onChange={(e) => setExpiryInput(e.target.value)} placeholder="OFF" />
                      </div>
                   </div>
                   {tempTier === 'gold' && (
                     <div className="flex flex-col gap-2">
                        <label className="text-[8px] uppercase font-black text-slate-500 tracking-[0.2em] pl-1">Security PIN</label>
                        <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="tactical-input text-center h-12" maxLength={4} placeholder="0000" />
                     </div>
                   )}
                   <div className="flex gap-3 mt-6">
                     <button className="tactical-btn flex-1 h-14 bg-white/5 border-0 font-black text-[10px]" onClick={() => setDropStep('tier')}>PREVIOUS</button>
                     <button className="tactical-btn primary flex-1 h-14 font-black text-[10px]" onClick={finalizeDrop}>DEEP DROP</button>
                   </div>
                 </div>
               )}
            </motion.div>
          </div>
        )}

        {adTimer !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-[#020617]/98 backdrop-blur-3xl">
            <div className="w-32 h-32 border-4 border-white/5 rounded-full flex items-center justify-center relative">
               <span className="text-4xl font-black text-orange-500 italic">{adTimer}</span>
               <svg className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] -rotate-90">
                  <circle cx="64" cy="64" r="60" fill="none" stroke="#f97316" strokeWidth="4" strokeDasharray="377" strokeDashoffset={377 - (377 * adTimer / 15)} className="transition-all duration-1000 linear" />
               </svg>
            </div>
            <div className="mt-12 text-center">
              <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter">Decrypting Caches</h2>
              <p className="text-orange-500/60 font-black text-[10px] mt-2 tracking-[8px] uppercase">Please maintain hardware connection</p>
            </div>
          </motion.div>
        )}

        {selectedChest && adTimer === null && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-[#020617]/95 backdrop-blur-2xl">
            <motion.div 
               initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
               className="tactical-panel p-12 w-full max-w-lg border-t-8 border-t-orange-500 flex flex-col gap-10 shadow-3xl"
            >
              <div className="flex items-center gap-8">
                <div className={`w-24 h-24 rounded-2xl flex items-center justify-center border-2 ${selectedChest.tier === 'gold' ? 'border-amber-400 bg-amber-400/10' : selectedChest.tier === 'silver' ? 'border-slate-400 bg-slate-400/10' : 'border-orange-950 bg-orange-950/10'}`}>
                   {selectedChest.tier === 'gold' ? <Crown size={48} className="text-amber-400" /> : <Gift size={48} className="text-slate-200" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">{selectedChest.fileName.split('.').shift()}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{selectedChest.tier} Level Payload</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="p-6 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Weight</p>
                    <p className="text-base font-black text-white italic">{selectedChest.fileSize}</p>
                 </div>
                 <div className="p-6 bg-white/[0.03] rounded-xl border border-white/5">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Source</p>
                    <p className="text-base font-black text-white italic uppercase">{selectedChest.droppedBy}</p>
                 </div>
              </div>

              <div className="flex flex-col gap-4 mt-4">
                 {selectedChest.tier === 'gold' && (
                    <div className="flex flex-col gap-3 mb-6">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] text-center">PIN Required</label>
                       <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="tactical-input text-center text-4xl tracking-[0.8em]" maxLength={4} placeholder="0000" />
                    </div>
                 )}
                 <button className="tactical-btn primary h-20 justify-center text-xs font-black tracking-[0.4em]" onClick={handleChestAction}>
                    {selectedChest.tier === 'gold' ? 'VERIFY & ACCESS' : selectedChest.tier === 'silver' ? 'START DECRYPT' : 'ACCESS DATA'}
                 </button>
                 <button className="text-[10px] font-black text-slate-600 uppercase tracking-[0.6em] mt-4 hover:text-white transition-colors text-center" onClick={() => { setSelectedChest(null); setPinInput(''); }}>ABORT ACCESS</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SVG Distortion Filter for the 3D 'Lens' / 'Bulge' Effect */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
        <defs>
          <filter id="bulge-filter">
             {/* Spherical Displacement Map */}
             <feImage 
                href="data:image/svg+xml;charset=utf-8,<svg xmlns='http://www.w3.org/2000/svg' width='100%' height='100%'><radialGradient id='g' cx='50%' cy='50%' r='50%' fx='50%' fy='50%'><stop offset='0%' stop-opacity='1'/><stop offset='80%' stop-opacity='0.4'/><stop offset='100%' stop-opacity='0'/></radialGradient><rect width='100%' height='100%' fill='url(%23g)'/></svg>"
                result="mask"
             />
             <feDisplacementMap in="SourceGraphic" in2="mask" scale="80" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {/* 3D Atmospheric Horizon Glow (Outer Ring) */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[86vh] h-[86vh] rounded-full border-[15px] border-blue-500/10 blur-[12px] pointer-events-none z-[11] shadow-[0_0_80px_rgba(135,206,235,0.2)]"></div>

      {isExploding && <div className="pottitheri-explosion z-[500] pointer-events-none"></div>}
    </div>
  );
}
