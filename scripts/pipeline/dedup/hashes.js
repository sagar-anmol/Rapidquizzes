const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { normalizeQuestionText } = require("../generate/validate");

const HASHES_FILE = path.join(process.cwd(), "data", "generated", "question-hashes.json");

function hashQuestion(questionText) {
  return crypto
    .createHash("sha256")
    .update(normalizeQuestionText(questionText))
    .digest("hex")
    .slice(0, 24);
}

async function loadHashes() {
  try {
    const raw = await fs.readFile(HASHES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveHashes(hashes) {
  await fs.mkdir(path.dirname(HASHES_FILE), { recursive: true });
  await fs.writeFile(HASHES_FILE, JSON.stringify(hashes, null, 2), "utf8");
}

function getRecentQuestionTexts(hashes, limit = 150) {
  const entries = Object.values(hashes)
    .filter((v) => v && typeof v === "object" && v.text)
    .sort((a, b) => String(b.addedAt || "").localeCompare(String(a.addedAt || "")));
  return entries.slice(0, limit).map((e) => e.text);
}

async function filterDuplicates(questions, knownHashes) {
  const seenInRun = new Set();
  const unique = [];
  let duplicates = 0;

  for (const q of questions) {
    const hash = hashQuestion(q.question);
    if (knownHashes[hash] || seenInRun.has(hash)) {
      duplicates++;
      continue;
    }
    seenInRun.add(hash);
    unique.push({ ...q, _hash: hash });
  }

  return { unique, duplicates };
}

module.exports = {
  loadHashes,
  saveHashes,
  filterDuplicates,
  hashQuestion,
  getRecentQuestionTexts
};
