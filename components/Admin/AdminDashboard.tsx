
import React, { useState, useEffect } from 'react';
import { Movie } from '../../types';
import { db } from '../../services/dbService';

const AdminDashboard: React.FC = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newMovie, setNewMovie] = useState<Omit<Movie, 'id'>>({
    title: '',
    imageUrl: '',
    year: new Date().getFullYear(),
    genre: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMovies();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await fetch(`/api/upload?filename=${file.name}`, {
        method: 'POST',
        body: file,
      });
      const blob = await response.json();
      setNewMovie(prev => ({ ...prev, imageUrl: blob.url }));
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const loadMovies = async () => {
    const data = await db.getMovies();
    setMovies(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addMovie(newMovie);
    setNewMovie({ title: '', imageUrl: '', year: new Date().getFullYear(), genre: '' });
    setIsAdding(false);
    loadMovies();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure?')) {
      await db.deleteMovie(id);
      loadMovies();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-24">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-brand tracking-widest text-white mb-2">DATABASE MANAGEMENT</h1>
          <p className="text-gray-400">Add, edit, or remove movie screenshots from the game pool.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-600/20"
        >
          {isAdding ? 'CANCEL' : 'ADD NEW MOVIE'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="bg-white/5 border border-white/10 rounded-2xl p-8 mb-12 animate-in slide-in-from-top duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Movie Title</label>
              <input 
                required
                type="text" 
                value={newMovie.title}
                onChange={e => setNewMovie({...newMovie, title: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none"
                placeholder="e.g. The Matrix"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Image URL (Screenshot)</label>
              <div className="flex gap-2">
                <input 
                  required
                  type="url" 
                  value={newMovie.imageUrl}
                  onChange={e => setNewMovie({...newMovie, imageUrl: e.target.value})}
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none"
                  placeholder="https://..."
                />
                <label className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-center transition-all">
                  <span className="text-xs font-bold uppercase tracking-widest">{uploading ? '...' : 'Upload'}</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Release Year</label>
              <input 
                required
                type="number" 
                value={newMovie.year}
                onChange={e => setNewMovie({...newMovie, year: parseInt(e.target.value)})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Genre</label>
              <input 
                required
                type="text" 
                value={newMovie.genre}
                onChange={e => setNewMovie({...newMovie, genre: e.target.value})}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none"
                placeholder="e.g. Action, Sci-Fi"
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
            SAVE MOVIE TO DATABASE
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map(movie => (
          <div key={movie.id} className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all">
            <div className="aspect-video relative overflow-hidden">
              <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <button 
                onClick={() => handleDelete(movie.id)}
                className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg">{movie.title}</h3>
              <p className="text-gray-500 text-sm">{movie.genre} • {movie.year}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
