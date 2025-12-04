import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const WORDS = [
  'JAVASCRIPT', 'PROGRAMMING', 'DEVELOPER', 'COMPUTER', 'ALGORITHM',
  'DATABASE', 'INTERNET', 'SOFTWARE', 'HARDWARE', 'KEYBOARD',
  'MONITOR', 'NETWORK', 'BROWSER', 'WEBSITE', 'CODING'
];

const scrambleWord = (word: string) => {
  return word.split('').sort(() => Math.random() - 0.5).join('');
};

const BASE_POINTS = 10;
const HINT_PENALTY = 5;
const WRONG_PENALTY = 2;
const SKIP_PENALTY = 4;
const MAX_ATTEMPTS = 3;
const TIME_PER_WORD = 20; // seconds

export function WordScramble() {
  const [currentWord, setCurrentWord] = useState('');
  const [scrambled, setScrambled] = useState('');
  const [guess, setGuess] = useState('');
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_WORD);
  const [streak, setStreak] = useState(0);
  const [isCorrectAnimating, setIsCorrectAnimating] = useState(false);
  const [isWrongAnimating, setIsWrongAnimating] = useState(false);

  // Generate a new word and reset per-word state
  const newWord = (keepScore = true) => {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    let scrambledWord = scrambleWord(word);
    // ensure scrambled != original
    while (scrambledWord === word) scrambledWord = scrambleWord(word);

    setCurrentWord(word);
    setScrambled(scrambledWord);
    setGuess('');
    setMessage('');
    setHintUsed(false);
    setAttemptsLeft(MAX_ATTEMPTS);
    setTimeLeft(TIME_PER_WORD);
    setIsCorrectAnimating(false);
    setIsWrongAnimating(false);
    // optionally do not change global score
    if (!keepScore) setScore(0);
  };

  useEffect(() => {
    newWord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // timer
  useEffect(() => {
    if (!currentWord) return;
    if (timeLeft <= 0) {
      // time out -> skip word
      setMessage(`⏱️ Time's up! The word was ${currentWord}`);
      setScore(s => Math.max(0, s - SKIP_PENALTY));
      setStreak(0);
      // show answer briefly then next
      const t = setTimeout(() => newWord(), 1800);
      return () => clearTimeout(t);
    }
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, currentWord]);

  // character cloud positions (deterministic per scramble)
  const cloud = useMemo(() => {
    // generate random-ish positions based on scrambled string to avoid reflow each render
    // use simple seeded pseudo-random from char codes
    const base = scrambled.split('');
    return base.map((ch, i) => {
      const seed = ch.charCodeAt(0) * (i + 1);
      // pseudo-random in range
      const randX = ((seed * 9301 + 49297) % 233280) / 233280;
      const randY = ((seed * 49297 + 9301) % 233280) / 233280;
      const x = Math.round((randX * 60) - 30); // translateX -30..30
      const y = Math.round((randY * 28) - 14); // translateY -14..14
      const rot = Math.round((randX * 40) - 20); // rotation -20..20
      const scale = 0.9 + (randY * 0.4);
      return { ch, x, y, rot, scale, idx: i };
    });
  }, [scrambled]);

  const revealHint = () => {
    if (hintUsed) return;
    setHintUsed(true);
    setScore(s => Math.max(0, s - HINT_PENALTY));
    setMessage(`🔎 Hint: ${currentWord[0]} _ _ _ ${currentWord[currentWord.length - 1]}`);
  };

  const checkAnswer = () => {
    if (!currentWord) return;
    if (guess.trim().toUpperCase() === currentWord) {
      // correct
      const hintPenalty = hintUsed ? HINT_PENALTY : 0;
      const attemptPenalty = (MAX_ATTEMPTS - attemptsLeft) * WRONG_PENALTY;
      let earned = BASE_POINTS - hintPenalty - attemptPenalty;
      if (earned < 1) earned = 1;
      // streak bonus
      const streakBonus = Math.max(0, streak) * 2;
      const totalEarn = earned + streakBonus;

      setScore(s => s + totalEarn);
      setMessage(`🎉 Correct! +${totalEarn} (streak +${streakBonus})`);
      setStreak(s => s + 1);
      setIsCorrectAnimating(true);

      // next word after delay
      setTimeout(() => {
        setIsCorrectAnimating(false);
        newWord();
      }, 1200);
    } else {
      // wrong
      setMessage('❌ Wrong — try again');
      setAttemptsLeft(a => a - 1);
      setScore(s => Math.max(0, s - WRONG_PENALTY));
      setIsWrongAnimating(true);
      setStreak(0);
      setTimeout(() => setIsWrongAnimating(false), 450);

      if (attemptsLeft - 1 <= 0) {
        // out of attempts -> skip
        setMessage(`✋ Out of attempts! The word was ${currentWord}`);
        setScore(s => Math.max(0, s - SKIP_PENALTY));
        setStreak(0);
        setTimeout(() => newWord(), 1400);
      }
    }
    setGuess('');
  };

  const skipWord = () => {
    setMessage(`⏭️ Skipped — the word was ${currentWord}`);
    setScore(s => Math.max(0, s - SKIP_PENALTY));
    setStreak(0);
    setTimeout(() => newWord(), 1200);
  };

  // Small helper to render the character cloud
  const CharCloud = () => (
    <div className="relative w-[420px] h-[120px] flex items-center justify-center select-none">
      <div className="absolute w-full h-full flex items-center justify-center">
        {cloud.map(c => (
          <div
            key={c.idx}
            style={{
              transform: `translate(${c.x}px, ${c.y}px) rotate(${c.rot}deg) scale(${c.scale})`,
            }}
            className={`m-1 w-11 h-11 rounded-2xl flex items-center justify-center text-2xl font-bold bg-gradient-to-br from-white/5 to-white/3 border border-white/6 text-white/90 shadow-[0_6px_18px_rgba(0,0,0,0.6)]`}
            aria-hidden
          >
            {c.ch}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-6 p-4 p-6 bg-black">
      <div className="flex items-center gap-6">
        <div className="text-sm text-muted-foreground">𝚂𝚌𝚘𝚛𝚎</div>
        <div className="text-2xl font-bold text-primary">{score}</div>

        <div className="ml-6 text-sm text-muted-foreground">𝚂𝚝𝚛𝚎𝚊𝚔</div>
        <div className="text-lg font-bold text-neon-cyan">{streak}</div>

        <div className="ml-6 text-sm text-muted-foreground">𝙰𝚝𝚝𝚎𝚖𝚙𝚝𝚜</div>
        <div className="text-lg font-bold text-neon-orange">{attemptsLeft}</div>

        <div className="ml-6 text-sm text-muted-foreground">Time</div>
        <div className="text-lg font-bold text-neon-green">{timeLeft}s</div>
      </div>

      <div className="w-full max-w-3xl rounded-2xl p-6 bg-gradient-to-br from-black/60 to-white/3 border border-white/6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-display text-white"></h2>
            <div className="text-xs text-muted-foreground mt-1">𝚄𝚗𝚜𝚌𝚛𝚊𝚖𝚋𝚕𝚎 𝚝𝚑𝚎 𝚌𝚕𝚘𝚞𝚍. 𝚄𝚜𝚎 𝚊 𝚜𝚒𝚗𝚐𝚕𝚎 𝚜𝚘𝚕𝚒𝚍 𝚑𝚒𝚗𝚝 𝚒𝚏 𝚗𝚎𝚎𝚍𝚎𝚍.</div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="neon" onClick={() => newWord()}>New Word</Button>
            {/*<Button variant="outline" onClick={skipWord}>Skip (-4)</Button>*/}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <div className="mb-3">
            <CharCloud />
          </div>

          {hintUsed ? (
            <div className="text-sm text-neon-yellow font-medium">𝚂𝚘𝚕𝚒𝚍 𝚑𝚒𝚗𝚝: {currentWord[0]} ... {currentWord[currentWord.length - 1]}</div>
          ) : (
            <div className="text-sm text-muted-foreground">𝚈𝚘𝚞 𝚑𝚊𝚟𝚎 𝚘𝚗𝚎 𝚜𝚘𝚕𝚒𝚍 𝚑𝚒𝚗𝚝 (𝚛𝚎𝚟𝚎𝚊𝚕𝚜 𝚏𝚒𝚛𝚜𝚝 & 𝚕𝚊𝚜𝚝 𝚕𝚎𝚝𝚝𝚎𝚛) — 𝚌𝚘𝚜𝚝𝚜 {HINT_PENALTY} 𝚙𝚝𝚜</div>
          )}

          {message && (
            <div className={`text-lg font-medium ${message.includes('Correct') ? 'text-neon-green' : 'text-neon-orange'}`}>
              {message}
            </div>
          )}

          <div className="flex gap-2 mt-1">
            <Input
              value={guess}
              onChange={(e) => setGuess(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
              placeholder="Type your guess"
              className="w-80 text-center uppercase tracking-wide"
            />
            <Button variant="game" onClick={checkAnswer}>Check</Button>
          </div>

          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={revealHint} disabled={hintUsed}>💡 Hint (-5)</Button>
            <Button variant="outline" onClick={skipWord}>⏭ Skip (-4)</Button>
          </div>

          <div className="mt-4 text-xs text-muted-foreground">
            Rules: You get {MAX_ATTEMPTS} 𝚊𝚝𝚝𝚎𝚖𝚙𝚝𝚜 𝚙𝚎𝚛 𝚠𝚘𝚛𝚍. 𝚆𝚛𝚘𝚗𝚐 𝚊𝚝𝚝𝚎𝚖𝚙𝚝: -{WRONG_PENALTY} 𝚙𝚝𝚜. 𝙲𝚘𝚛𝚛𝚎𝚌𝚝: +{BASE_POINTS} 𝚙𝚝𝚜 (𝚖𝚒𝚗𝚞𝚜 𝚙𝚎𝚗𝚊𝚕𝚝𝚒𝚎𝚜). 𝚂𝚝𝚛𝚎𝚊𝚔𝚜 𝚐𝚒𝚟𝚎 𝚜𝚖𝚊𝚕𝚕 𝚋𝚘𝚗𝚞𝚜𝚎𝚜.
          </div>
        </div>
      </div>

      <style>{`
        /* small animations */
        .text-neon-green { color: #34D399; }
        .text-neon-cyan { color: #06b6d4; }
        .text-neon-yellow { color: #fbbf24; }
        .text-neon-orange { color: #fb923c; }
        .animate-pop { transform: scale(1.06); transition: transform 120ms ease; }
      `}</style>
    </div>
  );
}
