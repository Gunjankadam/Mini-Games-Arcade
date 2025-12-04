import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Player = 'X' | 'O' | null;

export function TicTacToe() {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [mode, setMode] = useState<'single' | 'multi'>('single');
  const [playerSymbol, setPlayerSymbol] = useState<Player>('X');
  const winner = calculateWinner(board);

  useEffect(() => {
    // If single player and it's computer's turn, make move
    if (mode === 'single') {
      const computer = playerSymbol === 'X' ? 'O' : 'X';
      const humanTurn = (playerSymbol === 'X') === isXNext; // true if it's human's turn
      if (!winner && !board.every(Boolean) && !humanTurn) {
        const timeout = setTimeout(() => {
          const move = findBestMove(board, computer as Player);
          if (move !== -1) makeMove(move);
        }, 400); // small delay for UX
        return () => clearTimeout(timeout);
      }
    }
  }, [board, isXNext, mode, playerSymbol, winner]);

  const makeMove = (index: number) => {
    if (board[index] || winner) return;
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const handleClick = (index: number) => {
    if (mode === 'single') {
      // prevent clicking when it's computer's turn
      const computer = playerSymbol === 'X' ? 'O' : 'X';
      const humanTurn = (playerSymbol === 'X') === isXNext;
      if (!humanTurn) return;
    }
    makeMove(index);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  const status = winner
    ? `𝐖𝚰𝐍𝐍𝐄𝐑: ${winner}`
    : board.every(cell => cell)
    ? "𝐃𝐑𝐀𝐖!"
    : `𝐍𝐄𝐗𝐓: ${isXNext ? '𝐗' : '𝐎'}`;

  return (
    <div className="h-[627px] w-[400px] items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 -z-10 animate-float bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-500 opacity-40 mix-blend-screen filter blur-3xl"></div>

      <div className="w-[350px] h-[582px] rounded-3xl p-6 backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4 gap-2">
          {/*<h2 className="text-2xl font-display text-white">Tic Tac Toe</h2>*/}
          <div className="flex items-center gap-2">
            <Button variant={mode === 'single' ? 'neon' : undefined} onClick={() => setMode('single')}>Computer</Button>
            <Button variant={mode === 'multi' ? 'neon' : undefined} onClick={() => setMode('multi')}>Player</Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          {/*<div className="text-sm text-white/80">Mode: <span className="font-medium">{mode === 'single' ? 'Single Player' : 'Two Players'}</span></div>*/}

          {mode === 'single' && (
            <div className="flex items-center gap-2">
              <div className="text-lg text-white/90">𝐘𝐎𝐔 𝐀𝐑𝐄:</div>
              <Button variant={playerSymbol === 'X' ? 'neon' : undefined} onClick={() => setPlayerSymbol('X')}>X</Button>
              <Button variant={playerSymbol === 'O' ? 'neon' : undefined} onClick={() => setPlayerSymbol('O')}>O</Button>
            </div>
          )}
        </div>

        <div className="text-lg text-white/90 mb-6">{status}</div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={cn(
                'aspect-square w-full rounded-xl text-4xl font-extrabold transition-all duration-200 flex items-center justify-center',
                'bg-gradient-to-b from-white/3 to-white/2 border-2 border-white/10 shadow-inner',
                cell === 'X' && 'text-cyan-300',
                cell === 'O' && 'text-pink-300',
                !cell && 'hover:scale-105'
              )}
              aria-label={`cell-${index}`}
            >
              {cell}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="neon" onClick={resetGame}>New Game</Button>
          {/*<Button onClick={() => {
            // quick randomize board colors / vibe by toggling a CSS variable — simple playful action
            document.documentElement.classList.toggle('neon-boost');
          }}>Toggle Vibe</Button>*/}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(-10px) rotate(0deg); }
          50% { transform: translateY(10px) rotate(2deg); }
          100% { transform: translateY(-10px) rotate(-1deg); }
        }
        .animate-float { animation: float 8s ease-in-out infinite; }

        /* extra neon boost when user toggles vibe */
        .neon-boost .bg-white\\/5 { background-color: rgba(218, 20, 20, 0.08) !important; }
        .neon-boost .text-cyan-300 { text-shadow: 0 0 12px rgba(98, 203, 248, 0.6); }
        .neon-boost .text-pink-300 { text-shadow: 0 0 12px rgba(247, 104, 176, 0.6); }
      `}</style>
    </div>
  );
}
/* ----------------- helper logic ----------------- */
function calculateWinner(squares: Player[]): Player {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

// Minimax algorithm for perfect play (small board — performant)
function findBestMove(board: Player[], computer: Player): number {
  // If board empty, pick center for speed
  if (board.every(cell => cell === null)) return 4;

  const opponent: Player = computer === 'X' ? 'O' : 'X';

  function minimax(b: Player[], isMaximizing: boolean): {score: number, move: number} {
    const win = calculateWinner(b);
    if (win === computer) return { score: 10, move: -1 };
    if (win === opponent) return { score: -10, move: -1 };
    if (b.every(Boolean)) return { score: 0, move: -1 };

    let bestScore = isMaximizing ? -Infinity : Infinity;
    let bestMove = -1;

    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = isMaximizing ? computer : opponent;
        const result = minimax(b, !isMaximizing);
        b[i] = null;

        if (isMaximizing) {
          if (result.score > bestScore) {
            bestScore = result.score;
            bestMove = i;
          }
        } else {
          if (result.score < bestScore) {
            bestScore = result.score;
            bestMove = i;
          }
        }
      }
    }

    return { score: bestScore, move: bestMove };
  }

  const { move } = minimax([...board], true);
  return move === -1 ? board.findIndex(c => !c) : move;
}


