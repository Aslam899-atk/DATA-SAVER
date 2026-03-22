import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import {
  User,
  LogOut,
  Bell,
  X,
  Smartphone,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --- Types ---

interface Chest {
  id?: string;
  _id?: string;
  lat: number;
  lng: number;
  tier: 'gold' | 'silver' | 'bronze';
  fileName: string;
  fileSize: string;
  fileUrl?: string;
  droppedBy: string;
  hasPin: boolean;
  pin?: string;
  maxOpens?: number;
  currentOpens: number;
  expiresAt?: number;
  requiresRequest: boolean;
  requests?: { from: string, status: 'pending' | 'accepted' | 'rejected' }[];
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const AdminPanel = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [activeTab, setActiveTab] = useState<'DROPS' | 'ADS'>('DROPS');
  const [chests, setChests] = useState<Chest[]>([]);

  useEffect(() => {
    if (isAdminLoggedIn) {
      axios.get(`${API_URL}/chests`).then(res => setChests(res.data));
    }
  }, [isAdminLoggedIn]);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (adminUser === 'aslam' && adminPass === '313 aslam 786') {
      setIsAdminLoggedIn(true);
    } else {
      alert('Invalid admin credentials');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this drop?')) {
      await axios.delete(`${API_URL}/chests/${id}`);
      setChests(chests.filter(c => c._id !== id && c.id !== id));
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <form onSubmit={handleLogin} className="bg-[#5ba4e5] p-10 rounded-[2.5rem] border-2 border-black flex flex-col gap-6 w-full max-w-sm shadow-2xl">
          <h2 className="text-3xl font-black text-center mb-4 uppercase text-black">Admin Access</h2>
          <input type="text" value={adminUser} onChange={e => setAdminUser(e.target.value)} placeholder="Username" className="p-4 rounded-xl border-2 border-black font-bold text-lg bg-white/60" />
          <input type="password" value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="Password" className="p-4 rounded-xl border-2 border-black font-bold text-lg bg-white/60" />
          <button type="submit" className="bg-black text-[#5ba4e5] font-black py-4 rounded-xl text-xl uppercase tracking-widest hover:bg-black/80 shadow-[0_4px_0_0_#fff] active:shadow-none active:translate-y-1">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans p-10 flex gap-8">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col pt-4 max-w-5xl">
        {/* TABS */}
        <div className="flex w-full mb-10 h-16">
          <button onClick={() => setActiveTab('DROPS')} className={`flex-1 text-3xl font-bold border-2 border-black bg-[#5ba4e5] transition-all shadow-md ${activeTab === 'DROPS' ? 'border-red-500 border-4 z-10' : ''}`}>DROPS</button>
          <button onClick={() => setActiveTab('ADS')} className={`flex-1 text-3xl font-bold border-2 border-black bg-[#5ba4e5] -ml-[2px] transition-all shadow-md ${activeTab === 'ADS' ? 'border-red-500 border-4 z-10' : ''}`}>ADS</button>
        </div>

        {/* TAB CONTENT: DROPS */}
        {activeTab === 'DROPS' && (
          <div className="flex flex-col gap-5">
            {chests.map(chest => (
              <div key={chest._id || chest.id} className="w-full bg-[#5ba4e5] border-2 border-black p-3 flex items-center shadow-md">
                <button onClick={() => handleDelete(chest._id || chest.id!)} className="w-10 h-10 rounded-full border-2 border-black bg-white flex items-center justify-center hover:bg-black hover:text-white transition-colors group">
                  <X size={16} className="opacity-0 group-hover:opacity-100" />
                </button>
                <a href={chest.fileUrl || '#'} target="_blank" rel="noreferrer" className="flex-1 ml-6 text-xl tracking-wide font-mono hover:underline hover:text-blue-900 truncate">
                  {chest.droppedBy}
                </a>
                <div className="w-16 h-full flex items-center justify-center border-l-2 border-black/20 pl-4">
                  <span className="text-3xl drop-shadow-md" style={{ filter: `drop-shadow(0 0 5px ${chest.tier === 'gold' ? '#fbbf24' : chest.tier === 'silver' ? '#94a3b8' : '#cd7f32'})` }}>
                    {chest.tier === 'gold' ? '🥇' : chest.tier === 'silver' ? '🥈' : '🥉'}
                  </span>
                </div>
              </div>
            ))}
            {chests.length === 0 && <p className="text-2xl text-center font-bold text-gray-500 mt-10">No active drops available.</p>}
          </div>
        )}

        {/* TAB CONTENT: ADS */}
        {activeTab === 'ADS' && (
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-6">
              <div className="flex-1 border-4 border-black bg-[#5ba4e5] rounded-xl p-4 font-bold text-xl uppercase shadow-md cursor-pointer hover:bg-[#4a93d4] transition-colors">Choose video for ads</div>
              <span className="font-medium text-gray-600 text-lg">Only 15 second</span>
            </div>
            <div className="grid grid-cols-4 gap-6">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="aspect-square bg-[#5ba4e5] border-2 border-black rounded-[2rem] flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer">
                  <span className="font-semibold text-lg text-black/80">Preview of ads</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT HUD */}
      <div className="w-[300px] flex flex-col gap-10 pt-4 px-8 border-l-2 border-dashed border-gray-300">
        <div className="flex items-center justify-between text-2xl font-black w-full text-black">
          <span>TOTAL:{chests.length}</span>
          <div className="w-12 h-12 bg-slate-800 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">📦</span></div>
        </div>
        <div className="flex items-center justify-between text-2xl font-black w-full text-black">
          <span>GOLD:{chests.filter(c => c.tier === 'gold').length}</span>
          <div className="w-12 h-12 bg-yellow-400 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">🧰</span></div>
        </div>
        <div className="flex items-center justify-between text-2xl font-black w-full text-black">
          <span>SILVER:{chests.filter(c => c.tier === 'silver').length}</span>
          <div className="w-12 h-12 bg-gray-300/80 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">🎁</span></div>
        </div>
        <div className="flex items-center justify-between text-2xl font-black w-full text-black">
          <span>BRONZE:{chests.filter(c => c.tier === 'bronze').length}</span>
          <div className="w-12 h-12 bg-amber-700 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">🥉</span></div>
        </div>
      </div>
    </div>
  );
};

const LeafletMapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e: any) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const StarField = () => {
  const [stars, setStars] = useState<{ x: number, y: number, size: number, duration: number }[]>([]);
  useEffect(() => {
    const newStars = Array.from({ length: 150 }).map(() => ({
      x: Math.random() * 100, y: Math.random() * 100,
      size: Math.random() * 2 + 1, duration: Math.random() * 3 + 2
    }));
    setStars(newStars);
  }, []);
  return (
    <div className="star-field">
      {stars.map((star, i) => (
        <div key={i} className="star" style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, '--duration': `${star.duration}s` } as any} />
      ))}
    </div>
  );
};

