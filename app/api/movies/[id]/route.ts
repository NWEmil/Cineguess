import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await sql`DELETE FROM movies WHERE id = ${id}`;
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
