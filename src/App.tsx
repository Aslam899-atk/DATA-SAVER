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
  tier: 'gold' | 'silver' | 'platinum';
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
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('isAdminLoggedIn') === 'true';
  });
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [activeTab, setActiveTab] = useState<'OPERATORS' | 'ADS' | 'DROPS'>('OPERATORS');
  const [chests, setChests] = useState<Chest[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [ads, setAds] = useState<any[]>([]);

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

  const handleAddAd = async () => {
    const title = prompt('Ad Title (e.g., "Special Rewards")');
    if (!title) return;
    const imageUrl = prompt('Image URL (Optional)', 'https://res.cloudinary.com/dw7wcsate/image/upload/v1711132000/dummy_ad.png');
    const link = prompt('Link (Optional)', 'https://google.com');
    
    try {
      const res = await axios.post(`${API_URL}/ads`, { title, imageUrl, link });
      setAds([res.data, ...ads]);
      alert('AD BROADCASTED LIVE');
    } catch (e) { alert('UPLOAD FAILED'); }
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
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 40, height: 40, backgroundColor: '#2563eb', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
            <span style={{ fontSize: 20 }}>💼</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px', fontStyle: 'italic', margin: 0 }}>Command Center</h1>
        </div>
        <button 
          onClick={() => { setIsAdminLoggedIn(false); localStorage.removeItem('isAdminLoggedIn'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255, 255, 255, 0.05)', hover: { backgroundColor: 'rgba(255, 255, 255, 0.1)' }, padding: '10px 24px', borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)', transition: 'all 0.2s', fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: '#fff', cursor: 'pointer' } as any}
        >
          <LogOut size={16} />
          Terminal Exit
        </button>
      </header>

      <div style={{ paddingTop: 128, paddingBottom: 80, paddingLeft: 48, paddingRight: 48, display: 'flex', gap: 48, maxWidth: 1800, margin: '0 auto' }}>
        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* TABS */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 40, overflowX: 'auto', paddingBottom: 16 }}>
            <button 
              onClick={() => setActiveTab('OPERATORS')} 
              style={{ flexShrink: 0, padding: '20px 40px', fontSize: 20, fontWeight: 900, borderRadius: 20, transition: 'all 0.3s', border: '2px solid', 
                backgroundColor: activeTab === 'OPERATORS' ? '#2563eb' : '#0f172a',
                borderColor: activeTab === 'OPERATORS' ? '#60a5fa' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'OPERATORS' ? '#fff' : '#64748b',
                boxShadow: activeTab === 'OPERATORS' ? '0 0 30px rgba(37, 99, 235, 0.3)' : 'none',
                cursor: 'pointer'
              }}
            >
              OPERATORS
            </button>
            <button 
              onClick={() => setActiveTab('DROPS')} 
              style={{ flexShrink: 0, padding: '20px 40px', fontSize: 20, fontWeight: 900, borderRadius: 20, transition: 'all 0.3s', border: '2px solid', 
                backgroundColor: activeTab === 'DROPS' ? '#10b981' : '#0f172a',
                borderColor: activeTab === 'DROPS' ? '#34d399' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'DROPS' ? '#fff' : '#64748b',
                boxShadow: activeTab === 'DROPS' ? '0 0 30px rgba(16, 185, 129, 0.3)' : 'none',
                cursor: 'pointer'
              }}
            >
              INTEL DROPS
            </button>
            <button 
              onClick={() => setActiveTab('ADS')} 
              style={{ flexShrink: 0, padding: '20px 40px', fontSize: 20, fontWeight: 900, borderRadius: 20, transition: 'all 0.3s', border: '2px solid', 
                backgroundColor: activeTab === 'ADS' ? '#ea580c' : '#0f172a',
                borderColor: activeTab === 'ADS' ? '#fb923c' : 'rgba(255, 255, 255, 0.05)',
                color: activeTab === 'ADS' ? '#fff' : '#64748b',
                boxShadow: activeTab === 'ADS' ? '0 0 30px rgba(234, 88, 12, 0.3)' : 'none',
                cursor: 'pointer'
              }}
            >
              ADS ENGINE
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
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}
              >
                {users.map((user, i) => (
                  <div key={user.id || i} style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: 24, borderRadius: 24, display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, color: '#3b82f6', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, marginLeft: 24, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Operator Node</div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>{user.email}</div>
                    </div>
                    <div style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                      <Smartphone size={20} />
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
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
                style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 24 }}
              >
                {chests.map((chest, i) => (
                  <div key={chest._id || chest.id || i} style={{ backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: 24, borderRadius: 24, display: 'flex', alignItems: 'center', transition: 'all 0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <div style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: '1px solid rgba(255, 255, 255, 0.01)' }}>
                      {chest.tier === 'gold' ? '🥇' : chest.tier === 'silver' ? '🥈' : '🛡️'}
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
                ))}
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
                    <button onClick={handleAddAd} style={{ backgroundColor: '#fff', color: '#000', fontWeight: 900, padding: '16px 32px', borderRadius: 16, textTransform: 'uppercase', letterSpacing: '2px', cursor: 'pointer', border: 'none', transition: 'all 0.2s', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                      Upload Strategic Asset
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                  {ads.map((ad: any, i) => (
                    <div key={ad._id || i} style={{ aspectRatio: '16/9', backgroundColor: '#0f172a', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: 24, overflow: 'hidden', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.4)' }}>
                      <img src={ad.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                      <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', letterSpacing: 2 }}>Broadcasting • Asset {i+1}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 4 }}>{ad.title}</div>
                        <button onClick={() => handleDeleteAd(ad._id)} style={{ position: 'absolute', top: 12, right: 12, border: 'none', background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '6px 12px', borderRadius: 8, fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>REMOVE</button>
                      </div>
                    </div>
                  ))}
                  {ads.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', padding: 80, backgroundColor: 'rgba(15, 23, 42, 0.2)', borderRadius: 48, border: '2px dashed rgba(255, 255, 255, 0.05)', textAlign: 'center' }}>
                      <p style={{ fontSize: 24, fontWeight: 700, color: '#475569', fontStyle: 'italic', margin: 0 }}>No active broadcasts (Add an ad to see previews).</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT HUD */}
        <aside style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ backgroundColor: '#020617', padding: 40, borderRadius: 48, border: '2px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'sticky', top: 128, display: 'flex', flexDirection: 'column', gap: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 8, height: 8, backgroundColor: '#3b82f6', borderRadius: '50%' }}></div>
              <h4 style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', color: '#64748b', letterSpacing: '4px', margin: 0 }}>Operational Metrics</h4>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Total Operators</div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic' }}>{users.length}</div>
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
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '2px' }}>Platinum Assets</div>
                  <div style={{ fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: '#3b82f6', textTransform: 'uppercase' }}>{chests.filter(c => c.tier === 'platinum').length}</div>
                </div>
                <div style={{ width: 64, height: 64, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <span style={{ fontSize: 32 }}>🛡️</span>
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
  const [tempTier, setTempTier] = useState<'gold' | 'silver' | 'platinum'>('platinum');
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
      setIsDropping(null); setTempTier('platinum'); setSilverValue(''); setSelectedFile(null); setPinInput('');
      alert('SUCCESS: INTEL DEPLOYED TO SECTOR');
    } catch (e: any) { 
      alert(`FAILED: ${e.response?.data?.error || e.message}`); 
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeleteDrop = async (id: string) => {
    if (!confirm('CONFIRM DELETION OF INTEL?')) return;
    try {
      await axios.delete(`${API_URL}/chests/${id}`);
      setChests(prev => prev.filter(c => c._id !== id && c.id !== id));
      alert('REMOVED FROM SECTOR');
    } catch (e: any) { alert('DELETE FAILED'); }
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
            el.innerHTML = `
               <div style="display: flex; flex-direction: column; align-items: center;">
                 <div style="filter: drop-shadow(0 0 10px ${d.tier === 'gold' ? '#fbbf24' : d.tier === 'silver' ? '#94a3b8' : d.tier === 'platinum' ? '#3b82f6' : '#fff'});">${d.tier === 'gold' ? '🥇' : d.tier === 'silver' ? '🥈' : '🛡️'}</div>
                 <div style="font-size: 8px; font-weight: 900; color: #fff; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 4px; margin-top: 2px; text-transform: uppercase; white-space: nowrap; border: 1px solid rgba(255,255,255,0.1)">${d.droppedBy}</div>
               </div>
            `;
            el.style.pointerEvents = 'auto';
            el.title = d.fileName;
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
          <MapContainer center={[20, 0]} zoom={3} minZoom={2} style={{ height: '100%', width: '100%', background: '#001020' }} zoomControl={false} maxBounds={[[-90,-180],[90,180]]}>
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri"
              maxZoom={19}
              noWrap={true}
            />
            <LeafletMapEvents onMapClick={(lat: number, lng: number) => handleGlobeClick({ lat, lng })} />
            {chests.map((chest) => {
              const chestIcon = L.divIcon({
                html: `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; width: 80px; transform: translateX(-20px);">
                    <div style="font-size: 32px; filter: drop-shadow(0 0 10px ${chest.tier === 'gold' ? '#fbbf24' : '#fff'})">${chest.tier === 'gold' ? '🥇' : chest.tier === 'silver' ? '🥈' : '🛡️'}</div>
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
      <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300, display: 'flex', alignItems: 'center', gap: 16, padding: '12px 28px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, minWidth: 280, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
        {/* APP LOGO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 20, paddingRight: 20, borderRight: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontSize: 24 }}>📦</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: '#5ba4e5', letterSpacing: 1, textTransform: 'uppercase' }}>DATA SAVER</span>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #fbbf24', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>🥇</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#fbbf24', letterSpacing: 3, textTransform: 'uppercase' }}>GOLD: {chests.filter(c => c.tier === 'gold').length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #94a3b8', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>🥈</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase' }}>SILVER: {chests.filter(c => c.tier === 'silver').length}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderLeft: '4px solid #cd7f32', borderRadius: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase' }}>PLATINUM: {chests.filter(c => c.tier === 'platinum').length}</span>
        </div>
      </div>

      {/* PUBLIC STATISTICS HUD (RIGHT) */}
      <div style={{ position: 'fixed', top: 130, right: 20, zIndex: 100, pointerEvents: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRight: '4px solid #f97316', borderRadius: 10 }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontStyle: 'italic' }}>{chests.length}</span>
          <span style={{ fontSize: 12, fontWeight: 900, color: '#f97316', letterSpacing: 2, textTransform: 'uppercase' }}>TOTAL<br />DROPS</span>
        </div>
      </div>

      {/* MY DROPS SHELF (BOTTOM CENTER) */}
      {currentUser && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 300, width: 'calc(100% - 40px)', maxWidth: 800 }}>
           <div style={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', border: '2px solid rgba(255,255,255,0.1)', borderRadius: 28, padding: '16px 24px', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                 <p style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase' }}>📡 YOUR ACTIVE DROPS</p>
                 <span style={{ fontSize: 10, background: '#f97316', color: '#000', padding: '2px 8px', borderRadius: 4, fontWeight: 900 }}>{chests.filter(c => c.droppedBy === currentUser.username).length} UNIT(S)</span>
              </div>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }} className="no-scrollbar">
                 {chests.filter(c => c.droppedBy === currentUser.username).map(drop => (
                    <div key={drop._id || drop.id} style={{ minWidth: 200, background: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{drop.tier === 'gold' ? '🥇' : drop.tier === 'silver' ? '🥈' : '🛡️'}</span>
                          <div style={{ overflow: 'hidden' }}>
                             <p style={{ fontSize: 11, fontWeight: 800, color: '#fff', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{drop.fileName}</p>
                             <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>📍 {drop.lat.toFixed(2)}, {drop.lng.toFixed(2)}</p>
                          </div>
                       </div>
                       <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                          <button onClick={() => setSelectedChest(drop)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 9, fontWeight: 700, padding: '6px 0', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase' }}>VIEW</button>
                          <button onClick={() => handleDeleteDrop((drop._id || drop.id)!)} style={{ flex: 1, background: 'rgba(239, 68, 68, 0.2)', border: 'none', color: '#ef4444', fontSize: 9, fontWeight: 700, padding: '6px 0', borderRadius: 8, cursor: 'pointer', textTransform: 'uppercase' }}>DELETE</button>
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
                <button onClick={() => setTempTier('platinum')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#1e293b', border: tempTier === 'platinum' ? '4px solid #1d4ed8' : '2px solid #000', fontSize: 32, transition: 'all 0.2s' }}>🛡️</button>
                <button onClick={() => setTempTier('gold')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#fbbf24', border: tempTier === 'gold' ? '4px solid #1d4ed8' : '2px solid #000', fontSize: 32, transition: 'all 0.2s' }}>🥇</button>
                <button onClick={() => setTempTier('silver')} style={{ width: 70, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, cursor: 'pointer', background: '#d1d5db', border: tempTier === 'silver' ? '4px solid #1d4ed8' : '2px solid #000', fontSize: 32, transition: 'all 0.2s' }}>🥈</button>
              </div>

              {/* TIER INFO */}
              <div style={{ minHeight: 100, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {tempTier === 'platinum' && <p style={{ fontSize: 18, fontWeight: 600 }}>🛡️ Fully Free — Anyone can download</p>}

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
      {adTimer !== null && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-slate-950/98 backdrop-blur-3xl">
          <div className="text-7xl font-black text-orange-500 italic mb-4">{adTimer}</div>
          <p className="text-slate-500 font-black tracking-[8px] uppercase">Decryption Ongoing</p>
        </div>
      )}
    </div>
  );
}
