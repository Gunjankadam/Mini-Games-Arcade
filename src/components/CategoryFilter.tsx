import { GameCategory, categoryLabels } from '@/types/games';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
  selected: GameCategory | 'all';
  onChange: (category: GameCategory | 'all') => void;
}

const categories: (GameCategory | 'all')[] = ['all', 'puzzle', 'memory', 'reflex', 'strategy', 'word', 'math'];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onChange(category)}
          className={cn(
            'px-4 py-2 rounded-full font-medium text-sm transition-all duration-300',
            selected === category
              ? 'bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.5)]'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
          )}
        >
          {category === 'all' ? '🎮 All Games' : categoryLabels[category]}
        </button>
      ))}
    </div>
  );
}
