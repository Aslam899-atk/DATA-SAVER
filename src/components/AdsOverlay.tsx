import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, ExternalLink, Award, X, Sparkles } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

export interface Ad {
  id?: string;
  _id?: string;
  title: string;
  imageUrl?: string;
  videoUrl?: string;
  link?: string;
}

interface AdsOverlayProps {
  ad: Ad | null;
  onClose: () => void;
  onReward: () => void;
}

export const AdsOverlay: React.FC<AdsOverlayProps> = ({
  ad,
  onClose,
  onReward
}) => {
  if (!ad) return null;

  const [skipTimer, setSkipTimer] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  useEffect(() => {
    soundFx.playAdChime();
    setSkipTimer(5);
    setCanSkip(false);
    setRewardClaimed(false);

    const timer = setInterval(() => {
      setSkipTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [ad]);

  const handleClaimReward = () => {
    setRewardClaimed(true);
    soundFx.playSuccess();
    onReward();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.3)] text-slate-100"
        >
          {/* Top Bar with Ad Badge and Skip Button */}
          <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-amber-500/20">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Megaphone className="w-3.5 h-3.5 animate-pulse" />
              SPONSORED ADVERTISEMENT
            </div>

            {canSkip ? (
              <button
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>SKIP AD</span>
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-xs font-mono">
                Skip in {skipTimer}s
              </div>
            )}
          </div>

          {/* Ad Media Display */}
          <div className="relative aspect-video w-full bg-slate-950 overflow-hidden flex items-center justify-center">
            {ad.imageUrl ? (
              <img
                src={ad.imageUrl}
                alt={ad.title}
                className="w-full h-full object-cover"
              />
            ) : ad.videoUrl ? (
              <iframe
                src={ad.videoUrl}
                title={ad.title}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 w-full h-full">
                <Sparkles className="w-12 h-12 text-amber-400 mb-2 animate-spin" />
                <h3 className="text-xl font-bold text-amber-300">{ad.title}</h3>
                <p className="text-xs text-slate-400 mt-1">Discover special gear and drop intel!</p>
              </div>
            )}
          </div>

          {/* Ad Details & Action */}
          <div className="p-5 space-y-4 bg-slate-900">
            <div>
              <h4 className="text-lg font-bold text-slate-100">{ad.title || 'Special Promotion'}</h4>
              <p className="text-xs text-slate-400 mt-1">Explore features and claim free stamina boosts for your avatar.</p>
            </div>

            <div className="flex items-center gap-3">
              {ad.link && (
                <a
                  href={ad.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <span>VISIT SPONSOR</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              {!rewardClaimed ? (
                <button
                  onClick={handleClaimReward}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>CLAIM REWARD (+50 XP)</span>
                </button>
              ) : (
                <div className="flex-1 py-3 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs text-center font-bold">
                  ✓ REWARD CLAIMED!
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
