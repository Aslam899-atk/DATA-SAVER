import React from 'react';

interface AvatarCharacterProps {
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  isMoving: boolean;
  isRunning: boolean;
  playerName?: string;
  avatarStyle?: 'puppet' | 'cyber' | 'runner';
}

export const AvatarCharacter: React.FC<AvatarCharacterProps> = ({
  direction,
  isMoving,
  isRunning,
  playerName = 'Pava Explorer'
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none">
      {/* Player Label Tag */}
      <div className="absolute -top-7 px-2 py-0.5 rounded-full bg-black/75 border border-cyan-400/50 text-[10px] text-cyan-300 font-mono tracking-wider font-bold whitespace-nowrap shadow-lg flex items-center gap-1 backdrop-blur-md z-20">
        <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`}></span>
        {playerName}
        {isRunning && <span className="text-[9px] text-amber-300 ml-0.5">⚡RUN</span>}
      </div>

      {/* Energy Aura Effect when running */}
      {isRunning && (
        <div className="absolute w-12 h-12 rounded-full bg-amber-500/25 blur-sm animate-pulse z-0" />
      )}

      {/* Main Avatar Graphic Container */}
      <div className={`relative w-10 h-10 transition-transform duration-100 z-10 ${
        isMoving ? (isRunning ? 'animate-bounce text-amber-400' : 'animate-pulse text-cyan-400') : 'text-cyan-300'
      }`}>
        {/* Shadow */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-7 h-2 bg-black/60 rounded-full blur-[1px]" />

        <svg
          viewBox="0 0 64 64"
          className={`w-full h-full drop-shadow-[0_0_8px_rgba(6,182,212,0.6)] transition-transform duration-150 ${
            direction === 'LEFT' ? '-scale-x-100' : ''
          }`}
        >
          {/* Head & Hair */}
          <circle cx="32" cy="18" r="11" fill="#fcd34d" stroke="#d97706" strokeWidth="2" />
          <path d="M 23 14 Q 32 8 41 14 Q 32 12 23 14 Z" fill="#92400e" />

          {/* Eyes & Cap details depending on direction */}
          {direction === 'UP' ? (
            // Back of head
            <path d="M 23 12 Q 32 10 41 12 L 41 20 L 23 20 Z" fill="#b45309" />
          ) : (
            // Face features
            <g>
              <circle cx="28" cy="18" r="2" fill="#000" />
              <circle cx="36" cy="18" r="2" fill="#000" />
              <path d="M 28 23 Q 32 26 36 23" fill="none" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}

          {/* Body & Clothes */}
          <path
            d="M 20 29 C 20 26, 44 26, 44 29 L 42 45 C 42 47, 22 47, 22 45 Z"
            fill={isRunning ? "#f59e0b" : "#06b6d4"}
            stroke="#0891b2"
            strokeWidth="2"
          />
          {/* Shirt Emblem */}
          <circle cx="32" cy="35" r="3" fill="#ffffff" />
          <path d="M 32 33 L 32 37 M 30 35 L 34 35" stroke="#0891b2" strokeWidth="1.5" />

          {/* Animated Legs */}
          <g className={isMoving ? 'animate-pulse' : ''}>
            {/* Left Leg */}
            <rect
              x={isMoving && isRunning ? "22" : "24"}
              y="45"
              width="6"
              height="13"
              rx="3"
              fill="#1e293b"
              className={isMoving ? 'transition-all duration-100 -translate-y-0.5' : ''}
            />
            {/* Right Leg */}
            <rect
              x={isMoving && isRunning ? "36" : "34"}
              y="45"
              width="6"
              height="13"
              rx="3"
              fill="#1e293b"
              className={isMoving ? 'transition-all duration-100 translate-y-0.5' : ''}
            />
          </g>

          {/* Feet Shoes */}
          <ellipse cx={isMoving && isRunning ? "24" : "26"} cy="59" rx="4" ry="2.5" fill="#ef4444" />
          <ellipse cx={isMoving && isRunning ? "38" : "36"} cy="59" rx="4" ry="2.5" fill="#ef4444" />
        </svg>
      </div>
    </div>
  );
};
