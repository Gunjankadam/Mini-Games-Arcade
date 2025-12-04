import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function StackBuilder(): JSX.Element {
  // Config
  const CANVAS_W = 335;
  const CANVAS_H = 425;
  const START_BLOCK_W = 220;
  const BLOCK_HEIGHT = 28;
  const MOVE_SPEED = 160; // px/s
  const MIN_BLOCK_WIDTH = 18; // loss threshold
  const COLORS = ["#06b6d4", "#60a5fa", "#fb7185", "#f59e0b", "#a78bfa"];

  // Refs & state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // keep the moving block in a ref to avoid per-frame React updates
  const movingRef = useRef<{ dir: 1 | -1; x: number; w: number } | null>(null);

  const [stack, setStack] = useState<Array<{ x: number; w: number; color: string }>>([]);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("stack_best") || 0));
  const [gameOver, setGameOver] = useState(false);

  // helper: draw rounded rect
  function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill = true, stroke = false) {
    const radius = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // reset game
  const resetGame = useCallback(() => {
    // base block
    const baseW = START_BLOCK_W;
    const baseX = (CANVAS_W - baseW) / 2;
    setStack([{ x: baseX, w: baseW, color: COLORS[0] }]);
    // moving block starts off-screen
    movingRef.current = { dir: 1, x: -baseW, w: baseW };
    setRunning(false);
    setGameOver(false);
    setScore(0);
  }, []);

  useEffect(() => {
    resetGame();
  }, [resetGame]);

  // drop block (reads movingRef directly)
  const dropBlock = useCallback(() => {
    if (!movingRef.current || gameOver) return;
    const moving = movingRef.current;
    const curStack = stack;
    const top = curStack[curStack.length - 1];

    // overlap
    const overlapStart = Math.max(moving.x, top.x);
    const overlapEnd = Math.min(moving.x + moving.w, top.x + top.w);
    const overlapW = Math.max(0, overlapEnd - overlapStart);

    if (overlapW <= 0 || overlapW < MIN_BLOCK_WIDTH) {
      setGameOver(true);
      setRunning(false);
      if (score > best) {
        setBest(score);
        localStorage.setItem("stack_best", String(score));
      }
      return;
    }

    const newX = overlapStart;
    const newW = overlapW;
    const color = COLORS[(stack.length) % COLORS.length];

    // add new block
    setStack(prev => {
      const updated = [...prev, { x: newX, w: newW, color }];

      //  NEW: max 15 blocks
      if (updated.length >= 15) {
        setGameOver(true);
        setRunning(false);
        if (score + 1 > best) {
          setBest(score + 1);
          localStorage.setItem("stack_best", String(score + 1));
        }
      }

      return updated;
    });

    // update score
    setScore(prev => {
      const next = prev + 1;
      if (next > best) {
        setBest(next);
        localStorage.setItem("stack_best", String(next));
      }
      return next;
    });

    // prepare next moving block
    const nextDir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
    const startX = nextDir === 1 ? -newW : CANVAS_W;
    movingRef.current = { dir: nextDir, x: startX, w: newW };

    setRunning(true);
  }, [stack, score, best, gameOver]);

  // start / restart helpers
  const startPlay = () => {
    if (gameOver) {
      resetGame();
      setRunning(true);
    } else {
      setRunning(true);
    }
  };

  // INPUT HANDLERS — ONLY tap/click outside controls (no Space). Do NOT auto-start on click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // ignore clicks originating from controls (buttons, inputs) to avoid starting + immediate drop
      const target = e.target as HTMLElement | null;
      if (target) {
        if (target.closest && target.closest('button, input, label, .no-drop')) {
          return;
        }
      }
      // only allow click to drop while running
      if (running && !gameOver) {
        dropBlock();
      } else if (gameOver) {
        // after game over, allow click to reset
        resetGame();
      }
      // NOTE: do NOT start the game on click — Start button must be used.
    };

    const onTouch = (e: TouchEvent) => {
      // ignore touches on controls
      const touch = e.touches[0];
      if (!touch) return;
      const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
      if (el && el.closest && el.closest('button, input, label, .no-drop')) {
        return;
      }
      if (running && !gameOver) {
        dropBlock();
      } else if (gameOver) {
        resetGame();
      }
    };

    window.addEventListener("click", onClick);
    window.addEventListener("touchstart", onTouch);

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouch);
    };
  }, [running, gameOver, dropBlock, resetGame]);

  // animation loop using movingRef for per-frame x updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // DPI scaling
    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(CANVAS_W * ratio);
      canvas.height = Math.floor(CANVAS_H * ratio);
      canvas.style.width = `${CANVAS_W}px`;
      canvas.style.height = `${CANVAS_H}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const step = (ts: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = ts;
      const dt = Math.min(0.05, (ts - (lastTimeRef.current || ts)) / 1000);
      lastTimeRef.current = ts;

      // update moving block x if running
      if (running && movingRef.current) {
        const delta = MOVE_SPEED * dt * movingRef.current.dir;
        let nextX = movingRef.current.x + delta;
        // wrap/bounce behavior: wrap around
        if (movingRef.current.dir === 1 && nextX > CANVAS_W) {
          nextX = -movingRef.current.w;
        } else if (movingRef.current.dir === -1 && nextX + movingRef.current.w < 0) {
          nextX = CANVAS_W;
        }
        movingRef.current.x = nextX;
      }

      // draw background
      ctx.fillStyle = "#071124";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // soft floating gradient
      const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
      grad.addColorStop(0, "rgba(167,139,250,0.04)");
      grad.addColorStop(1, "rgba(96,165,250,0.02)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // draw stack
      for (let i = 0; i < stack.length; i++) {
        const blk = stack[i];
        const y = CANVAS_H - (i + 1) * BLOCK_HEIGHT - 20;
        ctx.fillStyle = blk.color;
        roundRect(ctx, blk.x + 1, y + 1, Math.max(0, blk.w - 2), BLOCK_HEIGHT - 2, 6, true, false);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        roundRect(ctx, blk.x + 6, y + 6, Math.max(0, blk.w - 12), BLOCK_HEIGHT / 2 - 6, 4, true, false);
      }

      // draw moving block
      if (movingRef.current) {
        const yTop = CANVAS_H - (stack.length + 1) * BLOCK_HEIGHT - 20;
        // shadow
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        roundRect(ctx, movingRef.current.x + 3, yTop + 6, movingRef.current.w, BLOCK_HEIGHT, 6, true, false);
        const col = COLORS[stack.length % COLORS.length];
        ctx.fillStyle = col;
        roundRect(ctx, movingRef.current.x, yTop, movingRef.current.w, BLOCK_HEIGHT, 6, true, false);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(movingRef.current.x + 1, yTop + 1, Math.max(0, movingRef.current.w - 2), BLOCK_HEIGHT - 2);
      }

      // HUD
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Score: ${score}`, 12, 20);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(`Best: ${best}`, 12, 38);

      // game over overlay
      if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 26px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", CANVAS_W / 2, CANVAS_H / 2 - 6);
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 18);
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      lastTimeRef.current = null;
    };
    // intentionally exclude movingRef from deps — it's a ref
  }, [running, stack, score, best, gameOver]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 p-6 bg-black">
      <div className="relative w-[380px]">
        <div className="absolute inset-0 -z-10 animate-float bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-500 opacity-20 mix-blend-screen filter blur-2xl" />
        <div className="h-[510px] bg-white/4 p-3 rounded-2xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-muted-foreground"></div>
              <div className="text-xs text-muted-foreground">𝚃𝚊𝚙 𝚝𝚘 𝚍𝚛𝚘𝚙</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">𝐒𝐂𝐎𝐑𝐄</div>
              <div className="text-lg font-bold text-primary">{score}</div>
              <Button variant="neon" onClick={() => startPlay()}>Start</Button>
              <Button variant="neon" onClick={() => resetGame()}>Reset</Button>
            </div>
          </div>

          <div className="h-[445px] bg-card rounded-xl p-2 border-2 border-border">
            <canvas ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H, display: "block" }} />
          </div>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">𝙰𝚕𝚒𝚐𝚗 𝚋𝚕𝚘𝚌𝚔𝚜 𝚝𝚘 𝚜𝚝𝚊𝚌𝚔 — 𝚖𝚒𝚜𝚜 𝚝𝚘𝚘 𝚖𝚞𝚌𝚑 𝚊𝚗𝚍 𝚒𝚝 𝚌𝚘𝚕𝚕𝚊𝚙𝚜𝚎𝚜.</div>

      <style>{`
        @keyframes float { 0% { transform: translateY(-8px) } 50% { transform: translateY(8px) } 100% { transform: translateY(-8px) } }
        .animate-float { animation: float 8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
