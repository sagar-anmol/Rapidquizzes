import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { hasMongoConfig, quizSetsCollection } from "./mongo";

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
};

export type QuizSet = {
  id: string;
  title: string;
  description?: string;
  category?: string;
  createdAt: string;
  questions: QuizQuestion[];
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "sets.json");

const starterSets: QuizSet[] = [
  {
    id: "starter-current-affairs",
    title: "Starter Current Affairs Set",
    description: "A tiny sample set so the app works before admin uploads.",
    category: "General",
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: "q1",
        question: "Which feature lets this app keep quiz sets available without internet?",
        options: ["Server cookies", "Offline cache", "Password reset", "Image CDN"],
        answer: 1,
        explanation: "Downloaded sets are saved locally in the browser."
      },
      {
        id: "q2",
        question: "What can the admin upload?",
        options: ["Only images", "Quiz sets as JSON", "Videos only", "User passwords"],
        answer: 1
      }
    ]
  }
];

export async function readSets(): Promise<QuizSet[]> {
  if (hasMongoConfig()) {
    const collection = await quizSetsCollection();
    const sets = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return sets.length ? sets : starterSets;
  }

  try {
    const raw = await readFile(dataFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : starterSets;
  } catch {
    return starterSets;
  }
}

export async function writeSets(sets: QuizSet[]) {
  if (hasMongoConfig()) {
    const collection = await quizSetsCollection();
    const operations = sets.map((set) => ({
      replaceOne: {
        filter: { id: set.id },
        replacement: set,
        upsert: true
      }
    }));

    if (operations.length) {
      await collection.bulkWrite(operations);
    }
    return;
  }

  await mkdir(dataDir, { recursive: true });
  await writeFile(dataFile, JSON.stringify(sets, null, 2), "utf8");
}

export async function listSets(page: number, limit: number) {
  if (hasMongoConfig()) {
    const collection = await quizSetsCollection();
    const total = await collection.countDocuments();
    const sets = await collection
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    return {
      sets: sets.length ? sets : page === 1 ? starterSets.slice(0, limit) : [],
      total: Math.max(total, sets.length ? total : starterSets.length)
    };
  }

  const sets = (await readSets()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const start = (page - 1) * limit;

  return {
    sets: sets.slice(start, start + limit),
    total: sets.length
  };
}

export async function upsertSets(newSets: QuizSet[]) {
  if (hasMongoConfig()) {
    const collection = await quizSetsCollection();
    await collection.bulkWrite(
      newSets.map((set) => ({
        replaceOne: {
          filter: { id: set.id },
          replacement: set,
          upsert: true
        }
      }))
    );
    return;
  }

  const existing = await readSets();
  const withoutDuplicates = existing.filter((set) => !newSets.some((item) => item.id === set.id));
  await writeSets([...newSets, ...withoutDuplicates]);
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 52);
}

function normalizeQuestion(input: any, index: number): QuizQuestion {
  const options = input.options ?? input.choices;
  if (!input.question || !Array.isArray(options) || options.length < 2) {
    throw new Error(`Question ${index + 1} needs "question" and at least two "options".`);
  }

  let answer = input.answer ?? input.correctAnswer ?? input.correct;
  if (typeof answer === "string") {
    const optionIndex = options.findIndex((option: string) => option === answer);
    answer = optionIndex >= 0 ? optionIndex : Number(answer);
  }

  if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
    throw new Error(`Question ${index + 1} has an invalid answer index.`);
  }

  return {
    id: String(input.id ?? `q-${index + 1}-${Date.now()}`),
    question: String(input.question),
    options: options.map(String),
    answer,
    explanation: input.explanation ? String(input.explanation) : undefined
  };
}

export function normalizeSet(input: any): QuizSet {
  if (!input || !Array.isArray(input.questions) || input.questions.length === 0) {
    throw new Error('Each set needs a non-empty "questions" array.');
  }

  const title = String(input.title ?? input.name ?? "Untitled Quiz Set");
  const createdAt = input.createdAt ? new Date(input.createdAt).toISOString() : new Date().toISOString();

  return {
    id: String(input.id ?? `${slug(title) || "quiz-set"}-${Date.now()}`),
    title,
    description: input.description ? String(input.description) : undefined,
    category: input.category ? String(input.category) : undefined,
    createdAt,
    questions: input.questions.map(normalizeQuestion)
  };
}
