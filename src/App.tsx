import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameModeSelector } from './components/UI/GameModeSelector';
import { DifficultySelector } from './components/UI/DifficultySelector';
import { ButtonGameBoard } from './components/GameBoard/ButtonGameBoard';
import { ResultPage } from './components/UI/ResultPage';
import { PWAInstallPrompt } from './components/UI/PWAInstallPrompt';
import { DifficultyLevel, GameMode } from './types/game';
import { useGameStore } from './store/gameStore';

function App() {
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | null>(null);
  const { gameStatus, resetGame } = useGameStore();

  const handleGameModeSelect = (mode: GameMode) => {
    setSelectedGameMode(mode);
    setSelectedDifficulty(null); // Reset difficulty when changing mode
  };

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setSelectedDifficulty(difficulty);
    // Reset game state when starting a new game
    resetGame();
  };

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="h-screen bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
        <PWAInstallPrompt />
        <div className="container mx-auto h-full">
          <AnimatePresence mode="wait">
            <Routes>
              <Route 
                path="/" 
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <GameModeSelector 
                      onSelect={handleGameModeSelect}
                      selectedMode={selectedGameMode || undefined}
                    />
                  </motion.div>
                } 
              />
              <Route 
                path="/difficulty" 
                element={
                  selectedGameMode ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <DifficultySelector 
                        onSelect={handleDifficultySelect}
                        selectedDifficulty={selectedDifficulty || undefined}
                        gameMode={selectedGameMode}
                      />
                    </motion.div>
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              <Route 
                path="/game" 
                element={
                  selectedDifficulty && selectedGameMode ? (
                    gameStatus === 'completed' ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ResultPage />
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ButtonGameBoard 
                          difficulty={selectedDifficulty} 
                          gameMode={selectedGameMode}
                        />
                      </motion.div>
                    )
                  ) : (
                    <Navigate to="/" replace />
                  )
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </div>
      </div>
    </Router>
  );
}

export default App; 