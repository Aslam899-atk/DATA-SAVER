import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Clock, Lock, Unlock, Download, FileText, CheckCircle, AlertTriangle, Cpu, X } from 'lucide-react';
import { soundFx } from '../utils/soundEffects';

export interface Chest {
  id?: string;
  _id?: string;
  lat: number;
  lng: number;
  title: string;
  message?: string;
  tier: 'gold' | 'silver' | 'bronze' | 'platinum';
  fileName: string;
  fileSize: string;
  fileUrl?: string;
  files?: { fileUrl: string; fileName: string; fileSize?: string; mimeType?: string }[];
  droppedBy: string;
  hasPin?: boolean;
  pin?: string;
  boxType?: 'free' | 'password' | 'timer' | 'task' | 'puzzle' | 'quiz';
  taskType?: 'memory' | 'cipher' | 'pattern';
  timerSeconds?: number;
  expiresAtHours?: number;
  maxUserOpens?: number;
  currentOpens?: number;
  puzzleGridSize?: '3x3' | '4x4' | '5x5';
  puzzleImage?: string;
  quizQuestion?: string;
  quizAnswer?: string;
}

interface BoxModalProps {
  chest: Chest | null;
  onClose: () => void;
  onSuccessUnlock: (chest: Chest) => void;
  forceDownload: (url: string, filename: string) => void;
  isAdmin?: boolean;
}

