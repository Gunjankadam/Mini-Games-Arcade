import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * SliceDash - fast swipe / slice mini-game
 *
 * Controls:
 * - Tap & drag (mouse or touch) to slice falling objects.
 * - Start / Reset buttons.
 *
 * Mechanics:
 * - Objects spawn from top and fall.
 * - Slicing an object (segment vs circle collision) destroys it and increases score.
 * - Combos increase multiplier; misses reduce combo.
 * - Particles + floating points on slice.
 * - Bomb penalty: -500 points (no game over)
 * - Miss 10 objects: Game Over
 */

type Fruit = {
  id: number;
  x: number;
  y: number;
  r: number;
  vy: number;
  color: string;
  sliced: boolean;
  spawnAt: number;
  kind: "circle" | "bomb";
  counted: boolean; // track if already counted as miss
};

type Point = { x: number; y: number; t: number };

export function SliceDash(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const fruitsRef = useRef<Fruit[]>([]);
  const particlesRef = useRef<any[]>([]);
  const swipeRef = useRef<Point[]>([]);
  const idRef = useRef(1);
  const spawnTimerRef = useRef(0);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45); // seconds
  const timerRef = useRef<number | null>(null);
  const comboRef = useRef(0);
  const comboTimerRef = useRef(0);
  const comboDecay = 1400; // ms to keep combo alive
  const [combo, setCombo] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [missedCount, setMissedCount] = useState(0);
  const missedRef = useRef(0);
  
  const spawnIntervalBase = 900; // ms
  const GAME_W = 480;
  const GAME_H = 500;
  const MAX_MISSES = 10;

  // refs for state to avoid stale closures
  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  // palette of neon-ish colors
  const COLORS = ["#fb7185", "#60a5fa", "#34d399", "#f59e0b", "#a78bfa", "#f472b6"];

  // utility: distance from point to segment
  function distPointSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const lx = x2 - x1;
    const ly = y2 - y1;
    const l2 = lx * lx + ly * ly;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * lx + (py - y1) * ly) / l2;
    t = Math.max(0, Math.min(1, t));
    const projx = x1 + t * lx;
    const projy = y1 + t * ly;
    return Math.hypot(px - projx, py - projy);
  }

  // spawn fruit
  function spawnFruit(now: number) {
    const id = idRef.current++;
    const r = 12 + Math.random() * 22; // radius
    const x = r + Math.random() * (GAME_W - r * 2);
    const y = -r - 10;
    const vy = 90 + Math.random() * 160 + (Math.random() < 0.08 ? 140 : 0); // occasional fast ones
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const kind = Math.random() < 0.20 ? "bomb" : "circle"; // small bomb chance
    fruitsRef.current.push({ id, x, y, r, vy, color, sliced: false, spawnAt: now, kind, counted: false });
  }

  // create particle burst at (x,y)
  function spawnParticles(x: number, y: number, color: string, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 180;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 600 + Math.random() * 600,
        size: 2 + Math.random() * 3,
        color,
        born: performance.now(),
      });
    }
  }

  // slice detection: check swipe segments against fruits
  function processSlicing(now: number) {
    const fruits = fruitsRef.current;
    const swipe = swipeRef.current;
    if (swipe.length < 2) return;

    // build segments (only recent points, say last 280ms)
    const cutoff = now - 280;
    const pts = swipe.filter(p => p.t >= cutoff);
    if (pts.length < 2) return;

    for (let f of fruits) {
      if (f.sliced) continue;
      // ignore very new fruit spawn briefly to prevent accidental immediate slice
      if (now - f.spawnAt < 80) continue;

      // check any segment
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const d = distPointSegment(f.x, f.y, a.x, a.y, b.x, b.y);
        if (d <= f.r * 0.9) {
          // sliced!
          f.sliced = true;
          // explode
          spawnParticles(f.x, f.y, f.color, 14);
          // score calculation
          if (f.kind === "bomb") {
            // BOMB: -500 points, distinct particles, but game continues
            spawnParticles(f.x, f.y, "#ff0000", 26);
            setScore(s => Math.max(0, s - 500));
            // reset combo
            comboRef.current = 0;
            setCombo(0);
            setMultiplier(1);
          } else {
            // normal fruit: increase combo & multiplier
            comboRef.current++;
            setCombo(comboRef.current);
            comboTimerRef.current = now;
            // multiplier grows per combo stage
            const mult = 1 + Math.floor(Math.min(comboRef.current, 20) / 4);
            setMultiplier(mult);
            // points base
            const base = Math.round(5 + f.r * 0.25);
            const gained = base * mult;
            setScore(s => {
              const next = s + gained;
              setBest(b => Math.max(b, next));
              return next;
            });
          }
          break;
        }
      }
    }
  }

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPR scaling
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.style.width = `${GAME_W}px`;
      canvas.style.height = `${GAME_H}px`;
      canvas.width = Math.floor(GAME_W * ratio);
      canvas.height = Math.floor(GAME_H * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    function step(ts: number) {
      if (!lastRef.current) lastRef.current = ts;
      const dt = Math.min(0.05, (ts - lastRef.current) / 1000);
      lastRef.current = ts;

      // update spawn timer
      if (runningRef.current) {
        spawnTimerRef.current += dt * 1000;
        // spawn interval reduces slightly as score increases
        const ramp = Math.min(0.9, Math.sqrt(score / 200) * 0.25);
        const spawnInterval = spawnIntervalBase * (1 - ramp);
        if (spawnTimerRef.current >= spawnInterval) {
          spawnFruit(ts);
          spawnTimerRef.current = 0;
        }
      }

      // update fruits
      const fruits = fruitsRef.current;
      for (let f of fruits) {
        if (!f.sliced) {
          f.y += f.vy * dt;
          // optional slight wobble
          f.x += Math.sin((ts + f.id * 37) / 300) * 6 * dt;
          
          // Check if missed (fell off screen without being sliced)
          if (f.y > GAME_H + f.r && !f.counted && f.kind !== "bomb") {
            f.counted = true;
            missedRef.current++;
            setMissedCount(missedRef.current);
            
            // Reset combo on miss
            comboRef.current = 0;
            setCombo(0);
            setMultiplier(1);
            
            // Check game over condition
            if (missedRef.current >= MAX_MISSES) {
              setGameOver(true);
              setRunning(false);
            }
          }
        } else {
          // when sliced, fall apart (fade by vy)
          f.y += 180 * dt;
        }
      }
      // remove offscreen fruits
      fruitsRef.current = fruits.filter(f => f.y < GAME_H + 120 && !(f.sliced && f.y > GAME_H + 80 && f.kind !== "bomb"));

      // update particles
      const parts = particlesRef.current;
      for (let p of parts) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 300 * dt; // gravity on particles
      }
      particlesRef.current = parts.filter(p => performance.now() - p.born < p.life);

      // swipe decays (keep short)
      const now = performance.now();
      swipeRef.current = swipeRef.current.filter(pt => now - pt.t < 350);

      // combo decay
      if (comboRef.current > 0 && now - comboTimerRef.current > comboDecay) {
        comboRef.current = 0;
        setCombo(0);
        setMultiplier(1);
      } else {
        // ensure state reflects ref
        setCombo(comboRef.current);
      }

      // process slicing from current swipe
      if (runningRef.current) processSlicing(now);

      // draw
      // background
      ctx.clearRect(0, 0, GAME_W, GAME_H);
      ctx.fillStyle = "#04060a";
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // subtle grid / neon gradient
      const g = ctx.createLinearGradient(0, 0, GAME_W, GAME_H);
      g.addColorStop(0, "rgba(99,102,241,0.02)");
      g.addColorStop(1, "rgba(249,115,22,0.02)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      // draw fruits (back to front)
      for (const f of fruitsRef.current) {
        if (f.sliced) {
          // sliced visual (small pieces already particles) draw faint halo
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.ellipse(f.x, f.y, f.r * 0.9, f.r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          continue;
        }

        if (f.kind === "bomb") {
          // draw bomb as white square
          const size = Math.max(12, f.r);
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.globalAlpha = 0.95;
          const half = size / 2;
          // subtle glow
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.fillRect(f.x - half - 6, f.y - half - 6, size + 12, size + 12);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(f.x - half, f.y - half, size, size);
          ctx.restore();
        } else {
          // glow
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r + 8, 0, Math.PI * 2);
          ctx.fillStyle = f.color;
          ctx.globalAlpha = 0.12;
          ctx.fill();
          ctx.globalAlpha = 1;

          // main circle
          ctx.fillStyle = f.color;
          ctx.beginPath();
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
          ctx.fill();

          // core shine
          ctx.fillStyle = "rgba(255,255,255,0.12)";
          ctx.beginPath();
          ctx.ellipse(f.x - f.r * 0.28, f.y - f.r * 0.32, f.r * 0.45, f.r * 0.25, -0.4, 0, Math.PI * 2);
          ctx.fill();

          // rim
          ctx.strokeStyle = "rgba(255,255,255,0.06)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // draw particles
      for (const p of particlesRef.current) {
        const lifeFrac = Math.max(0, 1 - (performance.now() - p.born) / p.life);
        ctx.globalAlpha = lifeFrac;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeFrac, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // draw swipe trail
      const pts = swipeRef.current;
      if (pts.length > 1) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        // outer glow
        ctx.strokeStyle = "rgba(99,102,241,0.12)";
        ctx.lineWidth = 18;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        // core
        ctx.strokeStyle = "rgba(99,102,241,0.95)";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }

      

      // Game over overlay
      if (gameOverRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, GAME_W, GAME_H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", GAME_W / 2, GAME_H / 2 - 20);
        ctx.font = "18px system-ui, sans-serif";
        ctx.fillText(`Final Score: ${score}`, GAME_W / 2, GAME_H / 2 + 20);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fillText(`Missed ${missedRef.current} objects`, GAME_W / 2, GAME_H / 2 + 50);
        ctx.textAlign = "left";
      }

      // check game end condition (time)
      if (runningRef.current && timeLeft <= 0) {
        setRunning(false);
        setGameOver(true);
        // stop loop by not requesting next frame
      } else {
        rafRef.current = requestAnimationFrame(step);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, score, best, timeLeft]);

  // timer management
  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [running]);

  // input handlers (pointer)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let pointerDown = false;

    const getPos = (e: PointerEvent | TouchEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e && e.touches.length > 0) {
        const t = e.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      } else if ("clientX" in e) {
        const ev = e as PointerEvent | MouseEvent;
        return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
      }
      return { x: 0, y: 0 };
    };

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      pointerDown = true;
      swipeRef.current = [];
      const p = getPos(e);
      swipeRef.current.push({ x: p.x, y: p.y, t: performance.now() });
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointerDown) return;
      e.preventDefault();
      const p = getPos(e);
      swipeRef.current.push({ x: p.x, y: p.y, t: performance.now() });
      // limit swipe length
      if (swipeRef.current.length > 28) swipeRef.current.shift();
    };
    const onPointerUp = (e: PointerEvent) => {
      pointerDown = false;
      // clear swipe after a short delay to allow slicing detection
      setTimeout(() => {
        swipeRef.current = [];
      }, 200);
    };

    // support pointer events where available
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // fallback for touch/mouse (rare)
    canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = (e as TouchEvent).touches[0];
      const rect = canvas.getBoundingClientRect();
      pointerDown = true;
      swipeRef.current = [{ x: t.clientX - rect.left, y: t.clientY - rect.top, t: performance.now() }];
    }, { passive: false });
    window.addEventListener("touchmove", (e) => {
      if (!pointerDown) return;
      e.preventDefault();
      const t = (e as TouchEvent).touches[0];
      const rect = canvas.getBoundingClientRect();
      swipeRef.current.push({ x: t.clientX - rect.left, y: t.clientY - rect.top, t: performance.now() });
    }, { passive: false });
    window.addEventListener("touchend", () => { pointerDown = false; swipeRef.current = []; }, { passive: false });

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  // start / reset helpers
  function start() {
    setScore(0);
    setTimeLeft(45);
    setMissedCount(0);
    missedRef.current = 0;
    fruitsRef.current = [];
    particlesRef.current = [];
    swipeRef.current = [];
    comboRef.current = 0;
    setCombo(0);
    setMultiplier(1);
    setGameOver(false);
    setRunning(true);
    lastRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame((t) => {
      lastRef.current = t;
    });
  }

  function reset() {
    setRunning(false);
    setGameOver(false);
    setScore(0);
    setTimeLeft(45);
    setMissedCount(0);
    missedRef.current = 0;
    fruitsRef.current = [];
    particlesRef.current = [];
    swipeRef.current = [];
    comboRef.current = 0;
    setCombo(0);
    setMultiplier(1);
  }

  return (
    <div className="h-[620px] max-w-xl mx-auto p-4 bg-black rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-display text-white"></h3>
          <div className="text-xs text-muted-foreground">𝚂𝚠𝚒𝚙𝚎 𝚝𝚘 𝚜𝚕𝚒𝚌𝚎 ✦ 𝚊𝚟𝚘𝚒𝚍 𝚋𝚘𝚖𝚋𝚜 (-𝟻𝟶𝟶𝚙𝚝𝚜) ✦ 𝚍𝚘𝚗'𝚝 𝚖𝚒𝚜𝚜 𝟷𝟶!</div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" onClick={() => start()} disabled={running && !gameOver}>Start</Button>
          <Button variant="outline" onClick={() => reset()}>Reset</Button>
        </div>
      </div>

      <div className="h-[520px] bg-card p-3 rounded-xl border border-border">
        <div className="rounded-lg overflow-hidden border border-white/6">
          <canvas ref={canvasRef} style={{ width: GAME_W, height: GAME_H, display: "block", touchAction: "none" }} />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            𝚂𝚌𝚘𝚛𝚎: <span className="font-bold text-primary">{score}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            𝙱𝚎𝚜𝚝: <span className="font-bold text-primary">{best}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            𝙼𝚒𝚜𝚜𝚎𝚍: <span className={`font-bold ${missedCount >= MAX_MISSES - 3 ? 'text-red-500' : 'text-white'}`}>{missedCount}/{MAX_MISSES}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            𝙲𝚘𝚖𝚋𝚘: <span className="font-bold text-cyan-400">{combo}</span> ×{multiplier}
          </div>
        </div>
      </div>
    </div>
  );
}