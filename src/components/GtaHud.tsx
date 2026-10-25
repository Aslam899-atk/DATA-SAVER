import React from 'react';
import type { UserProfile } from '../types/game';
import {
  Volume2,
  VolumeX,
  HelpCircle,
  Upload,
  Car,
  Landmark,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Flame,
  LogOut,
  Megaphone,
} from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

export type DriveControlAction =
  | 'gas'
  | 'reverse'
  | 'steerLeft'
  | 'steerRight'
  | 'handbrake'
  | 'exit'
  | 'horn';

interface GtaHudProps {
  user: UserProfile;
  inVehicle: boolean;
  vehicleSpeed: number;
  interactPrompt: string | null;
  notification: string | null;
  isDraggingFile: boolean;
  onOpenControls: () => void;
  onOpenAdminModal?: () => void;
  onOpenShowroomModal: () => void;
  onDropFileTrigger: () => void;
  onCollectAtmBonus: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onDriveControl?: (action: DriveControlAction, isPressed: boolean) => void;
  onTriggerContextInteract?: () => void;
}

export const GtaHud: React.FC<GtaHudProps> = ({
  user,
  inVehicle,
  vehicleSpeed,
  interactPrompt,
  notification,
  isDraggingFile,
  onOpenControls,
  onOpenShowroomModal,
  onDropFileTrigger,
  onCollectAtmBonus,
  isMuted,
  onToggleMute,
  onDriveControl,
  onTriggerContextInteract,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 select-none font-sans">
      {/* Top Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Player Profile Badge */}
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-zinc-800 shadow-xl">
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-full bg-cyan-950 border border-cyan-400/50 object-cover"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-white">{user.name}</span>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                  ONLINE
                </span>
              </div>
              <div className="text-[10px] font-mono text-zinc-400">
                Cars Owned: <span className="text-cyan-300 font-bold">{user.ownedCarIds.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <button
            onClick={() => {
              soundFx.playAtmChime();
              onCollectAtmBonus();
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-mono font-bold rounded-xl shadow-md border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all"
            title="Collect Daily $5,000 Bank Allowance"
          >
            <Landmark className="w-3.5 h-3.5" />
            ATM BONUS
          </button>
        </div>

        {/* Top-Center: Notification Banner */}
        {notification && (
          <div className="animate-bounce px-6 py-2.5 bg-black/90 border-2 border-cyan-400 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.4)]">
            <span className="font-mono text-xs font-black text-cyan-300 tracking-wider uppercase drop-shadow">
              {notification}
            </span>
          </div>
        )}

        {/* Top-Right: Cash Balance & Modals */}
        <div className="pointer-events-auto flex items-center gap-2.5">
          {/* Cash Display */}
          <div className="font-mono text-xl font-black text-green-400 tracking-wider bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-green-500/40 shadow-xl flex items-center gap-1.5">
            <span className="text-zinc-500 text-xs">$</span>
            <span>{user.cash.toLocaleString()}</span>
          </div>

          {/* Showroom & Garage Button */}
          <button
            onClick={() => {
              soundFx.playClick();
              onOpenShowroomModal();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-mono font-bold rounded-xl shadow-md border border-cyan-400/50 hover:scale-105 transition-all"
            title="Browse Showroom, Buy & Sell Cars"
          >
            <Car className="w-4 h-4" />
            SHOWROOM
          </button>

          {/* Mute Button */}
          <button
            onClick={onToggleMute}
            className="p-2.5 bg-black/75 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-xl transition-all"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-green-400" />}
          </button>

          {/* Controls Button */}
          <button
            onClick={onOpenControls}
            className="p-2.5 bg-black/75 hover:bg-black border border-zinc-800 hover:border-zinc-700 text-cyan-400 rounded-xl transition-all"
            title="Controls & City Guide"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-Vehicle Interactive Speedometer & Driving Controls HUD */}
      {inVehicle && (
        <div className="pointer-events-auto self-center mb-2 flex flex-col items-center gap-2 animate-in fade-in">
          {/* Speedometer Gauge & Info */}
          <div className="bg-black/90 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-cyan-500/60 shadow-[0_0_30px_rgba(6,182,212,0.3)] flex items-center gap-6">
            <div className="text-center font-mono">
              <div className="text-3xl font-black text-cyan-300 drop-shadow">
                {Math.round(vehicleSpeed * 150)}
              </div>
              <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                KM / H
              </div>
            </div>
            {/* Speed progress gauge */}
            <div className="w-28 h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-amber-400 transition-all duration-75"
                style={{ width: `${Math.min(100, Math.round(vehicleSpeed * 100))}%` }}
              />
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-2 border-l border-zinc-700 pl-4">
              <button
                onClick={() => onDriveControl?.('horn', true)}
                className="px-2.5 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/40 border border-yellow-500/50 text-yellow-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1 active:scale-95 transition-all"
                title="Honk Car Horn [H]"
              >
                <Megaphone className="w-3.5 h-3.5" />
                HORN [H]
              </button>
              <button
                onClick={() => onDriveControl?.('exit', true)}
                className="px-2.5 py-1.5 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-300 rounded-lg text-xs font-mono font-bold flex items-center gap-1 active:scale-95 transition-all"
                title="Exit Vehicle [F]"
              >
                <LogOut className="w-3.5 h-3.5" />
                EXIT [F]
              </button>
            </div>
          </div>

          {/* Interactive Mouse/Touch Steering & Gas D-Pad */}
          <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-zinc-800">
            {/* Steer Left */}
            <button
              onMouseDown={() => onDriveControl?.('steerLeft', true)}
              onMouseUp={() => onDriveControl?.('steerLeft', false)}
              onMouseLeave={() => onDriveControl?.('steerLeft', false)}
              onTouchStart={() => onDriveControl?.('steerLeft', true)}
              onTouchEnd={() => onDriveControl?.('steerLeft', false)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 active:bg-cyan-600 rounded-xl text-white font-mono font-bold text-xs shadow transition-colors"
              title="Steer Left [A]"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            {/* Accel & Reverse column */}
            <div className="flex flex-col gap-1.5">
              <button
                onMouseDown={() => onDriveControl?.('gas', true)}
                onMouseUp={() => onDriveControl?.('gas', false)}
                onMouseLeave={() => onDriveControl?.('gas', false)}
                onTouchStart={() => onDriveControl?.('gas', true)}
                onTouchEnd={() => onDriveControl?.('gas', false)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-400 rounded-xl text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shadow transition-colors"
                title="Accelerate / Gas [W]"
              >
                <ArrowUp className="w-4 h-4" /> GAS [W]
              </button>
              <button
                onMouseDown={() => onDriveControl?.('reverse', true)}
                onMouseUp={() => onDriveControl?.('reverse', false)}
                onMouseLeave={() => onDriveControl?.('reverse', false)}
                onTouchStart={() => onDriveControl?.('reverse', true)}
                onTouchEnd={() => onDriveControl?.('reverse', false)}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 active:bg-amber-400 rounded-xl text-white font-mono font-bold text-xs flex items-center justify-center gap-1 shadow transition-colors"
                title="Brake / Reverse [S]"
              >
                <ArrowDown className="w-4 h-4" /> BRAKE [S]
              </button>
            </div>
            {/* Steer Right */}
            <button
              onMouseDown={() => onDriveControl?.('steerRight', true)}
              onMouseUp={() => onDriveControl?.('steerRight', false)}
              onMouseLeave={() => onDriveControl?.('steerRight', false)}
              onTouchStart={() => onDriveControl?.('steerRight', true)}
              onTouchEnd={() => onDriveControl?.('steerRight', false)}
              className="p-3 bg-zinc-800 hover:bg-zinc-700 active:bg-cyan-600 rounded-xl text-white font-mono font-bold text-xs shadow transition-colors"
              title="Steer Right [D]"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            {/* Handbrake Drift */}
            <button
              onMouseDown={() => onDriveControl?.('handbrake', true)}
              onMouseUp={() => onDriveControl?.('handbrake', false)}
              onMouseLeave={() => onDriveControl?.('handbrake', false)}
              onTouchStart={() => onDriveControl?.('handbrake', true)}
              onTouchEnd={() => onDriveControl?.('handbrake', false)}
              className="px-3.5 py-4 bg-orange-700/80 hover:bg-orange-600 active:bg-orange-500 text-white font-mono font-black text-xs rounded-xl flex flex-col items-center gap-1 shadow transition-colors"
              title="Handbrake Drift [SPACE]"
            >
              <Flame className="w-4 h-4 text-yellow-300" />
              DRIFT
            </button>
          </div>
        </div>
      )}

      {/* Bottom Area */}
      <div className="flex items-end justify-between w-full">
        {/* Placeholder for Minimap on left */}
        <div className="w-44" />

        {/* Center Context Interaction Prompt (Clickable!) */}
        {interactPrompt && (
          <button
            onClick={() => {
              soundFx.playClick();
              if (interactPrompt.includes('[F]')) {
                onDriveControl?.('exit', true);
              } else if (onTriggerContextInteract) {
                onTriggerContextInteract();
              }
            }}
            className="pointer-events-auto animate-pulse bg-black/90 hover:bg-zinc-900 border-2 border-yellow-400 hover:border-yellow-300 text-yellow-300 hover:text-white px-6 py-2.5 rounded-2xl font-mono text-sm font-black tracking-wide shadow-[0_0_30px_rgba(250,204,21,0.5)] active:scale-95 transition-all cursor-pointer"
          >
            {interactPrompt}
          </button>
        )}

        {/* Right side Actions */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <button
            onClick={() => {
              soundFx.playClick();
              onDropFileTrigger();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono text-xs font-black rounded-xl shadow-lg shadow-pink-500/25 border border-pink-400/40 hover:scale-105 active:scale-95 transition-all"
          >
            <Upload className="w-4 h-4" />
            + AIRDROP FILE
          </button>

          <div className="bg-black/75 backdrop-blur-sm px-4 py-2 rounded-xl border border-zinc-800 text-[11px] font-mono text-zinc-400 text-right space-y-0.5">
            <div><span className="text-cyan-400 font-bold">WASD / ARROWS:</span> Move / Drive</div>
            <div><span className="text-cyan-400 font-bold">F:</span> Enter / Exit Car</div>
            <div><span className="text-cyan-400 font-bold">SPACE:</span> Jump / Drift</div>
            <div><span className="text-cyan-400 font-bold">E:</span> Inspect Crate / ATM</div>
            <div><span className="text-cyan-400 font-bold">DRAG FILE:</span> Free/Paid Airdrop</div>
          </div>
        </div>
      </div>

      {/* Full-Screen Drag-over Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 bg-pink-950/85 backdrop-blur-md border-4 border-dashed border-pink-400 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-150">
          <div className="p-6 bg-pink-500/20 border-2 border-pink-400 rounded-3xl animate-bounce text-pink-300 shadow-[0_0_50px_rgba(236,72,153,0.8)]">
            <Upload className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-black text-white font-mono tracking-widest uppercase drop-shadow">
            RELEASE FILE TO CONFIGURE AIRDROP
          </h1>
          <p className="text-pink-300 font-mono text-sm">
            Choose Free or Paid drop, countdown timer, and claim limits!
          </p>
        </div>
      )}
    </div>
  );
};
