import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Choice = "rock" | "paper" | "scissors";

// <-- image URLs you provided (mapped to choices)
const IMAGE_URLS: Record<Choice, string> = {
  scissors: "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764848875/scissors_a0mkws.png",
  rock:     "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764848875/stone_gdath5.png",
  paper:    "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764848875/scroll_t6t78n.png",
};

const choices: { value: Choice; emoji: string; label: string }[] = [
  { value: "rock", emoji: "✊", label: "Rock" },
  { value: "paper", emoji: "✋", label: "Paper" },
  { value: "scissors", emoji: "✌️", label: "Scissors" },
];

function decideWinner(p: Choice, c: Choice): "player" | "computer" | "tie" {
  if (p === c) return "tie";
  if (
    (p === "rock" && c === "scissors") ||
    (p === "paper" && c === "rock") ||
    (p === "scissors" && c === "paper")
  ) {
    return "player";
  }
  return "computer";
}

export function RockPaperScissors() {
  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [computerChoice, setComputerChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<string>("");
  const [score, setScore] = useState({ player: 0, computer: 0 });
  const [roundsToWin, setRoundsToWin] = useState(3); // best of (first to 3)
  const [round, setRound] = useState(1);
  const [isThinking, setIsThinking] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastRoundOutcome, setLastRoundOutcome] = useState<"player" | "computer" | "tie" | null>(null);

  // audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      try {
        audioCtxRef.current?.close();
      } catch {}
    };
  }, []);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      try {
        const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
        const g = ac.createGain();
        g.gain.value = 0.08;
        g.connect(ac.destination);
        audioCtxRef.current = ac;
        masterGain.current = g;
      } catch {
        audioCtxRef.current = null;
      }
    }
  };

  const playBeep = (freq: number, time = 0.12) => {
    try {
      ensureAudio();
      const ac = audioCtxRef.current!;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(1, ac.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + time);
      o.connect(g);
      g.connect(masterGain.current!);
      o.start();
      o.stop(ac.currentTime + time + 0.02);
    } catch {
      // ignore audio errors
    }
  };

  // reset game
  const resetGame = () => {
    setPlayerChoice(null);
    setComputerChoice(null);
    setResult("");
    setScore({ player: 0, computer: 0 });
    setRound(1);
    setIsThinking(false);
    setIsAnimating(false);
    setLastRoundOutcome(null);
  };

  // quick visual confetti (DOM SVG) for wins - returned inline where used
  const Confetti = ({ show }: { show: boolean }) =>
    show ? (
      <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 200 80" preserveAspectRatio="none">
        <g opacity="0.9">
          <circle cx="10" cy="10" r="3" fill="#FB7185" />
          <circle cx="40" cy="20" r="3" fill="#60A5FA" />
          <rect x="70" y="8" width="4" height="4" fill="#34D399" rx="1" />
          <circle cx="110" cy="18" r="3" fill="#F59E0B" />
          <rect x="150" y="6" width="4" height="4" fill="#A78BFA" rx="1" />
        </g>
      </svg>
    ) : null;

  // Play a round: animate hands, delay for "thinking", then decide
  const play = (choice: Choice) => {
    if (isAnimating) return;
    ensureAudio();
    setPlayerChoice(choice);
    setComputerChoice(null);
    setResult("");
    setIsThinking(true);
    setIsAnimating(true);

    // computer "thinks" with random delay
    const thinkDelay = 600 + Math.floor(Math.random() * 600); // 600-1200ms
    // small shaking / hand-clench audio during thinking
    playBeep(220, 0.07);

    setTimeout(() => {
      // pick computer choice
      const comp = choices[Math.floor(Math.random() * choices.length)].value;
      setComputerChoice(comp);
      playBeep(360, 0.12); // reveal tone

      const winner = decideWinner(choice, comp);
      if (winner === "tie") {
        setResult("It's a tie — rematch!");
        setLastRoundOutcome("tie");
        // small visual tie effect
        playBeep(180, 0.1);
      } else if (winner === "player") {
        setResult("You win this round! ");
        setScore((s) => ({ ...s, player: s.player + 1 }));
        setLastRoundOutcome("player");
        playBeep(720, 0.16);
      } else {
        setResult("Computer wins this round.");
        setScore((s) => ({ ...s, computer: s.computer + 1 }));
        setLastRoundOutcome("computer");
        playBeep(140, 0.16);
      }

      // small animation end and increment round (unless match already over)
      setTimeout(() => {
        setRound((r) => r + 1);
        setIsThinking(false);
        setIsAnimating(false);
      }, 380);
    }, thinkDelay);
  };

  // check for overall winner
  useEffect(() => {
    if (score.player >= roundsToWin) {
      setResult("You won the match! ");
      setIsAnimating(false);
    } else if (score.computer >= roundsToWin) {
      setResult("Computer won the match. Try again.");
      setIsAnimating(false);
    }
  }, [score, roundsToWin]);

  // Small helper to render big hand with realistic motion classes
  const Hand = ({ who, choice, highlight }: { who: "you" | "cpu"; choice: Choice | null; highlight?: boolean }) => {
    const isYou = who === "you";
    return (
      <div className={cn("flex flex-col items-center justify-center min-w-[96px] relative", isYou ? "order-1" : "order-3")}>
        <div className={cn(
          "w-28 h-28 rounded-xl bg-card border-2 border-border flex items-center justify-center text-5xl text-center transform transition-all duration-300",
          highlight ? "scale-110 shadow-[0_0_24px_rgba(96,165,250,0.18)]" : ""
        )}>
          {choice ? (
            <img src={IMAGE_URLS[choice]} alt={choice} className="w-16 h-16 object-contain" />
          ) : ""}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{isYou ? "You" : "CPU"}</div>
      </div>
    );
  };

  // small layout
  return (
    <div className="w-[540px] h-[455px] w-full flex flex-col items-center gap-4 p-6 bg-black">
      <div className="relative w-[510px] rounded-3xl p-4 bg-white/4 border border-white/8 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-display text-white"></h3>
            <div className="text-xs text-muted-foreground">𝙲𝚕𝚒𝚌𝚔 𝚊 𝚑𝚊𝚗𝚍 𝚝𝚘 𝚙𝚕𝚊𝚢 • 𝚛𝚎𝚊𝚕𝚒𝚜𝚝𝚒𝚌 𝚝𝚒𝚖𝚒𝚗𝚐 & 𝚛𝚎𝚟𝚎𝚊𝚕</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground text-right">
              {/*<div className="text-xs">Match</div>
              <div className="text-lg font-bold text-primary">{round <= 0 ? 1 : round}</div>*/}
            </div>

            <div className="text-sm text-muted-foreground text-right">
              {/*<div className="text-xs">First to</div>
              <div className="text-lg font-bold text-primary">{roundsToWin}</div>*/}
            </div>

            <Button variant="neon" onClick={resetGame}>Reset</Button>
          </div>
        </div>

        {/* board */}
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex flex-col items-start gap-1">
            <div className="text-xl text-muted-foreground">𝐘𝐎𝐔</div>
            <div className="text-2xl font-bold text-neon-cyan">{score.player}</div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <Hand who="you" choice={playerChoice} highlight={lastRoundOutcome === "player"} />
              {/*<div className="text-sm text-muted-foreground"></div>*/}
              <Hand who="cpu" choice={computerChoice} highlight={lastRoundOutcome === "computer"} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="text-xl text-muted-foreground">𝐂𝐏𝐔</div>
            <div className="text-2xl font-bold text-neon-pink">{score.computer}</div>
          </div>
        </div>

        {/* controls / choices */}
        <div className="flex items-center justify-center gap-3 mb-3">
          {choices.map(c => {
            const disabled = isThinking || (score.player >= roundsToWin) || (score.computer >= roundsToWin);
            return (
              <button
                key={c.value}
                onMouseDown={() => play(c.value)}
                disabled={disabled}
                className={cn(
                  "w-24 h-24 rounded-xl flex flex-col items-center justify-center text-4xl transition-transform duration-200 border-2",
                  disabled ? "opacity-60 cursor-not-allowed" : "hover:scale-105",
                  playerChoice === c.value ? "border-primary shadow-[0_0_18px_rgba(59,130,246,0.12)]" : "border-border",
                  c.value === "rock" ? "bg-gradient-to-br from-white/3 to-white/6" : ""
                )}
                title={c.label}
              >
                <img src={IMAGE_URLS[c.value]} alt={c.label} className="w-12 h-12 object-contain" />
                <div className="text-xs text-white/70 mt-1">{c.label}</div>
              </button>
            );
          })}
        </div>

        {/* settings */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">𝚁𝚘𝚞𝚗𝚍𝚜 𝚝𝚘 𝚠𝚒𝚗:</div>
            <input
              type="number"
              min={1}
              max={7}
              value={roundsToWin}
              onChange={(e) => setRoundsToWin(Math.max(1, Math.min(7, Number(e.target.value))))}
              className="w-16 bg-transparent border border-white/10 rounded px-2 py-1 text-white"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            {isThinking ? <span>𝙲𝙿𝚄 𝚒𝚜 𝚝𝚑𝚒𝚗𝚔𝚒𝚗𝚐...</span> : (score.player >= roundsToWin || score.computer >= roundsToWin) ? <span className="font-bold text-white">{result}</span> : <span>{result || "𝙼𝚊𝚔𝚎 𝚢𝚘𝚞𝚛 𝚖𝚘𝚟𝚎"}</span>}
          </div>
        </div>

        {/* confetti overlay for player win */}
        <div className="relative mt-2 h-6">
          <Confetti show={lastRoundOutcome === "player"} />
        </div>

        <style>{`
          .animate-fade { animation: fadeIn 260ms ease; }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
        `}</style>
      </div>
    </div>
  );
}
