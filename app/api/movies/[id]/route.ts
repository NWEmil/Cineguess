import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    console.log(`Attempting to delete movie with ID: ${id}`);

    if (!id) {
      return NextResponse.json({ error: 'Movie ID is missing' }, { status: 400 });
    }

    const result = await pool.query('DELETE FROM movies WHERE id = $1', [id]);
    console.log(`Delete operation result:`, result);

    if (result.rowCount === 0) {
      return NextResponse.json({ message: 'Movie not found or already deleted' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Movie deleted' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting movie:', error);
    return NextResponse.json({ error: 'Failed to delete movie' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { title, imageUrl, year, genre } = await request.json();

    const result = await pool.query(
      `UPDATE movies
       SET title = $1,
           image_url = $2,
           year = $3,
           genre = $4
       WHERE id = $5`,
      [title, imageUrl, year, genre, id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Movie updated' }, { status: 200 });
  } catch (error) {
    console.error('Error updating movie:', error);
    return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
  }
}
