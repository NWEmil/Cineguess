
import React, { useState, useEffect, useMemo } from 'react';
import { Movie, RoundResult, User } from '../../types';
import RoundTimer from './RoundTimer';
import { SECONDS_PER_ROUND, ROUNDS_COUNT } from '../../constants';
import { db } from '../../services/dbService';
import { soundService } from '../../services/soundService';

interface GameBoardProps {
  user: User;
  allMovies: Movie[];
  onFinish: (results: RoundResult[]) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ user, allMovies, onFinish }) => {
  const [currentRoundIdx, setCurrentRoundIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [results, setResults] = useState<RoundResult[]>([]);
  
  // Fisher-Yates shuffle
  const shuffle = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Select 10 random movies for this session
  const gameMovies = useMemo(() => {
    return shuffle(allMovies).slice(0, ROUNDS_COUNT);
  }, [allMovies]);

  const currentMovie = gameMovies[currentRoundIdx];

  // Generate 4 alternatives (1 correct + 3 random distractors)
  const alternatives = useMemo(() => {
    if (!currentMovie) return [];
    const others = allMovies.filter(m => m.id !== currentMovie.id);
    const distractors = shuffle(others).slice(0, 3);
    return shuffle([...distractors, currentMovie]);
  }, [currentMovie, allMovies]);

  const handleSelect = (title: string) => {
    if (isAnswerRevealed) return;
    setSelectedAnswer(title);
    revealAnswer(title);
  };

  const revealAnswer = (selection: string | null) => {
    setIsAnswerRevealed(true);
    
    const isCorrect = selection === currentMovie.title;
    
    if (isCorrect) {
      soundService.play('correct');
    } else {
      soundService.play('incorrect');
    }

    const newResult: RoundResult = {
      round: currentRoundIdx + 1,
      movieId: currentMovie.id,
      selectedTitle: selection || 'Time up',
      correctTitle: currentMovie.title,
      isCorrect,
      timeRemaining: 0 // In a more complex version we'd track actual time
    };

    const updatedResults = [...results, newResult];
    setResults(updatedResults);

    // Automatically advance after 2 seconds
    setTimeout(() => {
      if (currentRoundIdx + 1 >= ROUNDS_COUNT) {
        soundService.play('complete');
        onFinish(updatedResults);
      } else {
        setCurrentRoundIdx(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswerRevealed(false);
      }
    }, 2000);
  };

  const nextRound = () => {
    // This function is now handled inside the setTimeout in revealAnswer
    // but we'll keep it as a no-op or remove it if not used elsewhere.
  };

  if (!currentMovie) return <div className="text-white text-center mt-20">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-20">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-brand text-3xl tracking-wider">
          ROUND {currentRoundIdx + 1} <span className="text-gray-500 font-sans text-lg font-normal ml-2">/ {ROUNDS_COUNT}</span>
        </h2>
        <div className="flex gap-1">
          {Array.from({ length: ROUNDS_COUNT }).map((_, i) => (
            <div 
              key={i}
              className={`w-3 h-3 rounded-full ${
                i < currentRoundIdx ? 'bg-red-600' : 
                i === currentRoundIdx ? 'bg-white animate-pulse' : 
                'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative group overflow-hidden rounded-2xl shadow-2xl border border-white/10 aspect-video mb-12 bg-black">
        <img 
          src={currentMovie.imageUrl} 
          alt="Guess the movie" 
          className={`w-full h-full object-cover transition-all duration-700 ${isAnswerRevealed ? 'scale-105' : 'scale-100'}`}
        />
        {!isAnswerRevealed && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
        )}
      </div>

      <div className="mb-12">
        <RoundTimer 
          seconds={SECONDS_PER_ROUND} 
          isActive={!isAnswerRevealed} 
          onTimeUp={() => handleSelect('TIMEOUT')} 
          roundKey={currentRoundIdx}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {alternatives.map((movie) => {
          const isCorrect = movie.title === currentMovie.title;
          const isSelected = selectedAnswer === movie.title;
          
          let btnStyle = "bg-white/5 border-white/10 hover:bg-white/10 text-white";
          if (isAnswerRevealed) {
            if (isCorrect) btnStyle = "bg-green-600 border-green-400 text-white shadow-lg shadow-green-600/20";
            else if (isSelected && !isCorrect) btnStyle = "bg-red-600 border-red-400 text-white shadow-lg shadow-red-600/20 opacity-80";
            else btnStyle = "bg-white/5 border-white/5 text-gray-500 cursor-not-allowed";
          }

          return (
            <button
              key={movie.id}
              disabled={isAnswerRevealed}
              onClick={() => handleSelect(movie.title)}
              className={`p-5 rounded-xl border text-left font-semibold transition-all duration-200 flex items-center justify-between group ${btnStyle}`}
            >
              <span>{movie.title}</span>
              {isAnswerRevealed && isCorrect && (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {isAnswerRevealed && (
        <div className="mt-12 flex justify-center">
          <div className="text-gray-500 uppercase tracking-widest text-xs font-bold animate-pulse">
            Next round starting soon...
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
