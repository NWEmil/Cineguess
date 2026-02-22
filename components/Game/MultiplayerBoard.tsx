
import React, { useState, useEffect, useRef } from 'react';
import { Room, Player, Movie } from '../../types';
import { soundService } from '../../services/soundService';

interface MultiplayerBoardProps {
  user: { id: string; username: string };
  roomId: string;
  onRename?: (name: string) => void;
  onExit: () => void;
}

const MultiplayerBoard: React.FC<MultiplayerBoardProps> = ({ user, roomId, onRename, onExit }) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const prevStatus = useRef<string | null>(null);
  const prevTimer = useRef<number>(10);

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        if (response.ok) {
          const newRoom = await response.json();
          
          // Play sounds based on state changes
          if (prevStatus.current === 'playing' && newRoom.status === 'finished') {
            soundService.play('complete');
          }

          // Warning sound for timer
          if (newRoom.status === 'playing' && newRoom.timer <= 3 && newRoom.timer < prevTimer.current && newRoom.timer > 0) {
            soundService.play('warning');
          }

          setRoom(newRoom);
          prevStatus.current = newRoom.status;
          prevTimer.current = newRoom.timer;
        }
      } catch (err) {
        console.error('Failed to fetch room:', err);
      }
    };

    const joinRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ player: { id: user.id, username: user.username } })
        });
        if (response.ok) {
          const initialRoom = await response.json();
          setRoom(initialRoom);
        }
      } catch (err) {
        console.error('Failed to join room:', err);
      }
    };

    joinRoom();
    const interval = setInterval(fetchRoom, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [roomId, user.id, user.username]);

  useEffect(() => {
    if (room?.status === 'playing' && room.movies[room.currentMovieIndex]) {
      const currentMovie = room.movies[room.currentMovieIndex];
      // Generate options if not already set for this round
      const otherTitles = room.movies
        .filter(m => m.id !== currentMovie.id)
        .map(m => m.title)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      setOptions([currentMovie.title, ...otherTitles].sort(() => 0.5 - Math.random()));
      setSelectedAnswer(null);
    }
  }, [room?.currentMovieIndex, room?.status]);

  const handleReady = async () => {
    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'READY', playerId: user.id })
    });
  };

  const handleRename = async (newName: string) => {
    if (!newName.trim()) return;
    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'RENAME', playerId: user.id, username: newName.trim() })
    });
    onRename?.(newName.trim());
  };

  const handleAnswer = async (title: string) => {
    if (selectedAnswer || !room) return;
    setSelectedAnswer(title);
    const isCorrect = title === room.movies[room.currentMovieIndex].title;
    
    if (isCorrect) {
      soundService.play('correct');
    } else {
      soundService.play('incorrect');
    }

    await fetch(`/api/rooms/${roomId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'SUBMIT_ANSWER', 
        playerId: user.id,
        isCorrect, 
        movieId: room.movies[room.currentMovieIndex].id 
      })
    });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  if (!room) return <div className="flex items-center justify-center min-h-screen">Connecting...</div>;

  if (room.status === 'waiting') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <h2 className="text-4xl font-brand tracking-widest mb-4">WAITING ROOM</h2>
        <p className="text-gray-400 mb-8">Room ID: <span className="text-white font-mono">{roomId}</span></p>
        
        {user.id.startsWith('guest-') && (
          <div className="mb-8 max-w-sm mx-auto bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Change Your Display Name</label>
            <input 
              type="text" 
              defaultValue={user.username}
              onBlur={(e) => handleRename(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename((e.target as HTMLInputElement).value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition-all text-center font-bold"
              placeholder="Enter guest name..."
            />
            <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest">Press Enter or click away to save</p>
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 uppercase tracking-widest text-gray-500">Players</h3>
          <div className="space-y-4">
            {room.players.map(p => (
              <div key={p.id} className="flex justify-between items-center bg-black/30 p-4 rounded-xl">
                <span className="font-bold">{p.username} {p.id === user.id && '(You)'}</span>
                <span className={p.isReady ? 'text-green-500 font-bold' : 'text-yellow-500'}>
                  {p.isReady ? 'READY' : 'NOT READY'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={handleReady}
            disabled={room.players.find(p => p.id === user.id)?.isReady}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white px-8 py-4 rounded-xl font-bold transition-all"
          >
            I'M READY
          </button>
          <button 
            onClick={copyInviteLink}
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-xl font-bold transition-all border border-white/10"
          >
            COPY INVITE LINK
          </button>
          <button 
            onClick={async () => {
              await fetch(`/api/rooms/${roomId}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'EXIT', playerId: user.id })
              }).catch(() => {});
              onExit();
            }}
            className="bg-transparent hover:text-red-500 text-gray-500 px-8 py-4 rounded-xl font-bold transition-all"
          >
            EXIT
          </button>
        </div>
      </div>
    );
  }

  if (room.status === 'playing') {
    const currentMovie = room.movies[room.currentMovieIndex];
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-1">Round</p>
            <p className="text-2xl font-brand">{room.currentMovieIndex + 1} / 10</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-1">Seconds</p>
            <p className={`text-4xl font-brand ${room.timer <= 3 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              {room.timer}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 uppercase tracking-widest text-xs font-bold mb-1">Your Score</p>
            <p className="text-2xl font-brand text-red-600">{room.players.find(p => p.id === user.id)?.score}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative">
              <img 
                src={currentMovie.imageUrl} 
                alt="Movie Scene" 
                className="w-full h-full object-cover"
              />
              {selectedAnswer && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                  <p className="text-4xl font-brand tracking-widest">
                    {room.timer > 0 ? 'ANSWER SUBMITTED' : (selectedAnswer === currentMovie.title ? 'CORRECT!' : 'INCORRECT')}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {options.map((option, i) => (
                <button
                  key={i}
                  disabled={!!selectedAnswer}
                  onClick={() => handleAnswer(option)}
                  className={`
                    p-6 rounded-2xl font-bold text-lg transition-all border
                    ${selectedAnswer === option 
                      ? (room.timer > 0 ? 'bg-white/20 border-white/40' : (option === currentMovie.title ? 'bg-green-600 border-green-400' : 'bg-red-600 border-red-400')) 
                      : (selectedAnswer && room.timer === 0 && option === currentMovie.title ? 'bg-green-600/50 border-green-400' : 'bg-white/5 border-white/10 hover:bg-white/10')
                    }
                    ${!selectedAnswer && 'hover:scale-[1.02] active:scale-95'}
                  `}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6 text-center">Live Leaderboard</h3>
            <div className="space-y-4">
              {room.players.sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-6 text-gray-500 font-mono text-xs">{i + 1}.</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-bold truncate max-w-[100px]">{p.username}</span>
                      <span className="text-red-500 font-bold">{p.score}</span>
                    </div>
                    <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-600 h-full transition-all duration-500" 
                        style={{ width: `${(p.score / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (room.status === 'finished') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12">
        <h1 className="text-6xl font-brand tracking-widest mb-12 text-center">FINAL RESULTS</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Final Standings</h3>
            {room.players.sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border ${p.id === user.id ? 'bg-red-600/20 border-red-600' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center gap-3">
                  <span className="font-brand text-xl text-gray-500">{i + 1}</span>
                  <span className="font-bold">{p.username}</span>
                </div>
                <span className="font-brand text-xl text-red-500">{p.score}</span>
              </div>
            ))}
            
            <div className="pt-8">
              <button 
                onClick={async () => {
                  await fetch(`/api/rooms/${roomId}/action`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'EXIT', playerId: user.id })
                  }).catch(() => {});
                  onExit();
                }}
                className="w-full bg-white text-black px-12 py-4 rounded-xl font-bold hover:bg-gray-200 transition-all"
              >
                BACK TO HOME
              </button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Movie Breakdown</h3>
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Movie</th>
                    {room.players.map(p => (
                      <th key={p.id} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">
                        {p.username.substring(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {room.movies.map((movie) => (
                    <tr key={movie.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={movie.imageUrl} className="w-12 h-8 object-cover rounded" alt="" />
                          <span className="text-sm font-medium">{movie.title}</span>
                        </div>
                      </td>
                      {room.players.map(p => {
                        const result = p.results.find(r => r.movieId === movie.id);
                        return (
                          <td key={p.id} className="p-4 text-center">
                            {result ? (
                              result.isCorrect ? (
                                <span className="text-green-500">✓</span>
                              ) : (
                                <span className="text-red-500">✗</span>
                              )
                            ) : (
                              <span className="text-gray-600">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MultiplayerBoard;
