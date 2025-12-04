import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const GRID_SIZE = 9;
const GAME_DURATION = 30;

export function WhackAMole() {
  const [molePosition, setMolePosition] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsPlaying(true);
  };

  const whackMole = (index: number) => {
    if (!isPlaying) return;
    if (index === molePosition) {
      setScore(s => s + 1);
      setMolePosition(null);
    }
  };

  useEffect(() => {
    if (!isPlaying) return;

    const moleInterval = setInterval(() => {
      // mole pops for a short period
      const next = Math.floor(Math.random() * GRID_SIZE);
      setMolePosition(next);
      // hide mole after short pop-time
      setTimeout(() => setMolePosition(pos => (pos === next ? null : pos)), 650);
    }, 900);

    return () => clearInterval(moleInterval);
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  return (
    <div className="h-[590px] flex items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 -z-10 animate-float bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-500 opacity-30 mix-blend-screen filter blur-3xl"></div>

      <div className="max-w-md w-full rounded-3xl p-6 backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display text-white"></h2>
          <div className="flex gap-2">
            <Button variant="neon" onClick={startGame}>{isPlaying ? 'Restart' : 'Start'}</Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4 text-lg">
          <div className="text-muted-foreground">𝐒𝐂𝐎𝐑𝐄: <span className="text-primary font-bold">{score}</span></div>
          <div className="text-muted-foreground">𝐓𝐈𝐌𝐄: <span className="text-neon-orange font-bold">{timeLeft}s</span></div>
        </div>

        {!isPlaying && timeLeft === 0 && (
          <div className="text-xl font-display text-primary mb-4">𝐅𝚰𝐍𝐀𝐋 𝐒𝐂𝐎𝐑𝐄: {score}</div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: GRID_SIZE }).map((_, index) => {
            const isActive = molePosition === index;
            return (
              <button
                key={index}
                onClick={() => whackMole(index)}
                disabled={!isPlaying}
                className={cn(
                  'relative w-28 h-28 rounded-xl p-2 flex items-end justify-center transition-transform',
                  'bg-card border-2 border-border overflow-hidden',
                  isActive && 'scale-105'
                )}
                aria-label={`hole-${index}`}
              >
                {/* hole */}
                <div className="absolute bottom-2 w-16 h-6 rounded-full bg-[radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.5),rgba(0,0,0,0.85))] border-t border-black"></div>

                {/* mole — animates up from hole */}
                <div className={cn(
                  'relative w-16 h-16 flex items-end justify-center pointer-events-none',
                  isActive ? 'mole-pop' : 'mole-hidden'
                )}>
                  <div className="w-14 h-14 rounded-full bg-neon-brown flex items-center justify-center text-2xl shadow-[0_0_18px_rgba(0,0,0,0.6)]">
                    <img
                      src="https://res.cloudinary.com/dkeab9fo1/image/upload/v1764790258/ChatGPT_Image_Dec_4_2025_01_00_27_AM_vliqq7.png"
                      alt="Mole"
                      className="w-full h-full object-contain select-none pointer-events-none"
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/*<div className="flex items-center justify-between mt-6 gap-2">
          <Button onClick={() => document.documentElement.classList.toggle('neon-boost')}>Toggle Vibe</Button>
        </div>*/}
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(-8px) rotate(0deg); }
          50% { transform: translateY(8px) rotate(2deg); }
          100% { transform: translateY(-8px) rotate(-1deg); }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }

        .mole-hidden { transform: translateY(28px) scale(0.9); opacity: 0; transition: transform 200ms ease, opacity 200ms ease; }
        .mole-pop { transform: translateY(0) scale(1); opacity: 1; transition: transform 200ms cubic-bezier(.2,.9,.22,1), opacity 200ms ease; }

        .neon-boost .bg-white\/5 { background-color: rgba(255,255,255,0.08) !important; }
      `}</style>
    </div>
  );
}
