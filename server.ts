
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { put } from '@vercel/blob';
import pg from 'pg';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { Movie, Room, Player } from './types';
import { initDb } from './db-init';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Room management
const rooms = new Map<string, Room>();
const clients = new Map<string, WebSocket>();

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  await initDb();

  // WebSocket logic
  wss.on('connection', (ws) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'JOIN_ROOM': {
          const { roomId, player } = message;
          currentRoomId = roomId;
          currentPlayerId = player.id;
          
          let room = rooms.get(roomId);
          if (!room) {
            // Create room if it doesn't exist
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
            rooms.set(roomId, room);
          }

          // Add player if not already in
          if (!room.players.find(p => p.id === player.id)) {
            room.players.push({ ...player, score: 0, isReady: false, results: [] });
          }
          
          clients.set(player.id, ws);
          broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room });
          break;
        }

        case 'READY': {
          if (!currentRoomId || !currentPlayerId) return;
          const room = rooms.get(currentRoomId);
          if (room) {
            const player = room.players.find(p => p.id === currentPlayerId);
            if (player) player.isReady = true;

            // Start game if all ready
            if (room.players.every(p => p.isReady) && room.players.length >= 1) {
              room.status = 'playing';
              startGameLoop(currentRoomId);
            }
            broadcastToRoom(currentRoomId, { type: 'ROOM_UPDATE', room });
          }
          break;
        }

        case 'RENAME': {
          if (!currentRoomId || !currentPlayerId) return;
          const { username } = message;
          const room = rooms.get(currentRoomId);
          if (room) {
            const player = room.players.find(p => p.id === currentPlayerId);
            if (player) player.username = username;
            broadcastToRoom(currentRoomId, { type: 'ROOM_UPDATE', room });
          }
          break;
        }

        case 'SUBMIT_ANSWER': {
          if (!currentRoomId || !currentPlayerId) return;
          const { isCorrect, movieId } = message;
          const room = rooms.get(currentRoomId);
          if (room && room.status === 'playing') {
            const player = room.players.find(p => p.id === currentPlayerId);
            if (player) {
              if (isCorrect) player.score += 1;
              player.lastAnswerCorrect = isCorrect;
              // Track result
              if (!player.results.find(r => r.movieId === movieId)) {
                player.results.push({ movieId, isCorrect });
              }
            }
            broadcastToRoom(currentRoomId, { type: 'ROOM_UPDATE', room });
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      if (currentRoomId && currentPlayerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.players = room.players.filter(p => p.id !== currentPlayerId);
          if (room.players.length === 0) {
            rooms.delete(currentRoomId);
          } else {
            if (room.hostId === currentPlayerId) {
              room.hostId = room.players[0].id;
            }
            broadcastToRoom(currentRoomId, { type: 'ROOM_UPDATE', room });
          }
        }
        clients.delete(currentPlayerId);
      }
    });
  });

  function broadcastToRoom(roomId: string, message: any) {
    const room = rooms.get(roomId);
    if (room) {
      room.players.forEach(p => {
        const client = clients.get(p.id);
        if (client && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  function startGameLoop(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;

    const interval = setInterval(() => {
      const currentRoom = rooms.get(roomId);
      if (!currentRoom || currentRoom.status !== 'playing') {
        clearInterval(interval);
        return;
      }

      currentRoom.timer -= 1;

      if (currentRoom.timer <= 0) {
        currentRoom.currentMovieIndex += 1;
        currentRoom.timer = 10;
        
        if (currentRoom.currentMovieIndex >= currentRoom.movies.length) {
          currentRoom.status = 'finished';
          clearInterval(interval);
        }
      }

      broadcastToRoom(roomId, { type: 'ROOM_UPDATE', room: currentRoom });
    }, 1000);
  }

  // API Routes
  
  // Movies
  app.get('/api/movies', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM movies');
      const movies = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        imageUrl: row.image_url,
        year: row.year,
        genre: row.genre
      }));
      res.json(movies);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch movies' });
    }
  });

  app.post('/api/movies', async (req, res) => {
    const { id, title, imageUrl, year, genre } = req.body;
    try {
      await pool.query(
        'INSERT INTO movies (id, title, image_url, year, genre) VALUES ($1, $2, $3, $4, $5)',
        [id, title, imageUrl, year, genre]
      );
      res.status(201).json({ id, title, imageUrl, year, genre });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add movie' });
    }
  });

  app.delete('/api/movies/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM movies WHERE id = $1', [req.params.id]);
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete movie' });
    }
  });

  // Users
  app.get('/api/users', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users');
      const users = result.rows.map(row => ({
        id: row.id,
        username: row.username,
        email: row.email,
        password: row.password,
        bestScore: row.best_score,
        gamesPlayed: row.games_played,
        wins: row.wins,
        isAdmin: row.is_admin
      }));
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { id, username, email, password, isAdmin } = req.body;
    try {
      await pool.query(
        'INSERT INTO users (id, username, email, password, is_admin) VALUES ($1, $2, $3, $4, $5)',
        [id, username, email, password, isAdmin || false]
      );
      res.status(201).json({ id, username, email, isAdmin: isAdmin || false });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Failed to register user' });
    }
  });

  app.patch('/api/users/:id/score', async (req, res) => {
    const { score, isWin } = req.body;
    try {
      const result = await pool.query(
        `UPDATE users 
         SET best_score = GREATEST(best_score, $1), 
             games_played = games_played + 1,
             wins = wins + CASE WHEN $2 = true THEN 1 ELSE 0 END
         WHERE id = $3
         RETURNING *`,
        [score, isWin, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: 'Failed to update score' });
    }
  });

  // Leaderboard
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

  // Blob Upload
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

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
