import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';

const GRID_SIZE = 15;
const INITIAL_SPEED = 150;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type Position = { x: number; y: number };

export function Snake() {
  const [snake, setSnake] = useState<Position[]>([{ x: 7, y: 7 }]);
  const [food, setFood] = useState<Position>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const generateFood = useCallback(() => {
    const newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    setFood(newFood);
  }, []);

  const resetGame = () => {
    setSnake([{ x: 7, y: 7 }]);
    setDirection('RIGHT');
    setIsGameOver(false);
    setScore(0);
    setIsPlaying(true);
    generateFood();
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying) return;
      switch (e.key) {
        case 'ArrowUp':
          if (direction !== 'DOWN') setDirection('UP');
          break;
        case 'ArrowDown':
          if (direction !== 'UP') setDirection('DOWN');
          break;
        case 'ArrowLeft':
          if (direction !== 'RIGHT') setDirection('LEFT');
          break;
        case 'ArrowRight':
          if (direction !== 'LEFT') setDirection('RIGHT');
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [direction, isPlaying]);

  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const moveSnake = () => {
      setSnake(prev => {
        const head = { ...prev[0] };
        switch (direction) {
          case 'UP': head.y -= 1; break;
          case 'DOWN': head.y += 1; break;
          case 'LEFT': head.x -= 1; break;
          case 'RIGHT': head.x += 1; break;
        }

        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prev;
        }

        if (prev.some(segment => segment.x === head.x && segment.y === head.y)) {
          setIsGameOver(true);
          setIsPlaying(false);
          return prev;
        }

        const newSnake = [head, ...prev];
        if (head.x === food.x && head.y === food.y) {
          setScore(s => s + 10);
          generateFood();
        } else {
          newSnake.pop();
        }
        return newSnake;
      });
    };

    const interval = setInterval(moveSnake, INITIAL_SPEED);
    return () => clearInterval(interval);
  }, [direction, food, isPlaying, isGameOver, generateFood]);

  return (
    <div className="h-[600px] flex items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 -z-10 animate-float bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-500 opacity-40 mix-blend-screen filter blur-3xl"></div>

      <div className="max-w-md w-full rounded-3xl p-6 backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h2 className="text-2xl font-display text-white"></h2>
          <div className="flex gap-2">
            <Button variant={isPlaying ? 'neon' : undefined} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <Button variant="neon" onClick={resetGame}>Restart</Button>
          </div>
        </div>

        <div className="flex items-center gap-8 text-lg mb-4">
          <span className="text-muted-foreground">𝐒𝐂𝐎𝐑𝐄: <span className="text-primary font-bold">{score}</span></span>
          {isGameOver && <div className="text-2xl font-display text-destructive">𝐆𝐀𝐌𝐄 𝐎𝐕𝐄𝐑!</div>}
        </div>

        <div 
          className="grid gap-0.5 p-2 bg-card rounded-xl border-2 border-border mx-auto"
          style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1.5rem)` }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
            const x = index % GRID_SIZE;
            const y = Math.floor(index / GRID_SIZE);
            const isSnake = snake.some(s => s.x === x && s.y === y);
            const isHead = snake[0]?.x === x && snake[0]?.y === y;
            const isFood = food.x === x && food.y === y;

            return (
              <div
                key={index}
                className={`w-6 h-6 rounded-sm transition-colors ${
                  isHead ? 'bg-neon-cyan shadow-[0_0_10px_hsl(var(--neon-cyan))]' :
                  isSnake ? 'bg-neon-green' :
                  isFood ? 'bg-neon-pink shadow-[0_0_10px_hsl(var(--neon-pink))]' :
                  'bg-muted/30'
                }`}
              />
            );
          })}
        </div>

        <p className="text-muted-foreground text-sm mt-4">𝚄𝚜𝚎 𝚊𝚛𝚛𝚘𝚠 𝚔𝚎𝚢𝚜 𝚝𝚘 𝚖𝚘𝚟𝚎 </p>

        {/* <div className="flex items-center justify-between mt-6 gap-2">
          <Button onClick={() => document.documentElement.classList.toggle('neon-boost')}>Toggle Vibe</Button>
        </div>*/}
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(-10px) rotate(0deg); }
          50% { transform: translateY(10px) rotate(2deg); }
          100% { transform: translateY(-10px) rotate(-1deg); }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }

        .neon-boost .bg-white\\/5 { background-color: rgba(255,255,255,0.08) !important; }
        .neon-boost .text-cyan-300 { text-shadow: 0 0 12px rgba(56,189,248,0.6); }
        .neon-boost .text-pink-300 { text-shadow: 0 0 12px rgba(236,72,153,0.6); }
      `}</style>
    </div>
  );
}
