
import { Movie } from './types';

export const INITIAL_MOVIES: Movie[] = [
  {
    id: '1',
    title: 'Interstellar',
    imageUrl: 'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&q=80&w=1200',
    year: 2014,
    genre: 'Sci-Fi'
  },
  {
    id: '2',
    title: 'The Dark Knight',
    imageUrl: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&q=80&w=1200',
    year: 2008,
    genre: 'Action'
  },
  {
    id: '3',
    title: 'Inception',
    imageUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&q=80&w=1200',
    year: 2010,
    genre: 'Sci-Fi'
  },
  {
    id: '4',
    title: 'Blade Runner 2049',
    imageUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=1200',
    year: 2017,
    genre: 'Sci-Fi'
  },
  {
    id: '5',
    title: 'Dune',
    imageUrl: 'https://images.unsplash.com/photo-1506466010722-395aa2bef877?auto=format&fit=crop&q=80&w=1200',
    year: 2021,
    genre: 'Sci-Fi'
  },
  {
    id: '6',
    title: 'Mad Max: Fury Road',
    imageUrl: 'https://images.unsplash.com/photo-1533613220915-609f661a6fe1?auto=format&fit=crop&q=80&w=1200',
    year: 2015,
    genre: 'Action'
  },
  {
    id: '7',
    title: 'Arrival',
    imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200',
    year: 2016,
    genre: 'Sci-Fi'
  },
  {
    id: '8',
    title: 'The Matrix',
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200',
    year: 1999,
    genre: 'Action'
  },
  {
    id: '9',
    title: 'Spider-Man: Into the Spider-Verse',
    imageUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&q=80&w=1200',
    year: 2018,
    genre: 'Animation'
  },
  {
    id: '10',
    title: 'The Grand Budapest Hotel',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200',
    year: 2014,
    genre: 'Comedy'
  }
];

export const ROUNDS_COUNT = 10;
export const SECONDS_PER_ROUND = 10;
