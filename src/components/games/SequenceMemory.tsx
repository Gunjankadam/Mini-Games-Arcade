import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Ball = { x: number; y: number; vx: number; vy: number; radius: number; active: boolean };
type Block = { x: number; y: number; w: number; h: number; health: number; maxHealth: number; color: string; type: "normal" | "explosive" | "tough" | "moving"; moveDir?: number };
type PowerUp = { x: number; y: number; vy: number; type: "multiball" | "laser" | "expand" | "slowmo"; active: boolean };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string };

export function NeonBreakoutBlitz() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(null);
  const lastTimeRef = useRef<number>(null);
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);

  const GAME_W = 600, GAME_H = 490, PADDLE_W = 100, PADDLE_H = 12;
  const paddleRef = useRef({ x: GAME_W / 2, y: GAME_H - 40, w: PADDLE_W, h: PADDLE_H });
  const ballsRef = useRef<Ball[]>([]);
  const blocksRef = useRef<Block[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const mouseXRef = useRef(GAME_W / 2);
  const comboTimerRef = useRef(0);
  const powerUpStateRef = useRef({ laser: 0, expand: 0, slowmo: 0 });
  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { gameOverRef.current = gameOver; }, [gameOver]);

  const COLORS = { red: "#ef4444", blue: "#3b82f6", green: "#22c55e", yellow: "#eab308", purple: "#a855f7", pink: "#ec4899", cyan: "#06b6d4", orange: "#f97316" };

  function initLevel(levelNum: number) {
    const blocks: Block[] = [];
    const rows = Math.min(5 + Math.floor(levelNum / 2), 10);
    const cols = 10;
    const blockW = (GAME_W - 40) / cols;
    const blockH = 20;
    const colors = Object.values(COLORS);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (Math.random() < 0.15) continue;
        const x = 20 + col * blockW;
        const y = 60 + row * (blockH + 4);
        const color = colors[Math.floor(Math.random() * colors.length)];
        let type: Block["type"] = "normal";
        let health = 1;
        if (levelNum > 2 && Math.random() < 0.1) { type = "explosive"; health = 1; }
        else if (levelNum > 1 && Math.random() < 0.15) { type = "tough"; health = 2 + Math.floor(levelNum / 3); }
        else if (levelNum > 3 && Math.random() < 0.08) { type = "moving"; health = 1; }
        blocks.push({ x, y, w: blockW - 2, h: blockH, health, maxHealth: health, color, type, moveDir: type === "moving" ? (Math.random() > 0.5 ? 1 : -1) : 0 });
      }
    }
    blocksRef.current = blocks;
  }

  function resetGame() {
    paddleRef.current = { x: GAME_W / 2, y: GAME_H - 40, w: PADDLE_W, h: PADDLE_H };
    ballsRef.current = [{ x: GAME_W / 2, y: GAME_H - 60, vx: 0, vy: 0, radius: 6, active: false }];
    blocksRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    powerUpStateRef.current = { laser: 0, expand: 0, slowmo: 0 };
    comboTimerRef.current = 0;
    setScore(0);
    setLives(3);
    setLevel(1);
    setCombo(0);
    setGameOver(false);
    setRunning(false);
    initLevel(1);
  }

  function startGame() {
    resetGame();
    setRunning(true);
    lastTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  function nextLevel() {
    const newLevel = level + 1;
    setLevel(newLevel);
    initLevel(newLevel);
    ballsRef.current = [{ x: GAME_W / 2, y: GAME_H - 60, vx: 0, vy: 0, radius: 6, active: false }];
    paddleRef.current.w = PADDLE_W;
    powerUpStateRef.current = { laser: 0, expand: 0, slowmo: 0 };
  }

  function launchBall(ball: Ball) {
    if (ball.active) return;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.4;
    const speed = 350;
    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.active = true;
  }

  function spawnPowerUp(x: number, y: number) {
    if (Math.random() > 0.3) return;
    const types: PowerUp["type"][] = ["multiball", "laser", "expand", "slowmo"];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUpsRef.current.push({ x, y, vy: 100, type, active: true });
  }

  function activatePowerUp(type: PowerUp["type"]) {
    switch (type) {
      case "multiball":
        const ball = ballsRef.current.find((b) => b.active);
        if (ball) {
          for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.hypot(ball.vx, ball.vy);
            ballsRef.current.push({ x: ball.x, y: ball.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: ball.radius, active: true });
          }
        }
        break;
      case "laser": powerUpStateRef.current.laser = 5000; break;
      case "expand": paddleRef.current.w = PADDLE_W * 1.5; powerUpStateRef.current.expand = 8000; break;
      case "slowmo": powerUpStateRef.current.slowmo = 4000; break;
    }
  }

  function explode(x: number, y: number, color: string, count = 20) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 200;
      particlesRef.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 400 + Math.random() * 400, size: 2 + Math.random() * 4, color });
    }
  }

  function loop(ts: number) {
    if (!lastTimeRef.current) lastTimeRef.current = ts;
    let dt = Math.min(0.05, (ts - lastTimeRef.current) / 1000);
    lastTimeRef.current = ts;

    if (powerUpStateRef.current.slowmo > 0) {
      dt *= 0.5;
      powerUpStateRef.current.slowmo -= dt * 2000;
    }

    const paddle = paddleRef.current;
    const balls = ballsRef.current;
    const blocks = blocksRef.current;
    const powerUps = powerUpsRef.current;
    const particles = particlesRef.current;

    if (powerUpStateRef.current.laser > 0) powerUpStateRef.current.laser -= dt * 1000;
    if (powerUpStateRef.current.expand > 0) {
      powerUpStateRef.current.expand -= dt * 1000;
      if (powerUpStateRef.current.expand <= 0) paddle.w = PADDLE_W;
    }

    if (comboTimerRef.current > 0) {
      comboTimerRef.current -= dt * 1000;
      if (comboTimerRef.current <= 0) setCombo(0);
    }

    paddle.x = mouseXRef.current - paddle.w / 2;
    paddle.x = Math.max(0, Math.min(GAME_W - paddle.w, paddle.x));

    for (const block of blocks) {
      if (block.type === "moving" && block.moveDir) {
        block.x += block.moveDir * 80 * dt;
        if (block.x < 20 || block.x + block.w > GAME_W - 20) block.moveDir *= -1;
      }
    }

    for (let i = balls.length - 1; i >= 0; i--) {
      const ball = balls[i];
      if (!ball.active) {
        ball.x = paddle.x + paddle.w / 2;
        ball.y = paddle.y - 20;
        continue;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x - ball.radius < 0 || ball.x + ball.radius > GAME_W) {
        ball.vx *= -1;
        ball.x = ball.x < GAME_W / 2 ? ball.radius : GAME_W - ball.radius;
      }
      if (ball.y - ball.radius < 0) {
        ball.vy *= -1;
        ball.y = ball.radius;
      }

      if (ball.y + ball.radius > paddle.y && ball.y - ball.radius < paddle.y + paddle.h && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
        ball.vy *= -1;
        ball.y = paddle.y - ball.radius;
        const hitPos = (ball.x - paddle.x) / paddle.w;
        const angle = (hitPos - 0.5) * 1.2;
        const speed = Math.hypot(ball.vx, ball.vy);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.abs(Math.cos(angle) * speed);
      }

      if (ball.y - ball.radius > GAME_H) {
        balls.splice(i, 1);
        if (balls.length === 0 || !balls.some((b) => b.active)) {
          setLives((l) => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameOver(true);
              setRunning(false);
              setBest((b) => Math.max(b, score));
            } else {
              balls.push({ x: GAME_W / 2, y: GAME_H - 60, vx: 0, vy: 0, radius: 6, active: false });
            }
            return newLives;
          });
          setCombo(0);
          comboTimerRef.current = 0;
        }
        continue;
      }

      for (let j = blocks.length - 1; j >= 0; j--) {
        const block = blocks[j];
        if (ball.x + ball.radius > block.x && ball.x - ball.radius < block.x + block.w && ball.y + ball.radius > block.y && ball.y - ball.radius < block.y + block.h) {
          const fromLeft = ball.x < block.x;
          const fromRight = ball.x > block.x + block.w;
          const fromTop = ball.y < block.y;
          const fromBottom = ball.y > block.y + block.h;
          if (fromLeft || fromRight) ball.vx *= -1;
          if (fromTop || fromBottom) ball.vy *= -1;

          block.health--;
          comboTimerRef.current = 1000;
          setCombo((c) => c + 1);

          if (block.health <= 0) {
            const comboMultiplier = 1 + Math.floor(combo / 5);
            const points = 10 * comboMultiplier;
            setScore((s) => s + points);
            explode(block.x + block.w / 2, block.y + block.h / 2, block.color);

            if (block.type === "explosive") {
              for (let k = blocks.length - 1; k >= 0; k--) {
                if (k === j) continue;
                const other = blocks[k];
                const dist = Math.hypot(other.x + other.w / 2 - (block.x + block.w / 2), other.y + other.h / 2 - (block.y + block.h / 2));
                if (dist < 80) {
                  other.health = 0;
                  explode(other.x + other.w / 2, other.y + other.h / 2, other.color, 10);
                  blocks.splice(k, 1);
                  if (k < j) j--;
                  setScore((s) => s + 5 * comboMultiplier);
                }
              }
            }

            spawnPowerUp(block.x + block.w / 2, block.y + block.h / 2);
            blocks.splice(j, 1);
            if (blocks.length === 0) {
              setTimeout(() => { if (runningRef.current) nextLevel(); }, 1000);
            }
          } else {
            explode(ball.x, ball.y, block.color, 5);
          }
          break;
        }
      }
    }

    if (powerUpStateRef.current.laser > 0) {
      for (let j = blocks.length - 1; j >= 0; j--) {
        const block = blocks[j];
        if (block.x < paddle.x + paddle.w && block.x + block.w > paddle.x && block.y + block.h > paddle.y) {
          block.health -= dt * 3;
          if (block.health <= 0) {
            explode(block.x + block.w / 2, block.y + block.h / 2, block.color);
            setScore((s) => s + 5);
            blocks.splice(j, 1);
          }
        }
      }
    }

    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += pu.vy * dt;
      if (pu.y + 10 > paddle.y && pu.y < paddle.y + paddle.h && pu.x > paddle.x && pu.x < paddle.x + paddle.w) {
        activatePowerUp(pu.type);
        powerUps.splice(i, 1);
        explode(pu.x, pu.y, "#fff", 15);
        continue;
      }
      if (pu.y > GAME_H + 20) powerUps.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life += dt * 1000;
      if (p.life >= p.maxLife) particles.splice(i, 1);
    }

    drawFrame();
    if (runningRef.current && !gameOverRef.current) rafRef.current = requestAnimationFrame(loop);
  }

  function drawFrame() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== GAME_W * ratio || canvas.height !== GAME_H * ratio) {
      canvas.width = GAME_W * ratio;
      canvas.height = GAME_H * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, GAME_W, GAME_H);
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
    grad.addColorStop(0, "rgba(139,92,246,0.05)");
    grad.addColorStop(1, "rgba(59,130,246,0.05)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    for (const block of blocksRef.current) {
      ctx.fillStyle = block.color + "33";
      ctx.fillRect(block.x - 2, block.y - 2, block.w + 4, block.h + 4);
      ctx.fillStyle = block.color;
      ctx.fillRect(block.x, block.y, block.w, block.h);
      if (block.health < block.maxHealth) {
        const healthPct = block.health / block.maxHealth;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.fillStyle = block.color;
        ctx.fillRect(block.x, block.y, block.w * healthPct, block.h);
      }
      if (block.type === "explosive") {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("💥", block.x + block.w / 2, block.y + block.h / 2 + 4);
      }
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(block.x, block.y, block.w, block.h);
    }

    for (const p of particlesRef.current) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const pu of powerUpsRef.current) {
      const colors = { multiball: "#ef4444", laser: "#22c55e", expand: "#3b82f6", slowmo: "#a855f7" };
      const labels = { multiball: "⚫⚫", laser: "⚡", expand: "↔", slowmo: "⏱" };
      ctx.fillStyle = colors[pu.type] + "44";
      ctx.fillRect(pu.x - 12, pu.y - 12, 24, 24);
      ctx.fillStyle = colors[pu.type];
      ctx.fillRect(pu.x - 10, pu.y - 10, 20, 20);
      ctx.fillStyle = "#fff";
      ctx.font = "14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(labels[pu.type], pu.x, pu.y + 5);
    }

    const paddle = paddleRef.current;
    ctx.fillStyle = "#06b6d4" + "44";
    ctx.fillRect(paddle.x - 3, paddle.y - 3, paddle.w + 6, paddle.h + 6);
    ctx.fillStyle = "#06b6d4";
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    if (powerUpStateRef.current.laser > 0) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(paddle.x + paddle.w / 2 - 10, paddle.y);
      ctx.lineTo(paddle.x + paddle.w / 2 - 10, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(paddle.x + paddle.w / 2 + 10, paddle.y);
      ctx.lineTo(paddle.x + paddle.w / 2 + 10, 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const ball of ballsRef.current) {
      ctx.fillStyle = "#fb7185" + "44";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fb7185";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#fff";
    ctx.font = "bold 18px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`Score: ${score}`, 20, 30);
    ctx.fillText(`Lives: ${"❤️".repeat(lives)}`, 20, 50);
    ctx.fillText(`Level: ${level}`, GAME_W - 120, 30);
    if (combo > 0) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 16px system-ui";
      ctx.fillText(`Combo: x${combo}`, GAME_W / 2 - 50, 30);
    }

    let puY = GAME_H - 30;
    if (powerUpStateRef.current.laser > 0) { ctx.fillStyle = "#22c55e"; ctx.fillText("⚡ LASER", 20, puY); puY -= 20; }
    if (powerUpStateRef.current.expand > 0) { ctx.fillStyle = "#3b82f6"; ctx.fillText("↔ EXPAND", 20, puY); puY -= 20; }
    if (powerUpStateRef.current.slowmo > 0) { ctx.fillStyle = "#a855f7"; ctx.fillText("⏱ SLOWMO", 20, puY); }

    if (gameOverRef.current) {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillRect(0, 0, GAME_W, GAME_H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("Game Over", GAME_W / 2, GAME_H / 2 - 40);
      ctx.font = "24px system-ui";
      ctx.fillText(`Score: ${score}`, GAME_W / 2, GAME_H / 2 + 10);
      ctx.fillText(`Level: ${level}`, GAME_W / 2, GAME_H / 2 + 45);
      ctx.font = "18px system-ui";
      ctx.fillStyle = "#888";
      ctx.fillText(`Best: ${best}`, GAME_W / 2, GAME_H / 2 + 80);
    }
    ctx.textAlign = "left";
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      let clientX: number;
      if ("touches" in e && e.touches.length > 0) clientX = e.touches[0].clientX;
      else if ("clientX" in e) clientX = e.clientX;
      else return;
      mouseXRef.current = ((clientX - rect.left) / rect.width) * GAME_W;
    };

    const handleClick = () => {
      if (!runningRef.current || gameOverRef.current) return;
      const inactiveBall = ballsRef.current.find((b) => !b.active);
      if (inactiveBall) launchBall(inactiveBall);
    };

    canvas.addEventListener("mousemove", handleMove);
    canvas.addEventListener("touchmove", handleMove, { passive: true });
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("touchstart", handleClick, { passive: true });

    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("touchstart", handleClick);
    };
  }, []);

  useEffect(() => {
    resetGame();
    drawFrame();
  }, []);

  return (
    <div className="h-[620px] w-full max-w-3xl mx-auto p-4 bg-black rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xl font-display text-white"></h3>
          <div className="text-xs text-muted-foreground">𝙼𝚘𝚟𝚎 𝚝𝚘 𝚌𝚘𝚗𝚝𝚛𝚘𝚕 • 𝙲𝚕𝚒𝚌𝚔 𝚝𝚘 𝚕𝚊𝚞𝚗𝚌𝚑 • 𝙲𝚊𝚝𝚌𝚑 𝚙𝚘𝚠𝚎𝚛-𝚞𝚙𝚜:</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" onClick={startGame} disabled={running && !gameOver}>{gameOver ? "Play Again" : "Start"}</Button>
          <Button variant="outline" onClick={resetGame}>Reset</Button>
        </div>
      </div>
      <div className="h-[540px] bg-card p-3 rounded-xl border border-border">
        <div className="rounded-lg overflow-hidden border border-white/6">
          <canvas ref={canvasRef} style={{ width: GAME_W, height: GAME_H, display: "block", cursor: "none" }} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">𝚂𝚌𝚘𝚛𝚎: <span className="font-bold text-primary">{score}</span></div>
          <div className="text-sm text-muted-foreground">𝙻𝚎𝚟𝚎𝚕: <span className="font-bold text-cyan-400">{level}</span></div>
          <div className="text-sm text-muted-foreground">𝙻𝚒𝚟𝚎𝚜: <span className="font-bold text-red-500">{lives}</span></div>
          <div className="text-sm text-muted-foreground">𝙱𝚎𝚜𝚝: <span className="font-bold text-yellow-400">{best}</span></div>
        </div>
      </div>
    </div>
  );
}