import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

export function FlappyBird(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("flappy_best") || 0));
  const [gameOver, setGameOver] = useState(false);

  // Game constants (tweakable)
  const BG_COLOR = "#081018";
  const PIPE_COLOR = "#0ea5a4"; // neon-cyan
  const BIRD_COLOR = "#fb7185"; // neon-pink
  const GRAVITY = 900; // px/s^2
  const JUMP_V = -330; // px/s (instantaneous velocity applied on flap)
  const PIPE_SPEED = 160; // px/s
  const PIPE_INTERVAL = 1200; // ms between pipes
  const GAP_SIZE = 140; // px gap between top/bottom pipe
  const PIPE_WIDTH = 60; // px
  const BIRD_RADIUS = 14; // px
  const FLOOR_PADDING = 24; // px bottom safe margin

  // mutable refs used by loop
  const stateRef = useRef({
    birdY: 150,
    birdV: 0,
    pipes: [] as Array<{ x: number; gapY: number }>,
    lastPipeTime: 0,
    elapsed: 0,
    lastFrame: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    scoreRecordedPipes: new Set<number>(),
  });

  // helpers
  const resetGameState = useCallback((w = 480, h = 640) => {
    stateRef.current = {
      birdY: h / 3,
      birdV: 0,
      pipes: [],
      lastPipeTime: performance.now(),
      elapsed: 0,
      lastFrame: performance.now(),
      canvasWidth: w,
      canvasHeight: h,
      scoreRecordedPipes: new Set<number>(),
    };
    setScore(0);
    setGameOver(false);
  }, []);

  // spawn a pipe
  const spawnPipe = useCallback((w: number, h: number) => {
    const margin = 60;
    const minGapY = margin + GAP_SIZE / 2;
    const maxGapY = h - margin - GAP_SIZE / 2 - FLOOR_PADDING;
    const gapY = Math.floor(Math.random() * (maxGapY - minGapY + 1)) + minGapY;
    stateRef.current.pipes.push({ x: w + PIPE_WIDTH, gapY });
  }, []);

  // handle flap
  const flap = useCallback(() => {
    if (!running) {
      start();
      return;
    }
    if (gameOver) {
      // restart
      start(true);
      return;
    }
    stateRef.current.birdV = JUMP_V;
  }, [running, gameOver]);

  // start / restart
  const start = useCallback((restart = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = Math.min(540, Math.max(320, canvas.clientWidth));
    const h = Math.min(900, Math.max(480, canvas.clientHeight));
    resetGameState(w, h);
    spawnPipe(w, h); // initial pipe
    setRunning(true);
    setGameOver(false);
    if (restart) {
      setScore(0);
    }
  }, [resetGameState, spawnPipe]);

  // collision detection simple: bird circle vs pipe rects
  const intersectsPipe = useCallback((cx: number, cy: number, r: number, px: number, py: number, pw: number, ph: number) => {
    // find closest point on rect to circle center
    const closestX = Math.max(px, Math.min(cx, px + pw));
    const closestY = Math.max(py, Math.min(cy, py + ph));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < r * r;
  }, []);

  // main loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // high DPI scaling
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      stateRef.current.canvasWidth = rect.width;
      stateRef.current.canvasHeight = rect.height;
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();
    stateRef.current.lastFrame = last;
    stateRef.current.lastPipeTime = last;

    const step = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min((now - s.lastFrame) / 1000, 0.04); // clamp dt to avoid huge jumps
      s.lastFrame = now;
      s.elapsed += dt * 1000;

      // physics
      s.birdV += GRAVITY * dt;
      s.birdY += s.birdV * dt;

      // spawn pipes on interval
      if (now - s.lastPipeTime > PIPE_INTERVAL) {
        spawnPipe(s.canvasWidth, s.canvasHeight);
        s.lastPipeTime = now;
      }

      // move pipes left
      s.pipes = s.pipes.map(p => ({ ...p, x: p.x - PIPE_SPEED * dt }));

      // remove off-screen pipes and update score
      s.pipes = s.pipes.filter(p => {
        if (p.x + PIPE_WIDTH < -40) return false;
        // scoring: when pipe center passes bird x and not scored yet
        const pipeCenterX = p.x + PIPE_WIDTH / 2;
        const birdX = Math.max(80, s.canvasWidth * 0.25);
        if (pipeCenterX < birdX && !s.scoreRecordedPipes.has(Math.round(p.x))) {
          s.scoreRecordedPipes.add(Math.round(p.x));
          setScore(prev => {
            const next = prev + 1;
            if (next > best) { setBest(next); localStorage.setItem("flappy_best", String(next)); }
            return next;
          });
        }
        return true;
      });

      // bird x fixed
      const birdX = Math.max(80, s.canvasWidth * 0.25);

      // collision: hit floor or ceiling
      if (s.birdY - BIRD_RADIUS < 0 || s.birdY + BIRD_RADIUS > s.canvasHeight - FLOOR_PADDING) {
        // game over
        setGameOver(true);
        setRunning(false);
        setTimeout(() => {
          // keep showing gameover
        }, 0);
        return; // stop calling further frames (we'll cancel below)
      }

      // check collisions with every pipe
      for (const p of s.pipes) {
        const topRect = { x: p.x, y: 0, w: PIPE_WIDTH, h: p.gapY - GAP_SIZE / 2 };
        const botRect = { x: p.x, y: p.gapY + GAP_SIZE / 2, w: PIPE_WIDTH, h: s.canvasHeight - (p.gapY + GAP_SIZE / 2) - FLOOR_PADDING };
        if (intersectsPipe(birdX, s.birdY, BIRD_RADIUS, topRect.x, topRect.y, topRect.w, topRect.h) ||
            intersectsPipe(birdX, s.birdY, BIRD_RADIUS, botRect.x, botRect.y, botRect.w, botRect.h)) {
          setGameOver(true);
          setRunning(false);
          return;
        }
      }

      // DRAW
      // clear
      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);

      // subtle background grid / glow
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.01})`;
        ctx.fillRect(0, i * 60 + ((now / 150) % 60), s.canvasWidth, 2);
      }

      // pipes
      for (const p of s.pipes) {
        ctx.fillStyle = PIPE_COLOR;
        // top
        const topH = p.gapY - GAP_SIZE / 2;
        ctx.fillRect(p.x, 0, PIPE_WIDTH, topH);
        // bottom
        const bottomY = p.gapY + GAP_SIZE / 2;
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, s.canvasHeight - bottomY - FLOOR_PADDING);

        // pipe rim
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(p.x, topH - 4, PIPE_WIDTH, 4);
        ctx.fillRect(p.x, bottomY, PIPE_WIDTH, 4);
      }

      // floor
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, s.canvasHeight - FLOOR_PADDING, s.canvasWidth, FLOOR_PADDING);

      // bird (circle + wing)
      ctx.save();
      ctx.translate(birdX, s.birdY);
      // body glow
      ctx.beginPath();
      ctx.fillStyle = "rgba(251,113,133,0.14)";
      ctx.arc(0, 0, BIRD_RADIUS + 8, 0, Math.PI * 2);
      ctx.fill();
      // body
      ctx.beginPath();
      ctx.fillStyle = BIRD_COLOR;
      ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(5, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(`Score: ${score}`, 14, 26);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(`Best: ${best}`, 14, 46);

      // request next frame if still running
      if (running) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // draw final overlay if game over
        if (gameOver) {
          ctx.fillStyle = "rgba(0,0,0,0.45)";
          ctx.fillRect(0, 0, s.canvasWidth, s.canvasHeight);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 28px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Game Over", s.canvasWidth / 2, s.canvasHeight / 2 - 10);
          ctx.font = "16px system-ui, sans-serif";
          ctx.fillText(`Score: ${score}`, s.canvasWidth / 2, s.canvasHeight / 2 + 20);
        }
      }
    };

    // kick off
    if (running) {
      rafRef.current = requestAnimationFrame(step);
    }

    // cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [running, spawnPipe, intersectsPipe, score, best, gameOver]);

  // mouse / touch / keyboard listeners for flap & restart
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
      if (e.key === "r" && gameOver) {
        start(true);
      }
    };
    const handleClick = () => flap();
    const handleTouch = () => flap();

    window.addEventListener("keydown", handleKey);
    window.addEventListener("click", handleClick);
    window.addEventListener("touchstart", handleTouch);

    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("touchstart", handleTouch);
    };
  }, [flap, start, gameOver]);

  // cleanly stop RAF when running toggled off
  useEffect(() => {
    if (!running && rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [running]);

  // small UI: full canvas + controls
  return (
    <div className="h-[600px] flex items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 -z-10 animate-float bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-500 opacity-30 mix-blend-screen filter blur-3xl"></div>

      <div className="h-[590px] max-w-md w-full rounded-3xl p-4 backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            {/*<h3 className="text-2xl font-display text-white">Neon Flappy</h3>*/}
            <div className="text-sm text-muted-foreground">𝗧𝗮𝗽 / 𝗦𝗽𝗮𝗰𝗲 𝘁𝗼 𝗳𝗹𝗮𝗽 • 𝗥 𝘁𝗼 𝗿𝗲𝘀𝘁𝗮𝗿𝘁</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">𝗦𝗖𝗢𝗥𝗘</div>
              <div className="text-lg font-bold text-primary">{score}</div>
            </div>
            <Button variant="neon" onClick={() => start(true)}>Start</Button>
            <Button variant="neon" onClick={() => { resetGameState(); setRunning(false); setGameOver(false); setScore(0); }}>Reset</Button>
          </div>
        </div>

        <div className="h-[450px] w-full aspect-[3/4] bg-card rounded-xl border-2 border-border overflow-hidden">
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%", display: "block", touchAction: "manipulation" }}
          />
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="text-sm text-muted-foreground">𝐁𝐄𝐒𝐓: <span className="text-primary font-bold">{best}</span></div>
          <div className="text-sm text-muted-foreground">𝗖𝗼𝗻𝘁𝗿𝗼𝗹𝘀: 𝗦𝗽𝗮𝗰𝗲 / 𝗖𝗹𝗶𝗰𝗸 / 𝗧𝗮𝗽</div>
        </div>
      </div>
    </div>
  );
}
