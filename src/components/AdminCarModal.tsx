import React, { useState } from 'react';
import { FAMOUS_CARS } from '../utils/carCatalog';
import type { CarCatalogItem, SpawnedCar, BillboardSlot, OfflinePlayerAvatar } from '../types/game';
import {
  X,
  ShieldCheck,
  Car,
  Gauge,
  Zap,
  Plus,
  MapPin,
  BarChart3,
  Tv,
  Users,
  Image as ImageIcon,
  DollarSign,
  Upload,
  Lock,
  KeyRound,
  AlertCircle,
} from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

const MASTER_ADMIN_PASSWORD = 'VICEADMIN2026';

interface AdminCarModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: { x: number; z: number };
  onImportCar: (car: SpawnedCar) => void;
  billboards: BillboardSlot[];
  onUpdateBillboard: (id: string, update: { imageUrl: string; sponsorName: string; headline: string }) => void;
  totalVisitors: number;
  totalCarsCount: number;
  totalAirdropsCount: number;
  offlinePlayers: OfflinePlayerAvatar[];
}

export const AdminCarModal: React.FC<AdminCarModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  onImportCar,
  billboards,
  onUpdateBillboard,
  totalVisitors,
  totalCarsCount,
  totalAirdropsCount,
  offlinePlayers,
}) => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('vicedrop_admin_authenticated') === 'true';
  });
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'analytics' | 'billboards' | 'cars'>('analytics');

  // Car Tab State
  const [selectedCar, setSelectedCar] = useState<CarCatalogItem>(FAMOUS_CARS[0]);
  const [customPrice, setCustomPrice] = useState<number>(FAMOUS_CARS[0].defaultPrice);
  const [spawnLocation, setSpawnLocation] = useState<'showroom' | 'player' | 'bank' | 'thattukada'>('showroom');

  // Billboard Tab State
  const [selectedBillboard, setSelectedBillboard] = useState<BillboardSlot>(billboards[0]);
  const [adImageUrl, setAdImageUrl] = useState<string>(billboards[0]?.imageUrl || '');
  const [adSponsor, setAdSponsor] = useState<string>(billboards[0]?.sponsorName || '');
  const [adHeadline, setAdHeadline] = useState<string>(billboards[0]?.headline || '');

  if (!isOpen) return null;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput.trim() === MASTER_ADMIN_PASSWORD) {
      sessionStorage.setItem('vicedrop_admin_authenticated', 'true');
      setIsAuthenticated(true);
      setPasswordError(false);
      soundFx.playCashRegister();
    } else {
      setPasswordError(true);
      soundFx.playClick();
    }
  };

  const handleSelectBillboard = (b: BillboardSlot) => {
    setSelectedBillboard(b);
    setAdImageUrl(b.imageUrl);
    setAdSponsor(b.sponsorName);
    setAdHeadline(b.headline);
    soundFx.playClick();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setAdImageUrl(reader.result as string);
          soundFx.playClick();
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBillboard = () => {
    soundFx.playCashRegister();
    onUpdateBillboard(selectedBillboard.id, {
      imageUrl: adImageUrl,
      sponsorName: adSponsor,
      headline: adHeadline,
    });
  };

  const handleImportCar = () => {
    soundFx.playCashRegister();

    let spawnX = 35;
    let spawnZ = -15;

    if (spawnLocation === 'player') {
      spawnX = playerPos.x + 4;
      spawnZ = playerPos.z + 4;
    } else if (spawnLocation === 'bank') {
      spawnX = 0;
      spawnZ = -40;
    } else if (spawnLocation === 'thattukada') {
      spawnX = -30;
      spawnZ = 20;
    }

    const newCar: SpawnedCar = {
      id: 'car_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      catalogId: selectedCar.id,
      name: selectedCar.name,
      price: customPrice,
      x: spawnX,
      y: 0,
      z: spawnZ,
      rotation: Math.random() * Math.PI * 2,
      speed: 0,
      color: selectedCar.colorInt,
      isPlayerInside: false,
      ownerId: null, // for sale
    };

    onImportCar(newCar);
    onClose();
  };

  // If NOT authenticated, render Password Gate
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-in fade-in duration-200">
        <div className="relative w-full max-w-md bg-zinc-950 border-2 border-red-500/80 rounded-2xl shadow-[0_0_80px_rgba(239,68,68,0.3)] overflow-hidden flex flex-col p-8 text-center font-mono">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 border-2 border-red-500 rounded-2xl flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse">
            <Lock className="w-8 h-8" />
          </div>

          <div className="text-[11px] text-red-400 uppercase tracking-widest font-black">
            RESTRICTED ACCESS
          </div>
          <h2 className="text-xl font-black text-white mt-1">CITY AUTHORITY CONSOLE</h2>
          <p className="text-xs text-zinc-400 mt-2">
            Enter the Master Security Password to access Admin Analytics, Billboard Ads, and Vehicle Importers.
          </p>

          <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="Enter Admin Password..."
                autoFocus
                className={`w-full bg-zinc-900 border rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white outline-none transition-all ${
                  passwordError
                    ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                    : 'border-zinc-700 focus:border-red-400'
                }`}
              />
            </div>

            {passwordError && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span>Incorrect password! Please try again.</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              AUTHENTICATE ACCESS
            </button>
          </form>

          <div className="mt-5 text-[10px] text-zinc-600">
            Default Security Key: <code className="text-zinc-400">VICEADMIN2026</code>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-zinc-950 border-2 border-amber-500/80 rounded-2xl shadow-[0_0_70px_rgba(245,158,11,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-yellow-600/30 border-b border-amber-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 border border-amber-500 rounded-lg text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-2">
                <span>City Authority</span>
                <span>•</span>
                <span className="text-green-400">AUTHENTICATED</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">
                VICE CITY CONTROL & ADVERTISING CENTER
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 bg-zinc-900 border-b border-zinc-800 gap-4 font-mono text-xs">
          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('analytics');
            }}
            className={`py-3.5 px-3 border-b-2 font-bold flex items-center gap-2 transition-all ${
              activeTab === 'analytics'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            VISITOR ANALYTICS ({totalVisitors})
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('billboards');
            }}
            className={`py-3.5 px-3 border-b-2 font-bold flex items-center gap-2 transition-all ${
              activeTab === 'billboards'
                ? 'border-pink-500 text-pink-400'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            BILLBOARD ADVERTISING ({billboards.length} SLOTS)
          </button>

          <button
            onClick={() => {
              soundFx.playClick();
              setActiveTab('cars');
            }}
            className={`py-3.5 px-3 border-b-2 font-bold flex items-center gap-2 transition-all ${
              activeTab === 'cars'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            CAR DEALERSHIP IMPORTER (10 MODELS)
          </button>
        </div>

        {/* Tab 1: Visitor Analytics */}
        {activeTab === 'analytics' && (
          <div className="p-6 overflow-y-auto flex-1 space-y-6 font-mono text-xs bg-zinc-950">
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span>TOTAL CITIZEN VISITS</span>
                  <Users className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-3xl font-black text-white">{totalVisitors}</div>
                <div className="text-[10px] text-green-400 mt-1">Live Connected Sessions</div>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span>ACTIVE ON MAP</span>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="text-3xl font-black text-green-400">1 Online</div>
                <div className="text-[10px] text-zinc-400 mt-1">
                  {offlinePlayers.length} Offline in City
                </div>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span>VEHICLES IN CITY</span>
                  <Car className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-black text-amber-400">{totalCarsCount}</div>
                <div className="text-[10px] text-zinc-400 mt-1">Showroom & Roadways</div>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow">
                <div className="flex items-center justify-between text-zinc-500 mb-1">
                  <span>ACTIVE AIRDROPS</span>
                  <DollarSign className="w-4 h-4 text-pink-400" />
                </div>
                <div className="text-3xl font-black text-pink-400">{totalAirdropsCount}</div>
                <div className="text-[10px] text-zinc-400 mt-1">Free & Paid Intel</div>
              </div>
            </div>

            {/* Offline Citizens Registry */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex items-center justify-between text-zinc-300 font-bold">
                <span>REGISTERED CITIZEN ROSTER & OFFLINE AVATARS</span>
                <span className="text-[10px] text-zinc-500">
                  Stationed at their last logged coordinate
                </span>
              </div>
              <div className="divide-y divide-zinc-800">
                {offlinePlayers.map((player) => {
                  const minsAgo = Math.max(1, Math.floor((Date.now() - player.lastSeen) / 60000));
                  return (
                    <div key={player.id} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={player.avatar}
                          alt={player.name}
                          className="w-7 h-7 rounded-full bg-slate-800 border border-zinc-700"
                        />
                        <div>
                          <div className="text-white font-bold">{player.name}</div>
                          <div className="text-[10px] text-zinc-500">
                            Coordinate: X:{Math.round(player.x)}, Z:{Math.round(player.z)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                          OFFLINE ({minsAgo}m ago)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Billboard Advertising Manager */}
        {activeTab === 'billboards' && (
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
            {/* Left: 5 Billboard Slots */}
            <div className="md:col-span-5 p-4 border-r border-zinc-800 overflow-y-auto space-y-2.5 bg-zinc-900/50">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 font-bold px-1">
                Select Billboard Location ({billboards.length})
              </div>
              {billboards.map((b) => {
                const isSelected = selectedBillboard.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => handleSelectBillboard(b)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-pink-500/20 border-pink-500 shadow-md shadow-pink-500/10'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white truncate max-w-[200px]">
                        {b.title}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-cyan-300 border border-zinc-700">
                        {b.zone}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 mt-1">
                      {b.locationName}
                    </div>
                    <div className="text-[10px] font-mono text-pink-400 mt-0.5 flex items-center justify-between">
                      <span>Aspect: {b.aspectRatioText}</span>
                      <span>{b.recommendedResolution}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Upload & Customize Selected Billboard */}
            <div className="md:col-span-7 p-6 overflow-y-auto space-y-5 flex flex-col justify-between bg-zinc-950 font-mono text-xs">
              <div className="space-y-4">
                {/* Board Info Header */}
                <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-pink-400">
                      Active Billboard Slot
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Recommended: <strong className="text-white">{selectedBillboard.recommendedResolution}</strong>
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white mt-1">{selectedBillboard.title}</h3>
                  <div className="text-[11px] text-zinc-400">{selectedBillboard.locationName}</div>
                </div>

                {/* Live Preview Box */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Live In-Game Billboard Preview:
                  </label>
                  <div className="relative w-full h-44 rounded-xl border-2 border-zinc-800 overflow-hidden bg-black flex items-center justify-center shadow-inner">
                    {adImageUrl ? (
                      <img
                        src={adImageUrl}
                        alt="Billboard Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-zinc-600 flex flex-col items-center gap-1">
                        <ImageIcon className="w-8 h-8" />
                        <span>No Image Uploaded</span>
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/80 rounded text-[9px] text-yellow-300 font-bold">
                      {adSponsor || 'Sponsor Name'}
                    </div>
                  </div>
                </div>

                {/* Image Upload / Input */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Upload Advertisement Banner (JPG / PNG / WebP):
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-bold cursor-pointer transition-all shadow-md">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Image File</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <span className="text-[10px] text-zinc-500">Or paste image URL below:</span>
                  </div>
                  <input
                    type="text"
                    value={adImageUrl}
                    onChange={(e) => setAdImageUrl(e.target.value)}
                    placeholder="https://example.com/banner.png"
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-pink-500 rounded-xl px-3.5 py-2 text-zinc-300 text-xs outline-none"
                  />
                </div>

                {/* Sponsor Brand Name & Headline */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">
                      Sponsor Brand Name:
                    </label>
                    <input
                      type="text"
                      value={adSponsor}
                      onChange={(e) => setAdSponsor(e.target.value)}
                      placeholder="e.g. Malabar Gold & Diamonds"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-pink-500 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">
                      Campaign Headline:
                    </label>
                    <input
                      type="text"
                      value={adHeadline}
                      onChange={(e) => setAdHeadline(e.target.value)}
                      placeholder="e.g. Grand Festive Offer"
                      className="w-full bg-zinc-900 border border-zinc-800 focus:border-pink-500 rounded-xl px-3 py-2 text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Deploy Ad Button */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="text-[10px] text-zinc-500">
                  Updates 3D building/roadside billboard texture instantly.
                </div>
                <button
                  onClick={handleSaveBillboard}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black font-mono text-xs rounded-xl shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all"
                >
                  <Tv className="w-4 h-4" />
                  DEPLOY AD TO CITY BILLBOARD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Car Dealership Importer */}
        {activeTab === 'cars' && (
          <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden">
            {/* Left: 10 Famous Car Catalog */}
            <div className="md:col-span-5 p-4 border-r border-zinc-800 overflow-y-auto space-y-2 bg-zinc-900/50">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2 font-bold px-1">
                Select Famous Vehicle Model ({FAMOUS_CARS.length})
              </div>
              {FAMOUS_CARS.map((car) => {
                const isSelected = selectedCar.id === car.id;
                return (
                  <div
                    key={car.id}
                    onClick={() => {
                      setSelectedCar(car);
                      setCustomPrice(car.defaultPrice);
                      soundFx.playClick();
                    }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-500 shadow-md shadow-amber-500/10'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
                        style={{ backgroundColor: car.colorHex }}
                      />
                      <div>
                        <div className="font-bold text-xs text-white leading-snug">{car.name}</div>
                        <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2">
                          <span>{car.brand}</span>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">{car.category}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-green-400">
                      ${(car.defaultPrice / 1000).toFixed(0)}k
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right: Selected Car Specs & Price/Location Customizer */}
            <div className="md:col-span-7 p-6 overflow-y-auto space-y-5 flex flex-col justify-between bg-zinc-950 font-mono text-xs">
              <div className="space-y-4">
                {/* Car Banner */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {selectedCar.category}
                    </span>
                    <h3 className="text-2xl font-black text-white mt-1.5">{selectedCar.name}</h3>
                    <p className="text-xs text-zinc-400 font-mono mt-1 leading-relaxed">
                      {selectedCar.description}
                    </p>
                  </div>
                  <div className="p-3 bg-zinc-800/80 rounded-xl text-amber-400 border border-zinc-700">
                    <Car className="w-8 h-8" />
                  </div>
                </div>

                {/* Performance Specs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                    <Gauge className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-zinc-500 text-[10px]">TOP SPEED</div>
                      <div className="text-white font-bold">{selectedCar.topSpeed * 5} KM/H</div>
                    </div>
                  </div>
                  <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <div>
                      <div className="text-zinc-500 text-[10px]">ACCELERATION</div>
                      <div className="text-white font-bold">{selectedCar.acceleration} M/S²</div>
                    </div>
                  </div>
                </div>

                {/* Price Customizer */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Price for Citizens ($ Cash):</span>
                    <span className="text-green-400 font-bold">${customPrice.toLocaleString()}</span>
                  </label>
                  <input
                    type="number"
                    value={customPrice}
                    step={10000}
                    min={1000}
                    onChange={(e) => setCustomPrice(Math.max(1000, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl px-4 py-2.5 font-mono text-sm text-green-400 font-bold outline-none"
                  />
                </div>

                {/* Spawn Location Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spawn Location on Map:</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    {[
                      { id: 'showroom', label: 'Car Showroom Lot (X:35, Z:-15)' },
                      { id: 'player', label: 'Near Player Location' },
                      { id: 'bank', label: 'Vice Bank Avenue' },
                      { id: 'thattukada', label: 'Thattukada Junction' },
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setSpawnLocation(loc.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          spawnLocation === loc.id
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Import Button */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                <div className="text-xs font-mono text-zinc-500">
                  Vehicle will be ready for citizens to purchase & drive.
                </div>
                <button
                  onClick={handleImportCar}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  IMPORT TO MAP NOW
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
