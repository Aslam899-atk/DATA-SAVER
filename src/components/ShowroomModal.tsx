import React from 'react';
import type { SpawnedCar, UserProfile } from '../types/game';
import { X, Building2, Car, DollarSign, CheckCircle2, RotateCcw } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface ShowroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  cars: SpawnedCar[];
  user: UserProfile;
  onBuyCar: (carId: string) => void;
  onSellCar: (carId: string) => void;
}

export const ShowroomModal: React.FC<ShowroomModalProps> = ({
  isOpen,
  onClose,
  cars,
  user,
  onBuyCar,
  onSellCar,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border-2 border-cyan-500/80 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)] overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cyan-900/40 via-blue-900/40 to-indigo-900/40 border-b border-cyan-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 border border-cyan-500 rounded-lg text-cyan-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Apex Motors // Luxury Dealership & Second-Hand Trade
              </div>
              <h2 className="text-xl font-black text-white tracking-wide">
                CITY CAR SHOWROOM & GARAGE
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-3 py-1.5 bg-black/60 rounded-xl border border-green-500/40 font-mono text-xs">
              <span className="text-zinc-400">BALANCE: </span>
              <span className="text-green-400 font-bold">${user.cash.toLocaleString()}</span>
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
        </div>

        {/* Cars Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950/80">
          {cars.length === 0 ? (
            <div className="col-span-2 text-center py-16 text-zinc-500 font-mono">
              <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No vehicles currently available in the dealership.</p>
              <p className="text-xs mt-1 text-zinc-600">
                Use the Admin Dealership panel to import famous cars!
              </p>
            </div>
          ) : (
            cars.map((car) => {
              const isOwned = car.ownerId === user.id;
              const isOtherOwned = car.ownerId !== null && !isOwned;
              const canAfford = user.cash >= car.price;
              const sellRefund = Math.round(car.price * 0.7);

              return (
                <div
                  key={car.id}
                  className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-all shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                          {car.catalogId.replace('_', ' ')}
                        </span>
                        {isOwned && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-green-500/20 text-green-400 border border-green-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> OWNED
                          </span>
                        )}
                        {isOtherOwned && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                            OWNED BY CITIZEN
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-white mt-1">{car.name}</h4>
                      <div className="text-xs font-mono text-zinc-500 mt-0.5">
                        Coords: X:{Math.round(car.x)}, Z:{Math.round(car.z)}
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-xs text-zinc-500 uppercase">Price</div>
                      <div className="text-base font-black text-green-400">
                        ${car.price.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
                    {isOwned ? (
                      <>
                        <div className="text-[11px] font-mono text-zinc-400">
                          Resale value: <strong className="text-green-400">${sellRefund.toLocaleString()}</strong> (70%)
                        </div>
                        <button
                          onClick={() => {
                            soundFx.playCashRegister();
                            onSellCar(car.id);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-500/50 hover:border-red-400 text-red-300 hover:text-white rounded-xl font-mono text-xs font-bold transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          SELL FOR CASH
                        </button>
                      </>
                    ) : isOtherOwned ? (
                      <div className="text-xs font-mono text-zinc-500 italic">
                        Owned by {car.ownerName || 'another citizen'}. Cannot purchase.
                      </div>
                    ) : (
                      <>
                        <div className="text-[11px] font-mono text-zinc-400">
                          Status: <span className="text-yellow-400 font-bold">READY TO BUY</span>
                        </div>
                        <button
                          disabled={!canAfford}
                          onClick={() => {
                            soundFx.playCashRegister();
                            onBuyCar(car.id);
                          }}
                          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-mono text-xs font-black tracking-wider transition-all shadow-md ${
                            canAfford
                              ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-cyan-500/20 hover:scale-105'
                              : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                          }`}
                        >
                          <DollarSign className="w-4 h-4" />
                          {canAfford ? 'PURCHASE CAR' : 'INSUFFICIENT FUNDS'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
