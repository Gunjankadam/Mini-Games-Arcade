export interface Game {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: GameCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  color: 'cyan' | 'pink' | 'purple' | 'green' | 'orange' | 'yellow';
}

export type GameCategory = 'puzzle' | 'memory' | 'reflex' | 'strategy' | 'word' | 'math';

export const categoryLabels: Record<GameCategory, string> = {
  puzzle: '🧩 Puzzle',
  memory: '🧠 Memory',
  reflex: '⚡ Reflex',
  strategy: '♟️ Strategy',
  word: '📝 Word',
  math: '🔢 Math',
};
