
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

export async function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not found. Skipping database initialization.');
    return;
  }
  console.log('Initializing database...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS movies (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        image_url TEXT NOT NULL,
        year INTEGER NOT NULL,
        genre TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password TEXT,
        best_score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        is_admin BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Tables created or already exist.');

    // Check if admin exists
    const adminCheck = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO users (id, username, email, password, is_admin)
        VALUES ($1, $2, $3, $4, $5)
      `, ['admin-1', 'admin', 'admin@cineguess.com', 'metro2033', true]);
      console.log('Admin user created.');
    }

    // Seed movies if empty
    const movieCheck = await client.query('SELECT COUNT(*) FROM movies');
    if (parseInt(movieCheck.rows[0].count) === 0) {
      const INITIAL_MOVIES = [
        { id: '1', title: 'Interstellar', imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200', year: 2014, genre: 'Sci-Fi' },
        { id: '2', title: 'The Dark Knight', imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1200', year: 2008, genre: 'Action' },
        { id: '3', title: 'Inception', imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200', year: 2010, genre: 'Sci-Fi' },
        { id: '4', title: 'Blade Runner 2049', imageUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=1200', year: 2017, genre: 'Sci-Fi' },
        { id: '5', title: 'Dune', imageUrl: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&q=80&w=1200', year: 2021, genre: 'Sci-Fi' },
        { id: '6', title: 'Mad Max: Fury Road', imageUrl: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?auto=format&fit=crop&q=80&w=1200', year: 2015, genre: 'Action' },
        { id: '7', title: 'Arrival', imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200', year: 2016, genre: 'Sci-Fi' },
        { id: '8', title: 'The Matrix', imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200', year: 1999, genre: 'Action' },
        { id: '9', title: 'Spider-Man: Into the Spider-Verse', imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=1200', year: 2018, genre: 'Animation' },
        { id: '10', title: 'The Grand Budapest Hotel', imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200', year: 2014, genre: 'Comedy' },
        { id: '11', title: 'Pulp Fiction', imageUrl: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&q=80&w=1200', year: 1994, genre: 'Crime' },
        { id: '12', title: 'The Shawshank Redemption', imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=1200', year: 1994, genre: 'Drama' },
        { id: '13', title: 'Parasite', imageUrl: 'https://images.unsplash.com/photo-1585951237318-9ea5e175b891?auto=format&fit=crop&q=80&w=1200', year: 2019, genre: 'Thriller' },
        { id: '14', title: 'Everything Everywhere All at Once', imageUrl: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?auto=format&fit=crop&q=80&w=1200', year: 2022, genre: 'Sci-Fi' },
        { id: '15', title: 'The Godfather', imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200', year: 1972, genre: 'Crime' },
        { id: '16', title: 'Spirited Away', imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&q=80&w=1200', year: 2001, genre: 'Animation' },
        { id: '17', title: 'Gladiator', imageUrl: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&q=80&w=1200', year: 2000, genre: 'Action' },
        { id: '18', title: 'The Silence of the Lambs', imageUrl: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?auto=format&fit=crop&q=80&w=1200', year: 1991, genre: 'Thriller' },
        { id: '19', title: 'Jurassic Park', imageUrl: 'https://images.unsplash.com/photo-1568702846914-96b3c5d2aaeb?auto=format&fit=crop&q=80&w=1200', year: 1993, genre: 'Adventure' },
        { id: '20', title: 'Alien', imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200', year: 1979, genre: 'Horror' }
      ];
      for (const movie of INITIAL_MOVIES) {
        await client.query(
          'INSERT INTO movies (id, title, image_url, year, genre) VALUES ($1, $2, $3, $4, $5)',
          [movie.id, movie.title, movie.imageUrl, movie.year, movie.genre]
        );
      }
      console.log('Initial movies seeded.');
    }
    
    console.log('Database initialization complete.');
  } catch (err) {
    console.error('Database initialization failed:', err);
    throw err;
  } finally {
    client.release();
  }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('db-init.ts')) {
  initDb().then(() => process.exit(0)).catch(() => process.exit(1));
}
