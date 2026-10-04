import React, { useState } from 'react';
import { IndiaGameMap } from './components/IndiaGameMap';
import { ThreeDGameScene } from './components/ThreeDGameScene';

// Simple type definitions (adjust as needed)
export interface Chest {
  _id: string;
  title: string;
  lat: number;
  lng: number;
  creatorId?: string;
}
export interface User {
  googleId: string;
  name: string;
  coins: number;
}

const App: React.FC = () => {
  const [playerPos, setPlayerPos] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [show3D, setShow3D] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);

  const handleMapClick = (lat: number, lng: number) => {
    setPlayerPos({ lat, lng });
  };

  const handleEnter3D = () => {
    setShow3D(true);
  };

  const handleExit3D = () => {
    setShow3D(false);
  };

  return (
    <div className="w-screen h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700">
        <h1 className="text-xl font-bold">GTA‑Style Dropper</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono">Coins: {user?.coins ?? 0}</span>
          <button
            onClick={() => setUser({ googleId: 'guest', name: 'Guest', coins: 0 })}
            className="px-2 py-1 text-xs bg-cyan-600 hover:bg-cyan-500 rounded"
          >
            Login (guest)
          </button>
        </div>
      </header>

      {/* Main view */}
      <main className="flex-1 relative overflow-hidden">
        {show3D ? (
          <ThreeDGameScene


            onExit3D={handleExit3D}

          />
        ) : (
          <IndiaGameMap
            playerPos={playerPos}
            onMapClick={handleMapClick}
            onEnter3D={handleEnter3D}
          />
        )}
      </main>
    </div>
  );
};

export default App;
