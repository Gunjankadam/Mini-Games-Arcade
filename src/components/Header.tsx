import { Link } from 'react-router-dom';
import { Gamepad2 } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <Gamepad2 className="w-8 h-8 text-primary animate-glow" />
            <div className="absolute inset-0 bg-primary/20 blur-xl" />
          </div>
          <span className="font-display text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            MiniGames
          </span>
        </Link>
        
        {/*<nav className="flex items-center gap-6">
          <Link 
            to="/" 
            className="text-muted-foreground hover:text-primary transition-colors font-medium"
          >
            All Games
          </Link>
        </nav>*/}
      </div>
    </header>
  );
}
