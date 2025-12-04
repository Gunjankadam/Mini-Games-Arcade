import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Card = {
  id: number;
  img: string; // data URL or image URL
  isFlipped: boolean;
  isMatched: boolean;
};

const DEFAULT_MOVE_LIMIT = 30;

// helper: generate simple SVG data-URL images (keeps everything local, no external assets)
function svgDataUrl(bg: string, fg: string, label: string) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256' viewBox='0 0 256 256'>
    <rect width='100%' height='100%' fill='${bg}' rx='28'/>
    <circle cx='128' cy='92' r='44' fill='${fg}' fill-opacity='0.95' />
    <text x='128' y='188' font-size='48' text-anchor='middle' fill='white' font-family='system-ui, sans-serif' font-weight='700'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Create a palette of image data URLs
const IMAGE_SET = [
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793224/Screenshot_2025-12-04_014532-removebg-preview_gra2bg.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793224/Screenshot_2025-12-04_014452-removebg-preview_noecr3.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793224/Screenshot_2025-12-04_014520-removebg-preview_tzd1ob.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793224/Screenshot_2025-12-04_014421-removebg-preview_xstgwa.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793225/Screenshot_2025-12-04_014433-removebg-preview_ajz8ji.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793225/Screenshot_2025-12-04_014539-removebg-preview_jzghy2.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793225/Screenshot_2025-12-04_014504-removebg-preview_jyj9pi.png",
  "https://res.cloudinary.com/dkeab9fo1/image/upload/v1764793225/Screenshot_2025-12-04_014513-removebg-preview_cfsmvf.png",
];


