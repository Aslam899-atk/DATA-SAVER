import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { 
  User, 
  LogOut, 
  Download, 
  Bell,
  X,
  Timer,
  Users,
  Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

// --- Types ---

interface Chest {
  id?: string;
  _id?: string;
  lat: number;
  lng: number;
  tier: 'platinum' | 'gold' | 'silver' | 'bronze';
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
      <button onClick={onCancel} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
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
  const globeEl = useRef<any>();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('dataDropperUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [chests, setChests] = useState<Chest[]>([]);
  const [selectedChest, setSelectedChest] = useState<Chest | null>(null);
  const [isDropping, setIsDropping] = useState<{lat: number, lng: number} | null>(null);
  const [dropStep, setDropStep] = useState<'tier' | 'settings'>('tier');
  const [tempTier, setTempTier] = useState<'platinum' | 'gold' | 'silver' | 'bronze' | null>(null);
  const [maxOpensInput, setMaxOpensInput] = useState('');
  const [expiryInput, setExpiryInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [adTimer, setAdTimer] = useState<number | null>(null);
  const [isExploding, setIsExploding] = useState(false);

  useEffect(() => {
    const fn = () => axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);
    fn();
    const interval = setInterval(fn, 15000); // Faster updates for live maps
    return () => clearInterval(interval);
  }, []);

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
  };

  const handlePointClick = (pt: any) => {
    setSelectedChest(pt);
  };

  const handleChestAction = async () => {
    if (!selectedChest) return;
    if (selectedChest.tier === 'platinum') { processOpen(); return; }
    
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
    if (!isDropping || !currentUser || !tempTier) return;
    const formData = new FormData();
    formData.append('lat', isDropping.lat.toString());
    formData.append('lng', isDropping.lng.toString());
    formData.append('tier', tempTier);
    formData.append('droppedBy', currentUser.username);
    
    if (tempTier === 'gold') { 
      formData.append('pin', pinInput || '0000'); 
      formData.append('requiresRequest', 'true'); 
    }
    if (maxOpensInput && !isNaN(parseInt(maxOpensInput))) {
      formData.append('maxOpens', parseInt(maxOpensInput).toString());
    }
    if (expiryInput && !isNaN(parseInt(expiryInput))) {
      const expiryTimestamp = Date.now() + parseInt(expiryInput) * 3600000;
      formData.append('expiresAt', expiryTimestamp.toString());
    }
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_URL}/chests`, formData, { timeout: 45000 });
      setChests(prev => [...prev, res.data]);
      setIsDropping(null); setTempTier(null); setDropStep('tier'); setMaxOpensInput(''); setExpiryInput(''); setSelectedFile(null); setPinInput('');
      alert('DEPLOYED');
    } catch (e: any) { alert(`FAILED: ${e.response?.data?.error || e.message}`); }
  };

  const handleRequestAction = async (chestId: string, fromUser: string, status: 'accepted' | 'rejected') => {
    await axios.patch(`${API_URL}/chests/${chestId}/requests`, { from: fromUser, status });
    axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data));
  };

  return (
    <div className="world-map">
      <StarField />
      
      {/* 3D GLOBE RENDERED PUBLICLY */}
      <div className="globe-container">
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          onGlobeClick={handleGlobeClick}
          pointsData={chests}
          pointLat="lat" pointLng="lng"
          pointColor={(d: any) => (d.tier === 'platinum' ? '#38bdf8' : d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : '#ea580c')}
          pointAltitude={(d: any) => (d.tier === 'platinum' ? 0.4 : d.tier === 'gold' ? 0.3 : d.tier === 'silver' ? 0.2 : 0.1)}
          pointRadius={0.8}
          onPointClick={handlePointClick}
          ringsData={chests}
          ringLat="lat" ringLng="lng"
          ringColor={(d: any) => (d.tier === 'platinum' ? '#38bdf8' : d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : '#ea580c')}
          ringMaxRadius={2} ringPropagationSpeed={2}
          customLayerData={[]}
          customThreeObject={() => {
            const geometry = new THREE.SphereGeometry(2, 16, 16);
            const material = new THREE.MeshBasicMaterial({ color: '#f97316' });
            return new THREE.Mesh(geometry, material);
          }}
        />
      </div>

      {/* TOP USER BAR */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-6 px-8 py-3 tactical-panel min-w-[300px] max-w-xl">
         {currentUser ? (
            <>
              <div className="flex items-center gap-3">
                 <User size={18} className="text-orange-500" />
                 <span className="text-xs font-black text-white italic">{currentUser.username.toUpperCase()}</span>
              </div>
              <div className="ml-auto flex items-center justify-end gap-3 pl-8 flex-1">
                 <button className="tactical-btn h-10 w-10 p-0 relative" onClick={() => setShowRequests(!showRequests)}>
                    <Bell size={18} className={chests.some(c => c.droppedBy === currentUser.username && c.requests?.some(r => r.status === 'pending')) ? "text-orange-500 animate-pulse" : ""} />
                 </button>
                 <button className="tactical-btn h-10 w-10 p-0" onClick={() => { setCurrentUser(null); localStorage.removeItem('dataDropperUser'); }}><LogOut size={18} /></button>
              </div>
            </>
         ) : (
            <button className="text-[10px] w-full text-center font-black text-white uppercase tracking-[4px] hover:text-orange-500 transition-colors" onClick={() => setShowLoginModal(true)}>
               INITIATE OPERATOR LOGIN
            </button>
         )}
      </div>

      {/* PUBLIC STATISTICS HUD (LEFT) */}
      <div className="fixed top-24 left-6 z-[100] flex flex-col gap-4 pointer-events-none">
         <div className="flex items-center gap-4 tactical-panel py-2 px-4 border-l-4 border-l-amber-400 bg-black/40">
            <Package size={20} className="text-amber-400 opacity-80"/>
            <span className="text-sm font-black italic tracking-widest uppercase text-white">GOLD: {chests.filter(c=>c.tier==='gold').length}</span>
         </div>
         <div className="flex items-center gap-4 tactical-panel py-2 px-4 border-l-4 border-l-slate-400 bg-black/40">
            <Package size={20} className="text-slate-400 opacity-80"/>
            <span className="text-sm font-black italic tracking-widest uppercase text-white">SILVER: {chests.filter(c=>c.tier==='silver').length}</span>
         </div>
         <div className="flex items-center gap-4 tactical-panel py-2 px-4 border-l-4 border-l-sky-400 bg-black/40">
            <Package size={20} className="text-sky-400 opacity-80"/>
            <span className="text-sm font-black italic tracking-widest uppercase text-white">PLATINUM: {chests.filter(c=>c.tier==='platinum').length}</span>
         </div>
      </div>

      {/* PUBLIC STATISTICS HUD (RIGHT) */}
      <div className="fixed top-24 right-6 z-[100] pointer-events-none">
         <div className="flex items-center gap-4 tactical-panel py-3 px-5 border-r-4 border-r-orange-500 bg-black/40">
            <span className="text-2xl font-black italic text-white">{chests.length}</span>
            <Package size={24} className="text-orange-500 opacity-80"/>
         </div>
      </div>

      <AnimatePresence>
        {/* LOGIN MODAL */}
        {!currentUser && showLoginModal && (
           <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
              <LoginScreen 
                 onLogin={(user) => { setCurrentUser(user); localStorage.setItem('dataDropperUser', JSON.stringify(user)); setShowLoginModal(false); }} 
                 onCancel={() => setShowLoginModal(false)} 
              />
           </div>
        )}

        {/* DEPLOY MODAL */}
        {isDropping && currentUser && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-slate-950/90 backdrop-blur-xl">
             <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="tactical-panel p-10 w-full max-w-sm flex flex-col gap-6 border-t-8 border-t-orange-500">
               <h3 className="text-center text-2xl font-black italic uppercase">Deploy Ordnance</h3>
               {dropStep === 'tier' ? (
                 <div className="flex flex-col gap-2">
                   <button className="tactical-btn bg-sky-500/10 border-sky-500/40" onClick={() => { setTempTier('platinum'); setDropStep('settings'); }}>PLATINUM (FREE)</button>
                   <button className="tactical-btn bg-amber-500/10 border-amber-500/40" onClick={() => { setTempTier('gold'); setDropStep('settings'); }}>GOLD (SECURE)</button>
                   <button className="tactical-btn bg-slate-500/10 border-slate-500/40" onClick={() => { setTempTier('silver'); setDropStep('settings'); }}>SILVER (ADS/TIME)</button>
                   <button className="text-[10px] uppercase font-bold text-center mt-4" onClick={() => setIsDropping(null)}>ABORT</button>
                 </div>
               ) : (
                 <div className="flex flex-col gap-4">
                    <input type="file" className="tactical-input" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                    {tempTier === 'gold' && <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} className="tactical-input" placeholder="SET PIN" />}
                    {tempTier === 'silver' && (
                       <>
                          <input type="number" value={maxOpensInput} onChange={e=>setMaxOpensInput(e.target.value)} className="tactical-input" placeholder="MAX USERS" />
                          <input type="number" value={expiryInput} onChange={e=>setExpiryInput(e.target.value)} className="tactical-input" placeholder="TIMER (HOURS)" />
                       </>
                    )}
                    <button className="tactical-btn primary h-14" onClick={finalizeDrop}>COMMENCE DROP</button>
                    <button className="text-xs text-center" onClick={() => setDropStep('tier')}>BACK</button>
                 </div>
               )}
             </motion.div>
          </div>
        )}

        {/* CHEST MODAL */}
        {selectedChest && adTimer === null && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-slate-950/95 backdrop-blur-3xl">
             <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="tactical-panel p-12 w-full max-w-md border-t-8 border-t-orange-500 flex flex-col gap-6">
                <div className="flex gap-4">
                   <div className="w-16 h-16 bg-slate-900 border border-orange-500 rounded flex items-center justify-center"><Download size={24} className="text-orange-500" /></div>
                   <div><h3 className="text-2xl font-black italic">{selectedChest.fileName}</h3><p className="text-[10px] text-slate-500 uppercase">{selectedChest.tier} LINK // {selectedChest.droppedBy}</p></div>
                </div>
                {selectedChest.tier === 'silver' && (
                   <div className="grid grid-cols-2 gap-2 text-[10px] font-black">
                      <div className="p-3 bg-white/5 rounded flex items-center gap-2"><Users size={14}/> {selectedChest.currentOpens}/{selectedChest.maxOpens || '∞'}</div>
                      <div className="p-3 bg-white/5 rounded flex items-center gap-2"><Timer size={14}/> {selectedChest.expiresAt ? Math.round((selectedChest.expiresAt - Date.now())/3600000) + 'h' : 'PERM'}</div>
                   </div>
                )}
                <div className="flex flex-col gap-3">
                   {selectedChest.tier === 'gold' && <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} className="tactical-input text-center text-2xl" placeholder="PIN" />}
                   <button className="tactical-btn primary h-16" onClick={handleChestAction}>
                      {selectedChest.tier === 'platinum' ? 'ACCESS DATA' : selectedChest.tier === 'gold' ? 'VERIFY & REQUEST' : 'WATCH AD TO ACCESS'}
                   </button>
                   <button className="text-xs text-center" onClick={() => setSelectedChest(null)}>CANCEL</button>
                </div>
             </motion.div>
          </div>
        )}

        {/* REQUESTS LIST MODAL */}
        {showRequests && currentUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[400] bg-slate-950/90 backdrop-blur-md p-10 overflow-y-auto">
             <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black italic uppercase">Access Requests</h2>
                <button onClick={()=>setShowRequests(false)} className="tactical-btn h-12 w-12"><X size={20}/></button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {chests.filter(c => c.droppedBy === currentUser.username).map(c => (
                   c.requests?.map(r => (
                      <div key={r.from + c._id} className="tactical-panel p-6 flex flex-col gap-4 border-l-4 border-l-amber-500">
                         <p className="text-xs font-bold">{r.from.toUpperCase()} ACCESS {c.fileName}</p>
                         <div className="flex gap-2">
                            {r.status === 'pending' ? (
                               <><button className="tactical-btn primary flex-1 h-10 text-[9px]" onClick={()=>handleRequestAction(c._id!, r.from, 'accepted')}>GRANT</button>
                               <button className="tactical-btn flex-1 h-10 text-[9px] text-red-500" onClick={()=>handleRequestAction(c._id!, r.from, 'rejected')}>DENY</button></>
                            ) : <span className="text-[10px] font-black uppercase text-slate-500">{r.status}</span>}
                         </div>
                      </div>
                   ))
                ))}
             </div>
          </motion.div>
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
