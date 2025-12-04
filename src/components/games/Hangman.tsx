import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * MazeGame (edited)
 *
 * - Flood-fill visibility: player only sees cells reachable through open passages up to a radius
 * - Player rendered as a small dot moving through corridors
 * - All other game logic (generation, hints, limits, controls) unchanged
 */

type Cell = {
  r: number;
  c: number;
  walls: [boolean, boolean, boolean, boolean]; // N, E, S, W
  visited?: boolean;
};

type Difficulty = "Easy" | "Normal" | "Hard" | "Insane";

export function MazeGame(): JSX.Element {
  // ----- Config / presets -----
  const presets: Record<Difficulty, { rows: number; cols: number; timeLimit: number; moveLimit: number; hintUses: number; visRadius: number }> = {
    Easy: { rows: 11, cols: 11, timeLimit: 120, moveLimit: 300, hintUses: 3, visRadius: 4 },
    Normal: { rows: 21, cols: 21, timeLimit: 150, moveLimit: 500, hintUses: 2, visRadius: 3 },
    Hard: { rows: 31, cols: 31, timeLimit: 240, moveLimit: 900, hintUses: 1, visRadius: 3 },
    Insane: { rows: 41, cols: 41, timeLimit: 420, moveLimit: 2000, hintUses: 1, visRadius: 2 },
  };

  // ----- State -----
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [rows, setRows] = useState(presets[difficulty].rows);
  const [cols, setCols] = useState(presets[difficulty].cols);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [player, setPlayer] = useState<{ r: number; c: number } | null>(null);
  const [exitCell, setExitCell] = useState<{ r: number; c: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(presets[difficulty].timeLimit);
  const [movesLeft, setMovesLeft] = useState(presets[difficulty].moveLimit);
  const [hintUsesLeft, setHintUsesLeft] = useState(presets[difficulty].hintUses);
  const [message, setMessage] = useState<string | null>(null);
  const [pathHint, setPathHint] = useState<Array<[number, number]>>([]);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1e9));

  // canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);

  // constants used by rendering
  const CANVAS_W = 620; // physical drawing area - scaled for DPI
  const CANVAS_H = 435;

  // ----- Utilities: random with seed (simple LCG for determinism) -----
  function lcg(seedRef: { v: number }) {
    seedRef.v = (seedRef.v * 1664525 + 1013904223) % 4294967296;
    return seedRef.v / 4294967296;
  }

  // ----- Maze generation: recursive backtracker -----
  function makeEmptyGrid(r: number, c: number): Cell[][] {
    const g: Cell[][] = [];
    for (let i = 0; i < r; i++) {
      const row: Cell[] = [];
      for (let j = 0; j < c; j++) {
        row.push({ r: i, c: j, walls: [true, true, true, true], visited: false });
      }
      g.push(row);
    }
    return g;
  }

  function neighborsFor(g: Cell[][], cell: Cell) {
    const list: Array<{ cell: Cell; dir: number }> = [];
    const { r, c } = cell;
    if (r > 0) list.push({ cell: g[r - 1][c], dir: 0 }); // N
    if (c < g[0].length - 1) list.push({ cell: g[r][c + 1], dir: 1 }); // E
    if (r < g.length - 1) list.push({ cell: g[r + 1][c], dir: 2 }); // S
    if (c > 0) list.push({ cell: g[r][c - 1], dir: 3 }); // W
    return list;
  }

  function generateMaze(rowsNum: number, colsNum: number, seedValue: number) {
    const g = makeEmptyGrid(rowsNum, colsNum);
    const seedRef = { v: seedValue >>> 0 };
    const stack: Cell[] = [];
    const start = g[0][0];
    start.visited = true;
    stack.push(start);
    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      // get unvisited neighbors
      const nbs = neighborsFor(g, current).filter(n => !n.cell.visited);
      if (nbs.length === 0) {
        stack.pop();
        continue;
      }
      // pick a random neighbor
      const idx = Math.floor(lcg(seedRef) * nbs.length);
      const { cell: chosen, dir } = nbs[idx];
      // knock down wall between current and chosen
      current.walls[dir] = false;
      const opposite = (d: number) => (d + 2) % 4;
      chosen.walls[opposite(dir)] = false;
      chosen.visited = true;
      stack.push(chosen);
    }
    // reset visited flags
    for (let i = 0; i < g.length; i++) for (let j = 0; j < g[0].length; j++) g[i][j].visited = false;
    return g;
  }

  // ----- Pathfinding for hint: BFS (fast on grid) -----
  function findPathBFS(g: Cell[][], start: [number, number], goal: [number, number]) {
    const R = g.length;
    const C = g[0].length;
    const q: Array<[number, number]> = [start];
    const prev = new Map<string, string | null>();
    prev.set(`${start[0]}:${start[1]}`, null);
    while (q.length > 0) {
      const [r, c] = q.shift()!;
      if (r === goal[0] && c === goal[1]) break;
      const cell = g[r][c];
      // N
      if (!cell.walls[0] && !prev.has(`${r - 1}:${c}`)) {
        prev.set(`${r - 1}:${c}`, `${r}:${c}`);
        q.push([r - 1, c]);
      }
      // E
      if (!cell.walls[1] && !prev.has(`${r}:${c + 1}`)) {
        prev.set(`${r}:${c + 1}`, `${r}:${c}`);
        q.push([r, c + 1]);
      }
      // S
      if (!cell.walls[2] && !prev.has(`${r + 1}:${c}`)) {
        prev.set(`${r + 1}:${c}`, `${r}:${c}`);
        q.push([r + 1, c]);
      }
      // W
      if (!cell.walls[3] && !prev.has(`${r}:${c - 1}`)) {
        prev.set(`${r}:${c - 1}`, `${r}:${c}`);
        q.push([r, c - 1]);
      }
    }
    // reconstruct path
    const goalKey = `${goal[0]}:${goal[1]}`;
    if (!prev.has(goalKey)) return [] as Array<[number, number]>;
    const path: Array<[number, number]> = [];
    let cur: string | null = goalKey;
    while (cur) {
      const [rr, cc] = cur.split(":").map(Number);
      path.push([rr, cc]);
      cur = prev.get(cur) ?? null;
    }
    path.reverse();
    return path;
  }

  // ----- Game control: initialize a new random maze + set player + exit -----
  function newGame(newDifficulty = difficulty, newSeed = Math.floor(Math.random() * 1e9)) {
    const preset = presets[newDifficulty];
    setRows(preset.rows);
    setCols(preset.cols);
    setTimeLeft(preset.timeLimit);
    setMovesLeft(preset.moveLimit);
    setHintUsesLeft(preset.hintUses);
    setSeed(newSeed);
    const g = generateMaze(preset.rows, preset.cols, newSeed);
    setGrid(g);
    // Place player near top-left (0,0)
    setPlayer({ r: 0, c: 0 });
    // Place exit near bottom-right
    setExitCell({ r: preset.rows - 1, c: preset.cols - 1 });
    setRunning(false);
    setMessage(null);
    setPathHint([]);
  }

  // on mount init
  useEffect(() => {
    newGame(difficulty, seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // when difficulty changes, prepare new game but do not auto-start
  useEffect(() => {
    newGame(difficulty, Math.floor(Math.random() * 1e9));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // ----- Timer logic -----
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setRunning(false);
          setMessage("You lost");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [running]);

  // ----- Movement helper -----
  function canMoveTo(r: number, c: number) {
    if (!grid.length) return false;
    if (r < 0 || c < 0 || r >= grid.length || c >= grid[0].length) return false;
    return true;
  }

  function tryMove(dr: number, dc: number) {
    if (!running) return;
    if (!player || !grid.length || !exitCell) return;
    const { r, c } = player;
    const cell = grid[r][c];
    // determine direction index: 0 N,1E,2S,3W
    let dir = -1;
    if (dr === -1 && dc === 0) dir = 0;
    if (dr === 0 && dc === 1) dir = 1;
    if (dr === 1 && dc === 0) dir = 2;
    if (dr === 0 && dc === -1) dir = 3;
    if (dir === -1) return;

    // if wall exists in that direction, cannot move
    if (cell.walls[dir]) {
      // small penalty for walking into wall?
      setMovesLeft(m => Math.max(0, m - 1));
      if (movesLeft - 1 <= 0) {
        setRunning(false);
        setMessage("You lost");
      }
      return;
    }
    const nr = r + dr;
    const nc = c + dc;
    if (!canMoveTo(nr, nc)) return;
    setPlayer({ r: nr, c: nc });
    setMovesLeft(m => {
      const next = Math.max(0, m - 1);
      if (next <= 0) {
        setRunning(false);
        setMessage("You lost");
      }
      return next;
    });
    // clear any old hint path if stepping away
    setPathHint([]);
    // check win
    if (nr === exitCell.r && nc === exitCell.c) {
      setRunning(false);
      setMessage("You Win");
    }
  }

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running) return;
      if (e.key === "ArrowUp" || e.key === "w") tryMove(-1, 0);
      if (e.key === "ArrowDown" || e.key === "s") tryMove(1, 0);
      if (e.key === "ArrowLeft" || e.key === "a") tryMove(0, -1);
      if (e.key === "ArrowRight" || e.key === "d") tryMove(0, 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, grid, player, movesLeft, exitCell]);

  // ----- Hint (BFS) -----
  function requestHint() {
    if (!running) return;
    if (hintUsesLeft <= 0) {
      setMessage("No hints left!");
      return;
    }
    if (!player || !exitCell || !grid?.length) return;
    const path = findPathBFS(grid, [player.r, player.c], [exitCell.r, exitCell.c]);
    if (!path.length) {
      setMessage("No path (unexpected)!");
      return;
    }
    // limit displayed hint length for challenge (show at most 10 steps)
    const showLen = Math.min(Math.max(6, Math.floor(Math.max(rows, cols) / 6)), 18);
    setPathHint(path.slice(0, showLen));
    setHintUsesLeft(h => Math.max(0, h - 1));
  }

  // ----- NEW: Flood-fill visibility via corridors -----
  function computeVisibleSet(g: Cell[][], startR: number, startC: number, radius: number) {
    const R = g.length;
    const C = g[0].length;
    const key = (r: number, c: number) => `${r}:${c}`;
    const visited = new Set<string>();
    const q: Array<{ r: number; c: number; d: number }> = [{ r: startR, c: startC, d: 0 }];
    visited.add(key(startR, startC));

    while (q.length > 0) {
      const cur = q.shift()!;
      if (cur.d >= radius) continue;

      const cell = g[cur.r][cur.c];
      // try N (dir 0)
      if (!cell.walls[0] && cur.r - 1 >= 0) {
        const k = key(cur.r - 1, cur.c);
        if (!visited.has(k)) { visited.add(k); q.push({ r: cur.r - 1, c: cur.c, d: cur.d + 1 }); }
      }
      // E (dir 1)
      if (!cell.walls[1] && cur.c + 1 < C) {
        const k = key(cur.r, cur.c + 1);
        if (!visited.has(k)) { visited.add(k); q.push({ r: cur.r, c: cur.c + 1, d: cur.d + 1 }); }
      }
      // S (dir 2)
      if (!cell.walls[2] && cur.r + 1 < R) {
        const k = key(cur.r + 1, cur.c);
        if (!visited.has(k)) { visited.add(k); q.push({ r: cur.r + 1, c: cur.c, d: cur.d + 1 }); }
      }
      // W (dir 3)
      if (!cell.walls[3] && cur.c - 1 >= 0) {
        const k = key(cur.r, cur.c - 1);
        if (!visited.has(k)) { visited.add(k); q.push({ r: cur.r, c: cur.c - 1, d: cur.d + 1 }); }
      }
    }

    return visited; // Set of "r:c" keys visible following corridors
  }

  // ----- NEW: drawCanvas uses computeVisibleSet and renders player as small dot -----
  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !grid.length || !player || !exitCell) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // dpi scale
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== Math.floor(rect.width * ratio) || canvas.height !== Math.floor(rect.height * ratio)) {
      canvas.width = Math.floor(rect.width * ratio);
      canvas.height = Math.floor(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    // clear
    ctx.fillStyle = "#071124";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    const R = grid.length;
    const C = grid[0].length;
    const cellW = Math.floor(CANVAS_W / C);
    const cellH = Math.floor(CANVAS_H / R);

    // compute visible cells set using flood-fill along open passages
    const visRadius = presets[difficulty].visRadius;
    const visibleSet = computeVisibleSet(grid, player.r, player.c, visRadius);
    const key = (r: number, c: number) => `${r}:${c}`;

    // draw cells: floor, walls, hints
    for (let rr = 0; rr < R; rr++) {
      for (let cc = 0; cc < C; cc++) {
        const cell = grid[rr][cc];
        const x = cc * cellW;
        const y = rr * cellH;
        const isVisible = visibleSet.has(key(rr, cc));

        // floor color: visible corridor vs hidden
        ctx.fillStyle = isVisible ? "#071B28" : "#03050A";
        ctx.fillRect(x, y, cellW, cellH);

        // highlight exit if visible
        if ((rr === exitCell.r && cc === exitCell.c) && isVisible) {
          ctx.fillStyle = "#0ea5a4";
          ctx.globalAlpha = 0.16;
          ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
          ctx.globalAlpha = 1;
        }

        // hint overlay path (only visually when visible)
        if (pathHint.some(([pr, pc]) => pr === rr && pc === cc) && isVisible) {
          ctx.fillStyle = "rgba(99,102,241,0.12)";
          ctx.fillRect(x + 2, y + 2, cellW - 4, cellH - 4);
        }

        // draw walls (only where visible) — give edges a brighter look if visible
        ctx.strokeStyle = isVisible ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)";
        ctx.lineWidth = Math.max(1, Math.min(3, Math.floor(Math.min(cellW, cellH) / 10)));
        ctx.beginPath();
        const half = 0.5;
        if (cell.walls[0]) { ctx.moveTo(x + half, y + half); ctx.lineTo(x + cellW - half, y + half); }
        if (cell.walls[1]) { ctx.moveTo(x + cellW - half, y + half); ctx.lineTo(x + cellW - half, y + cellH - half); }
        if (cell.walls[2]) { ctx.moveTo(x + half, y + cellH - half); ctx.lineTo(x + cellW - half, y + cellH - half); }
        if (cell.walls[3]) { ctx.moveTo(x + half, y + half); ctx.lineTo(x + half, y + cellH - half); }
        ctx.stroke();
      }
    }

    // draw path hint overlay edges (if any) but only where visible
    ctx.strokeStyle = "rgba(99,102,241,0.9)";
    ctx.lineWidth = 2;
    for (let i = 0; i < pathHint.length - 1; i++) {
      const [r1, c1] = pathHint[i];
      const [r2, c2] = pathHint[i + 1];
      if (!visibleSet.has(key(r1, c1)) || !visibleSet.has(key(r2, c2))) continue; // only show visible path bits
      const x1 = c1 * cellW + cellW / 2;
      const y1 = r1 * cellH + cellH / 2;
      const x2 = c2 * cellW + cellW / 2;
      const y2 = r2 * cellH + cellH / 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // draw player as a small dot (no large glow)
    const px = player.c * cellW + cellW / 2;
    const py = player.r * cellH + cellH / 2;
    const dotR = Math.max(2, Math.min(cellW, cellH) * 0.12); // small radius
    ctx.beginPath();
    ctx.fillStyle = "#fb7185";
    ctx.arc(px, py, dotR, 0, Math.PI * 2);
    ctx.fill();

    // HUD in canvas (optional)
    ctx.fillStyle = "#fff";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "left";
  }

  // redraw when relevant state changes
  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, player, exitCell, timeLeft, movesLeft, pathHint, difficulty]);

  // start run
  function startRun() {
    if (!grid.length || !player) return;
    setRunning(true);
    setMessage(null);
    drawCanvas();
  }

  // reset to current seed/difficulty
  function resetSame() {
    newGame(difficulty, seed);
  }

  // button controls (touch)
  function btnMove(dr: number, dc: number) {
    if (!running) return;
    tryMove(dr, dc);
  }

  // call hint
  function useHint() {
    requestHint();
  }

  // quick solve check on finish: if message says win then show
  useEffect(() => {
    if (message && message.includes("Win")) {
      const t = setTimeout(() => setMessage(null), 2000);
      return () => clearTimeout(t);
    }
  }, [message]);

  return (
    <div className="w-[920px] h-[620px] mx-auto p-6 bg-black rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-display text-white"></h3>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">𝙳𝚒𝚏𝚏𝚒𝚌𝚞𝚕𝚝𝚢:</div>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className="bg-card border border-border px-2 py-1 rounded">
            <option>Easy</option>
            <option>Normal</option>
            <option>Hard</option>
            <option>Insane</option>
          </select>

          <Button variant="neon" onClick={() => newGame(difficulty, Math.floor(Math.random() * 1e9))}>New Maze</Button>
          <Button variant="neon" onClick={() => startRun()} disabled={running}>Start</Button>
          <Button variant="neon" onClick={() => { setRunning(false); setMessage("Stopped"); }}>Stop</Button>
          <Button variant="neon" onClick={() => resetSame()}>Reset</Button>
        </div>
      </div>

      <div className="h-[530px] bg-card p-4 rounded-xl border border-border flex gap-4">
        <div style={{ width: 660 }}>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">𝚂𝚞𝚛𝚟𝚒𝚟𝚎 & 𝚛𝚎𝚊𝚌𝚑 𝚝𝚑𝚎 𝚎𝚡𝚒𝚝 — 𝚏𝚘𝚐-𝚘𝚏-𝚠𝚊𝚛 𝚑𝚒𝚍𝚎𝚜 𝚝𝚑𝚎 𝚖𝚊𝚣𝚎</div>
           {/*} <div className="text-xs text-muted-foreground mt-1">Seed: <span className="font-mono text-white">{seed}</span></div>*/}
          </div>

          <div className="rounded-lg overflow-hidden border border-white/6 bg-black p-3 inline-block">
            <canvas ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H, display: "block" }} />
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="text-sm"></div>
            <div className="grid grid-cols-3 gap-1">
              <div />
              <button onMouseDown={() => btnMove(-1, 0)} onTouchStart={() => btnMove(-1, 0)} ></button>
              <div />
              <button onMouseDown={() => btnMove(0, -1)} onTouchStart={() => btnMove(0, -1)} ></button>
    
              <button onMouseDown={() => btnMove(0, 1)} onTouchStart={() => btnMove(0, 1)} ></button>
              <div />
              <button onMouseDown={() => btnMove(1, 0)} onTouchStart={() => btnMove(1, 0)} ></button>
              <div />
            </div>
          </div>
        </div>

        <aside style={{ width: 240 }}>
          <div className="bg-black/30 p-3 rounded-lg border border-white/6 mb-3">
            <div className="text-sm text-muted-foreground">𝚂𝚝𝚊𝚝𝚞𝚜</div>
            <div className="text-lg font-bold text-primary mt-1">{message ?? (running ? "Running" : "Ready")}</div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center justify-between">𝚃𝚒𝚖𝚎 𝙻𝚎𝚏𝚝</div>
            <div className="text-lg font-bold">{timeLeft}s</div>
            <div className="mt-2 text-xs text-muted-foreground">𝙼𝚘𝚟𝚎𝚜 𝙻𝚎𝚏𝚝</div>
            <div className="text-lg font-bold">{movesLeft}</div>
            <div className="mt-2 text-xs text-muted-foreground">𝙷𝚒𝚗𝚝𝚜 𝙻𝚎𝚏𝚝</div>
            <div className="text-lg font-bold">{hintUsesLeft}</div>
            <div className="mt-3">
              <Button variant="neon" onClick={() => useHint()} disabled={!running || hintUsesLeft <= 0}>Use Hint</Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">𝙶𝚘𝚊𝚕</div>
            <div className="text-sm">𝙵𝚒𝚗𝚍 & 𝚛𝚎𝚊𝚌𝚑 𝚝𝚑𝚎 𝚐𝚕𝚘𝚠𝚒𝚗𝚐 𝚎𝚡𝚒𝚝 𝚝𝚒𝚕𝚎 𝚋𝚎𝚏𝚘𝚛𝚎 𝚝𝚒𝚖𝚎 𝚘𝚛 𝚖𝚘𝚟𝚎𝚜 𝚛𝚞𝚗 𝚘𝚞𝚝.</div>
          </div>

          <div className="h-[89px] bg-card/20 p-3 rounded-lg border border-border">
            <div className="text-xs text-muted-foreground">𝙻𝚎𝚐𝚎𝚗𝚍</div>
            <div className="flex gap-2 items-center mt-2 ">
              <div style={{ width: 18, height: 18, background: "#fb7185", borderRadius: 6 }} />
              <div className="text-xs">𝚈𝚘𝚞</div>
              <div style={{ width: 18, height: 18, background: "#34D399", borderRadius: 6 }} />
              <div className="text-xs">𝙴𝚡𝚒𝚝 </div>
            </div>
            
            <div className="flex gap-2 items-center mt-2">
              <div style={{ width: 18, height: 18, background: "#6366F1", borderRadius: 6 }} />
              <div className="text-xs">𝙷𝚒𝚗𝚝 𝚙𝚊𝚝𝚑</div>
            </div>
          </div>

        </aside>
      </div>
    </div>
  );
}
