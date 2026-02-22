
export interface Movie {
  id: string;
  title: string;
  imageUrl: string;
  year: number;
  genre: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  bestScore: number;
  gamesPlayed: number;
  wins: number;
  isAdmin: boolean;
}

export interface RoundResult {
  round: number;
  movieId: string;
  selectedTitle: string;
  correctTitle: string;
  isCorrect: boolean;
  timeRemaining: number;
}

export interface GameState {
  currentRound: number;
  score: number;
  rounds: Movie[];
  results: RoundResult[];
  isFinished: boolean;
}

export interface LeaderboardEntry {
  username: string;
  bestScore: number;
  winPercentage: number;
  gamesPlayed: number;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  isReady: boolean;
  lastAnswerCorrect?: boolean;
  results: { movieId: string; isCorrect: boolean }[];
}

export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  status: 'waiting' | 'starting' | 'playing' | 'finished';
  currentMovieIndex: number;
  movies: Movie[];
  timer: number;
}
