import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Gravity Sway Runner
 *
 * Controls:
 * - Tap / Click / Space / ArrowUp -> flip gravity (instant)
 * - Start / Reset buttons
 *
 * Mechanics:
 * - Player is a small square that is constantly pushed by gravity direction
 * - Obstacles are boxes on ground/ceiling that move leftwards
 * - Passing each obstacle increases score; hitting obstacle = game over
 * - Difficulty ramps: spawnInterval decreases, obstacle height increases over time
 */

type Obstacle = { x: number; y: number; width: number; height: number; passed: boolean };

export function GravitySwayRunner(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // game state
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gravityDown, setGravityDown] = useState(true);

  // world params
  const WIDTH = 1135;
  const HEIGHT = 200;
  const DPR = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

  // player physics
  const player = useRef({ x: WIDTH * 0.22, y: HEIGHT / 2, vy: 0, size: 18 });

  // obstacles & timing
  const obstaclesRef = useRef<Obstacle[]>([]);
  const spawnTimerRef = useRef(0);
  const spawnIntervalRef = useRef(1800);
  const elapsedRef = useRef(0);

  // difficulty ramp parameters
  const minHeight = 80;
  const maxHeight = 110;
  const minSpawn = 600;
  const maxSpawn = 700;

  // refs for current state to avoid stale closures
  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);
  const gravityDownRef = useRef(gravityDown);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  useEffect(() => {
    gravityDownRef.current = gravityDown;
  }, [gravityDown]);

  useEffect(() => {
    resetGame();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function resetGame() {
    player.current = { x: WIDTH * 0.22, y: HEIGHT / 2, vy: 0, size: 18 };
    obstaclesRef.current = [];
    spawnTimerRef.current = 0;
    spawnIntervalRef.current = maxSpawn;
    elapsedRef.current = 0;
    setScore(0);
    setGameOver(false);
    setRunning(false);
    setGravityDown(true);
    setTimeout(() => drawFrameStatic(), 10);
  }

  function spawnObstacle() {
    const t = Math.min(1, elapsedRef.current / 30000);
    const height = Math.round(minHeight + t * (maxHeight - minHeight));
    
    // Randomly place on ground or ceiling
    const onGround = Math.random() > 0.5;
    const y = onGround ? HEIGHT - height : 0;
    const width = 40 + Math.random() * 30; // varied width
    
    obstaclesRef.current.push({ 
      x: WIDTH + width + 10, 
      y, 
      width, 
      height,
      passed: false
    });
  }

  function flipGravity() {
    if (!runningRef.current) {
      startGame();
      return;
    }
    if (gameOverRef.current) {
      resetGame();
      setTimeout(() => startGame(), 50);
      return;
    }
    setGravityDown(g => !g);
    player.current.vy = gravityDownRef.current ? -320 : 320;
  }

  function startGame() {
    setRunning(true);
    setGameOver(false);
    spawnTimerRef.current = 0;
    elapsedRef.current = 0;
    player.current = { x: WIDTH * 0.22, y: HEIGHT / 2, vy: 0, size: 18 };
    obstaclesRef.current = [];
    setScore(0);
    spawnObstacle();
    lastTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  function loop(ts: number) {
    if (!lastTimeRef.current) lastTimeRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTimeRef.current) / 1000);
    lastTimeRef.current = ts;

    elapsedRef.current += dt * 1000;
    spawnTimerRef.current += dt * 1000;

    const ramp = Math.min(1, elapsedRef.current / 60000);
    spawnIntervalRef.current = Math.round(maxSpawn - ramp * (maxSpawn - minSpawn));

    if (spawnTimerRef.current >= spawnIntervalRef.current) {
      spawnObstacle();
      spawnTimerRef.current = 0;
    }

    const GRAV = 900;
    const vy = player.current.vy + (gravityDownRef.current ? GRAV * dt : -GRAV * dt);
    player.current.vy = vy;
    player.current.y += vy * dt;

    const margin = 6;
    if (player.current.y < player.current.size / 2 + margin) {
      player.current.y = player.current.size / 2 + margin;
      player.current.vy = 0;
    }
    if (player.current.y > HEIGHT - player.current.size / 2 - margin) {
      player.current.y = HEIGHT - player.current.size / 2 - margin;
      player.current.vy = 0;
    }

    // move obstacles
    const speedBase = 180;
    const speed = speedBase + ramp * 150;
    for (const obs of obstaclesRef.current) {
      obs.x -= speed * dt;
    }
    
    // remove offscreen obstacles & count score when passed
    for (const obs of obstaclesRef.current) {
      if (!obs.passed && obs.x + obs.width < player.current.x) {
        obs.passed = true;
        setScore(s => {
          const next = s + 1;
          setBest(b => Math.max(b, next));
          return next;
        });
      }
    }
    
    // clean up offscreen obstacles
    obstaclesRef.current = obstaclesRef.current.filter(obs => obs.x + obs.width > -50);

    // collision check (AABB)
    const px = player.current.x;
    const py = player.current.y;
    const ps = player.current.size;
    let collided = false;
    
    for (const obs of obstaclesRef.current) {
      // AABB collision
      const playerLeft = px - ps / 2;
      const playerRight = px + ps / 2;
      const playerTop = py - ps / 2;
      const playerBottom = py + ps / 2;
      
      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;
      const obsTop = obs.y;
      const obsBottom = obs.y + obs.height;
      
      if (playerRight > obsLeft && 
          playerLeft < obsRight && 
          playerBottom > obsTop && 
          playerTop < obsBottom) {
        collided = true;
        break;
      }
    }

    if (collided) {
      setGameOver(true);
      setRunning(false);
      lastTimeRef.current = null;
      drawFrame();
      return;
    }

    drawFrame();

    if (runningRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = DPR;
    if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    ctx.fillStyle = "#04060a";
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = "#0b2a33";
    for (let gx = 0; gx < rect.width; gx += 28) {
      ctx.fillRect(gx, 0, 2, rect.height);
    }
    for (let gy = 0; gy < rect.height; gy += 28) {
      ctx.fillRect(0, gy, rect.width, 1);
    }
    ctx.restore();

    // draw obstacles (runner style - boxes on ground/ceiling)
    for (const obs of obstaclesRef.current) {
      // determine if on ground or ceiling by y position
      const onGround = obs.y > HEIGHT / 2;
      
      // neon glow behind
      ctx.fillStyle = "rgba(14,165,164,0.08)";
      ctx.fillRect(obs.x - 6, obs.y - 4, obs.width + 12, obs.height + 8);
      
      // main obstacle body
      ctx.fillStyle = "#0ea5a4";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      
      // inner darker core for depth
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(obs.x + 4, obs.y + 4, Math.max(2, obs.width - 8), Math.max(2, obs.height - 8));
      
      // top highlight
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      if (onGround) {
        ctx.fillRect(obs.x, obs.y, obs.width, 3);
      } else {
        ctx.fillRect(obs.x, obs.y + obs.height - 3, obs.width, 3);
      }
      
      // rim glow
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x + 0.5, obs.y + 0.5, obs.width - 1, obs.height - 1);
    }

    const pc = player.current;
    ctx.save();
    ctx.translate(pc.x, pc.y);
    ctx.fillStyle = "rgba(251,113,133,0.14)";
    ctx.fillRect(-pc.size * 0.9, -pc.size * 0.9, pc.size * 1.8, pc.size * 1.8);
    ctx.fillStyle = "#fb7185";
    ctx.fillRect(-pc.size / 2, -pc.size / 2, pc.size, pc.size);
    ctx.fillStyle = "#fff";
    if (gravityDownRef.current) {
      ctx.fillRect(-3, pc.size / 4 - 2, 6, 4);
    } else {
      ctx.fillRect(-3, -pc.size / 4 - 2, 6, 4);
    }
    ctx.restore();

  

    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", rect.width / 2, rect.height / 2 - 6);
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(`Score: ${score}`, rect.width / 2, rect.height / 2 + 20);
      ctx.textAlign = "left";
    }
  }

  function drawFrameStatic() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    drawFrame();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "ArrowUp" || e.key === "w") {
        e.preventDefault();
        flipGravity();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    drawFrameStatic();
  }, []);

  return (
    <div className="w-[1200px] h-[320px] -mx-auto p-4 bg-black rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xl font-display text-white"></h3>
          <div className="text-xs text-muted-foreground">𝚃𝚊𝚙 / 𝚂𝚙𝚊𝚌𝚎 𝚝𝚘 𝚏𝚕𝚒𝚙 𝚐𝚛𝚊𝚟𝚒𝚝𝚢 • 𝚂𝚞𝚛𝚟𝚒𝚟𝚎 𝚊𝚗𝚍 𝚙𝚊𝚜𝚜 𝚘𝚋𝚜𝚝𝚊𝚌𝚕𝚎𝚜</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => startGame()} disabled={running && !gameOver}>Start</Button>
          <Button variant="outline" onClick={() => { resetGame(); }}>Reset</Button>
        </div>
      </div>

      <div 
        className="w-[1164px] h-[230px] bg-card p-3 rounded-xl border border-border cursor-pointer"
        onClick={flipGravity}
        onTouchStart={(e) => {
          e.preventDefault();
          flipGravity();
        }}
      >
        <div className="rounded-lg overflow-hidden border border-white/6">
          <canvas 
            ref={canvasRef} 
            style={{ 
              width: WIDTH, 
              height: HEIGHT, 
              display: "block", 
              touchAction: "none"
            }} 
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">𝚂𝚌𝚘𝚛𝚎: <span className="font-bold text-primary">{score}</span></div>
          <div className="text-sm text-muted-foreground">𝙱𝚎𝚜𝚝: <span className="font-bold text-primary">{best}</span></div>
          <div className="text-sm text-muted-foreground">𝙶𝚛𝚊𝚟𝚒𝚝𝚢: <span className="font-bold">{gravityDown ? "Down ↓" : "Up ↑"}</span></div>
        </div>
      </div>
    </div>
  );
}