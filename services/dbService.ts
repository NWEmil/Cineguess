
import { Movie, User, LeaderboardEntry } from '../types';
import { INITIAL_MOVIES } from '../constants';

// In a real Vercel/NeonDB setup, these would be fetch calls to an API route.
// We simulate the DB logic here to fulfill the requirement within the SPA constraints.

const STORAGE_KEYS = {
  MOVIES: 'cineguess_movies',
  USERS: 'cineguess_users',
  SESSION: 'cineguess_current_user'
};


class DBService {
  // Movies
  async getMovies(): Promise<Movie[]> {
    const response = await fetch('/api/movies');
    if (!response.ok) throw new Error('Failed to fetch movies');
    return response.json();
  }

  async addMovie(movie: Omit<Movie, 'id'>): Promise<Movie> {
    const id = Date.now().toString();
    const response = await fetch('/api/movies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...movie, id })
    });
    if (!response.ok) throw new Error('Failed to add movie');
    return response.json();
  }

  async updateMovie(id: string, updates: Partial<Movie>): Promise<Movie> {
    // Note: server doesn't have PATCH for movies yet, but we can implement if needed.
    // For now, we'll just throw or implement it.
    throw new Error('Update movie not implemented on server');
  }

  async deleteMovie(id: string): Promise<void> {
    const response = await fetch(`/api/movies/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete movie');
  }

  // Users & Auth
  async getUsers(): Promise<User[]> {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch users');
    return response.json();
  }

  async getUser(id: string): Promise<User | null> {
    const users = await this.getUsers();
    return users.find(u => u.id === id) || null;
  }

  async registerUser(user: User): Promise<User> {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!response.ok) throw new Error('Failed to register user');
    return response.json();
  }

  async updateUserScore(userId: string, score: number, isWin: boolean): Promise<User> {
    const response = await fetch(`/api/users/${userId}/score`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score, isWin })
    });
    if (!response.ok) throw new Error('Failed to update score');
    const data = await response.json();
    return {
      id: data.id,
      username: data.username,
      email: data.email,
      password: data.password,
      bestScore: data.best_score,
      gamesPlayed: data.games_played,
      wins: data.wins,
      isAdmin: data.is_admin
    };
  }

  // Leaderboard
  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('Failed to fetch leaderboard');
    return response.json();
  }
}

export const db = new DBService();
