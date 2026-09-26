import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
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

export interface User {
  googleId: string;
  email: string;
  name: string;
  picture: string;
  coins: number;
  lastLat?: number;
  lastLng?: number;
}

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
  puzzleGridSize?: '2x2' | '3x3' | '4x4' | '5x5';
  puzzleImage?: string;
  quizQuestion?: string;
  quizAnswer?: string;
  coinCost?: number;
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
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('userSession');
    return saved ? JSON.parse(saved) : null;
  });
  const [isFirstSpawn, setIsFirstSpawn] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<{ socketId: string; googleId: string; name: string; lat: number; lng: number }[]>([]);

  const socketRef = useRef<any>(null);
  const peersRef = useRef<{ [socketId: string]: RTCPeerConnection }>({});
  const remoteStreamsRef = useRef<{ [socketId: string]: HTMLAudioElement }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const [playerPos, setPlayerPos] = useState({ lat: 11.0723, lng: 76.0740 }); // Default: Malappuram
  const [currentCityName, setCurrentCityName] = useState('Malappuram, Kerala');
  const [score, setScore] = useState(150);
  const [energy, setEnergy] = useState(100);
  const [unlockedItems, setUnlockedItems] = useState<Chest[]>([]);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAdModal, setShowAdModal] = useState(false);
  const [hasSeenStartupAd, setHasSeenStartupAd] = useState(false);

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

  const [allUsers, setAllUsers] = useState<User[]>([]);

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

    axios.get(`${API_URL}/users`)
      .then(res => {
        if (Array.isArray(res.data)) {
          setAllUsers(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // 1. Sync User / Location on reload
  useEffect(() => {
    if (user) {
      axios.post(`${API_URL}/users/login`, {
        googleId: user.googleId,
        name: user.name,
        email: user.email,
        picture: user.picture
      }).then(res => {
        setUser(res.data);
        localStorage.setItem('userSession', JSON.stringify(res.data));
        if (res.data.lastLat && res.data.lastLng) {
          setPlayerPos({ lat: res.data.lastLat, lng: res.data.lastLng });
          setIsFirstSpawn(false);
        } else {
          setIsFirstSpawn(true);
        }
      }).catch(() => {});
    }
  }, []);

  // Show ad on startup when user logs in for the first time
  useEffect(() => {
    if (user && !hasSeenStartupAd) {
      setHasSeenStartupAd(true);
      setShowAdModal(true);
    }
  }, [user, hasSeenStartupAd]);

  // 2. Debounce coordinates saving to database
  useEffect(() => {
    if (!user || isFirstSpawn) return;
    const timer = setTimeout(() => {
      axios.post(`${API_URL}/users/${user.googleId}/location`, {
        lat: playerPos.lat,
        lng: playerPos.lng
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [playerPos, user, isFirstSpawn]);

  // 3. User Microphone Access
  useEffect(() => {
    if (user && !isFirstSpawn) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          localStreamRef.current = stream;
        })
        .catch(err => console.log("Microphone access denied: ", err));
    }
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [user, isFirstSpawn]);

  // 4. Socket.io and WebRTC setup
  useEffect(() => {
    if (!user || isFirstSpawn) return;

    const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.emit('join-game', {
      googleId: user.googleId,
      name: user.name,
      lat: playerPos.lat,
      lng: playerPos.lng
    });

    socket.on('player-joined', (newPlayer) => {
      setOnlinePlayers(prev => {
        if (prev.some(p => p.socketId === newPlayer.socketId)) return prev;
        return [...prev, newPlayer];
      });
    });

    socket.on('player-moved', ({ socketId, lat, lng }) => {
      setOnlinePlayers(prev => prev.map(p => p.socketId === socketId ? { ...p, lat, lng } : p));
    });

    socket.on('player-left', (socketId) => {
      setOnlinePlayers(prev => prev.filter(p => p.socketId !== socketId));
      closePeerConnection(socketId);
    });

    socket.on('players-list', (list) => {
      setOnlinePlayers(list.filter((p: any) => p.socketId !== socket.id));
    });

    socket.on('webrtc-signal', async ({ from, signal }) => {
      let pc = peersRef.current[from];
      if (!pc) {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peersRef.current[from] = pc;

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
          });
        }

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socketRef.current?.emit('webrtc-signal', {
              to: from,
              signal: { type: 'candidate', candidate: e.candidate }
            });
          }
        };

        pc.ontrack = (e) => {
          const audio = new Audio();
          audio.srcObject = e.streams[0];
          audio.autoplay = true;
          remoteStreamsRef.current[from] = audio;
        };
      }

      if (signal.type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit('webrtc-signal', {
          to: from,
          signal: { type: 'answer', answer }
        });
      } else if (signal.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
      } else if (signal.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      // Close all peers
      Object.keys(peersRef.current).forEach(closePeerConnection);
    };
  }, [user, isFirstSpawn]);

  // 5. Emit position changes via socket
  useEffect(() => {
    if (socketRef.current && !isFirstSpawn) {
      socketRef.current.emit('update-position', { lat: playerPos.lat, lng: playerPos.lng });
    }
  }, [playerPos, isFirstSpawn]);

  // 6. Proximity audio handler (10 meters check)
  const getDistanceInMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const initiatePeerConnection = async (targetSocketId: string) => {
    if (peersRef.current[targetSocketId]) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    peersRef.current[targetSocketId] = pc;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit('webrtc-signal', {
          to: targetSocketId,
          signal: { type: 'candidate', candidate: e.candidate }
        });
      }
    };

    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      remoteStreamsRef.current[targetSocketId] = audio;
    };

    if (socketRef.current && socketRef.current.id < targetSocketId) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('webrtc-signal', {
        to: targetSocketId,
        signal: { type: 'offer', offer }
      });
    }
  };

  const closePeerConnection = (targetSocketId: string) => {
    if (peersRef.current[targetSocketId]) {
      peersRef.current[targetSocketId].close();
      delete peersRef.current[targetSocketId];
    }
    if (remoteStreamsRef.current[targetSocketId]) {
      remoteStreamsRef.current[targetSocketId].pause();
      delete remoteStreamsRef.current[targetSocketId];
    }
  };

  useEffect(() => {
    if (!socketRef.current || isFirstSpawn) return;
    onlinePlayers.forEach(player => {
      const dist = getDistanceInMeters(playerPos.lat, playerPos.lng, player.lat, player.lng);
      if (dist <= 10) {
        initiatePeerConnection(player.socketId);
      } else {
        closePeerConnection(player.socketId);
      }
    });
  }, [onlinePlayers, playerPos, isFirstSpawn]);

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

  const handleUnlockWithCoins = async (chest: Chest) => {
    if (!user) return false;
    try {
      const response = await axios.post(`${API_URL}/chests/${chest.id || chest._id}/unlock`, {
        googleId: user.googleId
      });
      if (response.status === 200) {
        const updatedUser = { ...user, coins: user.coins - (chest.coinCost || 0) };
        setUser(updatedUser);
        localStorage.setItem('userSession', JSON.stringify(updatedUser));
        return true;
      }
    } catch (e) {
      console.log("Unlock transaction failed", e);
    }
    return false;
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
    if (!user) {
      alert("Please login first to drop a box.");
      return;
    }
    
    // Check if user has enough coins (10 coins required)
    if ((user.coins || 0) < 10) {
      alert("You need 10 coins to drop a box! Watch an AD to earn coins.");
      setShowAdModal(true);
      return;
    }

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
      coinCost: newChest.coinCost || 0,
      currentOpens: 0
    };

    try {
      // Deduct coins via API
      await axios.post(`${API_URL}/users/${user.googleId}/coins/spend`, { amount: 10 });
      setUser(prev => prev ? { ...prev, coins: (prev.coins || 0) - 10 } : null);
      
      setChests(prev => [created, ...prev]);
      await axios.post(`${API_URL}/chests`, created);
    } catch (e: any) {
      alert(e.response?.data?.message || "Error dropping box");
    }
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

  const handleCoinTransfer = async (targetId: string, amount: number) => {
    if (!user) return;
    try {
      await axios.post(`${API_URL}/users/${user.googleId}/coins/transfer`, { targetId, amount });
      setUser(prev => prev ? { ...prev, coins: (prev.coins || 0) - amount } : null);
      alert(`Successfully shared ${amount} coins!`);
      // Update allUsers locally to reflect new balances
      setAllUsers(prev => prev.map(u => {
        if (u.googleId === user.googleId) return { ...u, coins: (u.coins || 0) - amount };
        if (u.googleId === targetId) return { ...u, coins: (u.coins || 0) + amount };
        return u;
      }));
    } catch (e: any) {
      alert(e.response?.data?.message || "Failed to share coins");
      throw e;
    }
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
    const coinCostInput = prompt('Enter Coin Unlock Cost (0 for Free):', '0');

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
      coinCost: coinCostInput ? parseInt(coinCostInput) : 0,
      droppedBy: user ? user.name : 'Map Explorer'
    };

    handleAddChest(newChestData);
    soundFx.playSuccess();
  };

  const handleFirstSpawnSet = async (lat: number, lng: number) => {
    if (!user) return;
    try {
      await axios.post(`${API_URL}/users/${user.googleId}/location`, { lat, lng });
      const updatedUser = { ...user, lastLat: lat, lastLng: lng };
      setUser(updatedUser);
      localStorage.setItem('userSession', JSON.stringify(updatedUser));
      setPlayerPos({ lat, lng });
      setIsFirstSpawn(false);
      soundFx.playSuccess();
    } catch (e) {
      console.log("Failed to set spawn", e);
    }
  };

  if (!user) {
    const handleGoogleSuccess = async (credentialResponse: any) => {
      if (credentialResponse.credential) {
        try {
          const decoded: any = jwtDecode(credentialResponse.credential);
          const response = await axios.post(`${API_URL}/users/login`, {
            googleId: decoded.sub,
            name: decoded.name,
            email: decoded.email,
            picture: decoded.picture
          });
          const userData = response.data;
          setUser(userData);
          localStorage.setItem('userSession', JSON.stringify(userData));
          if (userData.lastLat && userData.lastLng) {
            setPlayerPos({ lat: userData.lastLat, lng: userData.lastLng });
            setIsFirstSpawn(false);
          } else {
            setIsFirstSpawn(true);
          }
          soundFx.playSuccess();
        } catch (error) {
          alert("Database login failed!");
        }
      }
    };

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "666413173667-fohrcm0rhp8smrdfengbh7joue1401sj.apps.googleusercontent.com";

    return (
      <GoogleOAuthProvider clientId={clientId}>
        <div className="relative w-screen h-screen flex flex-col items-center justify-center bg-slate-950 font-mono text-slate-100 select-none overflow-hidden" style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #31102f 50%, #030712 100%)'
        }}>
          <div className="absolute inset-0 pointer-events-none opacity-30 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
          <div className="relative z-10 text-center space-y-6 max-w-md w-full p-8 rounded-3xl bg-slate-900/80 border border-[#ff007f]/30 shadow-[0_0_50px_rgba(255,0,127,0.15)] backdrop-blur-md flex flex-col items-center">
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-[#ff007f] via-[#ec4899] to-[#00f0ff] animate-pulse filter drop-shadow-[0_0_15px_rgba(255,0,127,0.5)]">
                VICE CITY
              </h1>
              <h2 className="text-sm font-bold tracking-widest text-[#00f0ff]">
                DATA DROPPERS MAP
              </h2>
            </div>
            
            <div className="py-4 w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => alert('Google Sign-In failed!')}
                useOneTap
              />
            </div>

            <p className="text-[10px] text-slate-500 font-mono">
              Sign in with Google to spawn and sync location.
            </p>
          </div>
        </div>
      </GoogleOAuthProvider>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none flex flex-col">
      {/* GAME TOP HUD HEADER */}
      <header className="absolute top-0 left-0 right-0 z-40 px-4 py-3 bg-gradient-to-b from-slate-950/90 via-slate-950/60 to-transparent backdrop-blur-md flex items-center justify-between border-b border-cyan-500/10 pointer-events-auto">
        {/* Game Title & Secret Admin Logo Trigger */}
        <div
          onClick={handleLogoClick}
          className="flex items-center cursor-pointer group"
          title="Click 5 times for Hidden Admin Panel"
        >
          <div className="p-2 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
        </div>

        {/* Essential Navigation Controls */}
        <div className="flex items-center gap-3">
          {/* Player Coins */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-amber-500/30 text-xs font-mono">
            <span className="text-amber-400 text-base">🪙</span>
            <span className="font-bold text-amber-300">{user.coins || 0}</span>
            <button 
              onClick={() => setShowAdModal(true)}
              className="ml-1 w-5 h-5 rounded-md bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 flex items-center justify-center text-amber-300 font-bold transition-colors"
            >
              +
            </button>
          </div>

          {/* Inventory Drawer Trigger */}
          <button
            onClick={() => setIsInventoryOpen(true)}
            className="relative p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 transition-all shadow-md"
            title="Open Dashboard & Drops"
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
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors hidden sm:block"
            title="Toggle Game Sound"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* User Profile */}
          {user.picture && (
            <img src={user.picture} alt="Profile" className="w-9 h-9 rounded-full border-2 border-cyan-500/50" />
          )}
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
          onlinePlayers={onlinePlayers}
          allUsers={allUsers}
          isFirstSpawn={isFirstSpawn}
          onFirstSpawnSet={handleFirstSpawnSet}
          onCoinTransfer={handleCoinTransfer}
          user={user}
        />
      </main>

      {/* MULTI-MODE UNLOCK BOX MODAL */}
      <BoxModal
        chest={activeBoxModal}
        onClose={() => setActiveBoxModal(null)}
        onSuccessUnlock={handleSuccessUnlock}
        forceDownload={forceDownload}
        isAdmin={isAdminLoggedIn}
        userCoins={user?.coins || 0}
        onUnlockWithCoins={handleUnlockWithCoins}
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

      {/* Ad Modal */}
      {showAdModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]">
            <div className="bg-slate-950 p-3 flex justify-between items-center border-b border-slate-800">
              <span className="text-amber-400 font-bold font-mono text-xs animate-pulse">
                SPONSORED INTEL
              </span>
              <button 
                onClick={() => setShowAdModal(false)}
                className="text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-700 text-xs font-bold"
              >
                SKIP AD
              </button>
            </div>
            
            <div className="p-4 flex flex-col items-center text-center space-y-4">
              <div className="w-full aspect-video bg-slate-800 rounded-xl overflow-hidden relative">
                {ads.length > 0 ? (
                  <img src={ads[0].imageUrl} alt="Ad" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">
                    VIDEO AD PLACEHOLDER
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4">
                  <h3 className="text-white font-bold text-left">{ads[0]?.title || 'Watch this Ad for 2 Coins!'}</h3>
                </div>
              </div>
              
              <p className="text-sm text-slate-300 font-mono">
                Watch the full ad or click below to receive <span className="text-amber-400 font-bold">2 COINS</span>.
              </p>

              <button
                onClick={async () => {
                  if (user) {
                    try {
                      await axios.post(`${API_URL}/users/${user.googleId}/coins/reward`);
                      setUser({ ...user, coins: (user.coins || 0) + 2 });
                      alert('You earned 2 coins!');
                    } catch (e) {
                      console.error("Ad reward failed", e);
                    }
                  }
                  setShowAdModal(false);
                }}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-2xl shadow-lg transition-transform active:scale-95"
              >
                I WATCHED IT - CLAIM 2 COINS
              </button>
              
              <button
                onClick={() => {
                  alert("Request sent to Admin! They will review and grant you coins soon.");
                  setShowAdModal(false);
                }}
                className="w-full py-2 bg-transparent text-slate-400 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-colors"
              >
                REQUEST ADMIN FOR COINS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