const LoginScreen = ({ onLogin, onCancel }: { onLogin: (user: UserProfile) => void, onCancel: () => void }) => {
  const handleGoogleSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decoded: any = jwtDecode(credentialResponse.credential);
      onLogin({
        id: decoded.sub,
        email: decoded.email,
        username: decoded.given_name || decoded.email.split('@')[0],
        isAdmin: decoded.email === 'admin@gmail.com' || decoded.email.includes('admin')
      });
    }
  };
  return (
    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="tactical-panel p-10 w-full max-w-md z-10 border-t-8 border-t-orange-500 relative flex flex-col items-center">
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20} /></button>
      <div className="text-center mb-8 mt-4">
        <h1 className="text-3xl font-black italic text-orange-500 mb-2 uppercase tracking-tighter">AUTHENTICATE</h1>
        <p className="text-slate-400 text-[10px] font-bold tracking-widest uppercase">Operator Login Required</p>
      </div>
      <div className="flex flex-col gap-6 items-center">
        <GoogleOAuthProvider clientId="666413173667-kkf2ggvt3avkgpdcojhkg8koeljv7t3m.apps.googleusercontent.com">
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => alert('AUTH FAILED')} theme="filled_black" shape="pill" />
        </GoogleOAuthProvider>
      </div>
    </motion.div>
  );
};

