import { Game } from '@/types/games';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface GameCardProps {
  game: Game;
  index: number;
}

const colorClasses = {
  cyan: 'hover:shadow-[0_0_30px_hsl(var(--neon-cyan)/0.6)] hover:border-neon-cyan',
  pink: 'hover:shadow-[0_0_30px_hsl(var(--neon-pink)/0.6)] hover:border-neon-pink',
  purple: 'hover:shadow-[0_0_30px_hsl(var(--neon-purple)/0.6)] hover:border-neon-purple',
  green: 'hover:shadow-[0_0_30px_hsl(var(--neon-green)/0.6)] hover:border-neon-green',
  orange: 'hover:shadow-[0_0_30px_hsl(var(--neon-orange)/0.6)] hover:border-neon-orange',
  yellow: 'hover:shadow-[0_0_30px_hsl(var(--neon-yellow)/0.6)] hover:border-neon-yellow',
};

const iconColorClasses = {
  cyan: 'text-neon-cyan',
  pink: 'text-neon-pink',
  purple: 'text-neon-purple',
  green: 'text-neon-green',
  orange: 'text-neon-orange',
  yellow: 'text-neon-yellow',
};

const difficultyColors = {
  easy: 'bg-neon-green/20 text-neon-green',
  medium: 'bg-neon-orange/20 text-neon-orange',
  hard: 'bg-neon-pink/20 text-neon-pink',
};

export function GameCard({ game, index }: GameCardProps) {
  return (
    <Link
      to={`/game/${game.id}`}
      className={cn(
        'game-card group block border-2 border-transparent cursor-pointer',
        colorClasses[game.color]
      )}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <img
              src={game.icon}
              alt={game.name}
              className={cn(
                "w-25 h-25 object-contain transition-transform duration-300 group-hover:scale-110",
                iconColorClasses[game.color] // optional if you want tinting
              )}
            />
          {/*<span className={cn('text-xs font-medium px-2 py-1 rounded-full', difficultyColors[game.difficulty])}>
            {game.difficulty}
          </span>*/}
        </div>
        
        <h3 className="font-display text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {game.name}
        </h3>
        
        <p className="text-sm text-muted-foreground flex-grow">
          {game.description}
        </p>
        
        <div className="mt-4 flex items-center text-xs text-muted-foreground">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-primary font-medium">
            Play Now →
          </span>
        </div>
      </div>
    </Link>
  );
}
