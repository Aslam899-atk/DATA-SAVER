import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, Trash2, PlusCircle, Megaphone, Eye, MapPin, X } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';
import type { Chest, Ad } from '../App';

interface HiddenAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  chests: Chest[];
  ads: Ad[];
  onDeleteChest: (id: string) => void;
  onAddChest: (newChest: Partial<Chest>) => void;
  onAddAd: (newAd: Partial<Ad>) => void;
  onDeleteAd: (id: string) => void;
  onTeleportPlayer: (lat: number, lng: number, cityName: string) => void;
}

export const HiddenAdminPanel: React.FC<HiddenAdminPanelProps> = ({
  isOpen,
  onClose,
  chests,
  ads,
  onDeleteChest,
  onAddChest,
  onAddAd,
  onDeleteAd,
  onTeleportPlayer
}) => {
  if (!isOpen) return null;

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return localStorage.getItem('hiddenAdminAuth') === 'true';
  });
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [activeTab, setActiveTab] = useState<'BOXES' | 'NEW_DROP' | 'ADS' | 'GODMODE'>('BOXES');

  // Filter boxes state
  const [searchTerm, setSearchTerm] = useState('');

  // New Drop Form State
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newBoxType, setNewBoxType] = useState<'free' | 'password' | 'timer' | 'task'>('free');
  const [newPin, setNewPin] = useState('');
  const [newTimerSeconds, setNewTimerSeconds] = useState(15);
  const [newTaskType, setNewTaskType] = useState<'memory' | 'cipher' | 'pattern'>('memory');
  const [newCityPreset, setNewCityPreset] = useState('malappuram');

  // New Ad Form State
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdImageUrl, setNewAdImageUrl] = useState('');
  const [newAdLink, setNewAdLink] = useState('');

  const cityCoordinates: Record<string, { lat: number; lng: number; name: string }> = {
    malappuram: { lat: 11.0723, lng: 76.0740, name: 'Malappuram, Kerala' },
    mumbai: { lat: 18.9220, lng: 72.8347, name: 'Marine Drive, Mumbai' },
    delhi: { lat: 28.6129, lng: 77.2295, name: 'India Gate, New Delhi' },
    bengaluru: { lat: 12.9716, lng: 77.5946, name: 'MG Road, Bengaluru' },
    kolkata: { lat: 22.5726, lng: 88.3639, name: 'Park Street, Kolkata' },
    agra: { lat: 27.1751, lng: 78.0421, name: 'Taj Mahal, Agra' }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = adminUser.trim().toLowerCase();
    const cleanPass = adminPass.trim();

    if (cleanUser === 'aslam' && cleanPass === '313 aslam 786') {
      setIsAdminLoggedIn(true);
      localStorage.setItem('hiddenAdminAuth', 'true');
      soundFx.playAdminBeep();
    } else {
      soundFx.playError();
      alert('ACCESS DENIED: Invalid Admin Credentials!');
    }
  };

  const handleCreateDrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const targetCoords = cityCoordinates[newCityPreset] || cityCoordinates.malappuram;

    const chestObj: Partial<Chest> = {
      title: newTitle,
      message: newMessage,
      boxType: newBoxType,
      tier: newBoxType === 'password' ? 'gold' : newBoxType === 'timer' ? 'silver' : 'bronze',
      hasPin: newBoxType === 'password',
      pin: newPin || '1234',
      timerSeconds: newTimerSeconds,
      taskType: newTaskType,
      lat: targetCoords.lat + (Math.random() * 0.004 - 0.002),
      lng: targetCoords.lng + (Math.random() * 0.004 - 0.002),
      fileName: 'admin_intel_pack.dat',
      fileSize: '1.2 MB',
      droppedBy: 'HIDDEN_ADMIN'
    };

    onAddChest(chestObj);
    soundFx.playSuccess();
    setNewTitle('');
    setNewMessage('');
    alert('SUCCESS: NEW DROP CREATED ON MAP!');
  };

  const handleCreateAd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim()) return;

    onAddAd({
      title: newAdTitle,
      imageUrl: newAdImageUrl,
      link: newAdLink
    });
    soundFx.playSuccess();
    setNewAdTitle('');
    setNewAdImageUrl('');
    setNewAdLink('');
  };

  const filteredChests = chests.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.message && c.message.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-slate-900 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.3)] text-slate-100 flex flex-col"
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-wide text-cyan-300">
                  SECRET ADMIN CONTROL PANEL
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  MAP DROPS MODERATION • BAD BOX CLEANUP • AD CONTROLS
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!isAdminLoggedIn ? (
            /* ADMIN LOGIN FORM */
            <div className="p-8 max-w-md mx-auto my-auto w-full space-y-6">
              <div className="text-center space-y-2">
                <Lock className="w-12 h-12 mx-auto text-cyan-400" />
                <h3 className="text-xl font-bold">AUTHENTICATION REQUIRED</h3>
                <p className="text-xs text-slate-400 font-mono">Enter admin credentials to unlock drop controls.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1">USERNAME</label>
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    placeholder="Username"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyan-300 mb-1">PASSWORD</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-cyan-500/30 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20"
                >
                  UNLOCK ADMIN PANEL
                </button>
              </form>
            </div>
          ) : (
            /* AUTHENTICATED ADMIN DASHBOARD */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Navigation Tabs */}
              <div className="flex border-b border-cyan-500/20 bg-slate-950/40 px-4 pt-2 gap-2">
                {[
                  { id: 'BOXES', label: `BOX INSPECTOR (${chests.length})`, icon: Eye },
                  { id: 'NEW_DROP', label: 'CREATE CUSTOM DROP', icon: PlusCircle },
                  { id: 'ADS', label: `ADS MANAGER (${ads.length})`, icon: Megaphone },
                  { id: 'GODMODE', label: 'MAP TELEPORT', icon: MapPin }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-4 py-2.5 rounded-t-xl text-xs font-bold font-mono flex items-center gap-2 transition-all ${
                        activeTab === tab.id
                          ? 'bg-slate-900 text-cyan-300 border-t-2 border-cyan-400 shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-6">
                {/* 1. BOX INSPECTOR & BAD BOX DELETION */}
                {activeTab === 'BOXES' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search boxes by title or intel message..."
                        className="w-full max-w-md px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                      />
                      <span className="text-xs font-mono text-cyan-400 whitespace-nowrap">
                        Total Drops: {filteredChests.length}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredChests.map((chest) => (
                        <div
                          key={chest.id || chest._id}
                          className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-cyan-200">{chest.title}</h4>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                Mode: <span className="text-amber-400 font-bold uppercase">{chest.boxType || chest.tier}</span> • By: {chest.droppedBy}
                              </p>
                            </div>
                            <button
                              onClick={() => onDeleteChest(chest.id || chest._id || '')}
                              className="p-2 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-colors shrink-0"
                              title="Delete Bad Box"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {chest.message && (
                            <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-xl border border-slate-800/80">
                              "{chest.message}"
                            </p>
                          )}

                          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800 pt-2">
                            <span>Lat: {chest.lat.toFixed(4)}, Lng: {chest.lng.toFixed(4)}</span>
                            {chest.pin && (
                              <span className="text-amber-300 font-bold">PIN: {chest.pin}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. CREATE CUSTOM DROP */}
                {activeTab === 'NEW_DROP' && (
                  <form onSubmit={handleCreateDrop} className="max-w-xl mx-auto space-y-4">
                    <h3 className="text-sm font-bold font-mono text-cyan-300">ADD CUSTOM DROP TO INDIA MAP</h3>
                    
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Target Location City</label>
                      <select
                        value={newCityPreset}
                        onChange={(e) => setNewCityPreset(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                      >
                        <option value="malappuram">📍 Malappuram, Kerala</option>
                        <option value="mumbai">📍 Marine Drive, Mumbai</option>
                        <option value="delhi">📍 India Gate, New Delhi</option>
                        <option value="bengaluru">📍 MG Road, Bengaluru</option>
                        <option value="kolkata">📍 Park Street, Kolkata</option>
                        <option value="agra">📍 Taj Mahal, Agra</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Box Title</label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="e.g. Secret Kerala Intel Box"
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1">Intel Message</label>
                      <textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Secret message hidden inside the box..."
                        rows={2}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-mono text-slate-400 mb-1">Box Mode Type</label>
                        <select
                          value={newBoxType}
                          onChange={(e) => setNewBoxType(e.target.value as any)}
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                        >
                          <option value="free">FREE BOX (Instant Open)</option>
                          <option value="password">PASSWORD BOX (Passcode required)</option>
                          <option value="timer">TIMER BOX (Countdown Lock)</option>
                          <option value="task">TASK MODE BOX (Mini-game Puzzle)</option>
                        </select>
                      </div>

                      {newBoxType === 'password' && (
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">Passcode / PIN</label>
                          <input
                            type="text"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            placeholder="7860"
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                          />
                        </div>
                      )}

                      {newBoxType === 'timer' && (
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">Timer Countdown (Seconds)</label>
                          <input
                            type="number"
                            value={newTimerSeconds}
                            onChange={(e) => setNewTimerSeconds(parseInt(e.target.value))}
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                          />
                        </div>
                      )}

                      {newBoxType === 'task' && (
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-1">Task Mini-Game</label>
                          <select
                            value={newTaskType}
                            onChange={(e) => setNewTaskType(e.target.value as any)}
                            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                          >
                            <option value="memory">Memory Matrix Tile Sequence</option>
                            <option value="cipher">Math Code Cipher</option>
                            <option value="pattern">Pattern Grid Node Connection</option>
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl shadow-lg"
                    >
                      CREATE DROP ON INDIA MAP
                    </button>
                  </form>
                )}

                {/* 3. ADS MANAGER */}
                {activeTab === 'ADS' && (
                  <div className="space-y-6">
                    <form onSubmit={handleCreateAd} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold font-mono text-amber-300">ADD SPONSORED ADVERTISEMENT</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={newAdTitle}
                          onChange={(e) => setNewAdTitle(e.target.value)}
                          placeholder="Ad Title / Brand"
                          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
                        />
                        <input
                          type="text"
                          value={newAdImageUrl}
                          onChange={(e) => setNewAdImageUrl(e.target.value)}
                          placeholder="Image URL"
                          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
                        />
                        <input
                          type="text"
                          value={newAdLink}
                          onChange={(e) => setNewAdLink(e.target.value)}
                          placeholder="Promo Link URL"
                          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200"
                        />
                      </div>
                      <button
                        type="submit"
                        className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                      >
                        ADD AD CAMPAIGN
                      </button>
                    </form>

                    <div className="space-y-2">
                      <h4 className="text-xs font-mono text-slate-400">ACTIVE ADS ({ads.length})</h4>
                      {ads.map((ad) => (
                        <div key={ad.id || ad._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                          <div>
                            <p className="font-bold text-xs text-amber-300">{ad.title}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{ad.link || 'No link'}</p>
                          </div>
                          <button
                            onClick={() => onDeleteAd(ad.id || ad._id || '')}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. MAP TELEPORT GODMODE */}
                {activeTab === 'GODMODE' && (
                  <div className="space-y-4 max-w-xl mx-auto">
                    <h3 className="text-sm font-bold font-mono text-cyan-300">TELEPORT AVATAR TO REAL INDIAN CITIES</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(cityCoordinates).map(([key, city]) => (
                        <button
                          key={key}
                          onClick={() => {
                            onTeleportPlayer(city.lat, city.lng, city.name);
                            soundFx.playSuccess();
                            onClose();
                          }}
                          className="p-3 rounded-xl bg-slate-950 border border-cyan-500/20 hover:border-cyan-400 hover:bg-cyan-500/10 text-cyan-300 text-xs font-bold text-left flex items-center gap-2 transition-all"
                        >
                          <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>{city.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
