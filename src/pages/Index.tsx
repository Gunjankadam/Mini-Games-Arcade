import { Header } from '@/components/Header';
import { GameCard } from '@/components/GameCard';
import { games } from '@/data/games';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-1/4 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-8xl md:text-8xl font-display font-bold mb-6">
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Mini Games
              </span>
              <br />
              <span className="text-foreground">Arcade</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Addictive browser games to challenge your skills. 
              Memory, reflexes, strategy, and more!
            </p>
            <div className="flex justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                Free to Play
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                No Downloads
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse" />
                Instant Fun
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Games Section */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {games.map((game, index) => (
              <GameCard key={game.id} game={game} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>🎮 MiniGames Arcade - Play anytime, anywhere!</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;