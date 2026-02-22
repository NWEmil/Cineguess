
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { put } from '@vercel/blob';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Movie, Room, Player } from './types';
import { initDb } from './db-init';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function getRoom(roomId: string): Promise<Room | null> {
  const result = await pool.query('SELECT state FROM rooms WHERE id = $1', [roomId]);
  if (result.rows.length === 0) return null;
  let room = result.rows[0].state as Room;
  
  // Progress state if playing
  if (room.status === 'playing' && room.roundStartTime) {
    const now = Date.now();
    const elapsed = Math.floor((now - room.roundStartTime) / 1000);
    const newTimer = Math.max(0, 10 - elapsed);
    
    if (newTimer === 0 && room.timer > 0) {
      // Round ended
      if (room.currentMovieIndex < room.movies.length - 1) {
        room.currentMovieIndex += 1;
        room.timer = 10;
        room.roundStartTime = Date.now();
        room.players.forEach(p => p.lastAnswerCorrect = undefined);
      } else {
        room.status = 'finished';
        room.timer = 0;
      }
      await saveRoom(room);
    } else if (newTimer !== room.timer) {
      room.timer = newTimer;
      await saveRoom(room);
    }
  }
  
  return room;
}

async function saveRoom(room: Room) {
  await pool.query(
    'INSERT INTO rooms (id, state, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE SET state = $2, updated_at = CURRENT_TIMESTAMP',
    [room.id, JSON.stringify(room)]
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  await initDb();

  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const movieCount = await pool.query('SELECT COUNT(*) FROM movies');
    console.log(`Database verified. Users: ${userCount.rows[0].count}, Movies: ${movieCount.rows[0].count}`);
  } catch (err) {
    console.error('Database verification failed:', err);
  }

  console.log('Database initialized. Connection string present:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    const maskedUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
    console.log('Using database URL:', maskedUrl);
  }

  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
      console.error('Health check failed:', err);
      res.status(500).json({ status: 'error', database: 'disconnected', error: String(err) });
    }
  });

  // Multiplayer Routes
  app.get('/api/rooms/:id', async (req, res) => {
    try {
      const room = await getRoom(req.params.id);
      if (!room) return res.status(404).json({ error: 'Room not found' });
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch room' });
    }
  });

  app.post('/api/rooms/:id/join', async (req, res) => {
    const { id: roomId } = req.params;
    const { player } = req.body;
    
    try {
      let room = await getRoom(roomId);
      if (!room) {
        const moviesResult = await pool.query('SELECT * FROM movies ORDER BY RANDOM() LIMIT 10');
        room = {
          id: roomId,
          hostId: player.id,
          players: [],
          status: 'waiting',
          currentMovieIndex: 0,
          movies: moviesResult.rows.map(row => ({
            id: row.id,
            title: row.title,
            imageUrl: row.image_url,
            year: row.year,
            genre: row.genre
          })),
          timer: 10
        };
      }

      if (!room.players.find(p => p.id === player.id)) {
        room.players.push({ ...player, score: 0, isReady: false, results: [] });
      }
      
      await saveRoom(room);
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: 'Failed to join room' });
    }
  });

  app.post('/api/rooms/:id/action', async (req, res) => {
    const { id: roomId } = req.params;
    const { type, playerId, ...payload } = req.body;
    
    try {
      const room = await getRoom(roomId);
      if (!room) return res.status(404).json({ error: 'Room not found' });

      const player = room.players.find(p => p.id === playerId);
      if (!player && type !== 'EXIT') return res.status(403).json({ error: 'Player not in room' });

      switch (type) {
        case 'READY':
          if (player) player.isReady = true;
          if (room.players.every(p => p.isReady) && room.players.length >= 1) {
            room.status = 'playing';
            room.roundStartTime = Date.now();
          }
          break;
        case 'RENAME':
          if (player) player.username = payload.username;
          break;
        case 'SUBMIT_ANSWER':
          if (player && room.status === 'playing') {
            const { isCorrect, movieId } = payload;
            if (isCorrect) player.score += 1;
            player.lastAnswerCorrect = isCorrect;
            if (!player.results.find(r => r.movieId === movieId)) {
              player.results.push({ movieId, isCorrect });
            }
          }
          break;
        case 'EXIT':
          room.players = room.players.filter(p => p.id !== playerId);
          if (room.players.length === 0) {
            await pool.query('DELETE FROM rooms WHERE id = $1', [roomId]);
            return res.json({ status: 'deleted' });
          } else if (room.hostId === playerId) {
            room.hostId = room.players[0].id;
          }
          break;
      }

      await saveRoom(room);
      res.json(room);
    } catch (err) {
      res.status(500).json({ error: 'Action failed' });
    }
  });

  // Existing Routes
  app.get('/api/movies', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM movies');
      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        imageUrl: row.image_url,
        year: row.year,
        genre: row.genre
      })));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch movies' });
    }
  });

  app.post('/api/movies', async (req, res) => {
    const { id, title, imageUrl, year, genre } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO movies (id, title, image_url, year, genre) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, title, imageUrl, year, genre]
      );
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add movie' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users');
      res.json(result.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        bestScore: row.best_score,
        gamesPlayed: row.games_played,
        wins: row.wins,
        isAdmin: row.is_admin
      })));
    } catch (err) {
      console.error('Error fetching users:', err);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { id, username, email, password, isAdmin } = req.body;
    try {
      const result = await pool.query(
        'INSERT INTO users (id, username, email, password, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [id, username, email, password, isAdmin]
      );
      const row = result.rows[0];
      res.json({
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        bestScore: row.best_score,
        gamesPlayed: row.games_played,
        wins: row.wins,
        isAdmin: row.is_admin
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  app.patch('/api/users/:id/score', async (req, res) => {
    const { id } = req.params;
    const { score, isWin } = req.body;
    try {
      const result = await pool.query(
        `UPDATE users 
         SET best_score = GREATEST(best_score, $1),
             games_played = games_played + 1,
             wins = wins + ${isWin ? 1 : 0}
         WHERE id = $2
         RETURNING *`,
        [score, id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      const row = result.rows[0];
      res.json({
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        bestScore: row.best_score,
        gamesPlayed: row.games_played,
        wins: row.wins,
        isAdmin: row.is_admin
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update score' });
    }
  });

  app.get('/api/leaderboard', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT username, best_score as "bestScore", games_played as "gamesPlayed", wins
        FROM users
        ORDER BY best_score DESC
        LIMIT 10
      `);
      const leaderboard = result.rows.map(row => ({
        username: row.username,
        bestScore: row.bestScore,
        gamesPlayed: row.gamesPlayed,
        winPercentage: row.gamesPlayed > 0 ? (row.wins / row.gamesPlayed) * 100 : 0
      }));
      res.json(leaderboard);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  app.post('/api/upload', async (req, res) => {
    const filename = req.query.filename as string;
    if (!filename) return res.status(400).json({ error: 'Filename required' });

    try {
      const blob = await put(filename, req, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      res.json(blob);
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
