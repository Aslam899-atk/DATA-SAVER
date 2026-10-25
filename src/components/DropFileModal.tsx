import React, { useState } from 'react';
import { X, Upload, DollarSign, Clock, Users, Gift } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface DropFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingFile: File | null;
  onConfirmDrop: (config: {
    isPaid: boolean;
    price: number;
    maxClaims: number;
    expiresInMinutes: number | null;
  }) => void;
}

export const DropFileModal: React.FC<DropFileModalProps> = ({
  isOpen,
  onClose,
  pendingFile,
  onConfirmDrop,
}) => {
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [price, setPrice] = useState<number>(1000);
  const [maxClaims, setMaxClaims] = useState<number>(10);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(60); // 1 hour default

  if (!isOpen || !pendingFile) return null;

  const handleConfirm = () => {
    soundFx.playAirdropTouchdown();
    onConfirmDrop({
      isPaid,
      price: isPaid ? price : 0,
      maxClaims,
      expiresInMinutes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border-2 border-pink-500/80 rounded-2xl shadow-[0_0_60px_rgba(236,72,153,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-900/40 via-purple-900/40 to-cyan-900/40 border-b border-pink-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 border border-pink-500 rounded-lg text-pink-400">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-pink-400 font-bold">
                Airdrop Configuration Console
              </div>
              <h2 className="text-lg font-black text-white tracking-wide truncate max-w-sm">
                DEPLOY INTEL TO 3D MAP
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

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh] font-mono text-xs">
          {/* File Selected Badge */}
          <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="truncate pr-3">
              <span className="text-zinc-500 uppercase text-[10px] block">Selected File</span>
              <span className="text-sm font-bold text-white truncate block">{pendingFile.name}</span>
            </div>
            <span className="text-cyan-400 font-bold whitespace-nowrap">
              {(pendingFile.size / 1024).toFixed(1)} KB
            </span>
          </div>

          {/* 1. Free vs Paid Drop Mode */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              1. Airdrop Monetization (Free vs. Paid):
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setIsPaid(false);
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  !isPaid
                    ? 'bg-green-500/20 border-green-500 text-green-300 shadow-md shadow-green-500/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <Gift className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">FREE AIRDROP</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Any citizen can walk up and download immediately for $0.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  setIsPaid(true);
                }}
                className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                  isPaid
                    ? 'bg-yellow-500/20 border-yellow-500 text-yellow-300 shadow-md shadow-yellow-500/10'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <DollarSign className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">PAID AIRDROP</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 leading-snug">
                    Requires citizens to pay in-game cash to download.
                  </div>
                </div>
              </button>
            </div>

            {/* Price input if Paid */}
            {isPaid && (
              <div className="p-3 bg-yellow-950/30 border border-yellow-500/30 rounded-xl space-y-1.5 animate-in fade-in duration-150">
                <label className="text-[10px] text-yellow-400 font-bold uppercase flex items-center justify-between">
                  <span>Enter Download Price ($ Cash):</span>
                  <span className="text-white font-bold">${price.toLocaleString()}</span>
                </label>
                <input
                  type="number"
                  min={100}
                  step={500}
                  value={price}
                  onChange={(e) => setPrice(Math.max(100, parseInt(e.target.value) || 0))}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-yellow-400 rounded-lg px-3 py-2 text-yellow-300 font-bold text-sm outline-none"
                />
              </div>
            )}
          </div>

          {/* 2. Download / Claim Limit */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>2. Claim Limit (Auto-delete when finished):</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'First 1', value: 1 },
                { label: 'First 5', value: 5 },
                { label: 'First 10', value: 10 },
                { label: 'First 20', value: 20 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setMaxClaims(opt.value);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    maxClaims === opt.value
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500">
              After {maxClaims} citizen{maxClaims > 1 ? 's' : ''} download{maxClaims === 1 ? 's' : ''}, the crate will automatically disappear.
            </div>
          </div>

          {/* 3. Expiration Timer */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-pink-400" />
              <span>3. Expiration Timer (Self-destruct countdown):</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '5 Mins', value: 5 },
                { label: '15 Mins', value: 15 },
                { label: '1 Hour', value: 60 },
                { label: '24 Hours', value: 1440 },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    setExpiresInMinutes(opt.value);
                  }}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    expiresInMinutes === opt.value
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300 font-bold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-mono font-bold"
          >
            CANCEL
          </button>

          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-black font-mono text-xs rounded-xl shadow-lg shadow-pink-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            PARACHUTE AIRDROP NOW
          </button>
        </div>
      </div>
    </div>
  );
};
