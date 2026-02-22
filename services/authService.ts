
import { User } from '../types';
import { db } from './dbService';

const SESSION_KEY = 'cineguess_session';

class AuthService {
  async register(username: string, email: string, password?: string): Promise<User> {
    const users = await db.getUsers();
    if (users.find(u => u.username === username)) throw new Error('Username taken');
    
    const newUser: User = {
      id: Date.now().toString(),
      username,
      email,
      password,
      bestScore: 0,
      gamesPlayed: 0,
      wins: 0,
      isAdmin: false
    };
    
    const registeredUser = await db.registerUser(newUser);
    this.setSession(registeredUser);
    return registeredUser;
  }

  async login(username: string, password?: string): Promise<User> {
    const users = await db.getUsers();
    const user = users.find(u => u.username === username);
    if (!user) throw new Error('User not found');
    
    // Simple password check
    if (user.password && user.password !== password) {
      throw new Error('Invalid password');
    }
    
    this.setSession(user);
    return user;
  }

  logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  getCurrentUser(): User | null {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  private setSession(user: User) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }
}

export const auth = new AuthService();
