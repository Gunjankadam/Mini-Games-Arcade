import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * BulletDodge
 *
 * Controls:
 * - Drag / touch / mouse to move the player horizontally (and vertically a bit).
 * - Arrow keys optionally move the player.
 * - Start / Reset buttons.
 *
 * Mechanics:
 * - Bullets spawn in patterns (falling, aimed shots, radial bursts).
 * - Collect power-ups: shield (one hit), slow-time (temporarily slows bullets).
 * - Score increases over time + bonus per collected power-up.
 * - Difficulty ramps up (spawn rate, bullet speed).
 */

type Bullet = { id: number; x: number; y: number; vx: number; vy: number; r: number; color: string; from?: string };
type PowerUp = { id: number; x: number; y: number; type: "shield" | "slow"; r: number; picked?: boolean };

export function BulletDodge(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("bullet_best") || 0));
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [shield, setShield] = useState(false);
  const [slowUntil, setSlowUntil] = useState(0);

  // Game constants
  const W = 520;
  const H = 490;
  const PLAYER_R = 14;
  const START_LIVES = 3;

  // mutable refs for performance
  const playerRef = useRef({ x: W / 2, y: H - 80 });
  const bulletsRef = useRef<Bullet[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const idRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const patternTimerRef = useRef(0);
  const difficultyRef = useRef(0); // grows with time/score
  const scoreRef = useRef(0);

  // helpers
  const rand = (a: number, b: number) => a + Math.random() * (b - a);
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

  // spawn bullet patterns
  function spawnBulletPattern(now: number) {
    const idBase = idRef.current;
    const diff = 1 + difficultyRef.current * 0.08;
    // choose pattern
    const pattern = Math.random() < 0.6 ? "fall" : Math.random() < 0.5 ? "aim" : "radial";

    if (pattern === "fall") {
      // spawn a cluster of falling bullets from top
      const count = 1 + Math.floor(rand(0, 2 + difficultyRef.current * 0.2));
      for (let i = 0; i < count; i++) {
        const r = rand(6, 10);
        const x = rand(30, W - 30);
        const vy = rand(80, 160) * diff;
        bulletsRef.current.push({ id: idRef.current++, x, y: -20 - Math.random()*40, vx: 0, vy, r, color: "#fb7185", from: "top" });
      }
    } else if (pattern === "aim") {
      // bullets fired from left or right aimed toward player
      const side = Math.random() < 0.5 ? -1 : 1;
      const baseY = rand(60, H - 200);
      const shots = 3 + Math.floor(difficultyRef.current * 0.15);
      for (let i = 0; i < shots; i++) {
        const delay = i * 80;
        setTimeout(() => {
          const px = playerRef.current.x;
          const py = playerRef.current.y;
          const sx = side === -1 ? -20 : W + 20;
          const sy = baseY + rand(-20, 20);
          const angle = Math.atan2(py - sy, px - sx);
          const speed = rand(120, 220) * diff;
          bulletsRef.current.push({ id: idRef.current++, x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 8, color: "#60a5fa", from: "aim" });
        }, delay);
      }
    } else {
      // radial burst in center top or around random point
      const cx = rand(120, W - 120);
      const cy = rand(80, H / 2);
      const pieces = 6 + Math.floor(difficultyRef.current * 0.2);
      for (let i = 0; i < pieces; i++) {
        const a = (i / pieces) * Math.PI * 2 + rand(-0.12, 0.12);
        const speed = rand(90, 160) * diff;
        bulletsRef.current.push({ id: idRef.current++, x: cx, y: cy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 7, color: "#f59e0b", from: "radial" });
      }
    }

    // occasional power-up spawn
    if (Math.random() < 0.09) {
      const puType = Math.random() < 0.55 ? "shield" : "slow";
      powerUpsRef.current.push({ id: idRef.current++, x: rand(60, W - 60), y: rand(60, H - 200), type: puType, r: 12 });
    }
  }

  // collision helpers
  function circleRectCollide(cx: number, cy: number, cr: number, rx: number, ry: number, rw: number, rh: number) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy <= cr * cr;
  }
  function circleCircleCollide(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
    const dx = x1 - x2, dy = y1 - y2;
    const r = r1 + r2;
    return dx*dx + dy*dy <= r*r;
  }

  // loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      canvas.width = Math.floor(W * ratio);
      canvas.height = Math.floor(H * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    function step(ts: number) {
      if (!lastRef.current) lastRef.current = ts;
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000);
      lastRef.current = ts;

      // difficulty ramps slowly with time/score
      difficultyRef.current = Math.min(18, Math.floor(scoreRef.current / 120));

      // spawn timers
      if (running) {
        spawnTimerRef.current += dt * 1000;
        patternTimerRef.current += dt * 1000;
        const spawnInterval = Math.max(420 - difficultyRef.current * 8, 180);
        const patternInterval = Math.max(900 - difficultyRef.current * 24, 420);
        if (spawnTimerRef.current >= spawnInterval) {
          // small single bullets from top to keep pressure
          const r = rand(6, 10);
          const x = rand(24, W - 24);
          const vy = rand(80, 160) + difficultyRef.current * 6;
          bulletsRef.current.push({ id: idRef.current++, x, y: -20, vx: 0, vy, r, color: "#fb7185", from: "top" });
          spawnTimerRef.current = 0;
        }
        if (patternTimerRef.current >= patternInterval) {
          spawnBulletPattern(ts);
          patternTimerRef.current = 0;
        }
      }

      const slowActive = performance.now() < slowUntil;

      // update bullets
      const bullets = bulletsRef.current;
      for (const b of bullets) {
        b.x += (slowActive ? b.vx * 0.45 : b.vx) * dt;
        b.y += (slowActive ? b.vy * 0.45 : b.vy) * dt;
      }
      // remove bullets out of range
      bulletsRef.current = bullets.filter(b => b.x > -80 && b.x < W + 80 && b.y > -120 && b.y < H + 120);

      // update powerups (float gently)
      for (const pu of powerUpsRef.current) {
        pu.y += Math.sin(performance.now() / 600 + pu.id) * 0.2;
      }

      // collisions: bullets vs player
      const p = playerRef.current;
      for (const b of bulletsRef.current.slice()) {
        if (circleCircleCollide(p.x, p.y, PLAYER_R, b.x, b.y, b.r)) {
          // hit
          if (shield) {
            // consume shield
            setShield(false);
            // remove bullet
            bulletsRef.current = bulletsRef.current.filter(bb => bb.id !== b.id);
            spawnFlash(b.x, b.y, "#ffffff");
            continue;
          }
          // lose a life
          setLives(prev => {
            const next = prev - 1;
            if (next <= 0) {
              // game over
              setRunning(false);
              setGameOver(true);
              if (scoreRef.current > best) {
                localStorage.setItem("bullet_best", String(scoreRef.current));
                setBest(scoreRef.current);
              }
            }
            return next;
          });
          // small penalty
          scoreRef.current = Math.max(0, scoreRef.current - 30);
          setScore(scoreRef.current);
          // remove bullet
          bulletsRef.current = bulletsRef.current.filter(bb => bb.id !== b.id);
          spawnFlash(b.x, b.y, "#ff4444");
        }
      }

      // collisions: player vs powerups
      for (const pu of powerUpsRef.current.slice()) {
        if (pu.picked) continue;
        if (circleCircleCollide(p.x, p.y, PLAYER_R, pu.x, pu.y, pu.r)) {
          pu.picked = true;
          if (pu.type === "shield") {
            setShield(true);
            scoreRef.current += 20;
            setScore(scoreRef.current);
            spawnFlash(pu.x, pu.y, "#60a5fa");
          } else {
            setSlowUntil(performance.now() + 1400);
            scoreRef.current += 30;
            setScore(scoreRef.current);
            spawnFlash(pu.x, pu.y, "#f59e0b");
          }
        }
      }
      powerUpsRef.current = powerUpsRef.current.filter(p => !p.picked && p.x > -40 && p.x < W + 40);

      // incremental score over time
      if (running) {
        scoreRef.current += Math.round(16 * dt);
        setScore(scoreRef.current);
      }

      // draw
      ctx.clearRect(0, 0, W, H);
      // bg
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#061018");
      g.addColorStop(1, "#07132a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      // arena border
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 2;
      roundRect(ctx, 4, 4, W - 8, H - 8, 12);
      ctx.stroke();

      // draw bullets
      for (const b of bulletsRef.current) {
        ctx.beginPath();
        ctx.fillStyle = b.color;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
        // small glow
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // draw powerups
      for (const pu of powerUpsRef.current) {
        ctx.save();
        if (pu.type === "shield") {
          // cyan hex / shield icon (simple)
          ctx.fillStyle = "#60a5fa";
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "12px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("S", pu.x, pu.y + 4);
        } else {
          ctx.fillStyle = "#f59e0b";
          ctx.beginPath();
          ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "12px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("T", pu.x, pu.y + 4);
        }
        ctx.restore();
      }

      // draw player
      // shadow
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.arc(p.x + 6, p.y + 8, PLAYER_R + 3, 0, Math.PI * 2);
      ctx.fill();
      // main
      ctx.beginPath();
      ctx.fillStyle = "#34d399";
      ctx.arc(p.x, p.y, PLAYER_R, 0, Math.PI * 2);
      ctx.fill();
      // shield ring
      if (shield) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(96,165,250,0.9)";
        ctx.lineWidth = 3;
        ctx.arc(p.x, p.y, PLAYER_R + 8, 0, Math.PI * 2);
        ctx.stroke();
      }


      if (!running && gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", W / 2, H / 2 - 18);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(`Score: ${scoreRef.current}`, W / 2, H / 2 + 8);
      }

      if (running) rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, gameOver, best, lives, shield, slowUntil]);

  // rounding helper for rounded rect
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 8) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // spawn small flash particles (simple)
  function spawnFlash(x: number, y: number, color = "#fff") {
    // quick canvas flash using a tiny circle rendered by main loop via pushing a bullet-like visual
    // to keep component compact, we'll push a short-lived power-up-like object that will be drawn as flash once
    powerUpsRef.current.push({ id: idRef.current++, x, y, type: "shield", r: 6, picked: true });
    setTimeout(() => {
      powerUpsRef.current = powerUpsRef.current.filter(p => !(p.x === x && p.y === y && p.r === 6));
    }, 220);
  }

  // input handlers: drag player and arrow keys
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dragging = false;

    const getPos = (ev: PointerEvent | TouchEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in ev && ev.touches.length) {
        const t = ev.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      } else if ("clientX" in ev) {
        const e = ev as PointerEvent | MouseEvent;
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      return { x: 0, y: 0 };
    };

    const onDown = (e: PointerEvent) => {
      e.preventDefault();
      dragging = true;
      const p = getPos(e);
      playerRef.current.x = clamp(p.x, PLAYER_R + 6, W - PLAYER_R - 6);
      playerRef.current.y = clamp(p.y, PLAYER_R + 6, H - PLAYER_R - 6);
      // start game if not running
      if (!running) start();
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const p = getPos(e);
      playerRef.current.x = clamp(p.x, PLAYER_R + 6, W - PLAYER_R - 6);
      playerRef.current.y = clamp(p.y, PLAYER_R + 6, H - PLAYER_R - 6);
    };
    const onUp = () => { dragging = false; };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // touch fallback
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const p = getPos(e);
      playerRef.current.x = clamp(p.x, PLAYER_R + 6, W - PLAYER_R - 6);
      playerRef.current.y = clamp(p.y, PLAYER_R + 6, H - PLAYER_R - 6);
      if (!running) start();
    }, { passive: false });

    // keyboard
    const onKey = (e: KeyboardEvent) => {
      if (!running) {
        if (e.key === " " || e.key === "Enter") { start(); return; }
      }
      if (e.key === "ArrowLeft") playerRef.current.x = clamp(playerRef.current.x - 24, PLAYER_R + 6, W - PLAYER_R - 6);
      if (e.key === "ArrowRight") playerRef.current.x = clamp(playerRef.current.x + 24, PLAYER_R + 6, W - PLAYER_R - 6);
      if (e.key === "ArrowUp") playerRef.current.y = clamp(playerRef.current.y - 18, PLAYER_R + 6, H - PLAYER_R - 6);
      if (e.key === "ArrowDown") playerRef.current.y = clamp(playerRef.current.y + 18, PLAYER_R + 6, H - PLAYER_R - 6);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("touchstart", () => {});
      window.removeEventListener("keydown", onKey);
    };
  }, [running]);

  // start/reset functions
  function start() {
    bulletsRef.current = [];
    powerUpsRef.current = [];
    idRef.current = 1;
    spawnTimerRef.current = 0;
    patternTimerRef.current = 0;
    difficultyRef.current = 0;
    playerRef.current = { x: W / 2, y: H - 80 };
    scoreRef.current = 0;
    setScore(0);
    setLives(START_LIVES);
    setGameOver(false);
    setShield(false);
    setSlowUntil(0);
    setRunning(true);
    lastRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame((t) => (lastRef.current = t));
  }

  function reset() {
    setRunning(false);
    setGameOver(false);
    bulletsRef.current = [];
    powerUpsRef.current = [];
    setLives(START_LIVES);
    setScore(0);
    scoreRef.current = 0;
    setShield(false);
    setSlowUntil(0);
  }

  return (
    <div className="h-[620px] max-w-2xl mx-auto p-4 bg-black rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-display text-white"></h3>
          <div className="text-xs text-muted-foreground">𝙳𝚛𝚊𝚐 𝚝𝚘 𝚖𝚘𝚟𝚎 • 𝙰𝚟𝚘𝚒𝚍 𝚋𝚞𝚕𝚕𝚎𝚝𝚜 • 𝙿𝚒𝚌𝚔 𝚙𝚘𝚠𝚎𝚛-𝚞𝚙𝚜</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="neon" onClick={() => start()} disabled={running}>Start</Button>
          <Button variant="neon" onClick={() => reset()}>Reset</Button>
        </div>
      </div>

      <div className="h-[515px] bg-card p-3 rounded-xl border border-border">
        <div className="rounded-lg overflow-hidden border border-white/6">
          <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", touchAction: "none" }} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">𝚂𝚌𝚘𝚛𝚎: <span className="font-bold text-primary">{score}</span></div>
          <div className="text-sm text-muted-foreground">𝙱𝚎𝚜𝚝: <span className="font-bold text-primary">{best}</span></div>
          <div className="text-sm text-muted-foreground">𝙻𝚒𝚟𝚎𝚜: <span className="font-bold">{lives}</span></div>
          <div className="text-sm text-muted-foreground">𝚂𝚑𝚒𝚎𝚕𝚍: <span className="font-bold">{shield ? "ON" : "OFF"}</span></div>
        </div>
      </div>
    </div>
  );
}
