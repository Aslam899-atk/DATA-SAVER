import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AdModalProps {
  ads: any[];
  user: any;
  onClose: () => void;
  onRewardSuccess: () => void;
}

export const AdModal: React.FC<AdModalProps> = ({ ads, user, onClose, onRewardSuccess }) => {
  const [timeLeft, setTimeLeft] = useState(10);
  const [rewarding, setRewarding] = useState(false);
  const activeAd = ads.length > 0 ? ads[0] : null;
  const isVideoAd = activeAd && activeAd.videoUrl;
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleReward = () => {
    if (rewarding) return;
    setRewarding(true);
    if (user && activeAd) {
      const rewardAmount = activeAd.coinReward || 10;
      axios.post(`${API_URL}/users/${user.googleId}/coins/reward`, { amount: rewardAmount })
        .then(() => {
          onRewardSuccess();
          onClose();
        })
        .catch((e) => {
          console.error("Ad reward failed", e);
          onClose();
        });
    } else {
      onClose();
    }
  };

  useEffect(() => {
    if (!isVideoAd) {
      if (timeLeft > 0) {
        const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
        return () => clearTimeout(timer);
      } else if (timeLeft === 0 && !rewarding) {
        handleReward();
      }
    }
  }, [timeLeft, rewarding, user, onClose, onRewardSuccess, isVideoAd, activeAd]);

  const handleSkip = () => {
    // If skipped, no reward. Just close.
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)]">
        <div className="bg-slate-950 p-3 flex justify-between items-center border-b border-slate-800">
          <span className="text-amber-400 font-bold font-mono text-xs animate-pulse">
            SPONSORED INTEL
          </span>
          <button 
            onClick={handleSkip}
            className="text-slate-400 hover:text-white px-3 py-1 rounded-lg border border-slate-700 text-xs font-bold transition-colors"
          >
            SKIP AD
          </button>
        </div>
        
        <div className="p-4 flex flex-col items-center text-center space-y-4">
          <div className="w-full aspect-video bg-slate-800 rounded-xl overflow-hidden relative">
            {isVideoAd ? (
              <video 
                ref={videoRef}
                src={activeAd.videoUrl} 
                autoPlay 
                playsInline
                disablePictureInPicture
                onEnded={handleReward}
                className="w-full h-full object-cover"
                style={{ pointerEvents: 'none' }} // Prevents clicking to pause/play
              />
            ) : activeAd && activeAd.imageUrl ? (
              <img src={activeAd.imageUrl} alt="Ad" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-sm">
                AD PLACEHOLDER
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent flex items-end p-4 pointer-events-none">
              <h3 className="text-white font-bold text-left">{activeAd ? activeAd.title : 'Watch this Ad for Coins!'}</h3>
            </div>
          </div>
          
          {!isVideoAd && (
            <div className="w-full">
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                <span>Watching Ad...</span>
                <span className="text-amber-400 font-bold">{timeLeft}s</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-1000 ease-linear" 
                  style={{ width: `${((10 - timeLeft) / 10) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          <p className="text-sm text-slate-300 font-mono py-2">
            {isVideoAd ? 
              `Watch the full video to get ${activeAd?.coinReward || 10} Coins!` : 
              `Coins will be automatically added when the timer finishes.`
            }
          </p>
        </div>
      </div>
    </div>
  );
};
