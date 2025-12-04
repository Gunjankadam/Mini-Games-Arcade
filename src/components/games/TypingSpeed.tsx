import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sentences = [
  "The quick brown fox jumps over the lazy dog",
  "Pack my box with five dozen liquor jugs",
  "How vexingly quick daft zebras jump",
  "The five boxing wizards jump quickly",
  "Sphinx of black quartz judge my vow",
  "Two driven jocks help fax my big quiz",
  "The jay pig fox and zebra quit",
  "Crazy Frederick bought many very exquisite opal jewels",
];

type Mode = 'practice' | 'timed';

export function TypingSpeed() {
  const [text, setText] = useState('');
  const [target, setTarget] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [mode, setMode] = useState<Mode>('practice');
  const [duration, setDuration] = useState(60); // for timed mode
  const [timeLeft, setTimeLeft] = useState(60);
  const [bestWpm, setBestWpm] = useState<number>(() => Number(localStorage.getItem('typing_best_wpm') || 0));
  const [streak, setStreak] = useState(0);
  const [lastWordCorrect, setLastWordCorrect] = useState<boolean | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);

  // pick a random sentence
  const pickSentence = () => {
    const idx = Math.floor(Math.random() * sentences.length);
    return sentences[idx];
  };

  // start or restart game
  const startGame = (selectedMode: Mode = mode, dur = duration) => {
    const sentence = pickSentence();
    setTarget(sentence);
    setText('');
    setIsPlaying(true);
    setStartTime(Date.now());
    setElapsedSec(0);
    setWpm(0);
    setCpm(0);
    setAccuracy(100);
    setErrors(0);
    setStreak(0);
    setLastWordCorrect(null);
    setShowCelebration(false);

    setMode(selectedMode);
    setDuration(dur);
    setTimeLeft(dur);

    // focus input a bit after render
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  // stop and finalize
  const finishGame = (auto = false) => {
    setIsPlaying(false);
    setStartTime(null);
    if (wpm > bestWpm) {
      setBestWpm(wpm);
      try { localStorage.setItem('typing_best_wpm', String(wpm)); } catch {}
    }
    if (wpm >= 50) {
      // little celebration
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 1800);
    }
    // clear timers
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  };

  // main effect: when playing, update timers
  useEffect(() => {
    if (!isPlaying) return;

    // tick every 250ms to update live metrics
    tickRef.current = window.setInterval(() => {
      if (!startTime) return;
      const now = Date.now();
      const elapsed = Math.max(0, (now - startTime) / 1000);
      setElapsedSec(elapsed);
      // compute metrics
      const correctChars = text.split('').reduce((acc, ch, i) => acc + (ch === target[i] ? 1 : 0), 0);
      const totalTyped = text.length;
      const minutes = elapsed / 60 || 1/60;
      const wordsCorrectEstimate = correctChars / 5; // standard WPM calc
      const calcWpm = Math.round(wordsCorrectEstimate / minutes) || 0;
      const calcCpm = Math.round((correctChars) / minutes) || 0;
      const acc = totalTyped === 0 ? 100 : Math.round((correctChars / totalTyped) * 100);
      setWpm(calcWpm);
      setCpm(calcCpm);
      setAccuracy(acc);
      const errs = totalTyped - correctChars;
      setErrors(errs < 0 ? 0 : errs);
      // if timed: setup countdown
      if (mode === 'timed') {
        setTimeLeft(prev => {
          const rem = Math.max(0, Math.round(duration - elapsed));
          if (rem <= 0) {
            // time up
            finishGame(true);
          }
          return rem;
        });
      }
    }, 250);

    // also a safety interval for timerRef to update timeLeft strictly every 1s for smooth UI
    if (mode === 'timed') {
      timerRef.current = window.setInterval(() => {
        if (!startTime) return;
        const now = Date.now();
        const elapsed = Math.max(0, Math.round((now - startTime) / 1000));
        setTimeLeft(Math.max(0, duration - elapsed));
      }, 1000);
    }

    return () => {
      if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, startTime, target, text, mode, duration]);

  // when user types
  useEffect(() => {
    if (!isPlaying) return;
    // If user completed sentence exactly -> finish
    if (text === target) {
      // finalize metrics
      const now = Date.now();
      const elapsed = startTime ? (now - startTime) / 1000 : 1;
      const correctChars = text.split('').filter((c, i) => c === target[i]).length;
      const minutes = Math.max(1 / 60, elapsed / 60);
      const finalWpm = Math.round((correctChars / 5) / minutes);
      setWpm(finalWpm);
      setCpm(Math.round(correctChars / minutes));
      finishGame();
    }
    // check per-word correctness when a space is typed or user completed a word
    const typedSoFar = text;
    const typedWords = typedSoFar.trim().split(/\s+/).filter(Boolean);
    const targetWords = target.split(/\s+/);
    if (typedSoFar.endsWith(' ') || typedSoFar === target) {
      // check last completed word
      const idx = typedWords.length - 1;
      if (idx >= 0 && idx < targetWords.length) {
        const playerWord = typedWords[idx];
        const correct = playerWord.toLowerCase() === targetWords[idx].toLowerCase();
        setLastWordCorrect(correct);
        if (correct) {
          setStreak(s => s + 1);
          // small bonus immediate
          setWpm(prev => prev + 0); // visual only (calculated periodically)
        } else {
          setStreak(0);
        }
      }
    } else {
      setLastWordCorrect(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, target, isPlaying]);

  // utility - progress percent
  const progressPct = Math.min(100, Math.round((text.length / (target.length || 1)) * 100));

  // quick format
  const pretty = (n: number) => n.toLocaleString();

  return (
    <div className="flex flex-col items-center gap-6 w-[1100px] h-[630px] p-4 p-6 bg-black">
      <div className="w-full flex items-center justify-between">
        <h2 className="text-2xl font-display text-white"></h2>
        <div className="flex items-center gap-2">
          <div className="text-md text-muted-foreground mr-2">𝙱𝚎𝚜𝚝 𝚆𝙿𝙼</div>
          <div className="text-lg font-bold text-neon-cyan">{bestWpm}</div>
        </div>
      </div>

      <div className="w-full p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 pr-4">
            <div className="text-s text-muted-foreground mb-2">𝙿𝚑𝚛𝚊𝚜𝚎</div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-black/50 to-white/2 border border-white/6 min-h-[72px]">
              <p className="text-lg leading-relaxed font-mono break-words">
                {target.split('').map((char, i) => (
                  <span
                    key={i}
                    className={cn(
                      i < text.length
                        ? text[i] === char
                          ? 'text-neon-green'
                          : 'text-destructive bg-destructive/20'
                        : i === text.length
                          ? 'border-b-2 border-primary'
                          : 'text-muted-foreground',
                      'transition-colors'
                    )}
                  >
                    {char}
                  </span>
                ))}
              </p>
            </div>

            <div className="mt-3">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => { if (isPlaying) setText(e.target.value); }}
                className="w-full p-3 bg-muted rounded-lg border border-border focus:border-primary focus:outline-none text-foreground"
                placeholder={isPlaying ? "𝚃𝚢𝚙𝚎 𝚑𝚎𝚛𝚎..." : "𝙿𝚛𝚎𝚜𝚜 𝚂𝚝𝚊𝚛𝚝 𝚝𝚘 𝚋𝚎𝚐𝚒𝚗"}
                disabled={!isPlaying}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="neon" onClick={() => startGame('practice')} disabled={isPlaying}>Practice</Button>
                <Button variant="neon" onClick={() => startGame('timed', 30)} disabled={isPlaying}>Timed 30s</Button>
                <Button variant="neon" onClick={() => startGame('timed', 60)} disabled={isPlaying}>Timed 60s</Button>
                <Button variant="neon" onClick={() => startGame('timed', 90)} disabled={isPlaying}>Timed 90s</Button>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-s text-muted-foreground">𝙼𝚘𝚍𝚎:</div>
                <div className="text-sm font-medium text-white">{mode === 'practice' ? '𝙿𝚛𝚊𝚌𝚝𝚒𝚌𝚎' : `𝚃𝚒𝚖𝚎𝚍 — ${duration}s`}</div>
                {isPlaying ? (
                  <Button variant="outline" onClick={() => finishGame(false)}>Stop</Button>
                ) : (
                  <Button variant="outline" onClick={() => { setTarget(pickSentence()); setText(''); setStreak(0); }}>Shuffle</Button>
                )}
              </div>
            </div>
          </div>

          <aside className="w-64 flex-shrink-0">
            <div className="bg-black/40 p-3 rounded-lg border border-white/6 mb-3">
              <div className="text-m text-muted-foreground">𝙻𝚒𝚟𝚎</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-m text-muted-foreground">𝚆𝙿𝙼</div>
                  <div className="text-2xl font-bold text-primary">{pretty(wpm)}</div>
                </div>
                <div>
                  <div className="text-m text-muted-foreground">𝙲𝙿𝙼</div>
                  <div className="text-2xl font-bold text-neon-cyan">{pretty(cpm)}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="text-s text-muted-foreground">𝙰𝚌𝚌𝚞𝚛𝚊𝚌𝚢</div>
                <div className="text-s font-bold" style={{ color: accuracy >= 90 ? '#34D399' : accuracy >= 70 ? '#fbbf24' : '#fb7185' }}>{accuracy}%</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-s text-muted-foreground">𝙴𝚛𝚛𝚘𝚛𝚜</div>
                <div className="text-s font-bold text-destructive">{errors}</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-s text-muted-foreground">𝚂𝚝𝚛𝚎𝚊𝚔</div>
                <div className="text-s font-bold text-neon-yellow">{streak}</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-s text-muted-foreground">𝙿𝚛𝚘𝚐𝚛𝚎𝚜𝚜</div>
                <div className="w-full h-2 bg-white/6 rounded mt-1 overflow-hidden">
                  <div style={{ width: `${progressPct}%` }} className="h-full bg-gradient-to-r from-neon-cyan to-neon-green" />
                </div>
                <div className="text-s text-muted-foreground mt-1">{progressPct}%</div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-s text-muted-foreground">𝚃𝚒𝚖𝚎𝚛</div>
                <div className="text-s font-bold text-primary">{mode === 'timed' ? `${timeLeft}s` : '—'}</div>
              </div>
            </div>

            <div className="bg-card p-3 rounded-lg border border-border">
              <div className="text-s text-muted-foreground mb-2">𝚂𝚎𝚜𝚜𝚒𝚘𝚗 𝚂𝚞𝚖𝚖𝚊𝚛𝚢</div>
              <div className="text-s">𝙴𝚕𝚊𝚙𝚜𝚎𝚍: <strong>{Math.max(0, Math.round(elapsedSec))}s</strong></div>
              <div className="text-s mt-1">𝙱𝚎𝚜𝚝 𝚆𝙿𝙼: <strong className="text-neon-cyan">{bestWpm}</strong></div>
              {showCelebration && <div className="mt-2 text-neon-green font-bold">Nice run!</div>}
            </div>
          </aside>
        </div>
      </div>

      <div className="w-full flex items-center justify-between text-xs text-muted-foreground">
        <div>𝚃𝚒𝚙𝚜: 𝙵𝚘𝚌𝚞𝚜 𝚘𝚗 𝚊𝚌𝚌𝚞𝚛𝚊𝚌𝚢 𝚏𝚒𝚛𝚜𝚝 — 𝚆𝙿𝙼 𝚛𝚒𝚜𝚎𝚜 𝚗𝚊𝚝𝚞𝚛𝚊𝚕𝚕𝚢. 𝚄𝚜𝚎 𝚃𝚒𝚖𝚎𝚍 𝚖𝚘𝚍𝚎 𝚝𝚘 𝚙𝚛𝚊𝚌𝚝𝚒𝚌𝚎 𝚜𝚙𝚎𝚎𝚍.</div>
        <div>𝙼𝚒𝚕𝚎𝚜𝚝𝚘𝚗𝚎𝚜: 𝟺𝟶 𝚆𝙿𝙼 = 𝙶𝚘𝚘𝚍 • 𝟼𝟶+ 𝚆𝙿𝙼 = 𝙴𝚡𝚌𝚎𝚕𝚕𝚎𝚗𝚝</div>
      </div>

      <style>{`
        :root {
          --neon-cyan: #06b6d4;
          --neon-green: #34D399;
          --neon-yellow: #fbbf24;
        }
        .bg-neon { background: linear-gradient(90deg,var(--neon-cyan),var(--neon-green)); }
        .from-neon-cyan { background: var(--neon-cyan); }
        .to-neon-green { background: var(--neon-green); }
      `}</style>
    </div>
  );
}
