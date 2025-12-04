import React, { useEffect, useState } from 'react';

type Level = 'easy' | 'medium' | 'hard' | 'complex';
type Operation = '+' | '-' | '×';

export function QuickMath() {
  const [level, setLevel] = useState<Level>('easy');
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operation, setOperation] = useState<Operation>('+');
  const [expression, setExpression] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [streak, setStreak] = useState(0);

  const settings = {
    easy: { maxA: 100, maxB: 50, time: 60, ops: ['+', '-'] as Operation[] },
    medium: { maxA: 250, maxB: 125, time: 50, ops: ['+', '-', '×'] as Operation[] },
    hard: { maxA: 1000, maxB: 500, time: 40, ops: ['+', '-', '×'] as Operation[] },
    complex: { maxA: 250, maxB: 250, time: 45, ops: ['+', '-', '×'] as Operation[] },
  } as const;

  useEffect(() => {
    setTimeLeft(settings[level].time);
  }, [level]);

  const randomInt = (max: number, min = 1) => Math.floor(Math.random() * (max - min + 1)) + min;

  const generateProblem = () => {
    setExpression(null);
    const ops = settings[level].ops;

    if (level === 'easy') {
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a = randomInt(settings.easy.maxA, 1);
      let b = randomInt(settings.easy.maxB, 1);
      if (op === '-' && b > a) [a, b] = [b, a];
      setNum1(a);
      setNum2(b);
      setOperation(op);
      setAnswer('');
      return;
    }

    if (level === 'medium') {
      const op = ops[Math.floor(Math.random() * ops.length)];
      let a = randomInt(settings.medium.maxA, 5);
      let b = randomInt(settings.medium.maxB, 2);
      if (op === '-' && b > a) [a, b] = [b, a];
      setNum1(a);
      setNum2(b);
      setOperation(op);
      setAnswer('');
      return;
    }

    if (level === 'hard') {
      const op = ops[Math.floor(Math.random() * ops.length)];
      const a = randomInt(settings.hard.maxA, 10);
      const b = randomInt(settings.hard.maxB, 5);
      if (op === '-' && b > a) {
        setNum1(b);
        setNum2(a);
      } else {
        setNum1(a);
        setNum2(b);
      }
      setOperation(op);
      setAnswer('');
      return;
    }

    if (level === 'complex') {
      const a = randomInt(settings.complex.maxA, 2);
      const b = randomInt(settings.complex.maxB, 1);
      const c = randomInt(settings.complex.maxA, 1);
      const op1 = ops[Math.floor(Math.random() * ops.length)];
      const op2 = ops[Math.floor(Math.random() * ops.length)];
      const expr = `${a} ${op1} ${b} ${op2} ${c}`;
      setExpression(expr);
      setNum1(0);
      setNum2(0);
      setOperation('+');
      setAnswer('');
      return;
    }
  };

  const getCorrectAnswer = () => {
    if (level === 'complex' && expression) {
      try {
        const safeExpr = expression.replace(/×/g, '*');
        const val = Function(`return (${safeExpr})`)();
        return Math.round(val);
      } catch {
        return 0;
      }
    }

    switch (operation) {
      case '+': return num1 + num2;
      case '-': return num1 - num2;
      case '×': return num1 * num2;
      default: return 0;
    }
  };

  const startGame = (chosenLevel?: Level) => {
    if (chosenLevel) setLevel(chosenLevel);
    setScore(0);
    setStreak(0);
    setIsPlaying(true);
    setTimeLeft(settings[chosenLevel ?? level].time);
    generateProblem();
  };

  useEffect(() => {
    if (!isPlaying || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setIsPlaying(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  const checkAnswer = () => {
    const correct = getCorrectAnswer();
    if (parseInt(answer, 10) === correct) {
      const bonus = streak >= 8 ? 5 : streak >= 5 ? 3 : streak >= 3 ? 2 : 1;
      setScore(s => s + bonus);
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
    generateProblem();
  };

  return (
    <div className="h-[635px] flex items-center justify-center p-4 bg-slate-950 relative overflow-hidden">
      {/* Animated background gradients */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="h-[600px] max-w-2xl w-full flex flex-col">
        {/* Main game card */}
        <div className="flex-1 rounded-3xl p-6 backdrop-blur-xl bg-gradient-to-br from-slate-900/90 to-slate-800/90 border border-slate-700/50 shadow-2xl relative overflow-hidden flex flex-col">
          {/* Header glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gradient-to-b from-purple-500/20 to-transparent blur-2xl"></div>

          {/* Title */}
          <div className="text-center mb-4 relative">
            <h1 className="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent mb-1 tracking-tight">
            </h1>
            <p className="text-slate-400 text-xs">𝚃𝚎𝚜𝚝 𝚢𝚘𝚞𝚛 𝚖𝚎𝚗𝚝𝚊𝚕 𝚌𝚊𝚕𝚌𝚞𝚕𝚊𝚝𝚒𝚘𝚗 𝚜𝚙𝚎𝚎𝚍!</p>
          </div>

          {/* Difficulty selector */}
          <div className="flex justify-center gap-2 mb-4 flex-wrap relative z-10">
            {(['easy', 'medium', 'hard', 'complex'] as Level[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                disabled={isPlaying}
                className={`px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wide transition-all duration-300 relative ${
                  level === lvl
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50 scale-105'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                } ${isPlaying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">𝚂𝚌𝚘𝚛𝚎</div>
              <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {score}
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">𝚃𝚒𝚖𝚎</div>
              <div className={`text-2xl font-bold ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`}>
                {timeLeft}s
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center border border-slate-700/30">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">𝚂𝚝𝚛𝚎𝚊𝚔</div>
              <div className="text-2xl font-bold text-pink-400 flex items-center justify-center gap-1">
                {streak >= 3 && <span className="text-xl animate-bounce">🔥</span>}
                {streak}
              </div>
            </div>
          </div>

          {/* Game area */}
          <div className="flex-1 flex items-center justify-center">
            {!isPlaying ? (
              <div className="text-center">
                {timeLeft === 0 ? (
                  <div className="space-y-4">
                    <div className="text-5xl">🎉</div>
                    <div>
                      <div className="text-xl text-slate-300 mb-1">Game Over!</div>
                      <div className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent mb-3">
                        {score} Points
                      </div>
                      <div className="text-slate-400 text-sm">
                        {score >= 50 ? '🏆 Amazing!' : score >= 30 ? '⭐ Great job!' : score >= 15 ? '👍 Good effort!' : '💪 Keep practicing!'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-400 text-base mb-3">𝚁𝚎𝚊𝚍𝚢 𝚝𝚘 𝚝𝚎𝚜𝚝 𝚢𝚘𝚞𝚛 𝚜𝚙𝚎𝚎𝚍?</div>
                )}
                <button
                  onClick={() => startGame()}
                  className="px-10 py-3 rounded-xl font-bold text-base bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 uppercase tracking-wide"
                >
                  {timeLeft === 0 ? 'Play Again' : 'Start Game'}
                </button>
              </div>
            ) : (
              <div className="w-full">
                {/* Problem display */}
                <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-xl p-6 mb-4 border border-slate-700/50 shadow-xl">
                  <div className="text-center text-5xl font-black text-white tracking-tight">
                    {level === 'complex' && expression ? (
                      <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {expression}
                      </span>
                    ) : (
                      <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                        {num1} {operation} {num2} = ?
                      </span>
                    )}
                  </div>
                </div>

                {/* Answer input */}
                <div className="flex gap-2 max-w-md mx-auto">
                  <input
                    type="number"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && checkAnswer()}
                    className="flex-1 px-5 py-3 rounded-lg text-center text-xl font-bold bg-slate-800/50 border-2 border-slate-700 text-white focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="?"
                    autoFocus
                  />
                  <button
                    onClick={checkAnswer}
                    className="px-6 py-3 rounded-lg font-bold text-base bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 uppercase"
                  >
                    ✓
                  </button>
                </div>

                {/* Streak bonus indicator */}
                {streak >= 3 && (
                  <div className="mt-4 text-center">
                    <div className="inline-block px-3 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
                      <span className="text-orange-400 font-bold text-sm">
                        Bonus: +{streak >= 8 ? 5 : streak >= 5 ? 3 : 2} points!
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tips section - at bottom */}
          {!isPlaying && timeLeft !== 0 && (
            <div className="text-center text-slate-500 text-[11px] space-y-0.5 mt-4">
              <div> 𝙶𝚎𝚝 𝚊 3+ 𝚜𝚝𝚛𝚎𝚊𝚔 𝚏𝚘𝚛 𝚋𝚘𝚗𝚞𝚜 𝚙𝚘𝚒𝚗𝚝𝚜!</div>
              <div> 𝙷𝚒𝚐𝚑𝚎𝚛 𝚜𝚝𝚛𝚎𝚊𝚔𝚜 = 𝚋𝚒𝚐𝚐𝚎𝚛 𝚋𝚘𝚗𝚞𝚜𝚎𝚜</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}