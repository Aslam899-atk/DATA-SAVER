import { useState, useEffect, useRef } from 'react';
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
import Globe from 'react-globe.gl';

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
  isMystery?: boolean;
  maxOpens?: number;
  currentOpens: number;
  expiresAt?: number;
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
}

interface Request {
  id: string;
  chestId: string;
  from: string;
  status: 'pending' | 'accepted' | 'rejected';
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

const LoginScreen = ({ onLogin }: { onLogin: (user: UserProfile) => void }) => {
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
    <div className="flex items-center justify-center h-screen relative overflow-hidden bg-slate-950">
      <StarField />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="tactical-panel p-12 w-full max-w-md z-10 border-t-4 border-t-amber-500">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic text-amber-500 mb-2 uppercase tracking-tighter">DATA DROPPER v3</h1>
          <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">3D GLOBAL INTEL NETWORK</p>
        </div>
        <div className="flex flex-col gap-6 items-center">
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => alert('AUTH FAILED')} theme="filled_black" shape="pill" />
        </div>
      </motion.div>
    </div>
  );
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
          if (uname === 'admin' && pwd === 'admin123') onLogin({ id: 'admin-local', email: 'admin@domain.com', username: 'admin', isAdmin: true });
          else alert('ACCESS DENIED');
        }}>AUTHORIZE</button>
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

