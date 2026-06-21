import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

let cachedClient = null;

async function connectToDatabase(uri) {
  if (cachedClient) {
    return cachedClient;
  }
  const client = new MongoClient(uri);
  await client.connect();
  cachedClient = client;
  return client;
}

export async function GET() {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "current_affairs_quiz";

    if (!uri) {
      throw new Error("MONGODB_URI environment variable is missing.");
    }

    const client = await connectToDatabase(uri);
    const db = client.db(dbName);

    // Ping the database deployment to confirm health
    await db.command({ ping: 1 });

    return NextResponse.json(
      { success: true, message: 'Database connected successfully via direct shards!' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Ping failed:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}