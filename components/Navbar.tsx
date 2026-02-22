
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onNavigate }) => {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-black/80 backdrop-blur-md border-b border-white/10 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          onClick={() => onNavigate('home')} 
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center transform group-hover:rotate-12 transition-transform">
            <span className="text-white font-bold">C</span>
          </div>
          <span className="font-brand text-2xl tracking-wider text-white">CINEGUESS</span>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => onNavigate('leaderboard')}
            className="text-gray-400 hover:text-white transition-colors font-medium text-sm"
          >
            Leaderboard
          </button>
          
          {user ? (
            <div className="flex items-center gap-4">
              {user.isAdmin && (
                <button 
                  onClick={() => onNavigate('admin')}
                  className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-full text-xs transition-colors"
                >
                  Admin
                </button>
              )}
              <div 
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium">{user.username}</span>
              </div>
              <button 
                onClick={onLogout}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => onNavigate('auth')}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all shadow-lg shadow-red-600/20"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