export const BoxModal: React.FC<BoxModalProps> = ({
  chest,
  onClose,
  onSuccessUnlock,
  forceDownload,
  isAdmin = false
}) => {
  if (!chest) return null;

  // Determine effective box mode
  const effectiveType = chest.boxType || (
    chest.hasPin || chest.tier === 'gold' ? 'password' :
    chest.tier === 'silver' ? 'timer' : 'free'
  );

  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(isAdmin);
  const [userQuizAnswer, setUserQuizAnswer] = useState('');

  // Sliding Tile Puzzle State (3x3, 4x4, 5x5)
  const gridSize = chest.puzzleGridSize === '5x5' ? 5 : chest.puzzleGridSize === '4x4' ? 4 : 3;
  const totalTiles = gridSize * gridSize;
  const [tiles, setTiles] = useState<number[]>([]);

  // Timer mode state
  const [timeLeft, setTimeLeft] = useState<number>(chest.timerSeconds || 10);

  // Memory Game task state
  const [memorySequence, setMemorySequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [memoryStep, setMemoryStep] = useState<'SHOW' | 'PLAY' | 'SUCCESS' | 'FAIL'>('SHOW');
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  // Cipher task state
  const [numA] = useState(() => Math.floor(Math.random() * 20) + 10);
  const [numB] = useState(() => Math.floor(Math.random() * 15) + 5);
  const [cipherInput, setCipherInput] = useState('');

  // Pattern grid task state
  const [selectedNodes, setSelectedNodes] = useState<number[]>([]);
  const targetPatternLength = 4;

  useEffect(() => {
    // Reset state on box open
    setIsUnlocked(false);
    setErrorMsg('');
    setEnteredPin('');
    setTimeLeft(chest.timerSeconds || 10);

    // Initialize Memory Game sequence if task mode
    if (effectiveType === 'task') {
      const seq = [
        Math.floor(Math.random() * 9),
        Math.floor(Math.random() * 9),
        Math.floor(Math.random() * 9)
      ];
      setMemorySequence(seq);
      setUserSequence([]);
      setMemoryStep('SHOW');
      playMemoryDemo(seq);
    }
  }, [chest]);

  // Timer countdown hook
  useEffect(() => {
    if (effectiveType === 'timer' && !isUnlocked && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setIsUnlocked(true);
            soundFx.playSuccess();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [effectiveType, isUnlocked, timeLeft]);

  // Memory demo player
  const playMemoryDemo = (seq: number[]) => {
    seq.forEach((num, index) => {
      setTimeout(() => {
        setHighlightIdx(num);
        soundFx.playAdminBeep();
        setTimeout(() => setHighlightIdx(null), 400);
      }, (index + 1) * 600);
    });
    setTimeout(() => {
      setMemoryStep('PLAY');
    }, (seq.length + 1) * 600);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = chest.pin || '0000';
    if (enteredPin.trim() === correctPin.trim()) {
      setIsUnlocked(true);
      setErrorMsg('');
      soundFx.playSuccess();
      onSuccessUnlock(chest);
    } else {
      setErrorMsg('INCORRECT PASSWORD / PIN');
      soundFx.playError();
    }
  };

  const handleMemoryTileClick = (idx: number) => {
    if (memoryStep !== 'PLAY') return;
    soundFx.playAdminBeep();
    const nextSeq = [...userSequence, idx];
    setUserSequence(nextSeq);

    // Check correctness so far
    if (nextSeq[nextSeq.length - 1] !== memorySequence[nextSeq.length - 1]) {
      setMemoryStep('FAIL');
      soundFx.playError();
      setTimeout(() => {
        setUserSequence([]);
        setMemoryStep('SHOW');
        playMemoryDemo(memorySequence);
      }, 1000);
      return;
    }

    if (nextSeq.length === memorySequence.length) {
      setMemoryStep('SUCCESS');
      setIsUnlocked(true);
      soundFx.playSuccess();
      onSuccessUnlock(chest);
    }
  };

  const handleCipherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expected = numA + numB;
    if (parseInt(cipherInput) === expected) {
      setIsUnlocked(true);
      soundFx.playSuccess();
      onSuccessUnlock(chest);
    } else {
      setErrorMsg('CIPHER SOLVE FAILED');
      soundFx.playError();
    }
  };

  // Initialize sliding tile puzzle when box opens
  useEffect(() => {
    if (effectiveType === 'puzzle') {
      const initial = Array.from({ length: totalTiles }, (_, i) => i);
      // Shuffle array
      for (let i = initial.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [initial[i], initial[j]] = [initial[j], initial[i]];
      }
      setTiles(initial);
    }
  }, [chest, effectiveType, totalTiles]);

  const handleTileClick = (index: number) => {
    const emptyIndex = tiles.indexOf(totalTiles - 1);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    const emptyRow = Math.floor(emptyIndex / gridSize);
    const emptyCol = emptyIndex % gridSize;

    // Check if adjacent
    if (Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1) {
      soundFx.playAdminBeep();
      const nextTiles = [...tiles];
      [nextTiles[index], nextTiles[emptyIndex]] = [nextTiles[emptyIndex], nextTiles[index]];
      setTiles(nextTiles);

      // Check if solved
      const isSolved = nextTiles.every((val, i) => val === i);
      if (isSolved) {
        setIsUnlocked(true);
        soundFx.playSuccess();
        onSuccessUnlock(chest);
      }
    }
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correct = (chest.quizAnswer || '').trim().toLowerCase();
    if (userQuizAnswer.trim().toLowerCase() === correct) {
      setIsUnlocked(true);
      setErrorMsg('');
      soundFx.playSuccess();
      onSuccessUnlock(chest);
    } else {
      setErrorMsg('INCORRECT QUIZ ANSWER! TRY AGAIN.');
      soundFx.playError();
    }
  };

  const handlePatternNodeClick = (nodeId: number) => {
    if (selectedNodes.includes(nodeId)) return;
    soundFx.playAdminBeep();
    const updated = [...selectedNodes, nodeId];
    setSelectedNodes(updated);

    if (updated.length >= targetPatternLength) {
      setIsUnlocked(true);
      soundFx.playSuccess();
      onSuccessUnlock(chest);
    }
  };

  const handleFreeUnlock = () => {
    setIsUnlocked(true);
    soundFx.playSuccess();
    onSuccessUnlock(chest);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.25)] text-slate-100"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                effectiveType === 'password' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' :
                effectiveType === 'timer' ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' :
                effectiveType === 'task' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
              }`}>
                {effectiveType === 'password' && <Lock className="w-5 h-5" />}
                {effectiveType === 'timer' && <Clock className="w-5 h-5" />}
                {effectiveType === 'task' && <Cpu className="w-5 h-5" />}
                {effectiveType === 'free' && <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">{chest.title || 'Intel Chest Box'}</h3>
                <p className="text-xs text-cyan-400/80 uppercase font-mono tracking-wider">
                  Type: {effectiveType.toUpperCase()} MODE • Tier: {chest.tier}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Body */}
          <div className="p-6 space-y-6">
            {!isUnlocked ? (
              <div>
                {/* 1. FREE BOX MODE */}
                {effectiveType === 'free' && (
                  <div className="py-6 text-center space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-cyan-500/10 border-2 border-cyan-400/30 flex items-center justify-center animate-bounce">
                      <Unlock className="w-10 h-10 text-cyan-400" />
                    </div>
                    <p className="text-sm text-slate-300">
                      This is an open public box. Click unlock to claim its intel!
                    </p>
                    <button
                      onClick={handleFreeUnlock}
                      className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
                    >
                      OPEN BOX NOW
                    </button>
                  </div>
                )}

                {/* 2. PASSWORD MODE */}
                {effectiveType === 'password' && (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="p-3 text-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-center gap-2">
                      <Key className="w-4 h-4 shrink-0" />
                      <span>Security Lock Engaged! Enter Passcode to open.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-cyan-300 mb-1.5 uppercase">
                        Enter Password / PIN Code
                      </label>
                      <input
                        type="password"
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
                        placeholder="••••"
                        autoFocus
                        className="w-full px-4 py-3 bg-slate-950 border border-cyan-500/30 rounded-xl text-center text-xl tracking-widest font-mono text-cyan-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-rose-400 text-center font-mono flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
                    >
                      UNLOCK PASSWORD BOX
                    </button>
                  </form>
                )}

                {/* 3. TIMER COUNTDOWN MODE */}
                {effectiveType === 'timer' && (
                  <div className="py-6 text-center space-y-4">
                    <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-400 animate-spin" />
                      <span className="text-3xl font-extrabold font-mono text-purple-300">
                        {timeLeft}s
                      </span>
                    </div>
                    <p className="text-sm text-purple-200">
                      Time-locked Box! Unlocking automatically when timer reaches zero...
                    </p>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-purple-500/30">
                      <div
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-1000"
                        style={{ width: `${((chest.timerSeconds || 10 - timeLeft) / (chest.timerSeconds || 10)) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 4. TASK MINI-GAME MODE */}
                {effectiveType === 'task' && (
                  <div className="space-y-4">
                    <div className="p-3 text-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                      <p className="font-bold">CHALLENGE TASK REQUIRED</p>
                      <p className="text-[11px] text-emerald-400/80">Complete the mini-game puzzle below to bypass security lock.</p>
                    </div>

                    {/* Sub-Task A: Memory Matrix */}
                    {(chest.taskType === 'memory' || !chest.taskType) && (
                      <div className="space-y-3">
                        <p className="text-xs text-center font-mono text-cyan-300">
                          {memoryStep === 'SHOW' && "👀 WATCH MEMORY SEQUENCE..."}
                          {memoryStep === 'PLAY' && "👉 REPEAT THE SEQUENCE!"}
                          {memoryStep === 'FAIL' && "❌ WRONG! TRY AGAIN..."}
                          {memoryStep === 'SUCCESS' && "✅ SEQUENCE CLEARED!"}
                        </p>
                        <div className="grid grid-cols-3 gap-2 w-48 mx-auto">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                            <button
                              key={idx}
                              onClick={() => handleMemoryTileClick(idx)}
                              disabled={memoryStep !== 'PLAY'}
                              className={`w-14 h-14 rounded-xl border transition-all duration-200 ${
                                highlightIdx === idx || userSequence.includes(idx)
                                  ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.8)] scale-105'
                                  : 'bg-slate-950 border-slate-800 hover:border-emerald-500/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sub-Task B: Cipher Math */}
                    {chest.taskType === 'cipher' && (
                      <form onSubmit={handleCipherSubmit} className="space-y-3 text-center">
                        <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 text-2xl font-mono text-cyan-300">
                          {numA} + {numB} = ?
                        </div>
                        <input
                          type="number"
                          value={cipherInput}
                          onChange={(e) => setCipherInput(e.target.value)}
                          placeholder="Answer..."
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-cyan-300"
                        />
                        <button
                          type="submit"
                          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
                        >
                          SUBMIT CIPHER ANSWER
                        </button>
                      </form>
                    )}

                    {/* Sub-Task C: Pattern Lock */}
                    {chest.taskType === 'pattern' && (
                      <div className="space-y-3 text-center">
                        <p className="text-xs font-mono text-cyan-300">Connect 4 Node Dots in Order</p>
                        <div className="grid grid-cols-3 gap-3 w-48 mx-auto">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((nodeId) => (
                            <button
                              key={nodeId}
                              onClick={() => handlePatternNodeClick(nodeId)}
                              className={`w-12 h-12 rounded-full border flex items-center justify-center font-mono text-xs transition-all ${
                                selectedNodes.includes(nodeId)
                                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-lg scale-110'
                                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-emerald-500'
                              }`}
                            >
                              {selectedNodes.indexOf(nodeId) >= 0 ? selectedNodes.indexOf(nodeId) + 1 : '•'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. SLIDING PUZZLE MODE (3x3, 4x4, 5x5) */}
                {effectiveType === 'puzzle' && (
                  <div className="space-y-4 text-center">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs">
                      <p className="font-bold uppercase">🧩 SLIDING TILE PUZZLE ({chest.puzzleGridSize || '3x3'})</p>
                      <p className="text-[11px] text-cyan-400/80">Click adjacent tiles to move and arrange them in order (0 to {totalTiles - 1})!</p>
                    </div>

                    <div
                      className="grid gap-1 mx-auto bg-slate-950 p-2 rounded-2xl border border-cyan-500/30"
                      style={{
                        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                        width: `${gridSize * 64}px`
                      }}
                    >
                      {tiles.map((tileVal, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleTileClick(idx)}
                          className={`h-14 rounded-xl font-bold font-mono text-sm border flex items-center justify-center transition-all ${
                            tileVal === totalTiles - 1
                              ? 'bg-slate-900 border-dashed border-slate-800 text-transparent'
                              : 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white border-cyan-300 shadow-md hover:scale-105'
                          }`}
                        >
                          {tileVal !== totalTiles - 1 && tileVal}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. QUIZ QUESTION MODE */}
                {effectiveType === 'quiz' && (
                  <form onSubmit={handleQuizSubmit} className="space-y-4">
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center">
                      <p className="text-xs font-mono text-amber-400 mb-1">❓ ANSWER QUIZ QUESTION TO UNLOCK:</p>
                      <p className="font-bold text-base text-slate-100">{chest.quizQuestion || 'What is the capital of India?'}</p>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={userQuizAnswer}
                        onChange={(e) => setUserQuizAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        autoFocus
                        className="w-full px-4 py-3 bg-slate-950 border border-amber-500/30 rounded-xl text-center font-mono text-amber-300 text-base focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-rose-400 text-center font-mono flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
                    >
                      SUBMIT QUIZ ANSWER
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* UNLOCKED CONTENT VIEW */
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center space-y-1">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-400 animate-bounce" />
                  <h4 className="font-bold text-lg text-emerald-200">BOX UNLOCKED SUCCESSFULLY!</h4>
                  <p className="text-xs text-emerald-400/80">Intel contents decrypted and claimed.</p>
                </div>

                {chest.message && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm">
                    <p className="text-xs font-mono text-cyan-400 mb-1">DATA INTEL MESSAGE:</p>
                    <p>{chest.message}</p>
                  </div>
                )}

                {/* File Attachments */}
                {chest.files && chest.files.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-mono text-slate-400">ATTACHED INTEL FILES ({chest.files.length}):</p>
                    {chest.files.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-cyan-500/20 hover:border-cyan-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="text-xs font-mono text-slate-200 truncate">{f.fileName}</span>
                        </div>
                        <button
                          onClick={() => forceDownload(f.fileUrl, f.fileName)}
                          className="px-3 py-1.5 text-xs font-bold bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 rounded-lg text-cyan-300 flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          DOWNLOAD
                        </button>
                      </div>
                    ))}
                  </div>
                ) : chest.fileUrl ? (
                  <button
                    onClick={() => forceDownload(chest.fileUrl!, chest.fileName || 'intel_data.dat')}
                    className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    DOWNLOAD INTEL DATA FILE
                  </button>
                ) : null}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
