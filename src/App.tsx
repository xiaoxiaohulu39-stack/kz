/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Pause, 
  Info, 
  X,
  ChevronRight,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  cn, 
  GRID_COLS, 
  GRID_ROWS, 
  INITIAL_ROWS, 
  GameMode, 
  GameStatus, 
  Block, 
  generateRow, 
  generateId,
  getRandomValue
} from './utils';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('idle');
  const [mode, setMode] = useState<GameMode>('classic');
  const [grid, setGrid] = useState<(Block | null)[][]>([]);
  const [selected, setSelected] = useState<{ r: number; c: number }[]>([]);
  const [target, setTarget] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(10);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState<number>(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  const initGame = useCallback((selectedMode: GameMode) => {
    const initialGrid: (Block | null)[][] = Array.from({ length: GRID_ROWS }, () => 
      Array.from({ length: GRID_COLS }, () => null)
    );

    // Fill initial rows from the bottom
    for (let i = 0; i < INITIAL_ROWS; i++) {
      initialGrid[GRID_ROWS - 1 - i] = generateRow();
    }

    setGrid(initialGrid);
    setMode(selectedMode);
    setStatus('playing');
    setScore(0);
    setSelected([]);
    setTarget(generateNewTarget(initialGrid));
    setTimeLeft(selectedMode === 'time' ? 15 : 0);
    setIsPaused(false);
  }, []);

  // Generate a target sum that is likely possible
  const generateNewTarget = (currentGrid: (Block | null)[][]) => {
    const flatBlocks = currentGrid.flat().filter(b => b !== null) as Block[];
    if (flatBlocks.length === 0) return 10;

    // Pick 2-4 random blocks and sum them
    const count = Math.min(flatBlocks.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = [...flatBlocks].sort(() => 0.5 - Math.random());
    const sum = shuffled.slice(0, count).reduce((acc, b) => acc + b.value, 0);
    
    // Ensure target is reasonable (e.g., between 5 and 30)
    return Math.max(5, Math.min(sum, 40));
  };

  const addNewRow = useCallback(() => {
    setGrid(prev => {
      // Check if top row is occupied
      if (prev[0].some(cell => cell !== null)) {
        setStatus('gameover');
        return prev;
      }

      const newGrid = [...prev];
      // Shift everything up
      for (let r = 0; r < GRID_ROWS - 1; r++) {
        newGrid[r] = [...newGrid[r + 1]];
      }
      // Add new row at the bottom
      newGrid[GRID_ROWS - 1] = generateRow();
      return newGrid;
    });
  }, []);

  // Handle block selection
  const handleBlockClick = (r: number, c: number) => {
    if (status !== 'playing' || isPaused) return;
    const block = grid[r][c];
    if (!block) return;

    const isAlreadySelected = selected.some(s => s.r === r && s.c === c);
    let newSelected;

    if (isAlreadySelected) {
      newSelected = selected.filter(s => !(s.r === r && s.c === c));
    } else {
      newSelected = [...selected, { r, c }];
    }

    setSelected(newSelected);

    const currentSum = newSelected.reduce((acc, s) => acc + (grid[s.r][s.c]?.value || 0), 0);

    if (currentSum === target) {
      // Success!
      handleSuccess(newSelected);
    } else if (currentSum > target) {
      // Failed - clear selection with a shake or just clear
      setSelected([]);
    }
  };

  const handleSuccess = (selectedBlocks: { r: number; c: number }[]) => {
    const points = target * selectedBlocks.length;
    setScore(prev => prev + points);
    
    // Clear blocks
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      selectedBlocks.forEach(({ r, c }) => {
        newGrid[r][c] = null;
      });
      
      // Apply gravity (optional, but let's keep it simple: blocks stay where they are or fall)
      // For this game style, usually blocks stay until a new row pushes them.
      return newGrid;
    });

    setSelected([]);
    
    // Effects
    if (points > 50) {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b']
      });
    }

    // Update target
    setGrid(currentGrid => {
      setTarget(generateNewTarget(currentGrid));
      return currentGrid;
    });

    // Mode specific logic
    if (mode === 'classic') {
      addNewRow();
    } else {
      setTimeLeft(prev => Math.min(prev + 5, 20)); // Bonus time
    }
  };

  // Timer logic
  useEffect(() => {
    if (status === 'playing' && !isPaused) {
      if (mode === 'time') {
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              addNewRow();
              return 10; // Reset timer but penalize with new row
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // In classic mode, maybe add a row every X seconds regardless?
        // Let's make it every 15 seconds to keep pressure
        timerRef.current = setInterval(() => {
          addNewRow();
        }, 15000);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, mode, isPaused, addNewRow]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
    }
  }, [score, highScore]);

  const currentSum = selected.reduce((acc, s) => acc + (grid[s.r][s.c]?.value || 0), 0);

  if (status === 'idle') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter italic text-emerald-500 uppercase">
              SumGame
            </h1>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
              Mathematical Elimination Puzzle
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <button 
              onClick={() => initGame('classic')}
              className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 p-6 rounded-2xl transition-all hover:border-emerald-500/50 hover:bg-zinc-800/50 text-left"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-bold">Classic Mode</span>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-emerald-500 transition-colors" />
              </div>
              <p className="text-zinc-400 text-sm">Clear blocks to reach the target. Each success adds a new row. Don't let them reach the top!</p>
            </button>

            <button 
              onClick={() => initGame('time')}
              className="group relative overflow-hidden bg-zinc-900 border border-zinc-800 p-6 rounded-2xl transition-all hover:border-amber-500/50 hover:bg-zinc-800/50 text-left"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-bold">Time Attack</span>
                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="text-zinc-400 text-sm">Race against the clock. Time out adds a row. Fast thinking earns bonus time!</p>
            </button>
          </div>

          <div className="pt-8 border-t border-zinc-800 flex justify-center gap-8">
            <div className="text-center">
              <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-1">High Score</p>
              <p className="text-2xl font-mono font-bold">{highScore}</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-4 font-sans overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-[400px] flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setStatus('idle')}
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-zinc-500" />
          </button>
          
          <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-1 rounded-full border border-zinc-800">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="font-mono font-bold text-sm">{score}</span>
          </div>

          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
          >
            {isPaused ? <Play className="w-6 h-6 text-emerald-500" /> : <Pause className="w-6 h-6 text-zinc-500" />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2">
              <Zap className="w-3 h-3 text-emerald-500 opacity-50" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">Target Sum</span>
            <span className="text-4xl font-black text-emerald-500">{target}</span>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-2 left-2">
              <Timer className="w-3 h-3 text-amber-500 opacity-50" />
            </div>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
              {mode === 'time' ? 'Time Left' : 'Next Row'}
            </span>
            <span className={cn(
              "text-4xl font-black font-mono",
              mode === 'time' && timeLeft < 5 ? "text-red-500 animate-pulse" : "text-amber-500"
            )}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Progress Bar for Sum */}
        <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
          <motion.div 
            className={cn(
              "h-full transition-colors duration-300",
              currentSum > target ? "bg-red-500" : "bg-emerald-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((currentSum / target) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between px-1">
          <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Current: {currentSum}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Target: {target}</span>
        </div>
      </div>

      {/* Game Grid */}
      <div className="relative w-full max-w-[400px] aspect-[6/10] bg-zinc-950 rounded-2xl border-2 border-zinc-900 p-2 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-6 grid-rows-10 gap-1 h-full">
          {grid.map((row, r) => (
            row.map((block, c) => (
              <div key={`${r}-${c}`} className="relative">
                <AnimatePresence mode="popLayout">
                  {block && (
                    <motion.button
                      layoutId={block.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 1.5, opacity: 0, filter: 'brightness(2)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleBlockClick(r, c)}
                      className={cn(
                        "w-full h-full rounded-lg flex items-center justify-center text-xl font-bold transition-all duration-200",
                        selected.some(s => s.r === r && s.c === c)
                          ? "bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10 scale-105"
                          : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 border border-zinc-800"
                      )}
                    >
                      {block.value}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            ))
          ))}
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center"
            >
              <h2 className="text-3xl font-bold mb-6">Game Paused</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-full flex items-center gap-2 hover:bg-emerald-400 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" />
                Resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {status === 'gameover' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-full mb-6">
                <X className="w-12 h-12 text-red-500" />
              </div>
              <h2 className="text-4xl font-black mb-2 uppercase italic tracking-tighter">Game Over</h2>
              <p className="text-zinc-500 mb-8 font-mono">You reached the top!</p>
              
              <div className="w-full max-w-[200px] space-y-4 mb-8">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <span className="text-zinc-500 text-xs uppercase tracking-widest">Score</span>
                  <span className="text-2xl font-mono font-bold">{score}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-xs uppercase tracking-widest">Best</span>
                  <span className="text-2xl font-mono font-bold text-emerald-500">{highScore}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => initGame(mode)}
                  className="bg-white text-black font-bold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-zinc-200 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  Try Again
                </button>
                <button 
                  onClick={() => setStatus('idle')}
                  className="bg-zinc-900 border border-zinc-800 text-white font-bold px-6 py-3 rounded-xl hover:bg-zinc-800 transition-colors"
                >
                  Menu
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions / Footer */}
      <div className="mt-8 text-center max-w-[400px]">
        <div className="flex items-center justify-center gap-2 text-zinc-600 mb-2">
          <Info className="w-4 h-4" />
          <span className="text-xs uppercase tracking-widest font-medium">How to play</span>
        </div>
        <p className="text-zinc-500 text-xs leading-relaxed">
          Select blocks to reach the <span className="text-emerald-500 font-bold">Target Sum</span>. 
          Blocks don't need to be adjacent. Don't let the blocks reach the top!
        </p>
      </div>
    </div>
  );
}
