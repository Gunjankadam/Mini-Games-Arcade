import { Header } from '@/components/Header';
import { GameWrapper } from '@/components/GameWrapper';

const GamePage = () => {
  return (
    <div className="h-screen overflow-hidden">
      <Header />
      <GameWrapper />
    </div>
  );
};

export default GamePage;
