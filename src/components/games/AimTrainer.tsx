import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * 2D Tank Battle - Player vs Computer
 *
 * Controls:
 * Player (Red): WASD to move, Space to shoot
 * Computer (Blue): Computer controlled
 *
 * Mechanics:
 * - Tanks can rotate and move forward/backward
 * - Shoot bullets to damage opponent
 * - Bullets reflect off walls (up to 2 bounces)
 * - Destructible and indestructible walls
 * - First to 5 kills wins
 */

type Tank = {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  size: number;
  color: string;
  cooldown: number;
};

type Bullet = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: number;
  size: number;
  bounces: number;
  maxBounces: number;
};

type Wall = {
  x: number;
  y: number;
  w: number;
  h: number;
  destructible: boolean;
  health: number;
};

export function TankBattle(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  
  const [running, setRunning] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [score1, setScore1] = useState(0);
  const [score2, setScore2] = useState(0);

  const GAME_W = 800;
  const GAME_H = 470;
  const WIN_SCORE = 5;

  // Game state refs
  const tank1Ref = useRef<Tank>({
    x: 100,
    y: GAME_H / 2,
    angle: 0,
    vx: 0,
    vy: 0,
    health: 100,
    maxHealth: 100,
    size: 24,
    color: "#ef4444",
    cooldown: 0,
  });

  const tank2Ref = useRef<Tank>({
    x: GAME_W - 100,
    y: GAME_H / 2,
    angle: Math.PI,
    vx: 0,
    vy: 0,
    health: 100,
    maxHealth: 100,
    size: 24,
    color: "#3b82f6",
    cooldown: 0,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const wallsRef = useRef<Wall[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  
  // Computer state
  const computerStateRef = useRef({
    targetX: 0,
    targetY: 0,
    moveTimer: 0,
    shootTimer: 0,
    strafeDirection: 1,
    strafeTimer: 0,
    dodgeTimer: 0,
  });

  const runningRef = useRef(running);
  const gameOverRef = useRef(gameOver);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    gameOverRef.current = gameOver;
  }, [gameOver]);

  // Initialize walls
  function initWalls() {
    wallsRef.current = [
      // Border walls (indestructible)
      { x: 0, y: 0, w: GAME_W, h: 20, destructible: false, health: 999 },
      { x: 0, y: GAME_H - 20, w: GAME_W, h: 20, destructible: false, health: 999 },
      { x: 0, y: 0, w: 20, h: GAME_H, destructible: false, health: 999 },
      { x: GAME_W - 20, y: 0, w: 20, h: GAME_H, destructible: false, health: 999 },
      
      // Center cover (destructible)
      { x: GAME_W / 2 - 60, y: GAME_H / 2 - 60, w: 120, h: 30, destructible: true, health: 5 },
      { x: GAME_W / 2 - 60, y: GAME_H / 2 + 30, w: 120, h: 30, destructible: true, health: 5 },
      
      // Side covers
      { x: 200, y: 150, w: 30, h: 70, destructible: true, health: 5 },
      { x: GAME_W - 230, y: 150, w: 30, h: 70, destructible: true, health: 5 },
      { x: 200, y: GAME_H - 200, w: 30, h: 70, destructible: true, health: 5 },
      { x: GAME_W - 230, y: GAME_H - 200, w: 30, h: 70, destructible: true, health: 5 },
    ];
  }

  // Reset game
  function resetGame() {
    tank1Ref.current = {
      x: 100,
      y: GAME_H / 2,
      angle: 0,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      size: 24,
      color: "#ef4444",
      cooldown: 0,
    };

    tank2Ref.current = {
      x: GAME_W - 100,
      y: GAME_H / 2,
      angle: Math.PI,
      vx: 0,
      vy: 0,
      health: 100,
      maxHealth: 100,
      size: 24,
      color: "#3b82f6",
      cooldown: 0,
    };

    bulletsRef.current = [];
    initWalls();
    computerStateRef.current = {
      targetX: GAME_W - 100,
      targetY: GAME_H / 2,
      moveTimer: 0,
      shootTimer: 0,
      strafeDirection: 1,
      strafeTimer: 0,
      dodgeTimer: 0,
    };
    setGameOver(false);
    setWinner(null);
    setRunning(false);
  }

  function startGame() {
    resetGame();
    setRunning(true);
    lastTimeRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }

  function newRound() {
    tank1Ref.current.x = 100;
    tank1Ref.current.y = GAME_H / 2;
    tank1Ref.current.angle = 0;
    tank1Ref.current.vx = 0;
    tank1Ref.current.vy = 0;
    tank1Ref.current.health = 100;
    tank1Ref.current.cooldown = 0;

    tank2Ref.current.x = GAME_W - 100;
    tank2Ref.current.y = GAME_H / 2;
    tank2Ref.current.angle = Math.PI;
    tank2Ref.current.vx = 0;
    tank2Ref.current.vy = 0;
    tank2Ref.current.health = 100;
    tank2Ref.current.cooldown = 0;

    bulletsRef.current = [];
    initWalls();
    
    computerStateRef.current = {
      targetX: GAME_W - 100,
      targetY: GAME_H / 2,
      moveTimer: 0,
      shootTimer: 0,
      strafeDirection: 1,
      strafeTimer: 0,
      dodgeTimer: 0,
    };
  }

  // Shoot bullet
  function shoot(tank: Tank, owner: number) {
    if (tank.cooldown > 0) return;
    
    const speed = 350;
    const bullet: Bullet = {
      x: tank.x + Math.cos(tank.angle) * (tank.size + 5),
      y: tank.y + Math.sin(tank.angle) * (tank.size + 5),
      vx: Math.cos(tank.angle) * speed,
      vy: Math.sin(tank.angle) * speed,
      owner,
      size: 4,
      bounces: 0,
      maxBounces: 2,
    };
    
    bulletsRef.current.push(bullet);
    tank.cooldown = 600;
  }

  // Circle-rect collision
  function circleRectCollision(cx: number, cy: number, r: number, 
                               rx: number, ry: number, rw: number, rh: number) {
    const testX = Math.max(rx, Math.min(cx, rx + rw));
    const testY = Math.max(ry, Math.min(cy, ry + rh));
    const distX = cx - testX;
    const distY = cy - testY;
    return (distX * distX + distY * distY) < (r * r);
  }

  // Computer AI logic - Enhanced difficulty
  function updateComputer(dt: number, tank1: Tank, tank2: Tank) {
    const ai = computerStateRef.current;
    
    // Update timers
    ai.moveTimer -= dt * 1000;
    ai.shootTimer -= dt * 1000;
    ai.strafeTimer -= dt * 1000;
    ai.dodgeTimer -= dt * 1000;

    // Detect incoming bullets (dodge behavior)
    let closestBulletDist = Infinity;
    let closestBullet: Bullet | null = null;
    for (const b of bulletsRef.current) {
      if (b.owner === 2) continue; // Ignore own bullets
      const dist = Math.hypot(b.x - tank2.x, b.y - tank2.y);
      if (dist < closestBulletDist) {
        closestBulletDist = dist;
        closestBullet = b;
      }
    }

    // Dodge incoming bullets
    if (closestBullet && closestBulletDist < 250 && ai.dodgeTimer <= 0) {
      // Calculate perpendicular dodge direction
      const bulletAngle = Math.atan2(closestBullet.vy, closestBullet.vx);
      const dodgeAngle = bulletAngle + Math.PI / 2; // 90 degrees from bullet
      
      // Pick dodge direction (alternate)
      ai.strafeDirection *= -1;
      const finalDodgeAngle = dodgeAngle + (ai.strafeDirection * Math.PI);
      
      // Set new target away from bullet
      const dodgeDist = 120;
      ai.targetX = tank2.x + Math.cos(finalDodgeAngle) * dodgeDist;
      ai.targetY = tank2.y + Math.sin(finalDodgeAngle) * dodgeDist;
      
      // Clamp to play area
      const margin = 80;
      ai.targetX = Math.max(margin, Math.min(GAME_W - margin, ai.targetX));
      ai.targetY = Math.max(margin, Math.min(GAME_H - margin, ai.targetY));
      
      ai.dodgeTimer = 500; // Cooldown before next dodge
      ai.moveTimer = 1500; // Commit to dodge movement
    }

    // Pick new strategic position periodically
    if (ai.moveTimer <= 0) {
      const margin = 100;
      const distToPlayer = Math.hypot(tank1.x - tank2.x, tank1.y - tank2.y);
      
      // Maintain medium distance from player (not too close, not too far)
      const idealDist = 250;
      
      if (distToPlayer < 180) {
        // Too close - back away
        const awayAngle = Math.atan2(tank2.y - tank1.y, tank2.x - tank1.x);
        ai.targetX = tank2.x + Math.cos(awayAngle) * 150;
        ai.targetY = tank2.y + Math.sin(awayAngle) * 150;
      } else if (distToPlayer > 400) {
        // Too far - move closer
        const toPlayerAngle = Math.atan2(tank1.y - tank2.y, tank1.x - tank2.x);
        ai.targetX = tank2.x + Math.cos(toPlayerAngle) * 100;
        ai.targetY = tank2.y + Math.sin(toPlayerAngle) * 100;
      } else {
        // Good distance - circle strafe around player
        if (ai.strafeTimer <= 0) {
          ai.strafeDirection *= -1;
          ai.strafeTimer = 1500 + Math.random() * 1000;
        }
        
        const angleToPlayer = Math.atan2(tank1.y - tank2.y, tank1.x - tank2.x);
        const strafeAngle = angleToPlayer + (Math.PI / 2) * ai.strafeDirection;
        ai.targetX = tank2.x + Math.cos(strafeAngle) * 100;
        ai.targetY = tank2.y + Math.sin(strafeAngle) * 100;
      }
      
      // Clamp to boundaries
      ai.targetX = Math.max(margin, Math.min(GAME_W - margin, ai.targetX));
      ai.targetY = Math.max(margin, Math.min(GAME_H - margin, ai.targetY));
      ai.moveTimer = 1200 + Math.random() * 800;
    }

    // Move towards target with improved pathfinding
    const dx = ai.targetX - tank2.x;
    const dy = ai.targetY - tank2.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget > 25) {
      const targetAngle = Math.atan2(dy, dx);
      let angleDiff = targetAngle - tank2.angle;
      
      // Normalize angle difference
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Rotate towards target (faster rotation)
      const rotSpeed = 5.0;
      if (Math.abs(angleDiff) > 0.08) {
        if (angleDiff > 0) {
          tank2.angle += rotSpeed * dt;
        } else {
          tank2.angle -= rotSpeed * dt;
        }
      }

      // Move forward if roughly facing target (more aggressive)
      if (Math.abs(angleDiff) < 0.8) {
        const speed = 170;
        tank2.vx = Math.cos(tank2.angle) * speed;
        tank2.vy = Math.sin(tank2.angle) * speed;
      } else {
        tank2.vx *= 0.85;
        tank2.vy *= 0.85;
      }
    } else {
      tank2.vx *= 0.85;
      tank2.vy *= 0.85;
    }

    // Improved aiming and shooting
    const toPlayerX = tank1.x - tank2.x;
    const toPlayerY = tank1.y - tank2.y;
    const distToPlayer = Math.hypot(toPlayerX, toPlayerY);
    
    // Lead the target based on player velocity
    const leadTime = distToPlayer / 350; // Bullet speed is 350
    const predictedX = tank1.x + tank1.vx * leadTime;
    const predictedY = tank1.y + tank1.vy * leadTime;
    
    const angleToPlayer = Math.atan2(predictedY - tank2.y, predictedX - tank2.x);
    
    let aimDiff = angleToPlayer - tank2.angle;
    while (aimDiff > Math.PI) aimDiff -= Math.PI * 2;
    while (aimDiff < -Math.PI) aimDiff += Math.PI * 2;

    // Shoot with better accuracy and timing
    const aimThreshold = 0.18; // Tighter aim
    const minShootCooldown = 300; // Faster shooting
    const maxShootCooldown = 500;
    
    if (Math.abs(aimDiff) < aimThreshold && ai.shootTimer <= 0 && distToPlayer < 500) {
      shoot(tank2, 2);
      ai.shootTimer = minShootCooldown + Math.random() * (maxShootCooldown - minShootCooldown);
    }
  }

  // Main game loop
  function loop(ts: number) {
    if (!lastTimeRef.current) lastTimeRef.current = ts;
    const dt = Math.min(0.05, (ts - lastTimeRef.current) / 1000);
    lastTimeRef.current = ts;

    const tank1 = tank1Ref.current;
    const tank2 = tank2Ref.current;
    const keys = keysRef.current;

    // Update cooldowns
    if (tank1.cooldown > 0) tank1.cooldown -= dt * 1000;
    if (tank2.cooldown > 0) tank2.cooldown -= dt * 1000;

    // Player controls (WASD + Space)
    const speed = 150;
    const rotSpeed = 3;

    if (keys.has("w")) {
      tank1.vx = Math.cos(tank1.angle) * speed;
      tank1.vy = Math.sin(tank1.angle) * speed;
    } else if (keys.has("s")) {
      tank1.vx = -Math.cos(tank1.angle) * speed * 0.7;
      tank1.vy = -Math.sin(tank1.angle) * speed * 0.7;
    } else {
      tank1.vx *= 0.9;
      tank1.vy *= 0.9;
    }

    if (keys.has("a")) tank1.angle -= rotSpeed * dt;
    if (keys.has("d")) tank1.angle += rotSpeed * dt;

    // Computer update
    updateComputer(dt, tank1, tank2);

    // Update tank positions
    tank1.x += tank1.vx * dt;
    tank1.y += tank1.vy * dt;
    tank2.x += tank2.vx * dt;
    tank2.y += tank2.vy * dt;

    // Tank-wall collision
    for (const wall of wallsRef.current) {
      if (circleRectCollision(tank1.x, tank1.y, tank1.size, wall.x, wall.y, wall.w, wall.h)) {
        tank1.x -= tank1.vx * dt;
        tank1.y -= tank1.vy * dt;
        tank1.vx = 0;
        tank1.vy = 0;
      }
      if (circleRectCollision(tank2.x, tank2.y, tank2.size, wall.x, wall.y, wall.w, wall.h)) {
        tank2.x -= tank2.vx * dt;
        tank2.y -= tank2.vy * dt;
        tank2.vx = 0;
        tank2.vy = 0;
      }
    }

    // Update bullets
    const bullets = bulletsRef.current;
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      const oldX = b.x;
      const oldY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Bullet-wall collision with reflection
      let hitWall = false;
      for (let j = wallsRef.current.length - 1; j >= 0; j--) {
        const wall = wallsRef.current[j];
        
        if (b.x > wall.x && b.x < wall.x + wall.w && 
            b.y > wall.y && b.y < wall.y + wall.h) {
          hitWall = true;
          
          if (wall.destructible) {
            wall.health--;
            if (wall.health <= 0) {
              wallsRef.current.splice(j, 1);
            }
          }

          // Reflect bullet if bounces left
          if (b.bounces < b.maxBounces) {
            b.bounces++;
            
            // Determine which side was hit
            const fromLeft = oldX <= wall.x;
            const fromRight = oldX >= wall.x + wall.w;
            const fromTop = oldY <= wall.y;
            const fromBottom = oldY >= wall.y + wall.h;
            
            // Reflect velocity
            if (fromLeft || fromRight) {
              b.vx = -b.vx;
              b.x = fromLeft ? wall.x - 1 : wall.x + wall.w + 1;
            }
            if (fromTop || fromBottom) {
              b.vy = -b.vy;
              b.y = fromTop ? wall.y - 1 : wall.y + wall.h + 1;
            }
            
            hitWall = false; // Don't remove bullet
          }
          break;
        }
      }

      if (hitWall) {
        bullets.splice(i, 1);
        continue;
      }

      // Bullet-tank collision
      if (b.owner !== 1 && Math.hypot(b.x - tank1.x, b.y - tank1.y) < tank1.size) {
        tank1.health -= 34;
        bullets.splice(i, 1);
        if (tank1.health <= 0) {
          setScore2(s => {
            const newScore = s + 1;
            if (newScore >= WIN_SCORE) {
              setWinner(2);
              setGameOver(true);
              setRunning(false);
            } else {
              setTimeout(() => newRound(), 1500);
            }
            return newScore;
          });
        }
        continue;
      }

      if (b.owner !== 2 && Math.hypot(b.x - tank2.x, b.y - tank2.y) < tank2.size) {
        tank2.health -= 34;
        bullets.splice(i, 1);
        if (tank2.health <= 0) {
          setScore1(s => {
            const newScore = s + 1;
            if (newScore >= WIN_SCORE) {
              setWinner(1);
              setGameOver(true);
              setRunning(false);
            } else {
              setTimeout(() => newRound(), 1500);
            }
            return newScore;
          });
        }
        continue;
      }

      // Remove off-screen bullets
      if (b.x < -20 || b.x > GAME_W + 20 || b.y < -20 || b.y > GAME_H + 20) {
        bullets.splice(i, 1);
      }
    }

    // Draw
    drawFrame();

    if (runningRef.current && !gameOverRef.current) {
      rafRef.current = requestAnimationFrame(loop);
    }
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

    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < GAME_W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_H);
      ctx.stroke();
    }
    for (let y = 0; y < GAME_H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_W, y);
      ctx.stroke();
    }

    // Draw walls
    for (const wall of wallsRef.current) {
      ctx.fillStyle = wall.destructible ? "#666" : "#333";
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      
      // Border
      ctx.strokeStyle = wall.destructible ? "#888" : "#555";
      ctx.lineWidth = 2;
      ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
      
      // Damage indicator for destructible walls
      if (wall.destructible && wall.health < 5) {
        const damagePct = 1 - (wall.health / 5);
        ctx.fillStyle = `rgba(255,100,100,${damagePct * 0.5})`;
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      }
    }

    // Draw bullets with trail
    for (const b of bulletsRef.current) {
      // Trail
      ctx.strokeStyle = b.owner === 1 ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Bullet
      ctx.fillStyle = b.owner === 1 ? "#ef4444" : "#3b82f6";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Glow
      ctx.fillStyle = b.owner === 1 ? "rgba(239,68,68,0.3)" : "rgba(59,130,246,0.3)";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * 2, 0, Math.PI * 2);
      ctx.fill();

      // Bounce counter
      if (b.bounces > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "10px system-ui";
        ctx.fillText(`${b.bounces}`, b.x + 8, b.y - 8);
      }
    }

    // Draw tanks
    const drawTank = (tank: Tank, label: string) => {
      if (tank.health <= 0) return;

      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(-tank.size + 2, -tank.size + 2, tank.size * 2, tank.size * 2);

      // Body
      ctx.fillStyle = tank.color;
      ctx.fillRect(-tank.size, -tank.size, tank.size * 2, tank.size * 2);

      // Turret
      ctx.fillStyle = tank.color;
      ctx.fillRect(0, -6, tank.size + 8, 12);

      // Barrel tip
      ctx.fillStyle = "#222";
      ctx.fillRect(tank.size + 6, -3, 4, 6);

      // Details
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-tank.size, -tank.size, tank.size * 2, tank.size * 2);

      ctx.restore();

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(label, tank.x, tank.y - tank.size - 20);
      ctx.textAlign = "left";

      // Health bar
      const barW = tank.size * 2;
      const barH = 4;
      const barX = tank.x - barW / 2;
      const barY = tank.y - tank.size - 12;

      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);

      const healthPct = Math.max(0, tank.health / tank.maxHealth);
      ctx.fillStyle = healthPct > 0.5 ? "#22c55e" : healthPct > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(barX, barY, barW * healthPct, barH);

      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barW, barH);
    };

    drawTank(tank1Ref.current, "PLAYER");
    drawTank(tank2Ref.current, "COMPUTER");

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.fillText(`Player: ${score1}`, 30, 40);
    ctx.fillText(`Computer: ${score2}`, GAME_W - 160, 40);

    ctx.font = "14px system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(`First to ${WIN_SCORE} wins`, GAME_W / 2 - 60, 30);

    // Game over overlay
    if (gameOverRef.current && winner) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, GAME_W, GAME_H);

      ctx.fillStyle = winner === 1 ? "#ef4444" : "#3b82f6";
      ctx.font = "bold 48px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(winner === 1 ? "You Win!" : "Computer Wins!", GAME_W / 2, GAME_H / 2 - 20);

      ctx.fillStyle = "#fff";
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText(`Final Score: ${score1} - ${score2}`, GAME_W / 2, GAME_H / 2 + 30);
      ctx.textAlign = "left";
    }
  }

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (key === " " && runningRef.current && !gameOverRef.current) {
        e.preventDefault();
        shoot(tank1Ref.current, 1);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Initial draw
  useEffect(() => {
    initWalls();
    drawFrame();
  }, []);

  return (
    <div className="h-[620px] w-full max-w-5xl mx-auto p-4 bg-black rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xl font-display text-white"></h3>
          <div className="text-xs text-muted-foreground">
            𝚆𝙰𝚂𝙳 𝚝𝚘 𝚖𝚘𝚟𝚎 • 𝚂𝚙𝚊𝚌𝚎 𝚝𝚘 𝚜𝚑𝚘𝚘𝚝 • 𝙱𝚞𝚕𝚕𝚎𝚝𝚜 𝚋𝚘𝚞𝚗𝚌𝚎 𝚝𝚠𝚒𝚌𝚎! • 𝙵𝚒𝚛𝚜𝚝 𝚝𝚘 {WIN_SCORE} 𝚠𝚒𝚗𝚜
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="default" onClick={startGame} disabled={running && !gameOver}>
            {gameOver ? "Play Again" : "Start"}
          </Button>
          <Button variant="outline" onClick={resetGame}>
            Reset
          </Button>
        </div>
      </div>

      <div className="h-[540px] bg-card p-3 rounded-xl border border-border">
        <div className="h-[480px] rounded-lg overflow-hidden border border-white/6">
          <canvas
            ref={canvasRef}
            style={{
              width: GAME_W,
              height: GAME_H,
              display: "block",
              imageRendering: "crisp-edges",
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="text-red-500 font-bold">𝙿𝚕𝚊𝚢𝚎𝚛</span>
            <span className="text-muted-foreground"> : </span>
            <span className="font-bold">{score1}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            𝙵𝚒𝚛𝚜𝚝 𝚝𝚘 <span className="font-bold text-white">{WIN_SCORE}</span> 𝚔𝚒𝚕𝚕𝚜
          </div>
          <div className="text-sm">
            <span className="text-blue-500 font-bold">𝙲𝚘𝚖𝚙𝚞𝚝𝚎𝚛</span>
            <span className="text-muted-foreground"> : </span>
            <span className="font-bold">{score2}</span>
          </div>
        </div>
      </div>
    </div>
  );
}