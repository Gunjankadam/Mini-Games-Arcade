import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Cell = {
  n: number;
  idx: number; // 0..24
};

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function NumberGuess() {
  const POOL = useMemo(() => Array.from({ length: 25 }, (_, i) => i + 1), []);
  const [playerBoard, setPlayerBoard] = useState<Cell[]>([]);
  const [cpuBoard, setCpuBoard] = useState<Cell[]>([]);
  const [drawPool, setDrawPool] = useState<number[]>([]);
  const [drawn, setDrawn] = useState<number[]>([]);
  const [lastDraw, setLastDraw] = useState<number | null>(null);
  const [playerMarks, setPlayerMarks] = useState<Set<number>>(new Set());
  const [cpuMarks, setCpuMarks] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<'player' | 'cpu' | 'tie' | null>(null);
  const [playerCall, setPlayerCall] = useState<string>(''); // player's manual call input
  const autoRef = useRef<number | null>(null);
  // kept for parity with earlier code (unused auto)
  const [auto, setAuto] = useState(false);

  // create a board: shuffled 1..25 with index
  const makeBoard = (): Cell[] => {
    const shuffled = shuffle(POOL);
    return shuffled.map((n, idx) => ({ n, idx }));
  };

  const start = () => {
    const p = makeBoard();
    const c = makeBoard();
    const pool = shuffle(POOL);
    setPlayerBoard(p);
    setCpuBoard(c);
    setDrawPool(pool);
    setDrawn([]);
    setLastDraw(null);
    setPlayerMarks(new Set());
    setCpuMarks(new Set());
    setWinner(null);
    setRunning(true);
    setPlayerCall('');
    setAuto(false);
  };

  useEffect(() => {
    // cleanup on unmount
    return () => {
      if (autoRef.current) window.clearInterval(autoRef.current);
      autoRef.current = null;
    };
  }, []);

  const markNumber = (n: number, board: Cell[], marks: Set<number>) => {
    const found = board.find(c => c.n === n);
    if (found) marks.add(found.idx);
  };

  const checkBingo = (marks: Set<number>) => {
    // rows
    for (let r = 0; r < 5; r++) {
      let ok = true;
      for (let c = 0; c < 5; c++) {
        if (!marks.has(r * 5 + c)) { ok = false; break; }
      }
      if (ok) return true;
    }
    // cols
    for (let c = 0; c < 5; c++) {
      let ok = true;
      for (let r = 0; r < 5; r++) {
        if (!marks.has(r * 5 + c)) { ok = false; break; }
      }
      if (ok) return true;
    }
    // diag TL-BR
    let ok = true;
    for (let i = 0; i < 5; i++) if (!marks.has(i * 5 + i)) ok = false;
    if (ok) return true;
    // diag TR-BL
    ok = true;
    for (let i = 0; i < 5; i++) if (!marks.has(i * 5 + (4 - i))) ok = false;
    if (ok) return true;

    return false;
  };

  // CPU advantage: pick number from pool that is on CPU board and maximizes progress
  const chooseCpuNumberAdvantageous = (pool: number[], cpuBd: Cell[], cpuMk: Set<number>): number | null => {
    // candidates on CPU board still in pool
    const candidates = pool.filter(n => cpuBd.some(c => c.n === n));
    if (candidates.length === 0) return null;

    // For each candidate, simulate marking and compute best line progress (max count in any row/col/diag)
    const scoreForCandidate = (candidate: number) => {
      const marks = new Set(cpuMk);
      const found = cpuBd.find(c => c.n === candidate);
      if (found) marks.add(found.idx);

      // compute max count in any row/col/diag
      let maxCount = 0;
      // rows
      for (let r = 0; r < 5; r++) {
        let cnt = 0;
        for (let c = 0; c < 5; c++) if (marks.has(r * 5 + c)) cnt++;
        if (cnt > maxCount) maxCount = cnt;
      }
      // cols
      for (let c = 0; c < 5; c++) {
        let cnt = 0;
        for (let r = 0; r < 5; r++) if (marks.has(r * 5 + c)) cnt++;
        if (cnt > maxCount) maxCount = cnt;
      }
      // diag TL-BR
      let cnt = 0;
      for (let i = 0; i < 5; i++) if (marks.has(i * 5 + i)) cnt++;
      if (cnt > maxCount) maxCount = cnt;
      // diag TR-BL
      cnt = 0;
      for (let i = 0; i < 5; i++) if (marks.has(i * 5 + (4 - i))) cnt++;
      if (cnt > maxCount) maxCount = cnt;

      return maxCount;
    };

    // evaluate candidates and pick highest score (ties -> random among top)
    let bestScore = -1;
    const topCandidates: number[] = [];
    for (const cand of candidates) {
      const s = scoreForCandidate(cand);
      if (s > bestScore) {
        bestScore = s;
        topCandidates.length = 0;
        topCandidates.push(cand);
      } else if (s === bestScore) {
        topCandidates.push(cand);
      }
    }
    if (topCandidates.length === 0) return null;
    return topCandidates[Math.floor(Math.random() * topCandidates.length)];
  };

  // Player calls a number manually. After player's call, CPU immediately picks advantageous number.
  const callNumber = () => {
    if (!running || winner) return;
    const n = parseInt(playerCall);
    if (Number.isNaN(n) || n < 1 || n > 25) {
      // invalid — just clear
      setPlayerCall('');
      return;
    }
    // if already drawn -> ignore
    if (drawn.includes(n)) {
      setPlayerCall('');
      return;
    }

    // Ensure it's in pool
    setDrawPool(prevPool => {
      if (!prevPool.includes(n)) {
        setPlayerCall('');
        return prevPool;
      }
      const newPool = prevPool.filter(x => x !== n);
      // mark player's number
      setDrawn(d => [...d, n]);
      setLastDraw(n);
      setPlayerMarks(pm => {
        const next = new Set(pm);
        markNumber(n, playerBoard, next);
        return next;
      });

      // after player's mark, check if player wins immediately
      setTimeout(() => {
        setPlayerMarks(pmSnap => {
          const playerWinsNow = checkBingo(pmSnap);
          if (playerWinsNow) {
            setWinner('player');
            setRunning(false);
            setPlayerCall('');
            return pmSnap;
          }

          // CPU picks from remaining newPool
          const cpuChoice = chooseCpuNumberAdvantageous(newPool, cpuBoard, cpuMarks);
          let chosen = cpuChoice;
          if (chosen === null) {
            // pick random from pool
            if (newPool.length > 0) chosen = newPool[Math.floor(Math.random() * newPool.length)];
          }
          if (chosen != null) {
            // remove chosen from pool and mark
            setDrawPool(poolAfterCpu => poolAfterCpu.filter(x => x !== chosen));
            setDrawn(d => [...d, chosen as number]);
            setLastDraw(chosen as number);

            // --- NEW: mark CPU choice on BOTH cpuMarks AND playerMarks ---
            setCpuMarks(cm => {
              const next = new Set(cm);
              markNumber(chosen as number, cpuBoard, next);
              return next;
            });
            setPlayerMarks(pm => {
              const next = new Set(pm);
              markNumber(chosen as number, playerBoard, next);
              return next;
            });
            // --- end NEW ---
          }
          // After CPU mark, check wins
          setTimeout(() => {
            setCpuMarks(cmSnap => {
              const cpuWinsNow = checkBingo(cmSnap);
              setPlayerMarks(pmSnap2 => {
                const playerWinsAfter = checkBingo(pmSnap2);
                if (playerWinsAfter && cpuWinsNow) setWinner('tie');
                else if (playerWinsAfter) setWinner('player');
                else if (cpuWinsNow) setWinner('cpu');
                if ((playerWinsAfter || cpuWinsNow) && (playerWinsAfter || cpuWinsNow)) {
                  setRunning(false);
                }
                return pmSnap2;
              });
              return cmSnap;
            });
          }, 10);
          return pmSnap;
        });
      }, 10);

      setPlayerCall('');
      return newPool;
    });
  };

  const reset = () => {
    setRunning(false);
    setAuto(false);
    setDrawPool([]);
    setDrawn([]);
    setLastDraw(null);
    setPlayerBoard([]);
    setCpuBoard([]);
    setPlayerMarks(new Set());
    setCpuMarks(new Set());
    setWinner(null);
    setPlayerCall('');
  };

  // helper to render a board as 5x5 (player only)
  const renderBoard = (board: Cell[], marks: Set<number>) => {
    return (
      <div className="grid grid-cols-5 gap-2">
        {board.map((c) => {
          const marked = marks.has(c.idx);
          return (
            <div
              key={c.idx}
              className={cn(
                'w-12 h-12 rounded-md flex items-center justify-center font-bold text-sm transition-shadow',
                marked ? 'bg-neon-green/20 border border-neon-green shadow-[0_0_10px_rgba(34,197,94,0.12)] text-neon-green' : 'bg-card border border-border text-white/90'
              )}
            >
              {c.n}
            </div>
          );
        })}
      </div>
    );
  };

  const statusText = () => {
    if (!running && !playerBoard.length) return '𝙿𝚛𝚎𝚜𝚜 𝚂𝚝𝚊𝚛𝚝 𝚝𝚘 𝚍𝚎𝚊𝚕 𝚋𝚘𝚊𝚛𝚍𝚜';
    if (winner === 'player') return '𝚈𝚘𝚞 𝙱𝚒𝚗𝚐𝚘!';
    if (winner === 'cpu') return '𝙲𝙿𝚄 𝙱𝚒𝚗𝚐𝚘 — 𝚢𝚘𝚞 𝚕𝚘𝚜𝚎.';
    if (winner === 'tie') return '𝚃𝚒𝚎!';
    if (running) return `𝙻𝚊𝚜𝚝: ${lastDraw ?? '-'} • 𝚁𝚎𝚖𝚊𝚒𝚗𝚒𝚗𝚐: ${drawPool.length}`;
    return '𝚁𝚎𝚊𝚍𝚢 — 𝚌𝚊𝚕𝚕 𝚊 𝚗𝚞𝚖𝚋𝚎𝚛';
  };

  return (
    <div className="w-[900px] mx-auto p-4 p-6 bg-black">
      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-display text-white"></h3>
            <div className="text-xs text-muted-foreground mt-1">{statusText()}</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="neon" onClick={start}>Start</Button>
            {/* Draw Next removed per request */}
            <Button variant="neon" onClick={reset}>Reset</Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 items-start">
          <div>
            <div className="text-sm text-muted-foreground mb-2">𝐘𝐎𝐔:</div>
            <div className="p-3 rounded-lg bg-card border border-border">
              {playerBoard.length ? renderBoard(playerBoard, playerMarks) : <div className="text-s text-muted-foreground">𝙱𝚘𝚊𝚛𝚍 𝚠𝚒𝚕𝚕 𝚊𝚙𝚙𝚎𝚊𝚛 𝚊𝚏𝚝𝚎𝚛 𝚂𝚝𝚊𝚛𝚝</div>}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="text-sm text-muted-foreground">𝐃𝐑𝐀𝐖𝐍:</div>
            <div className="w-20 h-20 rounded-md flex items-center justify-center bg-card border border-border text-2xl font-bold">
              {lastDraw ?? '-'}
            </div>

            <div className="text-xs text-muted-foreground">𝚁𝚎𝚖𝚊𝚒𝚗𝚒𝚗𝚐: {drawPool.length}</div>

            <div className="w-36 h-28 overflow-auto p-2 bg-card border border-border rounded">
              <div className="text-xs text-muted-foreground mb-1">𝐇𝐢𝐬𝐭𝐨𝐫𝐲</div>
              <div className="flex flex-wrap gap-1">
                {drawn.map((n, i) => (
                  <div key={i} className="w-8 h-6 text-xs flex items-center justify-center rounded bg-white/6">{n}</div>
                ))}
              </div>
            </div>

            {/* Player call input */}
            <div className="mt-2 w-full">
              <div className="text-xs text-muted-foreground mb-1">𝙲𝚑𝚘𝚘𝚜𝚎 𝚊 𝚗𝚞𝚖𝚋𝚎𝚛 -</div>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={playerCall}
                  onChange={(e) => setPlayerCall(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && callNumber()}
                  placeholder=""
                  className="w-20 bg-transparent border border-white/10 rounded px-2 py-1 text-white"
                />
                <Button variant="neon" onClick={callNumber} disabled={!running || !!winner}>Call Number</Button>
              </div>
            </div>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-2"> 𝐂𝐏𝐔:</div>
            <div className="p-2 rounded-lg bg-card border border-border">
              {/*<div className="text-xs text-muted-foreground"></div>*/}
              <div className="text-s text-muted-foreground">𝙲𝙿𝚄 𝚖𝚊𝚛𝚔𝚜: <strong>{cpuMarks.size}</strong></div>
            </div>
          </div>
        </div>

        {winner && (
          <div className="mt-4 text-center">
            <div className={cn('text-lg font-bold', winner === 'player' ? 'text-neon-green' : winner === 'cpu' ? 'text-neon-pink' : 'text-primary')}>
              {winner === 'player' ? 'You win Bingo!' : winner === 'cpu' ? 'CPU wins — better luck!' : 'It\'s a tie!'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Draws performed: {drawn.length}</div>
          </div>
        )}
      </div>
    </div>
  );
}
