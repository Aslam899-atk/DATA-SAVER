import { useState, useEffect } from 'react';
import axios from 'axios';
import { IndiaGameMap } from './components/IndiaGameMap';
import { BoxModal } from './components/BoxModal';
import { AdsOverlay } from './components/AdsOverlay';
import { HiddenAdminPanel } from './components/HiddenAdminPanel';
import { soundFx } from './utils/soundEffects';
import {
  ShieldCheck,
  Volume2,
  VolumeX,
  Package,
  Zap,
  Award,
  Compass,
  Download,
  X
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

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
  boxType?: 'free' | 'password' | 'timer' | 'task' | 'puzzle' | 'quiz';
  taskType?: 'memory' | 'cipher' | 'pattern';
  timerSeconds?: number;
  expiresAtHours?: number;
  maxUserOpens?: number;
  currentOpens?: number;
  requiresRequest?: boolean;
  puzzleGridSize?: '3x3' | '4x4' | '5x5';
  puzzleImage?: string;
  quizQuestion?: string;
  quizAnswer?: string;
}

export interface Ad {
  id?: string;
  _id?: string;
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string;
}

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api';

// Pre-populated initial map boxes across Indian Cities
const INITIAL_DEMO_CHESTS: Chest[] = [
  // Malappuram / Kerala
  {
    id: 'chest-mlp-1',
    lat: 11.0723,
    lng: 76.0740,
    title: '🌴 Malappuram Freedom Intel Box',
    message: 'Welcome to Malappuram real street game! You found a free intel drop.',
    tier: 'bronze',
    boxType: 'free',
    hasPin: false,
    fileName: 'kerala_intel_map.pdf',
    fileSize: '2.4 MB',
    fileUrl: 'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=800&q=80',
    droppedBy: 'Malappuram Explorer'
  },
  {
    id: 'chest-mlp-2',
    lat: 11.0735,
    lng: 76.0755,
    title: '🔑 Secret Password Vault Box',
    message: 'Encrypted passcode chest! Enter code 7860 to decrypt files.',
    tier: 'gold',
    boxType: 'password',
    hasPin: true,
    pin: '7860',
    fileName: 'secret_code_data.dat',
    fileSize: '5.1 MB',
    droppedBy: 'Agent Aslam'
  },
  {
    id: 'chest-mlp-3',
    lat: 11.0710,
    lng: 76.0725,
    title: '🧠 Memory Matrix Task Box',
    message: 'Solve the memory tile sequence to unlock this task box!',
    tier: 'silver',
    boxType: 'task',
    hasPin: false,
    taskType: 'memory',
    fileName: 'task_complete_reward.zip',
    fileSize: '8.7 MB',
    droppedBy: 'Puzzle Master'
  },
  {
    id: 'chest-mlp-4',
    lat: 11.0740,
    lng: 76.0715,
    title: '⏱️ 15-Sec Countdown Timer Box',
    message: 'Time-locked chest! Auto-unlocking after 10-sec countdown.',
    tier: 'silver',
    boxType: 'timer',
    hasPin: false,
    timerSeconds: 10,
    fileName: 'speed_data_pack.bin',
    fileSize: '3.3 MB',
    droppedBy: 'Time Runner'
  },
  // Mumbai
  {
    id: 'chest-bom-1',
    lat: 18.9220,
    lng: 72.8347,
    title: '🌊 Marine Drive Taj Gateway Box',
    message: 'Mumbai seafront secret box! Solve the math cipher.',
    tier: 'silver',
    boxType: 'task',
    hasPin: false,
    taskType: 'cipher',
    fileName: 'mumbai_secret_files.pdf',
    fileSize: '4.8 MB',
    droppedBy: 'Mumbai Runner'
  },
  // New Delhi
  {
    id: 'chest-del-1',
    lat: 28.6129,
    lng: 77.2295,
    title: '🏛️ India Gate Capital Vault',
    message: 'Capital city password box. Code: 313.',
    tier: 'gold',
    boxType: 'password',
    hasPin: true,
    pin: '313',
    fileName: 'capital_intel_archive.zip',
    fileSize: '12.0 MB',
    droppedBy: 'Delhi Squad'
  }
];