export function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [moveLimit, setMoveLimit] = useState(DEFAULT_MOVE_LIMIT);
  const [remaining, setRemaining] = useState(DEFAULT_MOVE_LIMIT);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);

  const initGame = (limit = DEFAULT_MOVE_LIMIT) => {
    const imgs = IMAGE_SET.slice(0, 8);
    const pairPool = [...imgs, ...imgs];
    // shuffle
    const shuffled = pairPool
      .map((img) => ({ img, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map((p, index) => ({ id: index, img: p.img, isFlipped: false, isMatched: false })) as Card[];

    setCards(shuffled);
    setFlipped([]);
    setMoves(0);
    setMoveLimit(limit);
    setRemaining(limit);
    setIsWon(false);
    setIsLost(false);
  };

  useEffect(() => {
    initGame(DEFAULT_MOVE_LIMIT);
  }, []);

  useEffect(() => {
    if (flipped.length === 2) {
      const [a, b] = flipped;
      if (cards[a].img === cards[b].img) {
        // mark matched
        setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, isMatched: true } : c));
        setFlipped([]);
        // check win
        setTimeout(() => {
          setCards(prev => {
            if (prev.every(c => c.isMatched || c.id === a || c.id === b)) {
              setIsWon(true);
            }
            return prev;
          });
        }, 100);
      } else {
        // flip back after short delay
        setTimeout(() => {
          setCards(prev => prev.map(c => (c.id === a || c.id === b) ? { ...c, isFlipped: false } : c));
          setFlipped([]);
        }, 900);
      }
    }
  }, [flipped, cards]);

  useEffect(() => {
    if (moves > 0 && remaining <= 0 && !isWon) {
      setIsLost(true);
      // lock board
      setCards(prev => prev.map(c => ({ ...c, isFlipped: false })));
    }
  }, [remaining, moves, isWon]);

  const handleCard = (id: number) => {
    if (isWon || isLost) return;
    const card = cards[id];
    if (!card || card.isFlipped || card.isMatched) return;
    // if two already flipped, ignore
    if (flipped.length === 2) return;

    setCards(prev => prev.map(c => c.id === id ? { ...c, isFlipped: true } : c));
    setFlipped(prev => [...prev, id]);
    setMoves(m => m + 1);
    setRemaining(r => r - 1);
  };

  const restart = () => initGame(moveLimit);

  return (
    <div className="h-[620px] flex items-center justify-center p-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 -z-10 animate-float bg-gradient-to-br from-purple-700 via-pink-600 to-cyan-500 opacity-30 mix-blend-screen filter blur-3xl"></div>

      <div className="h-[580px] max-w-2xl w-[500px] rounded-3xl p-6 backdrop-blur-md bg-white/5 border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-display text-white"></h2>
          <div className="flex items-center gap-3">
            {/*<div className="text-sm text-muted-foreground">Moves & Limit</div>
            <div className="text-lg font-bold text-primary">{moves} / {moveLimit}</div>*/}
            <Button variant="neon" onClick={restart}>Restart</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="text-muted-foreground">𝐑𝐄𝐌𝐀𝚰𝐍𝚰𝐍𝐆 𝐌𝐎𝐕𝐄𝐒: <span className="text-neon-orange font-bold">{remaining}</span></div>
          <div className="text-muted-foreground">𝐒𝐓𝐀𝐓𝐔𝐒: {isWon ? <span className="text-neon-green font-bold">𝐘𝐎𝐔 𝐖𝚰𝐍!</span> : isLost ? <span className="text-destructive font-bold">𝐎𝐔𝐓 𝐎𝐅 𝐌𝐎𝐕𝐄𝐒</span> : <span className="text-white/80">𝐏𝐋𝐀𝐘𝚰𝐍𝐆</span>}</div>
        </div>

        <div className="grid grid-cols-4 gap-1 overflow-hidden max-h-[360px] justify-center">

          {cards.map(card => (
         <button
  key={card.id}
  onClick={() => handleCard(card.id)}
  disabled={card.isFlipped || card.isMatched || isWon || isLost}
            className={cn(
              // slightly smaller tile, a bit more rounded, and subtle shadow for depth
              'relative w-24 h-20 rounded-2xl overflow-hidden border-2 transition-transform duration-200 shadow-sm',
              card.isFlipped || card.isMatched ? 'scale-100 border-primary' : 'bg-card/60 border-border hover:scale-105'
            )}
          >
            <div className={cn(
              'absolute inset-0 flex items-center justify-center p-2 transition-opacity duration-300',
              card.isFlipped || card.isMatched ? 'opacity-100' : 'opacity-0'
            )}>
              {/* reduce image footprint and center it; use object-contain so it never crops */}
              <img
                src={card.img}
                alt="tile"
                className="w-20 h-16 object-contain rounded-md select-none pointer-events-none"
                style={{ padding: '4px' }}
              />
            </div>
  ...
</button>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">𝚃𝚒𝚙: 𝚃𝚛𝚢 𝚝𝚘 𝚛𝚎𝚖𝚎𝚖𝚋𝚎𝚛 𝚙𝚘𝚜𝚒𝚝𝚒𝚘𝚗𝚜. 𝚈𝚘𝚞 𝚌𝚊𝚗 𝚌𝚑𝚊𝚗𝚐𝚎 𝚖𝚘𝚟𝚎 𝚕𝚒𝚖𝚒𝚝 𝚋𝚎𝚕𝚘𝚠.</div>
          <div className="flex items-center gap-2">
            <input type="number" min={8} max={100} value={moveLimit} onChange={(e) => setMoveLimit(Math.max(8, Math.min(100, Number(e.target.value))))} className="w-20 bg-transparent border border-white/10 rounded px-2 py-1 text-white" />
            <Button onClick={() => initGame(moveLimit)}>Start with Limit</Button>
          </div>
        </div>

      </div>

      <style>{`@keyframes float { 0% { transform: translateY(-8px) } 50% { transform: translateY(8px) } 100% { transform: translateY(-8px) } } .animate-float { animation: float 8s ease-in-out infinite; } .animate-glow { text-shadow: 0 0 12px rgba(139,92,246,0.6); }`}</style>
    </div>
  );
}
