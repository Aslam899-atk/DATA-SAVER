import React from 'react';
import { X, Gamepad2, FileUp, Car, ShieldCheck, Landmark } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface ControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ControlsModal: React.FC<ControlsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-zinc-950 border-2 border-cyan-500/80 rounded-2xl shadow-[0_0_50px_rgba(34,211,238,0.3)] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-900/40 via-purple-900/40 to-pink-900/40 border-b border-cyan-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500 rounded-lg text-cyan-400">
              <Gamepad2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                City Guide & Mechanics
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">
                CONTROLS & FEATURES
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
        <div className="p-6 space-y-4 font-mono text-xs overflow-y-auto max-h-[70vh]">
          {/* Section: Cars & Dealership */}
          <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm">
              <Car className="w-4 h-4" />
              <span>CARS, DRIVING & DEALERSHIP</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-zinc-300">
              <div><strong className="text-amber-300">[F]:</strong> Enter / Exit / Buy Car</div>
              <div><strong className="text-amber-300">[W / S]:</strong> Accelerate & Reverse</div>
              <div><strong className="text-amber-300">[A / D]:</strong> Steering & Drifting</div>
              <div><strong className="text-amber-300">[H]:</strong> Horn</div>
            </div>
            <div className="text-zinc-400 mt-1">
              Visit <strong className="text-white">Apex Motors Car Showroom</strong> to buy or sell cars second-hand for cash!
            </div>
          </div>

          {/* Section: Admin Dealership Import */}
          <div className="p-4 bg-yellow-950/30 border border-yellow-500/40 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-yellow-400 font-black text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>ADMIN PANEL // CAR IMPORTER</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Open the <strong>ADMIN</strong> console to choose from 10 legendary models (Bugatti Chiron, Lamborghini Aventador, Porsche 911, Rolls-Royce, etc.), set your own custom price, and spawn them to any map location for citizens to buy!
            </p>
          </div>

          {/* Section: File Airdrops */}
          <div className="p-4 bg-pink-950/30 border border-pink-500/40 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-pink-400 font-black text-sm">
              <FileUp className="w-4 h-4" />
              <span>FREE & PAID FILE AIRDROPS</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Drag <strong className="text-pink-300">ANY file</strong> from your computer directly into the game. Configure whether it is <strong>Free</strong> or <strong>Paid</strong>, set an <strong>expiration timer</strong>, and a <strong>claim limit</strong>!
            </p>
            <div className="text-zinc-400">
              • Approach crate and press <strong className="text-yellow-400">[E]</strong> to inspect, purchase, and download.
            </div>
          </div>

          {/* Section: Bank & Thattukada */}
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
              <Landmark className="w-4 h-4" />
              <span>CITY BANK & THATTUKADA (തട്ടുകട)</span>
            </div>
            <div className="text-zinc-300 space-y-1">
              <div>• Visit the <strong>Vice Bank & ATM</strong> to collect your $5,000 allowance.</div>
              <div>• Stop by the traditional <strong>Thattukada</strong> stall for fresh tea and community chats.</div>
              <div>• Buildings feature glass walls and realistic doorways—walk right in!</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold rounded-xl text-xs"
          >
            ENTER CITY
          </button>
        </div>
      </div>
    </div>
  );
};
