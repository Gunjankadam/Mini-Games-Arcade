import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
const DIRS: Dir[] = ["UP", "DOWN", "LEFT", "RIGHT"];

const ICONS: Record<Dir, string> = {
  UP: "↑",
  DOWN: "↓",
  LEFT: "←",
  RIGHT: "→",
};

function opposite(d: Dir): Dir {
  if (d === "UP") return "DOWN";
  if (d === "DOWN") return "UP";
  if (d === "LEFT") return "RIGHT";
  return "LEFT";
}

export function FlipDash(): JSX.Element {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<Dir | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [best, setBest] = useState<number>(() => Number(localStorage.getItem("flipdash_best") || 0));
  const [intervalMs, setIntervalMs] = useState(1200);
  const [round, setRound] = useState(1);
  const timerRef = useRef<number | null>(null);
  const awaitingRef = useRef(true);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const pickNext = () => {
    // pick a random direction
    const d = DIRS[Math.floor(Math.random() * DIRS.length)];
    setCurrent(d);
    awaitingRef.current = true;
  };

  const start = () => {
    setScore(0);
    setCombo(0);
    setRound(1);
    setIntervalMs(1500);
    setRunning(true);
    pickNext();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      // advance round - if player didn't respond in time, break combo
      if (awaitingRef.current) {
        setCombo(0);
        setScore(s => Math.max(0, s - 1));
      }
      pickNext();
      setRound(r => r + 1);
      // speed up slightly every few rounds
      setIntervalMs(prev => Math.max(320, prev - 12));
    }, intervalMs);
  };

  // keep interval in sync when intervalMs changes
  useEffect(() => {
    if (!running) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (awaitingRef.current) {
        setCombo(0);
        setScore(s => Math.max(0, s - 1));
      }
      pickNext();
      setRound(r => r + 1);
      setIntervalMs(prev => Math.max(320, prev - 12));
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, running]);

  const stop = () => {
    setRunning(false);
    setCurrent(null);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (score > best) {
      setBest(score);
      localStorage.setItem("flipdash_best", String(score));
    }
    awaitingRef.current = true;
  };

  const press = (d: Dir) => {
    if (!running || !current) return;
    const required = opposite(current);
    if (!awaitingRef.current) return; // already answered / waiting
    awaitingRef.current = false;
    if (d === required) {
      // correct
      setCombo(c => c + 1);
      setScore(s => s + 1 + Math.floor(combo / 3)); // combo bonus
      // quick immediate next after short delay
      setTimeout(() => { pickNext(); awaitingRef.current = true; }, Math.max(120, intervalMs / 3));
    } else {
      // wrong
      setCombo(0);
      setScore(s => Math.max(0, s - 1));
      // show next after small pause
      setTimeout(() => { pickNext(); awaitingRef.current = true; }, 420);
    }
  };

  // keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!running || !current) return;
      if (["ArrowUp", "w"].includes(e.key)) press("UP");
      if (["ArrowDown", "s"].includes(e.key)) press("DOWN");
      if (["ArrowLeft", "a"].includes(e.key)) press("LEFT");
      if (["ArrowRight", "d"].includes(e.key)) press("RIGHT");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, current, combo]);

  return (
    <div className="w-[520px] mx-auto p-4 bg-black rounded-2xl p-6 bg-black">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">𝚀𝚞𝚒𝚌𝚔 𝚛𝚎𝚏𝚕𝚎𝚡 & 𝚛𝚎𝚟𝚎𝚛𝚜𝚎 𝚕𝚘𝚐𝚒𝚌</div>
          <Button variant="neon" onClick={() => { if (!running) start(); }}>Start</Button>
          <Button variant="neon" onClick={() => stop()}>Stop</Button>
        </div>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-muted-foreground">𝚁𝚘𝚞𝚗𝚍</div>
            <div className="text-lg font-bold">{round}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">𝚂𝚌𝚘𝚛𝚎</div>
            <div className="text-2xl font-bold text-primary">{score}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">𝙲𝚘𝚖𝚋𝚘</div>
            <div className="text-lg font-bold text-neon-cyan">{combo}x</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">𝙱𝚎𝚜𝚝</div>
            <div className="text-lg font-bold text-neon-pink">{best}</div>
          </div>
        </div>

        <div className="flex items-center justify-center mb-4" style={{ minHeight: 120 }}>
          <div className={cn("w-36 h-36 rounded-2xl flex items-center justify-center text-6xl font-bold border-2", awaitingRef.current ? "border-primary" : "border-white/10")}>
            {current ? ICONS[current] : "—"}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <button onClick={() => press("UP")} className="p-4 rounded-2xl bg-white/3 hover:scale-105">↑</button>
          <button onClick={() => press("LEFT")} className="p-4 rounded-2xl bg-white/3 hover:scale-105">←</button>
          <button onClick={() => press("RIGHT")} className="p-4 rounded-2xl bg-white/3 hover:scale-105">→</button>
          <button onClick={() => press("DOWN")} className="p-4 rounded-2xl bg-white/3 hover:scale-105">↓</button>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          𝚁𝚞𝚕𝚎𝚜: 𝙰𝚗 𝚊𝚛𝚛𝚘𝚠 𝚊𝚙𝚙𝚎𝚊𝚛𝚜. 𝚈𝚘𝚞 𝚖𝚞𝚜𝚝 𝚙𝚛𝚎𝚜𝚜 𝚝𝚑𝚎 <strong>𝚘𝚙𝚙𝚘𝚜𝚒𝚝𝚎</strong> 𝚍𝚒𝚛𝚎𝚌𝚝𝚒𝚘𝚗. 𝚂𝚙𝚎𝚎𝚍 𝚒𝚗𝚌𝚛𝚎𝚊𝚜𝚎𝚜 𝚐𝚛𝚊𝚍𝚞𝚊𝚕𝚕𝚢. 𝙲𝚘𝚛𝚛𝚎𝚌𝚝 𝚊𝚗𝚜𝚠𝚎𝚛𝚜 𝚋𝚞𝚒𝚕𝚍 𝚌𝚘𝚖𝚋𝚘 𝚊𝚗𝚍 𝚐𝚒𝚟𝚎 𝚋𝚘𝚗𝚞𝚜 𝚙𝚘𝚒𝚗𝚝𝚜.
        </div>
      </div>
    </div>
  );
}
