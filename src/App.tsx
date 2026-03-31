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
  Monitor,
  Volume2,
  VolumeX
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
  tier: 'gold' | 'silver' | 'bronze' | 'platinum';
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
  adsRequired?: number;
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  isAdmin: boolean;
  avatarUrl?: string;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

const AdminPanel = () => {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [activeTab, setActiveTab] = useState<'OPERATORS' | 'ADS' | 'DROPS'>('OPERATORS');
  const [chests, setChests] = useState<Chest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [deviceType, setDeviceType] = useState<'DESKTOP' | 'TABLET' | 'MOBILE'>('DESKTOP');
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [newAd, setNewAd] = useState({ title: '', imageUrl: '', videoUrl: '', link: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setDeviceType('MOBILE');
      else if (w < 1024) setDeviceType('TABLET');
      else setDeviceType('DESKTOP');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isAdminLoggedIn) {
      axios.get(`${API_URL}/chests`).then(res => setChests(res.data));
      axios.get(`${API_URL}/users`).then(res => setUsers(res.data));
      axios.get(`${API_URL}/ads`).then(res => setAds(res.data));
    }
  }, [isAdminLoggedIn]);

  const handleLogin = (e: any) => {
    e.preventDefault();
    const cleanUser = adminUser.trim().toLowerCase();
    const cleanPass = adminPass.trim();
    
    if (cleanUser === 'aslam' && cleanPass === '313 aslam 786') {
      setIsAdminLoggedIn(true);
      localStorage.setItem('isAdminLoggedIn', 'true');
      setAdminPass(''); // Clear sensitive info
    } else {
      alert('ACCESS DENIED: Invalid Admin Credentials');
    }
  };

  const handleDeleteChest = async (id: string) => {
    if (window.confirm('WARNING: PERMANENTLY DELETE THIS INTEL DROP?')) {
      await axios.delete(`${API_URL}/chests/${id}`);
      setChests(chests.filter(c => c._id !== id && c.id !== id));
    }
  };

  const handleMigrateTiers = async () => {
     if (confirm('PERMANENTLY MIGRATE ALL LEGACY ASSETS TO BRONZE?')) {
       try {
         await axios.post(`${API_URL}/admin/migrate-tiers`);
         alert(`MIGRATION SUCCESS: units updated`);
         window.location.reload();
       } catch (e) { alert('MIGRATION FAILED'); }
     }
  };

  const handleAddAdSubmit = async (e: any) => {
    e.preventDefault();
    if (!newAd.title) return;
    
    const formData = new FormData();
    formData.append('title', newAd.title);
    if (newAd.imageUrl) formData.append('imageUrl', newAd.imageUrl);
    if (newAd.videoUrl) formData.append('videoUrl', newAd.videoUrl);
    if (newAd.link) formData.append('link', newAd.link);
    if (selectedFile) formData.append('file', selectedFile);

    try {
      const res = await axios.post(`${API_URL}/ads`, formData);
      setAds([res.data, ...ads]);
      setIsAddingAd(false);
      setNewAd({ title: '', imageUrl: '', videoUrl: '', link: '' });
      setSelectedFile(null);
      alert('AD BROADCASTED LIVE');
    } catch (e) { alert('BROADCAST FAILED'); }
  };

  const handleDeleteAd = async (id: string) => {
    if (confirm('REMOVE AD FROM BROADCAST?')) {
      await axios.delete(`${API_URL}/ads/${id}`);
      setAds(ads.filter(a => a._id !== id));
    }
  };

  if (!isAdminLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
        {/* Animated Background Elements */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', backgroundColor: 'rgba(37, 99, 235, 0.2)', filter: 'blur(120px)', borderRadius: '50%' }}></div>
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', backgroundColor: 'rgba(234, 88, 12, 0.2)', filter: 'blur(120px)', borderRadius: '50%' }}></div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 450 }}
        >
          <form 
            onSubmit={handleLogin} 
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(24px)', padding: 48, borderRadius: '40px', border: '2px solid rgba(255, 255, 255, 0.1)', display: 'flex', flexDirection: 'column', gap: 32, boxShadow: '0 20px 80px rgba(0,0,0,0.6)' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, backgroundColor: '#2563eb', borderRadius: 24, marginBottom: 20, boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)' }}>
                <span style={{ fontSize: 36 }}>🔐</span>
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '-1px', fontStyle: 'italic', margin: 0 }}>Admin Portal</h2>
              <p style={{ color: '#94a3b8', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px', marginTop: 8 }}>Authorized Personnel Only</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input 
                type="text" 
                value={adminUser} 
                onChange={e => setAdminUser(e.target.value)} 
                placeholder="Username" 
                style={{ width: '100%', padding: 20, borderRadius: 16, border: '2px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontWeight: 700, fontSize: 18, outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
              />
              <input 
                type="password" 
                value={adminPass} 
                onChange={e => setAdminPass(e.target.value)} 
                placeholder="Access Code" 
                style={{ width: '100%', padding: 20, borderRadius: 16, border: '2px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#fff', fontWeight: 700, fontSize: 18, outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
              />
            </div>

            <button 
              type="submit" 
              style={{ backgroundColor: '#2563eb', color: '#fff', fontWeight: 900, padding: 20, borderRadius: 16, fontSize: 20, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', boxShadow: '0 8px 0 #1e3a8a' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 4px 0 #1e3a8a'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 0 #1e3a8a'; }}
            >
              Initiate Login
            </button>

            <p style={{ textAlign: 'center', color: '#475569', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
              Secured Connection • System v4.0.2
            </p>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0f1d', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: deviceType === 'MOBILE' ? '0 16px' : '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 32, height: 32, backgroundColor: '#2563eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 16 }}>💼</span>
          </div>
          <h1 style={{ fontSize: deviceType === 'MOBILE' ? 14 : 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: deviceType === 'MOBILE' ? '1px' : '4px', fontStyle: 'italic', margin: 0 }}>Command Center</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleMigrateTiers} style={{ fontSize: 9, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: '1px solid #3b82f6', padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 900, textTransform: 'uppercase' }}>MIGRATE ASSETS</button>
          <button 
            onClick={() => { setIsAdminLoggedIn(false); localStorage.removeItem('isAdminLoggedIn'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: '#fff', cursor: 'pointer' }}
          >
            <LogOut size={16} />
            Terminal Exit
          </button>
        </div>
      </header>

      <div style={{ paddingTop: 100, paddingBottom: 80, paddingLeft: deviceType === 'MOBILE' ? 16 : 48, paddingRight: deviceType === 'MOBILE' ? 16 : 48, display: 'flex', flexDirection: deviceType === 'DESKTOP' ? 'row' : 'column', gap: deviceType === 'MOBILE' ? 24 : 48, maxWidth: 1800, margin: '0 auto' }}>
        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
          {/* TABS */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 32, overflowX: 'auto', paddingBottom: 8 }} className="hide-scrollbar">
            <button 
              onClick={() => setActiveTab('OPERATORS')} 
              style={{ flexShrink: 0, padding: deviceType === 'MOBILE' ? '12px 24px' : '20px 40px', fontSize: deviceType === 'MOBILE' ? 12 : 18, fontWeight: 900, borderRadius: 12, transition: 'all 0.3s', border: '2px solid', 
                backgroundColor: activeTab === 'OPERATORS' ? '#2563eb' : '#0f172a',
                borderColor: activeTab === 'OPERATORS' ? '#60a5fa' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'OPERATORS' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              OPERATORS
            </button>
            <button 
              onClick={() => setActiveTab('DROPS')} 
              style={{ flexShrink: 0, padding: deviceType === 'MOBILE' ? '12px 24px' : '20px 40px', fontSize: deviceType === 'MOBILE' ? 14 : 20, fontWeight: 900, borderRadius: 12, transition: 'all 0.3s', border: '2px solid', 
                backgroundColor: activeTab === 'DROPS' ? '#10b981' : '#0f172a',
                borderColor: activeTab === 'DROPS' ? '#34d399' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'DROPS' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              DROPS
            </button>
            <button 
              onClick={() => setActiveTab('ADS')} 
              style={{ flexShrink: 0, padding: deviceType === 'MOBILE' ? '12px 24px' : '20px 40px', fontSize: deviceType === 'MOBILE' ? 14 : 20, fontWeight: 900, borderRadius: 12, transition: 'all 0.3s', border: '2px solid', 
                backgroundColor: activeTab === 'ADS' ? '#ea580c' : '#0f172a',
                borderColor: activeTab === 'ADS' ? '#fb923c' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'ADS' ? '#fff' : '#64748b',
                cursor: 'pointer'
              }}
            >
              ADS
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* TAB CONTENT: OPERATORS */}
            {activeTab === 'OPERATORS' && (
              <motion.div 
                key="operators"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ display: 'grid', gridTemplateColumns: deviceType === 'DESKTOP' ? 'repeat(auto-fill, minmax(350px, 1fr))' : deviceType === 'TABLET' ? '1fr 1fr' : '1fr', gap: 16 }}
              >
                {Array.from(new Set([...users.map(u => u.username), ...chests.map(c => c.droppedBy)])).filter(Boolean).map((username, i) => {
                  const user = users.find(u => u.username === username);
                  return (
                    <div key={i} style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: 24, borderRadius: 24, display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden' }}>
                        {user?.avatarUrl ? <img src={user.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                      </div>
                      <div style={{ flex: 1, marginLeft: 24 }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '2px' }}>Operational Agent</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>{username}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <div style={{ width: 6, height: 6, backgroundColor: '#10b981', borderRadius: '50%' }}></div>
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Sector Active</span>
                        </div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', padding: '12px 20px', borderRadius: 16, border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#3b82f6' }}>{chests.filter(c => c.droppedBy === username).length}</div>
                        <div style={{ fontSize: 8, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Assets</div>
                      </div>
                    </div>
                  );
                })}
                {users.length === 0 && chests.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: 80, backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: 48, border: '2px dashed rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#475569', fontStyle: 'italic', margin: 0 }}>No operators detected in sector.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB CONTENT: INTEL DROPS */}
            {activeTab === 'DROPS' && (
              <motion.div 
                key="intel-drops"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ display: 'grid', gridTemplateColumns: deviceType === 'DESKTOP' ? 'repeat(auto-fill, minmax(350px, 1fr))' : deviceType === 'TABLET' ? '1fr 1fr' : '1fr', gap: 16 }}
              >
                {chests.map((chest, i) => {
                  const displayTier = (chest.tier as any) === 'platinum' ? 'bronze' : chest.tier;
                  return (
                    <div key={chest._id || chest.id || i} style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: 24, borderRadius: 24, display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                      <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: '2px solid', borderColor: displayTier === 'gold' ? '#fbbf24' : displayTier === 'silver' ? '#94a3b8' : '#d97706', boxShadow: `0 0 15px ${displayTier === 'gold' ? '#fbbf2433' : '#ffffff11'}` }}>
                        <img src={`/${displayTier}_drop.png`} style={{ width: 40, height: 40 }} />
                      </div>
                      <div style={{ flex: 1, marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Node: {chest.droppedBy}</div>
                        <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chest.fileName}</div>
                      </div>
                      <button 
                        onClick={() => handleDeleteChest((chest._id || chest.id)!)}
                        style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <X size={20} />
                      </button>
                    </div>
                  );
                })}
                {chests.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: 80, backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: 48, border: '2px dashed rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#475569', fontStyle: 'italic', margin: 0 }}>No intel drops deployed in this sector.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* TAB CONTENT: ADS */}
            {activeTab === 'ADS' && (
              <motion.div 
                key="ads"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 32 }}
              >
                <div style={{ background: 'linear-gradient(to right, rgba(234, 88, 12, 0.2), transparent)', borderLeft: '4px solid #ea580c', padding: 32, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '-1px', margin: 0 }}>Broadcast Distribution</h3>
                    <p style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '2px', marginTop: 4 }}>Global Ad Network Management</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                    <span style={{ fontWeight: 900, color: '#64748b', fontSize: 18, fontStyle: 'italic' }}>Max Payload: 15s</span>
                    <button onClick={() => setIsAddingAd(true)} style={{ backgroundColor: '#fff', color: '#000', fontWeight: 900, padding: '16px 32px', borderRadius: 16, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                      Upload Strategic Asset
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: deviceType === 'DESKTOP' ? 'repeat(auto-fill, minmax(280px, 1fr))' : deviceType === 'TABLET' ? '1fr 1fr' : '1fr', gap: 16 }}>
                  {ads.map((ad: any, i) => (
                    <div key={ad._id || i} style={{ aspectRatio: '16/9', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 24, overflow: 'hidden', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                      {ad.videoUrl ? (
                         <div style={{ position: 'absolute', inset: 0, background: '#000', borderRadius: 24, overflow: 'hidden' }}>
                            {ad.videoUrl.includes('youtube.com/embed') ? (
                               <iframe 
                                 src={`${ad.videoUrl}${ad.videoUrl.includes('?') ? '&' : '?'}autoplay=1&mute=1&loop=1&playlist=${ad.videoUrl.split('/').pop()?.split('?')[0]}`}
                                 title={ad.title}
                                 style={{ width: '100%', height: '100%', border: 'none' }}
                                 allow="autoplay"
                                 allowFullScreen
                               />
                            ) : (
                               <video 
                                 src={ad.videoUrl}
                                 autoPlay
                                 muted
                                 loop
                                 playsInline
                                 style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            )}
                            <div style={{ position: 'absolute', bottom: 12, left: 12, backgroundColor: '#ea580c', color: '#fff', fontSize: 8, fontWeight: 900, padding: '4px 8px', borderRadius: 4, zIndex: 5, pointerEvents: 'none' }}>VIDEO ASSET</div>
                         </div>
                      ) : (
                        <img src={ad.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                      )}
                      <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 2 }}>Broadcasting • Asset {i+1}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 4 }}>{ad.title}</div>
                        {ad.link && <div style={{ fontSize: 8, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🔗 {ad.link}</div>}
                        <button onClick={() => handleDeleteAd(ad._id)} style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '6px 12px', borderRadius: 8, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>REMOVE</button>
                      </div>
                    </div>
                  ))}
                  {ads.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: deviceType === 'MOBILE' ? 40 : 80, backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: 48, border: '2px dashed rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                      <p style={{ fontSize: deviceType === 'MOBILE' ? 18 : 24, fontWeight: 700, color: '#475569', fontStyle: 'italic', margin: 0 }}>No active broadcasts (Add an ad to see previews).</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
            {/* AD CREATION MODAL */}
            <AnimatePresence>
              {isAddingAd && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    style={{ backgroundColor: '#0f172a', width: '100%', maxWidth: 640, borderRadius: 32, border: '1px solid rgba(255, 255, 255, 0.1)', padding: deviceType === 'MOBILE' ? 24 : 48, position: 'relative' }}
                  >
                    <button onClick={() => setIsAddingAd(false)} style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={32} /></button>
                    <h2 style={{ fontSize: 32, fontWeight: 900, textTransform: 'uppercase', fontStyle: 'italic', margin: '0 0 8px 0' }}>Deploy Strategic Asset</h2>
                    <p style={{ color: '#64748b', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 4, margin: '0 0 40px 0' }}>Ads Engine Broadcast System</p>
                    
                    <form onSubmit={handleAddAdSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 9, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 2 }}>Asset Title</label>
                        <input required value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} placeholder="e.g. Special Rewards v2" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, color: '#fff', fontSize: 16 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 9, fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 2 }}>Option 1: Strategic Asset File (Img/Vid)</label>
                        <input type="file" accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files?.[0] || null)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid #3b82f633', padding: 16, borderRadius: 12, color: '#fff', fontSize: 14 }} />
                      </div>
                      <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', fontSize: 9, fontWeight: 900, color: '#64748b' }}>--- OR MANUALLY PROVIDE DATA ---</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 9, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 2 }}>Image Banner URL</label>
                        <input value={newAd.imageUrl} onChange={e => setNewAd({...newAd, imageUrl: e.target.value})} placeholder="https://..." style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, color: '#fff', fontSize: 16 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 9, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 2 }}>Video URL (Optional Embed/Direct)</label>
                        <input value={newAd.videoUrl} onChange={e => setNewAd({...newAd, videoUrl: e.target.value})} placeholder="https://youtube.com/..." style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, color: '#fff', fontSize: 16 }} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <label style={{ fontSize: 9, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 2 }}>Call-to-Action Link</label>
                        <input value={newAd.link} onChange={e => setNewAd({...newAd, link: e.target.value})} placeholder="https://google.com" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: 16, borderRadius: 12, color: '#fff', fontSize: 16 }} />
                      </div>
                      <button type="submit" style={{ backgroundColor: '#ea580c', color: '#fff', fontWeight: 900, padding: 20, borderRadius: 16, border: 'none', cursor: 'pointer', transition: 'all 0.2s', marginTop: 16, fontSize: 14, textTransform: 'uppercase', letterSpacing: 4 }}>
                        Initiate Global Broadcast
                      </button>
                    </form>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
        </div>

        <aside style={{ width: deviceType === 'DESKTOP' ? 400 : '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ backgroundColor: '#020617', padding: deviceType === 'MOBILE' ? 24 : 40, borderRadius: deviceType === 'MOBILE' ? 32 : 48, border: '2px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: deviceType === 'DESKTOP' ? 'sticky' : 'relative', top: deviceType === 'DESKTOP' ? 128 : 0, display: 'flex', flexDirection: 'column', gap: deviceType === 'MOBILE' ? 24 : 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '50%' }}></div>
              <h4 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#64748b', letterSpacing: '4px', margin: 0 }}>Operational Metrics</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Total Operators</div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic' }}>
                    {Math.max(users.length, new Set(chests.map(c => c.droppedBy)).size)}
                  </div>
                </div>
                <div style={{ width: 64, height: 64, backgroundColor: '#0f172a', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span style={{ fontSize: 32 }}>📦</span>
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', width: '100%' }}></div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(234, 179, 8, 0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>Gold Assets</div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: '#eab308' }}>{chests.filter(c => c.tier === 'gold').length}</div>
                </div>
                <div style={{ width: 64, height: 64, backgroundColor: 'rgba(234, 179, 8, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(234, 179, 8, 0.2)' }}>
                  <span style={{ fontSize: 32 }}>🧰</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>Silver Assets</div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: '#cbd5e1' }}>{chests.filter(c => c.tier === 'silver').length}</div>
                </div>
                <div style={{ width: 64, height: 64, backgroundColor: 'rgba(148, 163, 184, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  <span style={{ fontSize: 32 }}>🎁</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '2px' }}>Bronze Assets</div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: '#d97706', textTransform: 'uppercase' }}>{chests.filter(c => c.tier === 'bronze' || c.tier === 'platinum').length}</div>
                </div>
                <div style={{ width: 64, height: 64, backgroundColor: 'rgba(217, 119, 6, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(217, 119, 6, 0.2)' }}>
                   <span style={{ fontSize: 32 }}>📦</span>
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '1px solid rgba(37, 99, 235, 0.2)', padding: 24, borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Monitor size={20} style={{ color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>System Status</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', margin: 0 }}>All Secure • Uplink Live</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

const LeafletMapEvents = ({ onMapClick, onZoomEnd }: { onMapClick: (lat: number, lng: number) => void, onZoomEnd?: (zoom: number) => void }) => {
  const map = useMapEvents({
    click(e: any) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    zoomend() {
      if (onZoomEnd) onZoomEnd(map.getZoom());
    }
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
  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const userProfile: UserProfile = {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.given_name || decoded.email.split('@')[0],
        isAdmin: decoded.email === 'admin@gmail.com' || decoded.email.includes('admin')
      };

      // Save to server
      try {
        await axios.post(`${API_URL}/users/login`, {
          googleId: decoded.sub,
          email: decoded.email,
          username: userProfile.username
        });
      } catch (e) { console.error('Error saving user:', e); }

      onLogin(userProfile);
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [unlockedChest, setUnlockedChest] = useState<any>(null);
  const [pinInput, setPinInput] = useState('');
  const [showRequests, setShowRequests] = useState(false);
  const [ads, setAds] = useState<any[]>([]);
  const [activeAd, setActiveAd] = useState<any>(null);
  const [adElapsed, setAdElapsed] = useState<number | null>(null);
  const [adQueue, setAdQueue] = useState<any[]>([]);
  const [isExploding, setIsExploding] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [mapMode, setMapMode] = useState<'3d' | '2d'>('3d');
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [mapZoom, setMapZoom] = useState<number>(3);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deviceType, setDeviceType] = useState<'DESKTOP' | 'TABLET' | 'MOBILE'>('DESKTOP');
  const [transferProgress, setTransferProgress] = useState<number | null>(null);
  const [isAdMuted, setIsAdMuted] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setDeviceType('MOBILE');
      else if (w < 1024) setDeviceType('TABLET');
      else setDeviceType('DESKTOP');
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fn = () => axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data)).catch(console.error);
    fn();
    axios.get(`${API_URL}/ads`).then(res => setAds(res.data)).catch(console.error);
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
    if (activeAd !== null && adElapsed !== null) {
      const t = setTimeout(() => setAdElapsed(adElapsed + 1), 1000);
      return () => clearTimeout(t);
    }
  }, [adElapsed, activeAd]);

  const handleSkipAd = () => {
    if (adQueue.length > 0) {
      setActiveAd(adQueue[0]);
      setAdQueue(prev => prev.slice(1));
      setAdElapsed(0);
    } else {
      setActiveAd(null);
      setAdElapsed(null);
      if (selectedChest) processOpen();
    }
  };

  // Track state without triggering re-renders to prevent interval reset
  const adStateRef = useRef({ ads, selectedChest, isDropping, mapMode });
  useEffect(() => {
    adStateRef.current = { ads, selectedChest, isDropping, mapMode };
  }, [ads, selectedChest, isDropping, mapMode]);

  useEffect(() => {
    // Exact 60s timer that never gets cleared by state changes
    const interval = setInterval(() => {
      setActiveAd((prev: any) => {
        if (prev) return prev; // If ad is active, skip
        
        const current = adStateRef.current;
        if (current.ads.length > 0 && !current.selectedChest && !current.isDropping && window.location.pathname !== '/admin') {
          setTimeout(() => setAdElapsed(0), 0);
          return current.ads[Math.floor(Math.random() * current.ads.length)];
        }
        return prev;
      });
    }, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const handleGlobeClick = ({ lat, lng }: { lat: number, lng: number }) => {
    if (!currentUser) { setShowLoginModal(true); return; }
    if (selectedChest || activeAd !== null || isDropping) return;
    setIsDropping({ lat, lng });
    setTempTier('bronze'); setSilverMode('count'); setSilverValue(''); setPinInput(''); setSelectedFiles([]);
  };

  const handlePointClick = (pt: any) => {
    setSelectedChest(pt);
  };

  const handleChestAction = async () => {
    if (!selectedChest) return;
    if (selectedChest.tier === 'bronze') { processOpen(); return; }

    if (selectedChest.tier === 'silver') {
      if (activeAd !== null) return; // Ad already in progress
      const required = selectedChest.adsRequired || 1;
      let availableAds = ads.length > 0 ? [...ads].sort(() => 0.5 - Math.random()) : [];
      let queue = [];
      for (let i = 0; i < required; i++) {
        queue.push(availableAds.length > 0 ? availableAds[i % availableAds.length] : { title: 'Broadcast Payload', imageUrl: 'https://res.cloudinary.com/dw7wcsate/image/upload/v1711132000/dummy_ad.png' });
      }
      setActiveAd(queue[0]);
      setAdQueue(queue.slice(1));
      setAdElapsed(0); 
      return; 
    }

    if (selectedChest.tier === 'gold') {
      if (!currentUser) { setShowLoginModal(true); return; }
      if (pinInput !== (selectedChest.pin || '0000')) { alert('INVALID PIN'); return; }
      processOpen();
    }
  };

  const forceDownload = async (url: string, filename: string) => {
    // If it's a Cloudinary URL, we can force the attachment flag
    let downloadUrl = url;
    if (url.includes('res.cloudinary.com')) {
      downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
    }
    
    try {
      setTransferProgress(0);
      const response = await axios({
        url: downloadUrl,
        method: 'GET',
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setTransferProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
          }
        }
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'DATA_SECURE.dat');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      // Fallback if blob fetch fails (CORS etc)
      window.open(downloadUrl, '_blank');
    } finally {
      setTimeout(() => setTransferProgress(null), 1000);
    }
  };

  const processOpen = async () => {
    if (!selectedChest) return;
    try {
      // Use POST to match the new backend and pass security data
      const res = await axios.post(`${API_URL}/chests/${selectedChest._id || selectedChest.id}/open`, {
        pin: pinInput,
        username: currentUser?.username
      });

      setChests(prev => prev.map(c => (c._id === selectedChest._id || c.id === selectedChest.id) ? res.data : c));
      setIsExploding(true);

      setTimeout(() => {
        setIsExploding(false);
        setUnlockedChest(res.data);
        setSelectedChest(null);
        setPinInput('');
      }, 1000);
    } catch (e: any) { 
      alert(e.response?.data?.message || 'ENCRYPTION LOCK ACTIVE: ACCESS DENIED'); 
    }
  };

  const handleDeleteDrop = async (id: string) => {
    if (!window.confirm('PERMANENTLY SHRED THIS INTEL DROP?')) return;
    try {
      await axios.delete(`${API_URL}/chests/${id}`);
      setChests(chests.filter(c => (c._id !== id && c.id !== id)));
      alert('CLEARED: SECURE WIPEOUT COMPLETE');
    } catch (e) { alert('WIPEOUT FAILED'); }
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
    }
    if (tempTier === 'silver' && silverValue && !isNaN(parseInt(silverValue))) {
      if (silverMode === 'count') formData.append('maxOpens', silverValue);
      if (silverMode === 'timer') formData.append('expiresAt', (Date.now() + parseInt(silverValue) * 3600000).toString());
      if (silverMode === 'ads') formData.append('adsRequired', silverValue);
    }
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      setTransferProgress(0);
      const res = await axios.post(`${API_URL}/chests`, formData, { 
        timeout: 60000,
        onUploadProgress: (p) => {
          if (p.total) setTransferProgress(Math.round((p.loaded * 100) / p.total));
        }
      });
      setChests(prev => [...prev, res.data]);
      setIsDropping(null); setTempTier('bronze'); setSilverValue(''); setSelectedFiles([]); setPinInput('');
      alert('SUCCESS: INTEL DEPLOYED TO SECTOR');
    } catch (e: any) { 
      alert(`FAILED: ${e.response?.data?.error || e.message}`); 
    } finally {
      setIsDeploying(false);
      setTimeout(() => setTransferProgress(null), 1000);
    }
  };


  const handleRequestAction = async (chestId: string, fromUser: string, status: 'accepted' | 'rejected') => {
    await axios.patch(`${API_URL}/chests/${chestId}/requests`, { from: fromUser, status });
    axios.get(`${API_URL}/chests`).then((res: any) => setChests(res.data));
  };

  return (
    <div className="world-map relative w-full h-screen overflow-hidden bg-black">
      <StarField />

      {/* OPTIONAL: MAP TOGGLE REMOVED FOR SEAMLESS AUTO-ZOOM EFFECT */}

      {/* 3D GLOBE RENDERED PUBLICLY */}
      <div style={{ position: 'absolute', inset: 0, zIndex: mapMode === '3d' ? 10 : 0, opacity: mapMode === '3d' ? 1 : 0, pointerEvents: mapMode === '3d' ? 'auto' : 'none', transition: 'opacity 0.5s' }} className="globe-container">
        {/* @ts-ignore - react-globe.gl types might not include onCameraMove even though it works */}
        <Globe
          ref={globeEl}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          onGlobeClick={handleGlobeClick}
          htmlElementsData={chests}
          htmlElement={(d: any) => {
            const el = document.createElement('div');
            const displayTier = d.tier === 'platinum' ? 'bronze' : d.tier;
            el.innerHTML = `
               <div style="display: flex; flex-direction: column; align-items: center;">
                 <img src="/${displayTier}_drop.png" style="width: 32px; height: 32px; filter: drop-shadow(0 0 10px ${displayTier === 'gold' ? '#fbbf24' : displayTier === 'silver' ? '#94a3b8' : '#d97706'});" />
                 <div style="font-size: 8px; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; margin-top: 2px; text-transform: uppercase; white-space: nowrap; border: 1px solid rgba(255,255,255,0.1)">${d.droppedBy}</div>
               </div>
            `;
            el.style.pointerEvents = 'auto';
            el.title = d.fileName;
            el.onclick = (e) => { e.stopPropagation(); handlePointClick(d); };
            return el;
          }}
          htmlLat="lat" htmlLng="lng"
          htmlAltitude={0.02}
          {...({ onCameraMove: ((v: any) => {
             // Switch to high-res 2D Map earlier to avoid blurry globe pixels
             if (v.altitude < 1.2 && mapMode === '3d') {
                setMapCenter([v.lat, v.lng]);
                setMapZoom(4);
                setMapMode('2d');
             }
          }) } as any)}
          ringsData={chests}
          ringLat="lat" ringLng="lng"
          ringColor={(d: any) => (d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : '#d97706')}
          ringMaxRadius={2} ringPropagationSpeed={2}
        />
      </div>

      {/* 2D TACTICAL SATELLITE MAP */}
      <div style={{ position: 'absolute', inset: 0, zIndex: mapMode === '2d' ? 20 : 0, opacity: mapMode === '2d' ? 1 : 0, pointerEvents: mapMode === '2d' ? 'auto' : 'none', transition: 'opacity 0.8s ease-in-out' }}>
        {mapMode === '2d' && (
          <MapContainer 
            key={mapMode} // forces remount to properly apply the exact Globe coordinates
            center={mapCenter} 
            zoom={mapZoom} 
            minZoom={4} 
            style={{ height: '100%', width: '100%', background: '#001020' }} 
            zoomControl={false} 
            maxBounds={[[-90,-180],[90,180]]}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
              noWrap={true}
            />
            {/* Overlay for transparent Country and State labels */}
            <TileLayer
              url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
              noWrap={true}
              zIndex={10}
            />
            <LeafletMapEvents 
              onMapClick={(lat: number, lng: number) => handleGlobeClick({ lat, lng })} 
              onZoomEnd={(zoom: number) => {
                // Robust 2D to 3D zoom-out transition
                if (zoom <= 4 && mapMode === '2d') {
                  setMapMode('3d');
                }
              }}
            />
            {chests.map((chest) => {
              const displayTier = chest.tier === 'platinum' ? 'bronze' : chest.tier;
              const chestIcon = L.divIcon({
                html: `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; width: 80px; transform: translateX(-20px);">
                    <img src="/${displayTier}_drop.png" style="width: 40px; height: 40px; filter: drop-shadow(0 0 10px ${displayTier === 'gold' ? '#fbbf24' : displayTier === 'silver' ? '#94a3b8' : '#d97706'});" />
                    <div style="font-size: 7px; font-weight: 800; color: #fff; background: rgba(0,0,0,0.7); padding: 1px 4px; border-radius: 3px; margin-top: 1px; text-transform: uppercase; white-space: nowrap; border: 1px solid rgba(255,255,255,0.1)">${chest.droppedBy}</div>
                  </div>
                `,
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
      <div style={{ position: 'fixed', top: 20, left: deviceType === 'MOBILE' ? 10 : '50%', right: deviceType === 'MOBILE' ? 10 : 'auto', transform: deviceType === 'MOBILE' ? 'none' : 'translateX(-50%)', zIndex: 300, display: 'flex', alignItems: 'center', gap: deviceType === 'MOBILE' ? 8 : 16, padding: deviceType === 'MOBILE' ? '8px 16px' : '12px 28px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
        {/* APP LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: deviceType === 'MOBILE' ? 8 : 20, paddingRight: deviceType === 'MOBILE' ? 8 : 20, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: deviceType === 'MOBILE' ? 20 : 24 }}>📦</span>
          {deviceType !== 'MOBILE' && <span style={{ fontSize: 14, fontWeight: 900, color: '#5ba4e5', letterSpacing: 1, textTransform: 'uppercase' }}>DATA DROPPER</span>}
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #eab308', borderRadius: 10 }}>
          <img src="/gold_drop.png" style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 12, fontWeight: 900, color: '#eab308', letterSpacing: 3, textTransform: 'uppercase' }}>GOLD: {chests.filter(c => c.tier === 'gold').length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.[...])', borderLeft: '4px solid #94a3b8', borderRadius: 10 }}>
          <img src="/silver_drop.png" style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase' }}>SILVER: {chests.filter(c => c.tier === 'silver').length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #d97706', borderRadius: 10 }}>
          <img src="/bronze_drop.png" style={{ width: 24, height: 24 }} />
          <span style={{ fontSize: 12, fontWeight: 900, color: '#f59e0b', letterSpacing: 3, textTransform: 'uppercase' }}>BRONZE: {chests.filter(c => c.tier === 'bronze' || c.tier === 'platinum').length}</span>
        </div>
      </div>

      {/* PUBLIC STATISTICS HUD (RIGHT) - Hide on mobile map to avoid clutter */}
      {deviceType !== 'MOBILE' && (
        <div style={{ position: 'fixed', top: 130, right: 20, zIndex: 100, pointerEvents: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRight: '4px solid #f97316', borderRadius: 10 }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontStyle: 'italic' }}>{chests.length}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: '#f97316', letterSpacing: 2, textTransform: 'uppercase' }}>TOTAL<br />DROPS</span>
          </div>
        </div>
      )}

      {/* MY DROPS SHELF (BOTTOM CENTER) */}
      {currentUser && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300, width: 'calc(100% - 40px)', maxWidth: 800 }}>
           <div style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: '16px 24px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                 <p style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase' }}>📡 YOUR ACTIVE DROPS</p>
                 <span style={{ fontSize: 10, background: '#f97316', color: '#000', padding: '2px 8px', borderRadius: 4, fontWeight: 900 }}>{chests.filter(c => c.droppedBy === currentUser.username).length} UNIT(S)</span>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }} className="no-scrollbar">
                 {chests.filter(c => c.droppedBy === currentUser.username).map(drop => (
                    <div key={drop._id || drop.id} style={{ minWidth: 240, flexShrink: 0, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img src={`/${drop.tier === 'platinum' ? 'bronze' : drop.tier}_drop.png`} style={{ width: 32, height: 32 }} />
                          <div style={{ overflow: 'hidden' }}>
                             <p style={{ fontSize: 11, fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drop.fileName}</p>
                             <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>📍 {drop.lat.toFixed(2)}, {drop.lng.toFixed(2)}</p>
                          </div>
                       </div>
                       <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                          <button onClick={() => setSelectedChest(drop)} style={{ flex: 1, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 10, fontWeight: 900, padding: '10px 0', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>VIEW</button>
                          <button onClick={() => handleDeleteDrop((drop._id || drop.id)!)} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444', fontSize: 10, fontWeight: 900, padding: '10px 0', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1 }}>DELETE</button>
                       </div>
                    </div>
                 ))}
                 {chests.filter(c => c.droppedBy === currentUser.username).length === 0 && (
                    <p style={{ fontSize: 13, color: '#475569', textAlign: 'center', width: '100%', fontStyle: 'italic', padding: '20px 0' }}>No deployments registered in this sector.</p>
                 )}
              </div>
           </div>
        </div>
      )}

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
                <button onClick={() => setTempTier('bronze')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#78350f', border: tempTier === 'bronze' ? '4px solid #d97706' : '2px solid #000', transition: 'all 0.2s' }}><img src="/bronze_drop.png" style={{ width: 40 }} /></button>
                <button onClick={() => setTempTier('gold')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#eab308', border: tempTier === 'gold' ? '4px solid #fbbf24' : '2px solid #000', transition: 'all 0.2s' }}><img src="/gold_drop.png" style={{ width: 40 }} /></button>
                <button onClick={() => setTempTier('silver')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#94a3b8', border: tempTier === 'silver' ? '4px solid #94a3b8' : '2px solid #000', transition: 'all 0.2s' }}><img src="/silver_drop.png" style={{ width: 40 }} /></button>
              </div>

              {/* TIER INFO */}
              <div style={{ minHeight: 100, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {tempTier === 'bronze' && <p style={{ fontSize: 18, fontWeight: 600 }}>📦 Fully Free — Anyone can download</p>}

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
                  <input type="file" multiple onChange={e => setSelectedFiles(Array.from(e.target.files || []))} style={{ display: 'none' }} />
                  📁 {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) selected` : 'Choose files to drop'}
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
        {selectedChest && activeAd === null && !isExploding && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 500, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedChest(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 380, background: '#5ba4e5', borderRadius: 40, border: '2px solid #000', padding: 32, color: '#000', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 20 }}>

              <button onClick={() => setSelectedChest(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#000' }}>✕</button>

              <div style={{ width: '100%', height: 140, border: '2px solid #000', borderRadius: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', marginTop: 12, textAlign: 'center', padding: 12 }}>
                <img src={`/${selectedChest.tier === 'platinum' ? 'bronze' : selectedChest.tier}_drop.png`} style={{ width: 48, height: 48 }} />
                <span style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>Preview of file</span>
                <span style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, marginTop: 4 }}>[{selectedChest.fileName}]</span>
                <span style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>By: {selectedChest.droppedBy} • {selectedChest.tier.toUpperCase()}</span>
              </div>

              {selectedChest.tier === 'gold' && (
                <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value)} placeholder="Enter password" style={{ width: '100%', padding: '14px 16px', textAlign: 'center', borderRadius: 20, border: '2px solid #000', background: 'transparent', fontWeight: 700, fontSize: 16, outline: 'none' }} />
              )}

              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleChestAction(); }} style={{ width: '100%', border: '2px solid #000', borderRadius: 24, padding: '16px 0', background: '#000', color: '#5ba4e5', fontWeight: 900, fontSize: 20, cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase', boxShadow: '0 4px 0 rgba(0,0,0,0.3)' }}>
                {selectedChest.tier === 'silver' ? '📺 WATCH AD' : '🔓 UNLOCK INTEL'}
              </button>
            </motion.div>
          </div>
        )}

        {/* UNLOCKED CHEST VIEWER */}
        {unlockedChest && (
          <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 600, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)' }}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} style={{ width: '100%', maxWidth: 800, background: '#0f172a', borderRadius: 40, border: '1px solid rgba(255,255,255,0.1)', padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase', fontStyle: 'italic' }}>Decrypted Intel ({unlockedChest.files?.length > 0 ? unlockedChest.files.length : 1} File{unlockedChest.files?.length > 1 ? 's' : ''})</h3>
                <button onClick={() => setUnlockedChest(null)} style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 16px', fontWeight: 900, cursor: 'pointer' }}>Close ✕</button>
              </div>
              <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, scrollSnapType: 'x mandatory' }} className="hide-scrollbar">
                {(unlockedChest.files && unlockedChest.files.length > 0 ? unlockedChest.files : [{ fileUrl: unlockedChest.fileUrl, fileName: unlockedChest.fileName, fileSize: unlockedChest.fileSize }]).map((file: any, index: number) => {
                  const isImage = file.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
                  const isPdf = file.fileName.match(/\.pdf$/i);
                  const isApk = file.fileName.match(/\.apk$/i);

                  return (
                    <div key={index} style={{ minWidth: 280, width: 280, height: 400, background: 'rgba(0,0,0,0.5)', borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', scrollSnapAlign: 'start', flexShrink: 0 }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000', overflow: (isPdf ? 'auto' : 'hidden'), position: 'relative' }}>
                        {isImage && <img src={file.fileUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                        {isPdf && <div style={{ width: '100%', height: '100%', overflowY: 'auto' }}><iframe src={file.fileUrl} style={{ width: '100%', height: '800px', border: 'none' }} /></div>}
                        {isApk && <div style={{ fontSize: 80, filter: 'drop-shadow(0 0 20px #22c55e)' }}>📱</div>}
                        {(!isImage && !isPdf && !isApk) && <div style={{ fontSize: 80 }}>📄</div>}
                        {isApk && <div style={{ position: 'absolute', bottom: 10, fontSize: 10, fontWeight: 900, background: '#22c55e', color: '#000', padding: '4px 8px', borderRadius: 8 }}>APP ALREADY BUILT</div>}
                      </div>
                      <div style={{ padding: 16, background: 'rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.fileName}>{file.fileName}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{file.fileSize || 'N/A'}</div>
                        <button onClick={() => forceDownload(file.fileUrl, file.fileName)} style={{ background: '#3b82f6', color: '#fff', padding: '10px', borderRadius: 12, border: 'none', fontWeight: 900, cursor: 'pointer', marginTop: 8 }}>⬇️ DOWNLOAD</button>
                      </div>
                    </div>
                  );
                })}
              </div>
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

        {/* INTRO MODAL (HOW TO USE & DOWNLOADS) */}
        {showIntro && currentUser && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} style={{ width: '100%', maxWidth: 560, background: '#5ba4e5', border: '2px solid #000', borderRadius: 40, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative', overflow: 'hidden' }}>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: '#000', marginBottom: 24, textTransform: 'uppercase', textAlign: 'center', letterSpacing: 4 }}>HOW TO USE</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 24, border: '2px solid #000' }}>
                  <div style={{ fontSize: 32 }}>🌍</div>
                  <div>
                    <h4 style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: 13 }}>Global Dashboard</h4>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>Drag to rotate. Scroll to zoom into any sector.</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.2)', padding: 16, borderRadius: 24, border: '2px solid #000' }}>
                  <div style={{ fontSize: 32 }}>📦</div>
                  <div>
                    <h4 style={{ fontWeight: 800, margin: 0, textTransform: 'uppercase', fontSize: 13 }}>Drop Data</h4>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>Click empty areas to drop ordnance (Gold/Silver/Bronze).</p>
                  </div>
                </div>
              </div>

              {/* DOWNLOAD SECTION */}
              <div style={{ background: '#000', padding: 20, borderRadius: 28, marginBottom: 24, display: 'flex', justifyContent: 'space-around', gap: 12 }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                   <Smartphone size={28} style={{ color: '#5ba4e5' }} />
                   <a href="#" onClick={(e) => { e.preventDefault(); alert("Mobile App Download Starting..."); }} style={{ color: '#fff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', textDecoration: 'underline' }}>Download APK</a>
                </div>
                <div style={{ width: 2, height: 40, background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                   <Monitor size={28} style={{ color: '#5ba4e5' }} />
                   <a href="#" onClick={(e) => { e.preventDefault(); alert("PC Client Download Starting..."); }} style={{ color: '#fff', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', textDecoration: 'underline' }}>PC Software</a>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={handleCloseIntro} style={{ background: '#000', color: '#5ba4e5', padding: '14px 48px', borderRadius: 24, fontWeight: 900, fontSize: 18, border: '2px solid #000', cursor: 'pointer', textTransform: 'uppercase', boxShadow: '0 4px 0 #000' }}>CONFIRM</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {isExploding && <div className="pottitheri-explosion z-[500]"></div>}
      {activeAd && (
        <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-black/98 p-10">
          <div style={{ position: 'relative', width: '100%', maxWidth: 800, aspectRatio: '16/9', background: '#0f172a', borderRadius: 40, overflow: 'hidden', border: '2px solid rgba(234, 88, 12, 0.3)', boxShadow: '0 0 100px rgba(234, 88, 12, 0.2)' }}>
             {activeAd.videoUrl ? (
                <>
                  {activeAd.videoUrl.includes('youtube.com') ? (
                    <iframe 
                      src={`${activeAd.videoUrl.includes('embed/') ? activeAd.videoUrl : activeAd.videoUrl.replace('watch?v=', 'embed/')}?autoplay=1&mute=${isAdMuted ? 1 : 0}&controls=0`} 
                      style={{ width: '100%', height: '100%', border: 'none' }} 
                      allow="autoplay; fullscreen" 
                    />
                  ) : (
                    <video 
                      src={activeAd.videoUrl} 
                      autoPlay 
                      muted={isAdMuted}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  )}
                  {/* Mute Toggle */}
                  <button 
                    onClick={() => setIsAdMuted(!isAdMuted)}
                    style={{ position: 'absolute', top: 24, left: 24, background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: 12, borderRadius: 16, cursor: 'pointer', zIndex: 10, backdropFilter: 'blur(10px)' }}
                  >
                    {isAdMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                </>
             ) : (
                <img src={activeAd.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             )}
             <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                {adElapsed !== null && adElapsed >= 5 ? (
                  <button onClick={handleSkipAd} style={{ backgroundColor: '#ea580c', color: '#fff', padding: '12px 24px', borderRadius: 20, border: 'none', fontWeight: 900, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    Skip Ad ⏭️
                  </button>
                ) : (
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.8)', padding: '12px 24px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 12, backdropFilter: 'blur(10px)' }}>
                     <div style={{ fontSize: 32, fontWeight: 900, color: '#ea580c', fontStyle: 'italic' }}>{5 - (adElapsed || 0)}</div>
                     <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: 2 }}>Seconds to<br />Skip</div>
                  </div>
                )}
             </div>
             <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 40, background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 8 }}>Operational Broadcast</div>
                  <h3 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeAd.title}</h3>
                </div>
                {activeAd.link && (
                  <a href={activeAd.link} target="_blank" rel="noopener noreferrer" style={{ backgroundColor: '#fff', color: '#000', padding: '16px 32px', borderRadius: 20, fontWeight: 900, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, textDecoration: 'none', marginLeft: 20 }}>Visit Tactical Sector</a>
                )}
             </div>
          </div>
          <p style={{ marginTop: 40, fontSize: 10, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 8 }}>Decryption in Progress • Please Stand By</p>
        </div>
      )}

      {/* GLOBAL TRANSFER PROGRESS OVERLAY */}
      <AnimatePresence>
        {transferProgress !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(2, 6, 23, 0.9)', backdropFilter: 'blur(32px)' }}>
             <div style={{ width: '100%', maxWidth: 400, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#f97316', textTransform: 'uppercase', letterSpacing: 8, marginBottom: 24 }}>System Data Transfer</div>
                <div style={{ position: 'relative', width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                   <motion.div initial={{ width: 0 }} animate={{ width: `${transferProgress}%` }} style={{ position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: '#f97316', boxShadow: '0 0 20px #f97316' }} />
                </div>
                <div style={{ marginTop: 24, fontSize: 48, fontWeight: 900, fontStyle: 'italic', letterSpacing: -2, color: '#fff' }}>{transferProgress}%</div>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginTop: 12 }}>Syncing with Strategic Cloud Network</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