export default function App() {
  if (window.location.pathname === '/admin') {
    return <AdminPanel />;
  }

  const globeEl = useRef<any>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('dataDropperUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [chests, setChests] = useState<Chest[]>([]);
  const [selectedChest, setSelectedChest] = useState<Chest | null>(null);
  const [isDropping, setIsDropping] = useState<{ lat: number, lng: number } | null>(null);
  const [tempTier, setTempTier] = useState<'gold' | 'silver' | 'bronze'>('bronze');
  const [silverMode, setSilverMode] = useState<'timer' | 'count' | 'ads'>('count');
  const [silverValue, setSilverValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [adTimer, setAdTimer] = useState<number | null>(null);
  const [isExploding, setIsExploding] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const fn = () => axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);
    fn();
    const interval = setInterval(fn, 15000); // Faster updates for live maps
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (!localStorage.getItem(`introSeen_${currentUser.username}`)) {
        setShowIntro(true);
      }
    }
  }, [currentUser]);

  const handleCloseIntro = () => {
    setShowIntro(false);
    if (currentUser) localStorage.setItem(`introSeen_${currentUser.username}`, 'true');
  };

  useEffect(() => {
    if (adTimer !== null && adTimer > 0) {
      const t = setTimeout(() => setAdTimer(adTimer - 1), 1000);
      return () => clearTimeout(t);
    } else if (adTimer === 0) setAdTimer(null);
  }, [adTimer]);

  const handleGlobeClick = ({ lat, lng }: { lat: number, lng: number }) => {
    if (!currentUser) { setShowLoginModal(true); return; }
    if (selectedChest || adTimer !== null || isDropping) return;
    setIsDropping({ lat, lng });
    setTempTier('bronze'); setSilverMode('count'); setSilverValue(''); setPinInput(''); setSelectedFile(null);
  };

  const handlePointClick = (pt: any) => {
    setSelectedChest(pt);
  };

  const handleChestAction = async () => {
    if (!selectedChest) return;
    if (selectedChest.tier === 'bronze') { processOpen(); return; }

    if (selectedChest.tier === 'silver' && adTimer === null) { setAdTimer(15); return; }

    if (selectedChest.tier === 'gold') {
      if (!currentUser) { setShowLoginModal(true); return; }
      if (pinInput !== (selectedChest.pin || '0000')) { alert('INVALID PIN'); return; }
      const myReq = selectedChest.requests?.find(r => r.from === currentUser.username);
      if (!myReq || myReq.status === 'pending') {
        if (!myReq) {
          await axios.post(`${API_URL}/chests/${selectedChest._id || selectedChest.id}/request`, { from: currentUser.username });
          alert('REQUEST SENT');
        } else alert('WAITING APPROVAL');
        return;
      }
      if (myReq.status === 'rejected') { alert('DENIED'); return; }
      processOpen();
    }
  };

  const processOpen = async () => {
    if (!selectedChest) return;
    try {
      const res = await axios.patch(`${API_URL}/chests/${selectedChest._id || selectedChest.id}/open`);
      setChests(prev => prev.map(c => (c._id === selectedChest._id || c.id === selectedChest.id) ? res.data : c));
      setIsExploding(true);
      setTimeout(() => {
        setIsExploding(false);
        if (selectedChest.fileUrl) window.open(selectedChest.fileUrl, '_blank');
        setSelectedChest(null);
      }, 800);
    } catch (e: any) { alert(e.response?.data?.message || 'Failed'); }
  };

  const finalizeDrop = async () => {
    if (!isDropping || !currentUser || !tempTier || isDeploying) return;
    setIsDeploying(true);
    const formData = new FormData();
    formData.append('lat', isDropping.lat.toString());
    formData.append('lng', isDropping.lng.toString());
    formData.append('tier', tempTier);
    formData.append('droppedBy', currentUser.username);

    if (tempTier === 'gold') {
      formData.append('pin', pinInput || '0000');
      formData.append('requiresRequest', 'true');
    }
    if (tempTier === 'silver' && silverValue && !isNaN(parseInt(silverValue))) {
      if (silverMode === 'count') formData.append('maxOpens', silverValue);
      if (silverMode === 'timer') formData.append('expiresAt', (Date.now() + parseInt(silverValue) * 3600000).toString());
      if (silverMode === 'ads') formData.append('adsRequired', silverValue);
    }
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_URL}/chests`, formData, { timeout: 60000 });
      setChests(prev => [...prev, res.data]);
      setIsDropping(null); setTempTier('bronze'); setSilverValue(''); setSelectedFile(null); setPinInput('');
      alert('SUCCESS: INTEL DEPLOYED TO SECTOR');
    } catch (e: any) { 
      alert(`FAILED: ${e.response?.data?.error || e.message}`); 
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRequestAction = async (chestId: string, fromUser: string, status: 'accepted' | 'rejected') => {
    await axios.patch(`${API_URL}/chests/${chestId}/requests`, { from: fromUser, status });
    axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data));
  };

  return (
    <div className="world-map relative w-full h-screen overflow-hidden bg-black">
      <StarField />

      {/* MAP TOGGLE */}
      <div style={{ position: 'fixed', top: '80px', left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.7)', padding: '4px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
          <button
            style={{ padding: '8px 24px', borderRadius: '999px', fontWeight: 900, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: mapMode === '3d' ? '#5ba4e5' : 'transparent', color: mapMode === '3d' ? '#000' : '#94a3b8' }}
            onClick={() => setMapMode('3d')}
          >
            🌍 3D Globe
          </button>
          <button
            style={{ padding: '8px 24px', borderRadius: '999px', fontWeight: 900, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: mapMode === '2d' ? '#f97316' : 'transparent', color: mapMode === '2d' ? '#000' : '#94a3b8' }}
            onClick={() => setMapMode('2d')}
          >
            🗺️ Street View
          </button>
        </div>
      </div>

      {/* 3D GLOBE RENDERED PUBLICLY */}
      <div style={{ position: 'absolute', inset: 0, zIndex: mapMode === '3d' ? 10 : 0, opacity: mapMode === '3d' ? 1 : 0, pointerEvents: mapMode === '3d' ? 'auto' : 'none', transition: 'opacity 0.5s' }} className="globe-container">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          onGlobeClick={handleGlobeClick}
          htmlElementsData={chests}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.innerHTML = `📦`;
            el.style.fontSize = '32px';
            el.style.filter = `drop-shadow(0 0 10px ${d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : d.tier === 'bronze' ? '#cd7f32' : '#fff'})`;
            el.style.cursor = 'pointer';
            el.style.pointerEvents = 'auto';
            el.title = d.fileName;
            el.innerHTML = d.tier === 'gold' ? '🥇' : d.tier === 'silver' ? '🥈' : '🥉';
            el.onclick = (e) => { e.stopPropagation(); handlePointClick(d); };
            return el;
          }}
          htmlLat="lat" htmlLng="lng"
          htmlAltitude={(d: any) => (d.tier === 'gold' ? 0.4 : d.tier === 'silver' ? 0.3 : 0.2)}
          ringsData={chests}
          ringLat="lat" ringLng="lng"
          ringColor={(d: any) => (d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : '#cd7f32')}
          ringMaxRadius={2} ringPropagationSpeed={2}
        />
      </div>

      {/* 2D TACTICAL SATELLITE MAP */}
      <div style={{ position: 'absolute', inset: 0, zIndex: mapMode === '2d' ? 20 : 0, opacity: mapMode === '2d' ? 1 : 0, pointerEvents: mapMode === '2d' ? 'auto' : 'none', transition: 'opacity 0.5s' }}>
        {mapMode === '2d' && (
          <MapContainer center={[20, 0]} zoom={3} style={{ height: '100%', width: '100%', background: 'transparent' }} zoomControl={false}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
            />
            <LeafletMapEvents onMapClick={(lat: number, lng: number) => handleGlobeClick({ lat, lng })} />
            {chests.map((chest) => {
              const chestIcon = L.divIcon({
                html: `<div style="font-size: 32px; filter: drop-shadow(0 0 10px ${chest.tier === 'gold' ? '#fbbf24' : chest.tier === 'silver' ? '#fff' : chest.tier === 'bronze' ? '#cd7f32' : '#000'}); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; cursor: pointer;">${chest.tier === 'gold' ? '🥇' : chest.tier === 'silver' ? '🥈' : '🥉'}</div>`,
                className: 'custom-chest-icon',
                iconSize: [40, 40],
                iconAnchor: [20, 20]
              });
              return (
                <Marker
                  key={chest._id || chest.id}
                  position={[chest.lat, chest.lng]}
                  icon={chestIcon}
                  eventHandlers={{ click: (e) => { L.DomEvent.stopPropagation(e as any); handlePointClick(chest); } }}
                />
              );
            })}
          </MapContainer>
        )}
      </div>

      {/* TOP USER BAR */}
      <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 28px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, minWidth: 280, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        {currentUser ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <User size={18} style={{ color: '#f97316' }} />
              <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>{currentUser.username.toUpperCase()}</span>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <button className="tactical-btn" style={{ height: 36, width: 36, padding: 0 }} onClick={() => setShowRequests(!showRequests)}>
                <Bell size={16} style={{ color: chests.some(c => c.droppedBy === currentUser.username && c.requests?.some(r => r.status === 'pending')) ? '#f97316' : '#fff' }} />
              </button>
              <button className="tactical-btn" style={{ height: 36, width: 36, padding: 0 }} onClick={() => { setCurrentUser(null); localStorage.removeItem('dataDropperUser'); }}><LogOut size={16} /></button>
            </div>
          </>
        ) : (
          <button style={{ fontSize: 10, width: '100%', textAlign: 'center', fontWeight: 900, color: '#fff', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 4, textTransform: 'uppercase' }} onClick={() => setShowLoginModal(true)}>
            🔐 INITIATE OPERATOR LOGIN
          </button>
        )}
      </div>

      {/* PUBLIC STATISTICS HUD (LEFT) */}
      <div style={{ position: 'fixed', top: 130, left: 20, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 10, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #fbbf24', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>🥇</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#fbbf24', letterSpacing: 3, textTransform: 'uppercase' }}>GOLD: {chests.filter(c => c.tier === 'gold').length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #94a3b8', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>🥈</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase' }}>SILVER: {chests.filter(c => c.tier === 'silver').length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #cd7f32', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>🥉</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#cd7f32', letterSpacing: 3, textTransform: 'uppercase' }}>BRONZE: {chests.filter(c => c.tier === 'bronze').length}</span>
        </div>
      </div>

      {/* PUBLIC STATISTICS HUD (RIGHT) */}
      <div style={{ position: 'fixed', top: 130, right: 20, zIndex: 100, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRight: '4px solid #f97316', borderRadius: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontStyle: 'italic' }}>{chests.length}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#f97316', letterSpacing: 2, textTransform: 'uppercase' }}>TOTAL<br />DROPS</span>
        </div>
      </div>

      <AnimatePresence>
        {/* LOGIN MODAL */}
        {!currentUser && showLoginModal && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(16px)' }}>
            <LoginScreen
              onLogin={(user) => { setCurrentUser(user); localStorage.setItem('dataDropperUser', JSON.stringify(user)); setShowLoginModal(false); }}
              onCancel={() => setShowLoginModal(false)}
            />
          </div>
        )}

        {/* DEPLOY MODAL */}
        {isDropping && currentUser && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 500, background: 'rgba(10,15,30,0.7)', backdropFilter: 'blur(8px)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: 480, background: '#5ba4e5', borderRadius: 40, border: '2px solid #000', padding: 32, color: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflowY: 'auto', maxHeight: '90vh' }}>

              {/* TIER SELECTION */}
              <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 24 }}>
                <button onClick={() => setTempTier('gold')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#fbbf24', border: tempTier === 'gold' ? '4px solid #1d4ed8' : '2px solid #000', fontSize: 32, transition: 'all 0.2s' }}>🥇</button>
                <button onClick={() => setTempTier('silver')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#d1d5db', border: tempTier === 'silver' ? '4px solid #1d4ed8' : '2px solid #000', fontSize: 32, transition: 'all 0.2s' }}>🥈</button>
                <button onClick={() => setTempTier('bronze')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#cd7f32', border: tempTier === 'bronze' ? '4px solid #1d4ed8' : '2px solid #000', fontSize: 32, transition: 'all 0.2s' }}>🥉</button>
              </div>

              {/* TIER INFO */}
              <div style={{ minHeight: 100, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {tempTier === 'bronze' && <p style={{ fontSize: 18, fontWeight: 600 }}>🥉 Fully Free — Anyone can download</p>}

                {tempTier === 'silver' && (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', width: '100%', justifyContent: 'space-around', fontWeight: 600, fontSize: 14 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="silverMode" checked={silverMode === 'timer'} onChange={() => setSilverMode('timer')} /> ⏱️ Timer
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="silverMode" checked={silverMode === 'count'} onChange={() => setSilverMode('count')} /> 👥 Count
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input type="radio" name="silverMode" checked={silverMode === 'ads'} onChange={() => setSilverMode('ads')} /> 📺 Ads
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input type="number" value={silverValue} onChange={e => setSilverValue(e.target.value)} style={{ width: 70, height: 48, border: '2px solid #000', borderRadius: 12, textAlign: 'center', fontSize: 20, fontWeight: 700, background: 'transparent', outline: 'none' }} />
                      <span style={{ fontSize: 16, fontWeight: 600 }}>
                        {silverMode === 'timer' && 'Hours'}
                        {silverMode === 'count' && 'People can open'}
                        {silverMode === 'ads' && 'Ad views required'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* FILE INPUT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', marginBottom: 24 }}>
                <label style={{ width: '100%', border: '2px solid #000', borderRadius: 12, padding: '12px 16px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ display: 'none' }} />
                  📁 {selectedFile ? selectedFile.name : 'Choose file to drop'}
                </label>

                {tempTier === 'gold' && (
                  <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="🔑 Set password for access" style={{ width: '100%', border: '2px solid #000', borderRadius: 12, padding: '12px 16px', background: 'transparent', fontWeight: 600, fontSize: 15, outline: 'none' }} />
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
                <button style={{ background: 'rgba(0,0,0,0.8)', color: '#fff', border: '2px solid #000', padding: '12px 28px', borderRadius: 24, fontWeight: 700, fontSize: 14, cursor: isDeploying ? 'not-allowed' : 'pointer', opacity: isDeploying ? 0.6 : 1, letterSpacing: 1, textTransform: 'uppercase' }} onClick={() => setIsDropping(null)} disabled={isDeploying}>✕ Abort</button>
                <button style={{ background: '#000', color: '#5ba4e5', padding: '12px 32px', borderRadius: 24, fontWeight: 900, fontSize: 15, cursor: isDeploying ? 'not-allowed' : 'pointer', opacity: isDeploying ? 0.6 : 1, letterSpacing: 1, textTransform: 'uppercase', border: '2px solid #000', boxShadow: '0 4px 0 #000' }} onClick={finalizeDrop} disabled={isDeploying}>
                  {isDeploying ? '⏳ DEPLOYING...' : '🚀 Commence Drop'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* CHEST MODAL */}
        {selectedChest && adTimer === null && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedChest(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 380, background: '#5ba4e5', borderRadius: 40, border: '2px solid #000', padding: 32, color: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 20 }}>

              <button onClick={() => setSelectedChest(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#000' }}>✕</button>

              <div style={{ width: '100%', height: 140, border: '2px solid #000', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', marginTop: 12, textAlign: 'center', padding: 12 }}>
                <span style={{ fontSize: 36 }}>📦</span>
                <span style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Preview of file</span>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginTop: 4 }}>[{selectedChest.fileName}]</span>
                <span style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>By: {selectedChest.droppedBy} • {selectedChest.tier.toUpperCase()}</span>
              </div>

              {selectedChest.tier === 'gold' && (
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter password" style={{ width: '100%', padding: '14px 16px', textAlign: 'center', borderRadius: 20, border: '2px solid #000', background: 'transparent', fontWeight: 700, fontSize: 16, outline: 'none' }} />
              )}

              <button onClick={handleChestAction} style={{ width: '100%', border: '2px solid #000', borderRadius: 24, padding: '16px 0', background: '#000', color: '#5ba4e5', fontWeight: 900, fontSize: 20, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 4px 0 rgba(0,0,0,0.3)' }}>
                {selectedChest.tier === 'silver' ? '📺 WATCH AD' : '⬇️ DOWNLOAD'}
              </button>
            </motion.div>
          </div>
        )}

        {/* REQUESTS LIST MODAL */}
        {showRequests && currentUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[400] bg-slate-950/90 backdrop-blur-md p-10 overflow-y-auto">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black italic uppercase">Access Requests</h2>
              <button onClick={() => setShowRequests(false)} className="tactical-btn h-12 w-12"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {chests.filter(c => c.droppedBy === currentUser.username).map(c => (
                c.requests?.map(r => (
                  <div key={r.from + c._id} className="tactical-panel p-6 flex flex-col gap-4 border-l-4 border-l-amber-500">
                    <p className="text-xs font-bold">{r.from.toUpperCase()} ACCESS {c.fileName}</p>
                    <div className="flex gap-2">
                      {r.status === 'pending' ? (
                        <><button className="tactical-btn primary flex-1 h-10 text-[9px]" onClick={() => handleRequestAction(c._id!, r.from, 'accepted')}>GRANT</button>
                          <button className="tactical-btn flex-1 h-10 text-[9px] text-red-500" onClick={() => handleRequestAction(c._id!, r.from, 'rejected')}>DENY</button></>
                      ) : <span className="text-[10px] font-black uppercase text-slate-500">{r.status}</span>}
                    </div>
                  </div>
                ))
              ))}
            </div>
          </motion.div>
        )}

        {/* INTRO MODAL */}
        {showIntro && currentUser && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-xl bg-[#5ba4e5] border-2 border-black rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl font-black text-black mb-6 uppercase text-center tracking-widest">HOW TO USE</h2>

              <div className="space-y-4 text-black font-semibold mb-8">
                <div className="flex gap-4 items-center bg-white/20 p-4 rounded-2xl border-2 border-black shadow">
                  <div className="text-4xl drop-shadow-md">🌍</div>
                  <div>
                    <h4 className="font-bold uppercase mb-1">Global Dashboard</h4>
                    <p className="text-sm">Drag to rotate the map. Use scroll or pinch to zoom into any sector.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center bg-white/20 p-4 rounded-2xl border-2 border-black shadow">
                  <div className="text-4xl drop-shadow-md">📦</div>
                  <div>
                    <h4 className="font-bold uppercase mb-1">Drop Data</h4>
                    <p className="text-sm">Click empty areas to drop ordnance. Choose between Gold, Silver, and Bronze tiers.</p>
                  </div>
                </div>

                <div className="flex gap-4 items-center bg-white/20 p-4 rounded-2xl border-2 border-black shadow">
                  <div className="text-4xl drop-shadow-md">🔓</div>
                  <div>
                    <h4 className="font-bold uppercase mb-1">Access Intel</h4>
                    <p className="text-sm">Click existing chests on the map to preview and safely download the contents.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap justify-around items-center gap-4 mb-8 bg-white/20 p-4 rounded-2xl border-2 border-black shadow text-black">
                <div className="flex-1 flex flex-col items-center border-r-2 border-black/20 pr-4 hover:scale-105 transition-transform">
                  <Smartphone size={32} className="mb-2 text-black" />
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("Mobile App Download Starting..."); }} className="font-bold underline text-sm uppercase text-center text-black hover:text-orange-900">Mobile App (APK)</a>
                </div>
                <div className="flex-1 flex flex-col items-center hover:scale-105 transition-transform">
                  <Monitor size={32} className="mb-2 text-black" />
                  <a href="#" onClick={(e) => { e.preventDefault(); alert("PC Client Download Starting..."); }} className="font-bold underline text-sm uppercase text-center text-black hover:text-orange-900">PC Software (.exe)</a>
                </div>
              </div>

              <div className="flex justify-center">
                <button onClick={handleCloseIntro} className="bg-black text-[#5ba4e5] px-12 py-3 rounded-[1.5rem] font-black uppercase text-xl border-2 border-black shadow-[0_4px_0_0_#000] active:shadow-none active:translate-y-1 hover:bg-black/90 transition-all">START MISSION</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isExploding && <div className="pottitheri-explosion z-[500]"></div>}
      {adTimer !== null && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-3xl">
          <div className="text-7xl font-black text-orange-500 italic mb-4">{adTimer}</div>
          <p className="text-slate-500 font-black tracking-[8px] uppercase">Decryption Ongoing</p>
        </div>
      )}
    </div>
  );
}
