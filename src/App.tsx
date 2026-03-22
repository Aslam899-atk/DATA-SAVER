import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { 
  User, 
  LogOut, 
  Bell,
  X,
  Package,
  Smartphone,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Globe from 'react-globe.gl';

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
             <input type="text" value={adminUser} onChange={e=>setAdminUser(e.target.value)} placeholder="Username" className="p-4 rounded-xl border-2 border-black font-bold text-lg bg-white/60"/>
             <input type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} placeholder="Password" className="p-4 rounded-xl border-2 border-black font-bold text-lg bg-white/60"/>
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
            <button onClick={() => setActiveTab('DROPS')} className={`flex-1 text-3xl font-bold border-2 border-black bg-[#5ba4e5] transition-all shadow-md ${activeTab==='DROPS'? 'border-red-500 border-4 z-10' : ''}`}>DROPS</button>
            <button onClick={() => setActiveTab('ADS')} className={`flex-1 text-3xl font-bold border-2 border-black bg-[#5ba4e5] -ml-[2px] transition-all shadow-md ${activeTab==='ADS'? 'border-red-500 border-4 z-10' : ''}`}>ADS</button>
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
                        <span className="text-3xl drop-shadow-md" style={{filter: `drop-shadow(0 0 5px ${chest.tier === 'platinum' ? '#38bdf8' : chest.tier === 'gold' ? '#fbbf24' : chest.tier === 'silver' ? '#fff' : '#000'})`}}>
                           {chest.tier === 'platinum' ? '📦' : chest.tier === 'gold' ? '🧰' : '🎁'}
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
                  {Array.from({length: 16}).map((_, i) => (
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
            <span>GOLD:{chests.filter(c=>c.tier==='gold').length}</span>
            <div className="w-12 h-12 bg-yellow-400 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">🧰</span></div>
         </div>
         <div className="flex items-center justify-between text-2xl font-black w-full text-black">
            <span>SILVER:{chests.filter(c=>c.tier==='silver').length}</span>
            <div className="w-12 h-12 bg-gray-300/80 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">🎁</span></div>
         </div>
         <div className="flex items-center justify-between text-2xl font-black w-full text-black">
            <span>PLATINUM:{chests.filter(c=>c.tier==='platinum').length}</span>
            <div className="w-12 h-12 bg-slate-800 rounded flex flex-col items-center justify-center shadow-md"><span className="text-xl">📦</span></div>
         </div>
      </div>
    </div>
  );
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
  const [isDropping, setIsDropping] = useState<{lat: number, lng: number} | null>(null);
  const [tempTier, setTempTier] = useState<'platinum' | 'gold' | 'silver'>('platinum');
  const [silverMode, setSilverMode] = useState<'timer' | 'count' | 'ads'>('count');
  const [silverValue, setSilverValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [adTimer, setAdTimer] = useState<number | null>(null);
  const [isExploding, setIsExploding] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

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
    setTempTier('platinum'); setSilverMode('count'); setSilverValue(''); setPinInput(''); setSelectedFile(null);
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
    if (tempTier === 'silver' && silverValue && !isNaN(parseInt(silverValue))) {
      if (silverMode === 'count') formData.append('maxOpens', silverValue);
      if (silverMode === 'timer') formData.append('expiresAt', (Date.now() + parseInt(silverValue) * 3600000).toString());
      if (silverMode === 'ads') formData.append('adsRequired', silverValue);
    }
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_URL}/chests`, formData, { timeout: 45000 });
      setChests(prev => [...prev, res.data]);
      setIsDropping(null); setTempTier('platinum'); setSilverValue(''); setSelectedFile(null); setPinInput('');
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
          htmlElementsData={chests}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            el.innerHTML = `📦`;
            el.style.fontSize = '32px';
            el.style.filter = `drop-shadow(0 0 10px ${d.tier === 'platinum' ? '#38bdf8' : d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#fff' : '#000'})`;
            el.style.cursor = 'pointer';
            el.style.pointerEvents = 'auto';
            el.onclick = () => handlePointClick(d);
            return el;
          }}
          htmlLat="lat" htmlLng="lng"
          htmlAltitude={(d: any) => (d.tier === 'platinum' ? 0.4 : d.tier === 'gold' ? 0.3 : d.tier === 'silver' ? 0.2 : 0.1)}
          ringsData={chests}
          ringLat="lat" ringLng="lng"
          ringColor={(d: any) => (d.tier === 'platinum' ? '#38bdf8' : d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : '#ea580c')}
          ringMaxRadius={2} ringPropagationSpeed={2}
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
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-slate-900/50 backdrop-blur-sm">
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-lg bg-[#5ba4e5] rounded-[2.5rem] border-2 border-black p-8 text-black shadow-2xl relative">
                
                <div className="flex gap-6 justify-center mb-8">
                   <button onClick={() => setTempTier('gold')} className={`w-[70px] h-[70px] flex items-center justify-center rounded transition-all ${tempTier === 'gold' ? 'border-4 border-blue-700 bg-yellow-400' : 'bg-yellow-400 opacity-90'}`}>
                      <Package size={36} className="text-white drop-shadow" />
                   </button>
                   <button onClick={() => setTempTier('silver')} className={`w-[70px] h-[70px] flex items-center justify-center rounded transition-all ${tempTier === 'silver' ? 'border-4 border-blue-700 bg-gray-300' : 'bg-gray-300 opacity-90'}`}>
                      <Package size={36} className="text-white drop-shadow" />
                   </button>
                   <button onClick={() => setTempTier('platinum')} className={`w-[70px] h-[70px] flex items-center justify-center rounded transition-all ${tempTier === 'platinum' ? 'border-4 border-blue-700 bg-slate-800' : 'bg-slate-800 opacity-90'}`}>
                      <Package size={36} className="text-white drop-shadow" />
                   </button>
                </div>

                <div className="w-full min-h-[120px] mb-4 flex flex-col justify-center items-center">
                   {tempTier === 'platinum' && (
                      <h3 className="text-xl text-black font-semibold mb-6">Fully free</h3>
                   )}

                   {tempTier === 'silver' && (
                      <div className="flex flex-col items-center w-full">
                         <div className="flex w-full justify-around mb-6 text-black font-medium text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" name="silverMode" checked={silverMode==='timer'} onChange={()=>setSilverMode('timer')} className="w-4 h-4 accent-black" /> timer
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" name="silverMode" checked={silverMode==='count'} onChange={()=>setSilverMode('count')} className="w-4 h-4 accent-black" /> count
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" name="silverMode" checked={silverMode==='ads'} onChange={()=>setSilverMode('ads')} className="w-4 h-4 accent-black" /> ads
                            </label>
                         </div>
                         <div className="flex items-center gap-4">
                            <input 
                               type="number" 
                               value={silverValue} onChange={e=>setSilverValue(e.target.value)} 
                               className="w-16 h-12 bg-transparent border-2 border-black rounded-xl text-center text-xl font-bold focus:outline-none" 
                            />
                            <span className="text-lg font-medium">
                               {silverMode === 'timer' && 'hour'}
                               {silverMode === 'count' && 'People can open'}
                               {silverMode === 'ads' && 'Ads view'}
                            </span>
                         </div>
                      </div>
                   )}
                   
                   {tempTier === 'gold' && (
                      <div className="w-full flex items-center justify-center h-full"> 
                      </div>
                   )}
                </div>

                <div className="w-full px-4 flex flex-col gap-4">
                   <label className="w-full border-2 border-black rounded-lg p-3 text-black font-medium cursor-pointer overflow-hidden flex items-center">
                      <input type="file" onChange={e => setSelectedFile(e.target.files?.[0] || null)} className="hidden" />
                      {selectedFile ? selectedFile.name : 'Choose file'}
                   </label>
                   
                   {tempTier === 'gold' && (
                      <input 
                         type="password" 
                         value={pinInput} 
                         onChange={e => setPinInput(e.target.value)} 
                         placeholder="password" 
                         className="w-full border-2 border-black rounded-lg p-3 bg-transparent text-black placeholder-black/60 focus:outline-none font-medium" 
                      />
                   )}
                </div>

                <div className="absolute -bottom-16 left-0 right-0 flex justify-center gap-4">
                   <button className="bg-white/10 text-white border border-white/30 px-6 py-2 rounded-full font-bold uppercase hover:bg-white/20" onClick={() => setIsDropping(null)}>Abort</button>
                   <button className="bg-orange-500 text-white px-8 py-2 rounded-full font-black uppercase hover:bg-orange-600 shadow-xl" onClick={finalizeDrop}>Commence Drop</button>
                </div>
             </motion.div>
          </div>
        )}

        {/* CHEST MODAL */}
        {selectedChest && adTimer === null && (
          <div className="fixed inset-0 flex items-center justify-center p-6 z-[300] bg-black/60 backdrop-blur-sm" onClick={() => setSelectedChest(null)}>
             <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} className="relative w-full max-w-sm bg-[#5ba4e5] rounded-[2.5rem] border-2 border-black p-8 text-black shadow-2xl flex flex-col gap-6">
                
                <button onClick={() => setSelectedChest(null)} className="absolute top-4 right-4 text-black hover:text-white transition-colors">
                   <X size={24}/>
                </button>

                <div className="w-full h-40 border-2 border-black rounded-[2rem] flex flex-col items-center justify-center bg-[#5ba4e5] p-4 text-center mt-4">
                   <span className="text-2xl font-medium mb-1 line-clamp-2">Preview of file</span>
                   <span className="text-xs font-bold opacity-70">[{selectedChest.fileName}]</span>
                </div>

                {selectedChest.tier === 'gold' && (
                   <input 
                      type="password" 
                      value={pinInput} 
                      onChange={e => setPinInput(e.target.value)} 
                      placeholder="Password" 
                      className="w-full p-4 text-center rounded-2xl border-2 border-black bg-transparent placeholder-black/60 focus:outline-none font-bold text-lg text-black" 
                   />
                )}

                <button 
                  onClick={handleChestAction} 
                  className="w-full border-2 border-black rounded-[1.5rem] py-4 bg-[#5ba4e5] font-semibold text-2xl uppercase hover:bg-black/10 transition-colors shadow-[0_4px_0_0_#000] active:shadow-none active:translate-y-1"
                >
                   {selectedChest.tier === 'platinum' ? 'DOWNLOAD' : selectedChest.tier === 'gold' ? 'DOWNLOAD' : 'WATCH AD'}
                </button>
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
                         <p className="text-sm">Click empty areas to drop ordnance. Choose between Platinum, Silver, and Gold tiers.</p>
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
                      <a href="#" onClick={(e)=>{e.preventDefault(); alert("Mobile App Download Starting...");}} className="font-bold underline text-sm uppercase text-center text-black hover:text-orange-900">Mobile App (APK)</a>
                   </div>
                   <div className="flex-1 flex flex-col items-center hover:scale-105 transition-transform">
                      <Monitor size={32} className="mb-2 text-black" />
                      <a href="#" onClick={(e)=>{e.preventDefault(); alert("PC Client Download Starting...");}} className="font-bold underline text-sm uppercase text-center text-black hover:text-orange-900">PC Software (.exe)</a>
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