export default function App() {
  const globeEl = useRef<any>();
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
  const [showRequests, setShowRequests] = useState(false);
  const [adTimer, setAdTimer] = useState<number | null>(null);
  const [playerPos, setPlayerPos] = useState({ lat: 10.85, lng: 76.27 });
  const [isExploding, setIsExploding] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); });
    axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);
    const checkInterval = setInterval(() => {
      axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);
    }, 30000);
    return () => clearInterval(checkInterval);
  }, []);

  useEffect(() => {
    if (adTimer !== null && adTimer > 0) {
      const timer = setTimeout(() => setAdTimer(adTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (adTimer === 0) setAdTimer(null);
  }, [adTimer]);

  const handleGlobeClick = ({ lat, lng }: { lat: number, lng: number }) => {
    if (selectedChest || adTimer !== null || !currentUser || isDropping) return;
    setIsDropping({ lat, lng });
  };

  const handleChestAction = async () => {
    if (!selectedChest) return;
    if (selectedChest.tier === 'gold' && pinInput !== (selectedChest.pin || '0000')) {
      alert('ACCESS DENIED: INCORRECT PIN'); return;
    }
    if (selectedChest.tier === 'silver' && adTimer === null) {
      setAdTimer(15); return;
    }
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
      alert('DEPLOYED');
    } catch (e) { alert('Failed'); }
    setIsDropping(null); setTempTier(null); setDropStep('tier'); setMaxOpensInput(''); setExpiryInput(''); setSelectedFile(null); setPinInput('');
  };

  const deleteChest = async (id: string) => {
    await axios.delete(`${API_URL}/chests/${id}`).catch(console.error);
    setChests(prev => prev.filter(c => c._id !== id && c.id !== id));
    setSelectedChest(null);
  };

  if (window.location.pathname === '/admin' && (!currentUser || !currentUser.isAdmin)) {
    return <AdminLogin onLogin={(user) => { setCurrentUser(user); localStorage.setItem('dataDropperUser', JSON.stringify(user)); window.location.href = '/'; }} />
  }

  if (!currentUser) {
    return (
      <GoogleOAuthProvider clientId="666413173667-kkf2ggvt3avkgpdcojhkg8koeljv7t3m.apps.googleusercontent.com">
        <LoginScreen onLogin={(user) => { setCurrentUser(user); localStorage.setItem('dataDropperUser', JSON.stringify(user)); if (!users.find(u => u.id === user.id)) setUsers(prev => [...prev, user]); }} />
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="world-map">
      <StarField />
      
      {/* 3D Global Visualization */}
      <div className="globe-container">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          onGlobeClick={handleGlobeClick}
          
          pointsData={chests}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d: any) => (d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : '#78350f')}
          pointRadius={0.5}
          pointAltitude={0.1}
          pointsMerge={false}
          onPointClick={(pt: any) => setSelectedChest(pt)}

          customLayerData={[playerPos]}
          customThreeObject={(d: any) => {
            const geometry = new (window as any).THREE.SphereGeometry(2, 16, 16);
            const material = new (window as any).THREE.MeshBasicMaterial({ color: '#f97316' });
            return new (window as any).THREE.Mesh(geometry, material);
          }}
          customThreeObjectUpdate={(obj: any, d: any) => {
             Object.assign(obj.position, globeEl.current.getCoords(d.lat, d.lng, 0.2));
          }}
        />
      </div>

      {/* Floating Tactical HUD */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-6 px-8 py-3 tactical-panel w-[90%] max-w-4xl">
         <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-800/50 rounded-lg flex items-center justify-center border border-white/5">
               <User size={20} className="text-orange-500" />
            </div>
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Operator Active</span>
               <span className="text-sm font-black text-white italic">{currentUser?.username.toUpperCase()}</span>
            </div>
         </div>
         <div className="h-8 w-[1px] bg-white/10 ml-auto"></div>
         <div className="flex items-center gap-3">
            {currentUser?.isAdmin && (
               <button className={`tactical-btn h-10 px-4 ${isAdminMode ? 'primary' : ''}`} onClick={() => setIsAdminMode(!isAdminMode)}>
                  <Shield size={16} /> DATA_ROOT
               </button>
            )}
            <button className="tactical-btn h-10 w-10 p-0 relative" onClick={() => setShowRequests(!showRequests)}>
               <Bell size={18} />
            </button>
            <button className="tactical-btn h-10 w-10 p-0 text-red-500" onClick={() => { setCurrentUser(null); localStorage.removeItem('dataDropperUser'); }}>
               <LogOut size={18} />
            </button>
            <button className="tactical-btn primary h-10 px-6 font-black text-[10px]" onClick={() => deferredPrompt?.prompt()}>INSTALL</button>
         </div>
      </div>

      {/* Location Waypoints */}
      <div className="fixed bottom-10 left-10 z-[150] flex flex-col gap-3">
         <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] pl-1">Targeting Arrays</p>
         <div className="flex gap-2">
            {locations.map(loc => (
               <button key={loc.name} className="tactical-btn bg-slate-950/80 text-[9px]" onClick={() => {
                  globeEl.current.pointOfView({ lat: loc.lat, lng: loc.lng, altitude: 1.5 }, 2000);
                  setPlayerPos({ lat: loc.lat, lng: loc.lng });
               }}>{loc.name.split(',')[0]}</button>
            ))}
         </div>
      </div>

      <AnimatePresence>
        {isAdminMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="admin-overlay px-12 py-12">
            <div className="flex justify-between items-center mb-16">
              <h2 className="text-5xl font-black italic text-white uppercase tracking-tighter">Command System</h2>
              <button className="tactical-btn danger h-14 px-8" onClick={() => setIsAdminMode(false)}><X size={20} /> LOGOUT</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="tactical-panel p-10 overflow-hidden">
                <h3 className="text-xs font-black text-white/40 tracking-[4px] mb-8 uppercase">Live Drops</h3>
                <div className="overflow-y-auto max-h-[500px]">
                  <table className="admin-table w-full">
                    {chests.map(c => (
                      <tr key={c._id || c.id}>
                        <td className="py-4 font-black text-white uppercase text-xs">{c.tier}</td>
                        <td className="py-4 text-slate-400 text-xs">{c.droppedBy}</td>
                        <td className="py-4"><button className="text-red-500" onClick={() => deleteChest(c._id || c.id || '')}><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isDropping && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-slate-950/90 backdrop-blur-xl">
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="tactical-panel p-10 w-full max-w-sm flex flex-col gap-8 border-t-8 border-t-orange-500">
               <h3 className="text-center text-2xl font-black italic uppercase tracking-tighter">Initiate Drop</h3>
               {dropStep === 'tier' ? (
                 <div className="flex flex-col gap-3">
                   <button className="tactical-btn h-14 bg-white/5 border-l-4 border-l-amber-400" onClick={() => { setTempTier('gold'); setDropStep('settings'); }}>GOLD_SECURE</button>
                   <button className="tactical-btn h-14 bg-white/5 border-l-4 border-l-slate-400" onClick={() => { setTempTier('silver'); setDropStep('settings'); }}>SILVER_AD</button>
                   <button className="tactical-btn h-14 bg-white/5 border-l-4 border-l-orange-900" onClick={() => { setTempTier('bronze'); finalizeDrop(); }}>BRONZE_OPEN</button>
                   <button className="text-[10px] font-black text-slate-500 mt-4" onClick={() => setIsDropping(null)}>ABORT</button>
                 </div>
               ) : (
                 <div className="flex flex-col gap-5">
                    <input type="file" className="tactical-input text-[10px]" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    <button className="tactical-btn primary h-14" onClick={finalizeDrop}>CONFIRM UPLINK</button>
                    <button className="text-[10px] text-slate-500 text-center" onClick={() => setDropStep('tier')}>BACK</button>
                 </div>
               )}
             </motion.div>
          </div>
        )}

        {selectedChest && adTimer === null && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-slate-950/95 backdrop-blur-3xl">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="tactical-panel p-12 w-full max-w-lg border-t-8 border-t-orange-500 flex flex-col gap-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-xl bg-slate-900 border-2 border-orange-500 flex items-center justify-center">
                  <Download size={32} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter">{selectedChest.fileName.split('.')[0]}</h3>
                  <p className="text-xs font-black text-slate-500 tracking-widest uppercase">{selectedChest.tier} PAYLOAD</p>
                </div>
              </div>
              <div className="flex flex-col gap-4 mt-4">
                 {selectedChest.tier === 'gold' && <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className="tactical-input text-center text-4xl" placeholder="PIN" />}
                 <button className="tactical-btn primary h-20 text-xs font-black tracking-widest" onClick={handleChestAction}>DECRYPT DATA</button>
                 <button className="text-[10px] font-black text-slate-600 text-center" onClick={() => setSelectedChest(null)}>ABORT</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isExploding && <div className="pottitheri-explosion z-[500]"></div>}
      
      {adTimer !== null && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-3xl">
          <div className="text-6xl font-black text-orange-500 italic mb-4">{adTimer}</div>
          <p className="text-slate-500 font-black tracking-[8px] uppercase">Decrypting Orbital Link</p>
        </div>
      )}
    </div>
  );
}