const INITIAL_ADS: Ad[] = [
  {
    id: 'ad-1',
    title: '⚡ Dynamic Speed Gear & Energy Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    link: 'https://google.com'
  },
  {
    id: 'ad-2',
    title: '🎮 Cyberpunk Game Gear & Pro Headsets',
    imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
    link: 'https://google.com'
  }
];

export function App() {
  // Player state
  const [playerPos, setPlayerPos] = useState({ lat: 11.0723, lng: 76.0740 }); // Default: Malappuram
  const [currentCityName, setCurrentCityName] = useState('Malappuram, Kerala');
  const [score, setScore] = useState(150);
  const [energy, setEnergy] = useState(100);
  const [unlockedItems, setUnlockedItems] = useState<Chest[]>([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Boxes & Ads state
  const [chests, setChests] = useState<Chest[]>(INITIAL_DEMO_CHESTS);
  const [ads, setAds] = useState<Ad[]>(INITIAL_ADS);
  const [activeBoxModal, setActiveBoxModal] = useState<Chest | null>(null);
  const [activeAd, setActiveAd] = useState<Ad | null>(null);

  // Hidden Admin Panel & Auth state
  const [isHiddenAdminOpen, setIsHiddenAdminOpen] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => localStorage.getItem('hiddenAdminAuth') === 'true');

  const handleOpenAdmin = () => {
    setIsAdminLoggedIn(localStorage.getItem('hiddenAdminAuth') === 'true');
    setIsHiddenAdminOpen(true);
  };

  // Fetch drops from server API if available
  useEffect(() => {
    axios.get(`${API_URL}/chests`)
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setChests(res.data);
        }
      })
      .catch(() => {});

    axios.get(`${API_URL}/ads`)
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAds(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Secret Shortcut Listener (`Ctrl + Shift + A`) for Hidden Admin Panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        soundFx.playAdminBeep();
        setIsHiddenAdminOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Periodic Interstitial Ad Trigger ("Edakkide Ads") - Triggers every 2.5 mins
  useEffect(() => {
    const adInterval = setInterval(() => {
      if (ads.length > 0 && !activeBoxModal && !isHiddenAdminOpen) {
        const randomAd = ads[Math.floor(Math.random() * ads.length)];
        setActiveAd(randomAd);
      }
    }, 150000); // 2.5 minutes

    return () => clearInterval(adInterval);
  }, [ads, activeBoxModal, isHiddenAdminOpen]);

  // Handle Logo 5x Tap to open Hidden Admin Panel
  const handleLogoClick = () => {
    const nextCount = logoTapCount + 1;
    setLogoTapCount(nextCount);
    if (nextCount >= 5) {
      soundFx.playAdminBeep();
      setIsHiddenAdminOpen(true);
      setLogoTapCount(0);
    }
  };

  const handleAudioToggle = () => {
    const muted = soundFx.toggleMute();
    setIsMuted(muted);
  };

  const handleSuccessUnlock = (chest: Chest) => {
    setScore(prev => prev + 100);
    setEnergy(prev => Math.min(100, prev + 25));
    if (!unlockedItems.some(item => (item.id || item._id) === (chest.id || chest._id))) {
      setUnlockedItems(prev => [chest, ...prev]);
    }
  };

  const handleAdReward = () => {
    setScore(prev => prev + 50);
    setEnergy(prev => Math.min(100, prev + 50));
  };

  const handleTeleportPlayer = (lat: number, lng: number, cityName: string) => {
    setPlayerPos({ lat, lng });
    setCurrentCityName(cityName);
  };

  const handleDeleteChest = async (id: string) => {
    setChests(prev => prev.filter(c => (c.id !== id && c._id !== id)));
    try {
      await axios.delete(`${API_URL}/chests/${id}`);
    } catch (e) {}
  };

  const handleAddChest = async (newChest: Partial<Chest>) => {
    const created: Chest = {
      id: `chest-custom-${Date.now()}`,
      lat: newChest.lat || playerPos.lat,
      lng: newChest.lng || playerPos.lng,
      title: newChest.title || 'User Drop Box',
      message: newChest.message || 'Secret drop message',
      tier: newChest.tier || 'bronze',
      boxType: newChest.boxType || 'free',
      pin: newChest.pin,
      timerSeconds: newChest.timerSeconds,
      taskType: newChest.taskType,
      fileName: newChest.fileName || 'drop_intel.dat',
      fileSize: newChest.fileSize || '1.5 MB',
      fileUrl: newChest.fileUrl,
      files: newChest.files,
      droppedBy: newChest.droppedBy || 'Explorer',
      hasPin: !!newChest.pin,
      currentOpens: 0
    };

    setChests(prev => [created, ...prev]);
    try {
      await axios.post(`${API_URL}/chests`, created);
    } catch (e) {}
  };

  const handleAddAd = (newAd: Partial<Ad>) => {
    const created: Ad = {
      id: `ad-${Date.now()}`,
      title: newAd.title || 'New Ad Campaign',
      imageUrl: newAd.imageUrl,
      link: newAd.link
    };
    setAds(prev => [created, ...prev]);
  };

  const handleDeleteAd = (id: string) => {
    setAds(prev => prev.filter(a => a.id !== id && a._id !== id));
  };

  const forceDownload = async (url: string, filename: string) => {
    try {
      const response = await axios.get(url, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename || 'data_file.dat');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const handleMapClickDrop = async (lat: number, lng: number) => {
    const title = prompt('Enter Title for New Box Drop:', 'Secret Map Drop Box');
    if (!title) return;

    const message = prompt('Enter Message / Intel text for this Box:', 'Secret message hidden inside!');
    
    const modeChoice = prompt(
      'Select Box Mode:\n1 = FREE (Instant Open)\n2 = PASSWORD (PIN / Passcode)\n3 = QUIZ QUESTION (Q&A Answer)\n4 = PUZZLE 3x3 (Sliding Tiles)\n5 = PUZZLE 4x4\n6 = PUZZLE 5x5',
      '1'
    );

    let boxType: 'free' | 'password' | 'quiz' | 'puzzle' = 'free';
    let pin: string | undefined = undefined;
    let quizQuestion: string | undefined = undefined;
    let quizAnswer: string | undefined = undefined;
    let puzzleGridSize: '3x3' | '4x4' | '5x5' | undefined = undefined;

    if (modeChoice === '2') {
      boxType = 'password';
      pin = prompt('Enter Password / PIN code:', '7860') || '1234';
    } else if (modeChoice === '3') {
      boxType = 'quiz';
      quizQuestion = prompt('Enter Quiz Question:', 'What is the capital of India?') || 'What is the capital of India?';
      quizAnswer = prompt('Enter Quiz Answer:', 'New Delhi') || 'New Delhi';
    } else if (modeChoice === '4') {
      boxType = 'puzzle';
      puzzleGridSize = '3x3';
    } else if (modeChoice === '5') {
      boxType = 'puzzle';
      puzzleGridSize = '4x4';
    } else if (modeChoice === '6') {
      boxType = 'puzzle';
      puzzleGridSize = '5x5';
    }

    const hoursInput = prompt('Enter Expiry Time Limit in Hours (e.g. 1, 10, 24):', '10');
    const maxOpensInput = prompt('Enter Max People / Opens Limit (e.g. 50, 100):', '50');
    const fileUrlInput = prompt('Enter File URL or Image Link (optional):', '');

    const newChestData: Partial<Chest> = {
      title,
      message: message || '',
      lat,
      lng,
      hasPin: !!pin,
      pin,
      boxType,
      quizQuestion,
      quizAnswer,
      puzzleGridSize,
      expiresAtHours: hoursInput ? parseInt(hoursInput) : 10,
      maxUserOpens: maxOpensInput ? parseInt(maxOpensInput) : 50,
      tier: boxType === 'password' ? 'gold' : boxType === 'puzzle' ? 'silver' : 'bronze',
      fileUrl: fileUrlInput || undefined,
      fileName: fileUrlInput ? (fileUrlInput.split('/').pop() || 'attached_intel.dat') : 'intel_drop.dat',
      fileSize: fileUrlInput ? '1.5 MB' : '0.5 MB',
      droppedBy: 'Map Explorer'
    };

    handleAddChest(newChestData);
    soundFx.playSuccess();
    alert('✅ NEW CUSTOM DROP PLACED ON MAP WITH YOUR SETTINGS!');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none flex flex-col">
      {/* GAME TOP HUD HEADER */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent backdrop-blur-md flex items-center justify-between border-b border-cyan-500/10 pointer-events-auto">
        {/* Game Title & Secret Admin Logo Trigger */}
        <div
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-pointer group"
          title="Click 5 times for Hidden Admin Panel"
        >
          <div className="p-2 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wider bg-gradient-to-r from-cyan-300 via-blue-200 to-indigo-300 bg-clip-text text-transparent">
              INDIA STREET GAME EXPLORER
            </h1>
            <p className="text-[10px] font-mono text-cyan-400/70">
              REAL MAP STREETS • MULTI-MODE BOXES • PAVA RUNNER
            </p>
          </div>
        </div>

        {/* Player Stats & Controls */}
        <div className="flex items-center gap-3">
          {/* Energy Bar */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <div className="w-20 bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-300"
                style={{ width: `${energy}%` }}
              />
            </div>
            <span className="text-amber-300 font-bold">{Math.round(energy)}%</span>
          </div>

          {/* Player Score */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-cyan-300">
            <Award className="w-4 h-4 text-cyan-400" />
            <span className="font-bold">{score} XP</span>
          </div>

          {/* Inventory Drawer Trigger */}
          <button
            onClick={() => setIsInventoryOpen(true)}
            className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 transition-all shadow-md"
            title="Open Inventory Bag"
          >
            <Package className="w-5 h-5" />
            {unlockedItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                {unlockedItems.length}
              </span>
            )}
          </button>

          {/* Audio Sound FX Toggle */}
          <button
            onClick={handleAudioToggle}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Toggle Game Sound"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Hidden Admin Secret Launcher Button */}
          <button
            onClick={handleOpenAdmin}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold flex items-center gap-1.5"
            title="Secret Admin Panel (Ctrl+Shift+A)"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline">ADMIN</span>
          </button>
        </div>
      </header>

      {/* MAIN GAME ENGINE MAP CANVAS */}
      <main className="flex-1 w-full h-full relative">
        <IndiaGameMap
          chests={chests}
          playerPos={playerPos}
          setPlayerPos={setPlayerPos}
          onOpenBox={(chest) => setActiveBoxModal(chest)}
          setEnergy={setEnergy}
          currentCityName={currentCityName}
          onMapClickDrop={handleMapClickDrop}
        />
      </main>

      {/* MULTI-MODE UNLOCK BOX MODAL */}
      <BoxModal
        chest={activeBoxModal}
        onClose={() => setActiveBoxModal(null)}
        onSuccessUnlock={handleSuccessUnlock}
        forceDownload={forceDownload}
        isAdmin={isAdminLoggedIn}
      />

      {/* PERIODIC AD OVERLAY */}
      <AdsOverlay
        ad={activeAd}
        onClose={() => setActiveAd(null)}
        onReward={handleAdReward}
      />

      {/* HIDDEN SECRET ADMIN PANEL */}
      <HiddenAdminPanel
        isOpen={isHiddenAdminOpen}
        onClose={() => setIsHiddenAdminOpen(false)}
        chests={chests}
        ads={ads}
        onDeleteChest={handleDeleteChest}
        onAddChest={handleAddChest}
        onAddAd={handleAddAd}
        onDeleteAd={handleDeleteAd}
        onTeleportPlayer={handleTeleportPlayer}
      />

      {/* INVENTORY DRAWER MODAL */}
      {isInventoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Package className="w-5 h-5" />
                <span>UNLOCKED INTEL INVENTORY ({unlockedItems.length})</span>
              </div>
              <button onClick={() => setIsInventoryOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {unlockedItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs font-mono space-y-2">
                <Package className="w-10 h-10 mx-auto text-slate-600" />
                <p>No boxes unlocked yet! Explore real street map & open boxes.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {unlockedItems.map((item, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-cyan-300">{item.title}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Type: {item.boxType || item.tier}</p>
                    </div>
                    {item.fileUrl && (
                      <button
                        onClick={() => forceDownload(item.fileUrl!, item.fileName || 'intel.dat')}
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        DOWNLOAD
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
