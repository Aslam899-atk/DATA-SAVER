import React, { useState } from 'react';
import type { UserProfile } from '../types/game';
import { X, User, Mail, DollarSign, LogIn, ArrowRightLeft, CheckCircle2 } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSwitchAccount: (email: string, name?: string) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSwitchAccount,
}) => {
  const [emailInput, setEmailInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>('');

  if (!isOpen) return null;

  const handleSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    soundFx.playCashRegister();
    onSwitchAccount(emailInput.trim(), nameInput.trim() || undefined);
    onClose();
  };

  const handleQuickSwitch = (email: string, name: string) => {
    soundFx.playCashRegister();
    onSwitchAccount(email, name);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150 font-mono">
      <div className="relative w-full max-w-md bg-zinc-950 border-2 border-cyan-500/80 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-400 rounded-xl text-cyan-300">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                Citizen Identity & Auth
              </div>
              <h2 className="text-lg font-black text-white">ACCOUNT / EMAIL LOGIN</h2>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Account Card */}
        <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-xl space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            Currently Logged In:
          </div>
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full border-2 border-cyan-400 bg-slate-900 object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm truncate">{currentUser.name}</span>
                <span className="px-1.5 py-0.2 text-[9px] bg-green-500/20 text-green-400 border border-green-500/40 rounded font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="text-xs text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                <Mail className="w-3 h-3 text-cyan-400" />
                <span>{currentUser.email}</span>
              </div>
              <div className="text-xs text-green-400 font-bold flex items-center gap-1 mt-0.5">
                <DollarSign className="w-3 h-3" />
                <span>Cash: ${currentUser.cash.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Testing Accounts */}
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3 text-cyan-400" />
            <span>1-Click Test Accounts (Test 2 tabs):</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => handleQuickSwitch('citizen1@vicedrop.net', 'Citizen_One')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentUser.email === 'citizen1@vicedrop.net'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <span>Account 1</span>
                {currentUser.email === 'citizen1@vicedrop.net' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">citizen1@vicedrop.net</div>
            </button>

            <button
              onClick={() => handleQuickSwitch('citizen2@vicedrop.net', 'Citizen_Two')}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                currentUser.email === 'citizen2@vicedrop.net'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
              }`}
            >
              <div className="font-bold flex items-center gap-1">
                <span>Account 2</span>
                {currentUser.email === 'citizen2@vicedrop.net' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              </div>
              <div className="text-[10px] text-zinc-500 truncate">citizen2@vicedrop.net</div>
            </button>
          </div>
        </div>

        {/* Custom Email Form */}
        <form onSubmit={handleSwitch} className="space-y-3 pt-2 border-t border-zinc-800">
          <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            Or Login with Your Custom Email:
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">Email Address:</label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="e.g. aslam@gmail.com"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-zinc-400">Citizen Name (Optional):</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="e.g. Aslam_Rider"
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-cyan-400 rounded-xl px-3.5 py-2 text-xs text-white outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <LogIn className="w-4 h-4" />
            LOGIN WITH THIS ACCOUNT
          </button>
        </form>

        <div className="text-[10px] text-zinc-500 text-center leading-relaxed">
          💡 Cash is earned by <strong>dropping & selling files</strong> or claiming <strong>Admin Cash Drops</strong>.
          When you go offline, your 3D avatar stays in the city!
        </div>
      </div>
    </div>
  );
};
