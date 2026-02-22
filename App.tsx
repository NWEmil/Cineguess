
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import GameBoard from './components/Game/GameBoard';
import MultiplayerBoard from './components/Game/MultiplayerBoard';
import AdminDashboard from './components/Admin/AdminDashboard';
import { User, Movie, RoundResult, LeaderboardEntry } from './types';
import { auth } from './services/authService';
import { db } from './services/dbService';

type View = 'home' | 'auth' | 'game' | 'results' | 'leaderboard' | 'admin' | 'profile' | 'multiplayer';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [user, setUser] = useState<User | null>(null);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [lastResults, setLastResults] = useState<RoundResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '', isRegister: false });
  const [error, setError] = useState('');
  const [multiplayerRoomId, setMultiplayerRoomId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    setUser(currentUser);
    loadData();

    // Check for room ID in URL
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('room');
    if (roomId) {
      setMultiplayerRoomId(roomId);
      if (currentUser) {
        setView('multiplayer');
      } else {
        // Automatically assign guest if not logged in but joining a room
        const guestUser: User = {
          id: `guest-${Date.now()}`,
          username: `Guest_${Math.floor(Math.random() * 10000)}`,
          email: '',
          bestScore: 0,
          gamesPlayed: 0,
          wins: 0,
          isAdmin: false
        };
        setUser(guestUser);
        setView('multiplayer');
      }
    }
  }, []);

  const loadData = async () => {
    const [movies, board] = await Promise.all([
      db.getMovies(),
      db.getLeaderboard()
    ]);
    setAllMovies(movies);
    setLeaderboard(board);
  };

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setView('home');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (authForm.isRegister) {
        const newUser = await auth.register(authForm.username, authForm.email, authForm.password);
        setUser(newUser);
      } else {
        const existingUser = await auth.login(authForm.username, authForm.password);
        setUser(existingUser);
      }
      if (multiplayerRoomId) {
        setView('multiplayer');
      } else {
        setView('home');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGuestPlay = () => {
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      username: `Guest_${Math.floor(Math.random() * 10000)}`,
      email: '',
      bestScore: 0,
      gamesPlayed: 0,
      wins: 0,
      isAdmin: false
    };
    setUser(guestUser);
    if (multiplayerRoomId) {
      setView('multiplayer');
    } else {
      setView('home');
    }
  };

  const handleGameFinish = async (results: RoundResult[]) => {
    setLastResults(results);
    const score = results.filter(r => r.isCorrect).length;
    if (user && !user.id.startsWith('guest-')) {
      const updatedUser = await db.updateUserScore(user.id, score, score === 10);
      setUser(updatedUser);
    }
    await loadData(); // Refresh leaderboard
    setView('results');
  };

  const startGame = () => {
    let currentUser = user;
    if (!currentUser) {
      currentUser = {
        id: `guest-${Date.now()}`,
        username: `Guest_${Math.floor(Math.random() * 10000)}`,
        email: '',
        bestScore: 0,
        gamesPlayed: 0,
        wins: 0,
        isAdmin: false
      };
      setUser(currentUser);
    }
    if (allMovies.length < 10) {
      alert("Not enough movies in the database to start a 10-round game. Ask an admin to add more!");
      return;
    }
    setView('game');
  };

  const hostMultiplayer = () => {
    let currentUser = user;
    if (!currentUser) {
      currentUser = {
        id: `guest-${Date.now()}`,
        username: `Guest_${Math.floor(Math.random() * 10000)}`,
        email: '',
        bestScore: 0,
        gamesPlayed: 0,
        wins: 0,
        isAdmin: false
      };
      setUser(currentUser);
    }
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setMultiplayerRoomId(roomId);
    setView('multiplayer');
  };

  const renderView = () => {
    switch (view) {
      case 'home':
        return (
          <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
            <h1 className="font-brand text-7xl md:text-9xl tracking-[0.2em] text-white mb-6 drop-shadow-2xl">
              CINE<span className="text-red-600">GUESS</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-12 font-light leading-relaxed">
              Think you know cinema? Put your knowledge to the test.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button 
                onClick={startGame}
                className="bg-red-600 hover:bg-red-700 text-white px-12 py-5 rounded-full font-bold text-xl transition-all shadow-2xl shadow-red-600/30 hover:scale-105"
              >
                SOLO GAME
              </button>
              <button 
                onClick={hostMultiplayer}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-12 py-5 rounded-full font-bold text-xl transition-all backdrop-blur-sm"
              >
                HOST MULTIPLAYER
              </button>
            </div>
            <div className="mt-20 grid grid-cols-3 gap-12 border-t border-white/10 pt-12 w-full max-w-4xl">
              <div>
                <p className="text-3xl font-brand text-red-600">{allMovies.length}</p>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Movies</p>
              </div>
              <div>
                <p className="text-3xl font-brand text-red-600">10</p>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Seconds</p>
              </div>
              <div>
                <p className="text-3xl font-brand text-red-600">10</p>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Rounds</p>
              </div>
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className="flex items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-md bg-white/5 border border-white/10 p-10 rounded-3xl shadow-2xl backdrop-blur-xl">
              <h2 className="text-4xl font-brand text-center mb-8 tracking-widest">
                {authForm.isRegister ? 'JOIN THE CINEMA' : 'WELCOME BACK'}
              </h2>
              {error && <p className="bg-red-600/20 text-red-500 p-4 rounded-xl text-sm mb-6 border border-red-600/20 text-center">{error}</p>}
              <form onSubmit={handleAuth} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Username</label>
                  <input 
                    required
                    type="text" 
                    value={authForm.username}
                    onChange={e => setAuthForm({...authForm, username: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-red-500 outline-none transition-all"
                  />
                </div>
                {authForm.isRegister && (
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={authForm.email}
                      onChange={e => setAuthForm({...authForm, email: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-red-500 outline-none transition-all"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
                  <input 
                    required
                    type="password" 
                    value={authForm.password}
                    onChange={e => setAuthForm({...authForm, password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white focus:border-red-500 outline-none transition-all"
                  />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-5 rounded-xl transition-all shadow-lg shadow-red-600/20 mt-4">
                  {authForm.isRegister ? 'CREATE ACCOUNT' : 'LOGIN TO PLAY'}
                </button>
              </form>
              
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0a0a0a] px-4 text-gray-500 font-bold tracking-widest">Or</span></div>
              </div>

              <button 
                onClick={handleGuestPlay}
                className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-xl transition-all border border-white/10 mb-6"
              >
                PLAY AS GUEST
              </button>

              <p className="text-center text-gray-500 text-sm">
                {authForm.isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button 
                  onClick={() => setAuthForm({...authForm, isRegister: !authForm.isRegister, error: ''})}
                  className="text-white hover:text-red-500 font-bold underline underline-offset-4"
                >
                  {authForm.isRegister ? 'Log In' : 'Sign Up'}
                </button>
              </p>
            </div>
          </div>
        );

      case 'game':
        return <GameBoard user={user!} allMovies={allMovies} onFinish={handleGameFinish} />;

      case 'multiplayer':
        return (
          <MultiplayerBoard 
            user={user!} 
            roomId={multiplayerRoomId!} 
            onRename={(name) => setUser(prev => prev ? {...prev, username: name} : null)}
            onExit={() => { 
              setView('home'); 
              setMultiplayerRoomId(null); 
              window.history.replaceState({}, '', '/'); 
            }} 
          />
        );

      case 'results':
        const correctCount = lastResults.filter(r => r.isCorrect).length;
        return (
          <div className="max-w-4xl mx-auto px-4 py-24 text-center">
            <h1 className="text-6xl font-brand tracking-widest mb-4">GAME OVER</h1>
            <div className="relative inline-block mb-12">
              <div className="text-8xl font-brand text-red-600 mb-2">{correctCount}/10</div>
              <p className="text-gray-400 uppercase tracking-widest font-bold">Final Score</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
              {lastResults.map((res, i) => (
                <div key={i} className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${res.isCorrect ? 'bg-green-600' : 'bg-red-600'}`}>
                    {res.isCorrect ? '✓' : '✗'}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{res.correctTitle}</p>
                    <p className="text-xs text-gray-500">Round {res.round} • {res.isCorrect ? 'Correct' : `Guessed: ${res.selectedTitle}`}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => setView('game')}
                className="bg-red-600 hover:bg-red-700 text-white px-10 py-4 rounded-full font-bold transition-all"
              >
                PLAY AGAIN
              </button>
              <button 
                onClick={() => setView('home')}
                className="bg-white/10 hover:bg-white/20 text-white px-10 py-4 rounded-full font-bold transition-all"
              >
                MAIN MENU
              </button>
            </div>
          </div>
        );

      case 'leaderboard':
        return (
          <div className="max-w-4xl mx-auto px-4 py-24">
            <h1 className="text-5xl font-brand tracking-widest text-center mb-4">GLOBAL RANKINGS</h1>
            <p className="text-gray-500 text-center mb-12 uppercase tracking-widest font-bold text-sm">Top cinephiles from around the world</p>
            
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-left">
                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Rank</th>
                    <th className="px-6 py-5 text-xs font-bold text-gray-500 uppercase tracking-widest">Player</th>
                    <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">High Score</th>
                    <th className="px-6 py-5 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-6 font-brand text-2xl text-gray-500">
                        {i === 0 ? '👑' : `#${i + 1}`}
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            i === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white'
                          }`}>
                            {entry.username.substring(0, 2).toUpperCase()}
                          </div>
                          <span className={`font-bold ${i === 0 ? 'text-yellow-500' : 'text-white'}`}>{entry.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right font-brand text-2xl text-red-600">{entry.bestScore}</td>
                      <td className="px-6 py-6 text-right text-gray-400 font-mono">{entry.winPercentage.toFixed(1)}%</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-gray-500">No players ranked yet. Be the first!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'admin':
        return user?.isAdmin ? <AdminDashboard /> : <div className="text-center mt-20">Access Denied</div>;

      case 'profile':
        return (
          <div className="max-w-2xl mx-auto px-4 py-24 text-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-purple-800 mx-auto mb-8 flex items-center justify-center text-5xl font-brand shadow-xl shadow-red-600/20">
              {user?.username.substring(0, 1).toUpperCase()}
            </div>
            
            {user?.id.startsWith('guest-') ? (
              <div className="mb-12">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Guest Display Name</label>
                <div className="flex gap-2 max-w-md mx-auto">
                  <input 
                    type="text" 
                    value={user.username}
                    onChange={e => setUser({...user, username: e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-all text-center text-2xl font-brand tracking-widest"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-4 uppercase tracking-widest">Changes are temporary for this session</p>
              </div>
            ) : (
              <h1 className="text-5xl font-brand tracking-widest mb-12">{user?.username.toUpperCase()}</h1>
            )}
            
            <div className="grid grid-cols-3 gap-8 mb-12">
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <p className="text-4xl font-brand text-red-600 mb-1">{user?.bestScore}</p>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Best Score</p>
              </div>
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <p className="text-4xl font-brand text-red-600 mb-1">{user?.gamesPlayed}</p>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Played</p>
              </div>
              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <p className="text-4xl font-brand text-red-600 mb-1">
                  {user?.gamesPlayed ? ((user.wins / user.gamesPlayed) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-gray-500 uppercase tracking-widest text-xs font-bold">Win Rate</p>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="bg-white/10 hover:bg-red-600/20 text-red-500 px-10 py-4 rounded-xl font-bold border border-white/10 transition-all"
            >
              LOGOUT FROM ACCOUNT
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-red-600 selection:text-white">
      <Navbar user={user} onLogout={handleLogout} onNavigate={setView} />
      <main className="pt-16 pb-20">
        {renderView()}
      </main>
      
      {/* Footer Branding */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none flex justify-between items-end">
      </footer>
    </div>
  );
};

export default App;
