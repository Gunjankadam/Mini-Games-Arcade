import { useParams, Link } from 'react-router-dom';
import { games } from '@/data/games';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import all games
import { MemoryMatch } from './games/MemoryMatch';
import { TicTacToe} from './games/TicTacToe';
import { Snake } from './games/Snake';
import { FlappyBird } from './games/Game2048';
import { WhackAMole } from './games/WhackAMole';
import { SimonSays } from './games/SimonSays';
import { RockPaperScissors } from './games/RockPaperScissors';
import { NumberGuess } from './games/NumberGuess';
import { NumberPlayMiniCricket} from './games/ReactionTime';
import { StackBuilder } from './games/ColorMatch';
import { TypingSpeed } from './games/TypingSpeed';
import { GravitySwayRunner } from './games/MathQuiz';
import { FlipDash } from './games/ClickSpeed';
import { WordScramble } from './games/WordScramble';
import { MazeGame } from './games/Hangman';
import { SliceDash } from './games/PatternMatch';
import { TankBattle } from './games/AimTrainer';
import { NeonBreakoutBlitz } from './games/SequenceMemory';
import { QuickMath } from './games/QuickMath';
import { BulletDodge } from './games/EmojiMatch';

const gameComponents: Record<string, React.ComponentType> = {
  'memory-match': MemoryMatch,
  'tic-tac-toe': TicTacToe,
  'snake': Snake,
  'flappy-bird': FlappyBird,
  'whack-a-mole': WhackAMole,
  'simon-says': SimonSays,
  'rock-paper-scissors': RockPaperScissors,
  'number-guess': NumberGuess,
  'reaction-time': NumberPlayMiniCricket,
  'color-match': StackBuilder,
  'typing-speed': TypingSpeed,
  'math-quiz': GravitySwayRunner,
  'click-speed': FlipDash,
  'word-scramble': WordScramble,
  'hangman': MazeGame,
  'pattern-match': SliceDash,
  'aim-trainer': TankBattle,
  'sequence-memory': NeonBreakoutBlitz,
  'quick-math': QuickMath,
  'emoji-match': BulletDodge,
};

export function GameWrapper() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = games.find(g => g.id === gameId);
  const GameComponent = gameId ? gameComponents[gameId] : null;

  if (!game || !GameComponent) {
    return (
      <div className="h-screen flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <h1 className="text-4xl font-display text-foreground mb-4">Game Not Found</h1>
          <Link to="/">
            <Button variant="neon">Back to Games</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen py-8 overflow-hidden">
     <div className="container mx-auto px-4">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Games
        </Link>

        <div className="text-center mb-8">
          {/*<span className="text-6xl mb-4 block">{game.icon}</span>*/}
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">
            {game.name}
          </h1>
          {/*<p className="text-muted-foreground">{game.description}</p>*/}
        </div>

        <div className="flex justify-center">
          <div className="bg-card/50 rounded-2xl p-8 border border-border">
            <GameComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
