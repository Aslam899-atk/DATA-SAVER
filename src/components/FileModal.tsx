import React, { useState, useEffect } from 'react';
import type { DroppedFileItem, UserProfile } from '../types/game';
import { Download, Trash2, X, FileText, Music, Box, DollarSign, Clock, Users } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

interface FileModalProps {
  file: DroppedFileItem | null;
  currentUser: UserProfile;
  onClose: () => void;
  onDelete: (id: string) => void;
  onClaimDownload: (file: DroppedFileItem) => boolean; // returns true if success
}

export const FileModal: React.FC<FileModalProps> = ({
  file,
  currentUser,
  onClose,
  onDelete,
  onClaimDownload,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('');

  useEffect(() => {
    if (!file || !file.expiresAt) {
      setTimeLeftStr('No Expiration');
      return;
    }

    const updateTimer = () => {
      const diff = file.expiresAt! - Date.now();
      if (diff <= 0) {
        setTimeLeftStr('EXPIRED');
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeftStr(`${m}m ${s}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [file]);

  if (!file) return null;

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isCreator = file.creatorId === currentUser.id;
  const canAfford = !file.isPaid || isCreator || currentUser.cash >= file.price;
  const claimsRemaining = file.maxClaims > 0 ? Math.max(0, file.maxClaims - (file.claimedCount || 0)) : null;

  const handleDownloadAction = () => {
    const success = onClaimDownload(file);
    if (!success) return;

    soundFx.playCashRegister();

    // Trigger download
    if (file.dataUrl) {
      const link = document.createElement('a');
      link.href = file.dataUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (file.textContent) {
      const blob = new Blob([file.textContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    onClose();
  };

  const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name);
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(file.name);
  const isText =
    file.type.startsWith('text/') ||
    /\.(txt|json|js|ts|tsx|jsx|html|css|py|md|log)$/i.test(file.name) ||
    !!file.textContent;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-pink-500/80 rounded-2xl shadow-[0_0_50px_rgba(236,72,153,0.3)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-pink-600/30 via-purple-600/30 to-cyan-600/30 border-b border-pink-500/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/20 border border-pink-500 rounded-lg text-pink-400">
              <Box className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-mono uppercase tracking-widest text-pink-400 font-bold flex items-center gap-2">
                <span>INTEL TERMINAL</span>
                <span>•</span>
                <span className={file.isPaid ? 'text-yellow-400' : 'text-green-400'}>
                  {file.isPaid ? `PAID ($${file.price.toLocaleString()})` : 'FREE AIRDROP'}
                </span>
              </div>
              <h2 className="text-xl font-black text-white tracking-wide truncate max-w-md drop-shadow">
                {file.name}
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

        {/* Metadata info bar */}
        <div className="grid grid-cols-4 gap-2 px-6 py-3 bg-zinc-900/90 border-b border-zinc-800 text-xs font-mono">
          <div>
            <span className="text-zinc-500">SIZE:</span>{' '}
            <span className="text-cyan-300 font-bold">{formatSize(file.size)}</span>
          </div>
          <div>
            <span className="text-zinc-500">CREATOR:</span>{' '}
            <span className="text-zinc-200 font-semibold truncate">{file.creatorName || 'Citizen'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-pink-300 font-bold">{timeLeftStr}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-300 font-bold">
              {claimsRemaining !== null ? `${claimsRemaining} left` : 'Unlimited'}
            </span>
          </div>
        </div>

        {/* Preview Container */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[200px] bg-zinc-950/60">
          {isImage && file.dataUrl ? (
            <div className="relative group max-h-[320px] overflow-hidden rounded-xl border border-zinc-800 bg-black/60 p-2">
              <img
                src={file.dataUrl}
                alt={file.name}
                className="max-h-[300px] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          ) : isAudio && file.dataUrl ? (
            <div className="w-full max-w-md p-6 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col items-center gap-4">
              <div className="p-4 bg-pink-500/20 text-pink-400 rounded-full animate-bounce">
                <Music className="w-10 h-10" />
              </div>
              <div className="text-center font-mono text-sm text-zinc-300">{file.name}</div>
              <audio controls src={file.dataUrl} className="w-full" />
            </div>
          ) : isText && file.textContent ? (
            <div className="w-full max-h-[280px] overflow-auto bg-black/90 p-4 rounded-xl border border-zinc-800 font-mono text-xs text-green-400 whitespace-pre-wrap select-text">
              {file.textContent.slice(0, 4000)}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-400">
              <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl text-cyan-400 mb-3">
                <FileText className="w-12 h-12" />
              </div>
              <p className="text-sm font-mono text-zinc-300">Intel Package Ready</p>
              <p className="text-xs text-zinc-500 mt-1">Download to extract contents to your device</p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-900/90 border-t border-zinc-800 gap-3">
          {isCreator ? (
            <button
              onClick={() => {
                soundFx.playClick();
                onDelete(file.id);
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600 border border-red-500/50 hover:border-red-400 text-red-400 hover:text-white rounded-xl font-bold font-mono text-xs transition-all duration-200"
            >
              <Trash2 className="w-4 h-4" />
              REMOVE MY CRATE
            </button>
          ) : (
            <div className="text-xs font-mono text-zinc-400">
              Your Cash: <strong className="text-green-400">${currentUser.cash.toLocaleString()}</strong>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl font-mono text-xs font-bold transition-all"
            >
              CANCEL [ESC]
            </button>

            <button
              disabled={!canAfford}
              onClick={handleDownloadAction}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black font-mono text-xs tracking-wider shadow-lg transition-all ${
                canAfford
                  ? file.isPaid && !isCreator
                    ? 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-yellow-500/20 hover:scale-105'
                    : 'bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-400 hover:to-cyan-400 text-white shadow-pink-500/20 hover:scale-105'
                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
              }`}
            >
              {file.isPaid && !isCreator ? (
                <>
                  <DollarSign className="w-4 h-4" />
                  PAY ${file.price.toLocaleString()} & DOWNLOAD
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  {isCreator ? 'DOWNLOAD (CREATOR FREE)' : 'FREE DOWNLOAD'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
