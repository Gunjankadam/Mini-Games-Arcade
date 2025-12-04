import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;
type Color = typeof COLORS[number];

const colorStyles: Record<Color, { base: string; active: string; ring: string; tone: number }> = {
  red: { base: 'bg-red-700/50 border-red-400', active: 'bg-red-500 shadow-[0_0_28px_rgba(239,68,68,0.65)]', ring: 'ring-red-400/60', tone: 520 },
  blue: { base: 'bg-blue-700/50 border-blue-400', active: 'bg-blue-500 shadow-[0_0_28px_rgba(59,130,246,0.65)]', ring: 'ring-blue-400/60', tone: 410 },
  green: { base: 'bg-green-700/50 border-green-400', active: 'bg-green-500 shadow-[0_0_28px_rgba(34,197,94,0.65)]', ring: 'ring-green-400/60', tone: 330 },
  yellow: { base: 'bg-yellow-700/50 border-yellow-400', active: 'bg-yellow-500 shadow-[0_0_28px_rgba(250,204,21,0.65)]', ring: 'ring-yellow-400/60', tone: 260 },
};

type Difficulty = 'easy' | 'medium' | 'hard';

export function SimonSays() {
  const [sequence, setSequence] = useState<Color[]>([]);
  const [playerSequence, setPlayerSequence] = useState<Color[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [activeColor, setActiveColor] = useState<Color | null>(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [speedBoost, setSpeedBoost] = useState(0); // reduces flash duration as streak grows
  const [combo, setCombo] = useState(0);

  // sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);

  useEffect(() => {
    // lazy init audio when user interacts (some browsers disallow autoplay)
    return () => {
      if (audioCtxRef.current) {
        try { audioCtxRef.current.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  const toneFor = (color: Color) => colorStyles[color].tone;

  const playTone = useCallback((freq: number, duration = 140) => {
    try {
      if (!audioCtxRef.current) {
        const ac = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtxRef.current = ac;
        masterGain.current = ac.createGain();
        masterGain.current.gain.value = 0.12;
        masterGain.current.connect(ac.destination);
      }
      const ac = audioCtxRef.current!;
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ac.createGain();
      g.gain.setValueAtTime(0, ac.currentTime);
      g.gain.linearRampToValueAtTime(1, ac.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration / 1000);
      osc.connect(g);
      g.connect(masterGain.current!);
      osc.start();
      osc.stop(ac.currentTime + duration / 1000 + 0.02);
    } catch {
      // silent failure if audio unavailable
    }
  }, []);

  // difficulty settings
  const settings: Record<Difficulty, { flash: number; pause: number }> = {
    easy: { flash: 600, pause: 200 },
    medium: { flash: 460, pause: 160 },
    hard: { flash: 340, pause: 120 },
  };

  // helper: sleep
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

  // show sequence (async so we can await)
  const showSequence = useCallback(async (seq: Color[]) => {
    setIsShowingSequence(true);
    const baseFlash = settings[difficulty].flash;
    const basePause = settings[difficulty].pause;

    for (let i = 0; i < seq.length; i++) {
      const color = seq[i];
      // progressive speed boost based on combo and speedBoost counter
      const flash = Math.max(120, baseFlash - speedBoost * 20);
      setActiveColor(color);
      playTone(toneFor(color), Math.round(flash * 0.75));
      await sleep(flash);
      setActiveColor(null);
      await sleep(basePause);
    }
    // small final pause
    await sleep(120);
    setIsShowingSequence(false);
  }, [difficulty, playTone, speedBoost]);

  // add next random color
  const addNext = useCallback((prevSeq: Color[]) => {
    const next = COLORS[Math.floor(Math.random() * COLORS.length)];
    return [...prevSeq, next];
  }, []);

  // start game
  const startGame = useCallback(() => {
    // ensures audio context created on user gesture
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        masterGain.current = audioCtxRef.current.createGain();
        masterGain.current.gain.value = 0.12;
        masterGain.current.connect(audioCtxRef.current.destination);
      } catch {
        audioCtxRef.current = null;
      }
    }

    const first = COLORS[Math.floor(Math.random() * COLORS.length)];
    const seq = [first];
    setSequence(seq);
    setPlayerSequence([]);
    setScore(0);
    setGameOver(false);
    setIsPlaying(true);
    setCombo(0);
    setSpeedBoost(0);
    // show after tiny delay so UI updates
    setTimeout(() => showSequence(seq), 420);
  }, [showSequence]);

  // handle player's click/tap/keyboard input
  const handleColorInput = useCallback((color: Color) => {
    if (isShowingSequence || gameOver || !isPlaying) return;
    setPlayerSequence(prev => {
      const next = [...prev, color];
      const idx = next.length - 1;
      // play tone + flash
      setActiveColor(color);
      playTone(toneFor(color), 160);
      setTimeout(() => setActiveColor(null), 180);

      if (color !== sequence[idx]) {
        // wrong -> penalty & game over
        setGameOver(true);
        setIsPlaying(false);
        setCombo(0);
        // small negative feedback tone
        playTone(120, 220);
        return next;
      }

      // correct so far
      if (next.length === sequence.length) {
        // completed round
        const newScore = score + 1 + Math.floor(combo / 3); // combo bonus
        setScore(newScore);
        setCombo(c => c + 1);
        // every 3 combos speed up slightly
        setSpeedBoost(sb => {
          if ((combo + 1) % 3 === 0) return Math.min(6, sb + 1);
          return sb;
        });

        // add next color and replay after short wait
        const newSeq = addNext(sequence);
        setSequence(newSeq);
        setPlayerSequence([]);
        setTimeout(() => showSequence(newSeq), 650);
      }
      return next;
    });
  }, [isShowingSequence, gameOver, isPlaying, playTone, sequence, score, combo, addNext, showSequence]);

  // keyboard support (use keys: q,w,a,s mapped to colors)
  useEffect(() => {
    const map: Record<string, Color> = { q: 'red', w: 'blue', a: 'green', s: 'yellow' };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'r') {
        startGame();
        return;
      }
      if (map[k]) {
        handleColorInput(map[k]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleColorInput, startGame]);

  // quick "flash" helper for button visuals (mouse/touch)
  const onButtonDown = (c: Color) => {
    // do immediate visual + sound feedback for pressing even during sequence (but ignore input)
    setActiveColor(c);
    playTone(toneFor(c), 120);
    setTimeout(() => setActiveColor(null), 140);
  };

  // small confetti particles when combo high (visual only)
  const renderParticles = () => {
    // tiny inline SVG burst - purely decorative
    if (combo < 4) return null;
    return (
      <svg className="absolute -top-6 left-1/2 -translate-x-1/2 w-[160px] h-[40px] pointer-events-none" viewBox="0 0 160 40" fill="none">
        <circle cx="20" cy="20" r="4" fill="#fb7185" opacity="0.85" />
        <circle cx="40" cy="6" r="3" fill="#34d399" opacity="0.85" />
        <circle cx="60" cy="26" r="3" fill="#60a5fa" opacity="0.85" />
        <circle cx="100" cy="12" r="3" fill="#f59e0b" opacity="0.85" />
        <circle cx="140" cy="20" r="4" fill="#a78bfa" opacity="0.85" />
      </svg>
    );
  };

  // UI render
  return (
    <div className="min-w-[320px] flex flex-col items-center gap-4 p-6 bg-black">
      <div className="relative w-full max-w-xl rounded-3xl p-4 bg-white/3 border border-white/8 shadow-2xl backdrop-blur-sm">
        {/* header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xl font-display text-white"></h3>
            <div className="text-sm text-muted-foreground">𝚀 𝚆 𝙰 𝚂 𝚔𝚎𝚢𝚜 𝚊𝚕𝚜𝚘 𝚠𝚘𝚛𝚔 • 𝚁 𝚝𝚘 𝚛𝚎𝚜𝚝𝚊𝚛𝚝</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground text-right">𝐒𝐂𝐎𝐑𝐄:</div>
            <div className="text-lg font-bold text-primary">{score}</div>
            <Button variant="neon" onClick={startGame}>{isPlaying ? 'Restart' : 'Start'}</Button>
          </div>
        </div>

        {/* difficulty + combo */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Button variant={difficulty === 'easy' ? 'neon' : undefined} onClick={() => setDifficulty('easy')}>Easy</Button>
            <Button variant={difficulty === 'medium' ? 'neon' : undefined} onClick={() => setDifficulty('medium')}>Medium</Button>
            <Button variant={difficulty === 'hard' ? 'neon' : undefined} onClick={() => setDifficulty('hard')}>Hard</Button>
          </div>

          <div className="text-sm text-muted-foreground flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <div className="text-xs text-white/80">𝐂𝐎𝐌𝐁𝐎</div>
              <div className="text-sm font-bold text-neon-green">{combo}x</div>
            </div>

            <div className="w-36 h-2 bg-white/5 rounded overflow-hidden">
              <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-pink transition-[width] ease-linear"
                   style={{ width: `${Math.min(100, combo * 8)}%` }} />
            </div>
          </div>
        </div>

        {/* particles on combo */}
        <div className="relative flex items-center justify-center mb-2">
          {renderParticles()}
        </div>

        {/* grid */}
        <div className="grid grid-cols-2 gap-4 px-6 py-4">
          {COLORS.map((color) => {
            const isActive = activeColor === color || isShowingSequence && activeColor === color;
            return (
              <button
                key={color}
                onMouseDown={() => onButtonDown(color)}
                onTouchStart={() => onButtonDown(color)}
                onClick={() => handleColorInput(color)}
                disabled={isShowingSequence}
                aria-pressed={isActive}
                className={cn(
                  'relative flex items-center justify-center rounded-3xl border-4 transition-transform duration-150 active:scale-95',
                  'h-36 sm:h-44',
                  colorStyles[color].base,
                  isActive ? `${colorStyles[color].active} ${colorStyles[color].ring} ring-4` : 'hover:scale-105'
                )}
              >
                {/* subtle inner glow */}
                <div className={cn('absolute inset-0 rounded-3xl pointer-events-none', isActive ? 'opacity-100' : 'opacity-30')} style={{ boxShadow: isActive ? '0 0 30px rgba(255,255,255,0.04)' : 'none' }} />
                {/* label & key hint */}
                <div className="relative z-10 flex flex-col items-center gap-1">
                  <div className="text-2xl font-bold text-white/95 uppercase tracking-wide">{color}</div>
                  <div className="text-xs text-white/60">Key: {color === 'red' ? 'Q' : color === 'blue' ? 'W' : color === 'green' ? 'A' : 'S'}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* status */}
        <div className="flex items-center justify-between mt-3">
          <div>
            {isShowingSequence ? <span className="text-sm text-muted-foreground">𝚆𝚊𝚝𝚌𝚑𝚒𝚗𝚐 𝚜𝚎𝚚𝚞𝚎𝚗𝚌𝚎...</span>
              : gameOver ? <span className="text-sm text-destructive">𝚆𝚛𝚘𝚗𝚐! 𝙿𝚛𝚎𝚜𝚜 𝚂𝚝𝚊𝚛𝚝 𝚝𝚘 𝚝𝚛𝚢 𝚊𝚐𝚊𝚒𝚗.</span>
                : isPlaying ? <span className="text-sm text-white/80">𝚈𝚘𝚞𝚛 𝚝𝚞𝚛𝚗</span> : <span className="text-sm text-white/80">𝚁𝚎𝚊𝚍𝚢</span>}
          </div>

          <div className="text-sm text-muted-foreground">𝐒𝐓𝐑𝐄𝐀𝐊: <span className="font-bold text-neon-green">{combo}</span></div>
        </div>

        {/* CSS tweaks */}
        <style>{`
          .neon-boost .bg-white\\/3 { background-color: rgba(255,255,255,0.04) !important; }
          .from-neon-cyan { background-image: linear-gradient(90deg,#06b6d4,#60a5fa); }
          .to-neon-pink { background-image: linear-gradient(90deg,#fb7185,#a78bfa); }
        `}</style>
      </div>
    </div>
  );
}
