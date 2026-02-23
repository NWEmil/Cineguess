import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    console.log(`Attempting to delete movie with ID: ${id}`);

    if (!id) {
      return NextResponse.json({ error: 'Movie ID is missing' }, { status: 400 });
    }

    const result = await sql`DELETE FROM movies WHERE id = ${id}`;
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

    await sql`
      UPDATE movies
      SET title = ${title},
          image_url = ${imageUrl},
          year = ${year},
          genre = ${genre}
      WHERE id = ${id}
    `;

    return NextResponse.json({ message: 'Movie updated' }, { status: 200 });
  } catch (error) {
    console.error('Error updating movie:', error);
    return NextResponse.json({ error: 'Failed to update movie' }, { status: 500 });
  }
}
