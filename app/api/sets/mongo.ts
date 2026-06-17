import { MongoClient } from "mongodb";
import type { QuizSet } from "./store";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "current_affairs_quiz";

let clientPromise: Promise<MongoClient> | null = null;

export function hasMongoConfig() {
  return Boolean(uri);
}

export async function quizSetsCollection() {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
  }

  const client = await clientPromise;
  return client.db(dbName).collection<QuizSet>("quiz_sets");
}
