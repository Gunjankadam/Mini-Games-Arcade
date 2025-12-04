import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'batting' | 'bowling' | 'finished';

export function NumberPlayMiniCricket() {
  const MAX_BALLS = 10;
  const [phase, setPhase] = useState<Phase>('idle');

  // inning 1 (player batting)
  const [playerScore, setPlayerScore] = useState(0);
  const [playerBalls, setPlayerBalls] = useState(MAX_BALLS);
  const [playerOutBy, setPlayerOutBy] = useState<number | null>(null); // computer number that got player out

  // inning 2 (player bowling)
  const [cpuScore, setCpuScore] = useState(0);
  const [cpuBalls, setCpuBalls] = useState(MAX_BALLS);
  const [cpuOutBy, setCpuOutBy] = useState<number | null>(null); // player's guess that got cpu out

  // result message
  const [message, setMessage] = useState<string>('Press Start to bat first!');

  // helper: random 1..10
  const rand = () => Math.floor(Math.random() * 10) + 1;

  const startGame = () => {
    // reset everything and start batting
    setPhase('batting');
    setPlayerScore(0);
    setPlayerBalls(MAX_BALLS);
    setPlayerOutBy(null);
    setCpuScore(0);
    setCpuBalls(MAX_BALLS);
    setCpuOutBy(null);
    setMessage('You are batting — pick a number (1–10)');
  };

  // player chooses a number while batting
  const playerBat = (n: number) => {
    if (phase !== 'batting') return;
    if (playerBalls <= 0) return;

    const cpuPick = rand();
    // out if equal
    if (cpuPick === n) {
      setPlayerOutBy(cpuPick);
      setPlayerBalls(0);
      setMessage(`OUT! Computer picked ${cpuPick}. Your score: ${playerScore}`);
      // move to bowling after a tiny delay to let user read
      setTimeout(() => {
        setPhase('bowling');
        setMessage(`Now bowl — defend ${playerScore} runs. Guess CPU's number 1–10.`);
      }, 350);
      return;
    }

    // not out — add to score and decrement ball
    setPlayerScore(s => s + n);
    setPlayerBalls(b => b - 1);

    // if balls exhausted after this ball, move to bowling
    if (playerBalls - 1 <= 0) {
      setMessage(`Over! Your final score: ${playerScore + n}. Now bowl to stop the CPU.`);
      setTimeout(() => {
        setPhase('bowling');
        setMessage(`Now bowl — defend ${playerScore + n} runs. Guess CPU's number 1–10.`);
      }, 350);
    } else {
      setMessage(`Good shot! Computer picked ${cpuPick}. You scored ${n}. Balls left: ${playerBalls - 1}`);
    }
  };

  // player guesses while bowling
  const playerBowl = (guess: number) => {
    if (phase !== 'bowling') return;
    if (cpuBalls <= 0) return;

    const cpuPick = rand();
    // if guess equals cpuPick -> cpu out -> player wins (if cpu hasn't reached target yet)
    if (guess === cpuPick) {
      setCpuOutBy(guess);
      setCpuBalls(0);
      setMessage(`Nice! You bowled them out. CPU picked ${cpuPick}. You defended ${playerScore} runs — You win!`);
      setPhase('finished');
      return;
    }

    // cpu not out — add cpuPick to cpuScore
    setCpuScore(s => {
      const next = s + cpuPick;
      // check if cpu reached or exceeded target -> cpu wins
      if (next >= playerScore) {
        setMessage(`CPU scored ${cpuPick} (guess ${guess}) and reached ${next} — CPU wins!`);
        setPhase('finished');
        // ensure balls reflect end
        setCpuBalls(0);
        return next;
      } else {
        // continue
        setMessage(`CPU scored ${cpuPick} (your guess ${guess}). CPU total: ${next}. Balls left: ${cpuBalls - 1}`);
        setCpuBalls(b => b - 1);
        // if balls now 0 after decrement, game ends — compare scores
        if (cpuBalls - 1 <= 0) {
          setTimeout(() => {
            // compute final result
            if (next >= playerScore) {
              setMessage(`End of innings. CPU reached ${next} — CPU wins.`);
            } else if (next < playerScore) {
              setMessage(`End of innings. CPU ${next} vs You ${playerScore} — You win!`);
            }
            setPhase('finished');
          }, 180);
        }
        return next;
      }
    });
  };

  const restart = () => {
    setPhase('idle');
    setPlayerScore(0);
    setPlayerBalls(MAX_BALLS);
    setPlayerOutBy(null);
    setCpuScore(0);
    setCpuBalls(MAX_BALLS);
    setCpuOutBy(null);
    setMessage('Press Start to bat first!');
  };

  // small UI helpers
  const renderNumbers = (onClick: (n: number) => void, disabled = false) => {
    return (
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          return (
            <button
              key={n}
              onClick={() => onClick(n)}
              disabled={disabled}
              className={cn(
                'w-12 h-12 rounded-lg font-bold transition transform duration-150',
                disabled ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105',
                'bg-card border border-border'
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    );
  };

  // --- bat and ball image URLs ---
  const BAT_URL = "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764849949/cricket-bat_y20taa.png";
  const BALL_URL = "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764849950/tennis_nsgw8m.png";

  return (
    <div className="flex flex-col items-center gap-4 p-4 p-6 bg-black">
      <div className="w-[500px] h-[490px] max-w-lg bg-white/5 p-4 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm text-muted-foreground"></div>
            <div className="text-lg font-bold text-foreground">
              𝐏𝐇𝐀𝐒𝐄: <span className="text-primary">{phase === 'idle' ? 'Idle' : phase === 'batting' ? 'You Bat' : phase === 'bowling' ? 'You Bowl' : 'Finished'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">𝚈𝚘𝚞𝚛 𝚛𝚞𝚗𝚜 :</div>
            <div className="text-xl font-bold text-neon-cyan">{playerScore}</div>
            <div className="text-xs text-muted-foreground">𝙲𝙿𝚄 𝚛𝚞𝚗𝚜 :</div>
            <div className="text-xl font-bold text-neon-pink">{cpuScore}</div>
            <Button variant="neon" onClick={restart}>Reset</Button>
            <Button variant="neon" onClick={startGame}>Start</Button>
          </div>
        </div>

        <div className="mb-3">
          <div className="text-sm text-muted-foreground mb-1">𝗠𝗲𝘀𝘀𝗮𝗴𝗲 :</div>
          <div className="p-3 rounded-md bg-card border border-border">{message}</div>
        </div>

        {/* --- UPDATED UI: batting with bat image and bowling with ball image --- */}
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* BATTING */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img
                src={BAT_URL}
                alt="bat"
                className="w-8 h-8 animate-bounce drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]"
              />
              <div className="text-xl text-muted-foreground">𝐁𝐀𝐓𝐓𝚰𝐍𝐆 (𝚈𝚘𝚞)</div>
            </div>

            <div className="mb-2">𝗕𝗮𝗹𝗹𝘀 𝗹𝗲𝗳𝘁: <strong>{playerBalls}</strong></div>

            <div className="mb-3">
              {phase === 'batting' ? (
                renderNumbers(playerBat, false)
              ) : (
                <div className="text-xs text-muted-foreground">𝐁𝐚𝐭𝐭𝐢𝐧𝐠 𝐜𝐥𝐨𝐬𝐞𝐝</div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">𝗢𝘂𝘁 𝗯𝘆: {playerOutBy ?? '-'}</div>
            <div className="text-sm text-muted-foreground">𝗦𝗰𝗼𝗿𝗲: <strong>{playerScore}</strong></div>
          </div>

          {/* BOWLING */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img
                src={BALL_URL}
                alt="ball"
                className="w-8 h-8 animate-bounce drop-shadow-[0_0_8px_rgba(255,255,0,0.4)]"
              />
              <div className="text-xl text-muted-foreground">𝐁𝐎𝐖𝐋𝐈𝐍𝐆 (𝚈𝚘𝚞)</div>
            </div>

            <div className="mb-2">𝗕𝗮𝗹𝗹𝘀 𝗹𝗲𝗳𝘁: <strong>{cpuBalls}</strong></div>

            <div className="mb-3">
              {phase === 'bowling' ? (
                renderNumbers(playerBowl, false)
              ) : (
                <div className="text-xs text-muted-foreground">𝐁𝐨𝐰𝐥𝐢𝐧𝐠 𝐜𝐥𝐨𝐬𝐞𝐝</div>
              )}
            </div>

            <div className="text-sm text-muted-foreground">𝗖𝗣𝗨 𝗼𝘂𝘁 𝗯𝘆 𝗴𝘂𝗲𝘀𝘀: {cpuOutBy ?? '-'}</div>
            <div className="text-sm text-muted-foreground">𝗖𝗣𝗨 𝗦𝗰𝗼𝗿𝗲: <strong>{cpuScore}</strong></div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">𝗧𝗮𝗿𝗴𝗲𝘁 𝘁𝗼 𝗰𝗵𝗮𝘀𝗲 (𝘄𝗵𝗲𝗻 𝗯𝗼𝘄𝗹𝗶𝗻𝗴): <strong>{playerScore}</strong></div>
          <div className="text-sm text-muted-foreground">𝗠𝗮𝘅 𝗯𝗮𝗹𝗹𝘀 𝗽𝗲𝗿 𝗶𝗻𝗻𝗶𝗻𝗴: <strong>{MAX_BALLS}</strong></div>
        </div>

        <style>{`
          @keyframes pulse-glow {
            0% { filter: drop-shadow(0 0 4px rgba(255,255,255,0.3)); }
            50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.7)); }
            100% { filter: drop-shadow(0 0 4px rgba(255,255,255,0.3)); }
          }
          .animate-pulse { animation: pulse-glow 2s infinite; }
        `}</style>
      </div>
    </div>
  );
}
