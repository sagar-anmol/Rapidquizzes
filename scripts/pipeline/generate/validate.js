function extractJsonArray(text) {
  const cleaned = String(text || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "");
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Model response contains no JSON array");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeQuestionText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function validateQuestions(rawArray) {
  if (!Array.isArray(rawArray)) throw new Error("Expected an array of questions");

  const valid = [];
  const rejected = [];

  for (const q of rawArray) {
    try {
      if (typeof q.question !== "string" || q.question.trim().length < 10) {
        throw new Error("question too short or missing");
      }
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error("options must be exactly 4");
      }
      const options = q.options.map((o) => String(o).trim());
      if (options.some((o) => o.length === 0)) throw new Error("empty option");
      const idx = Number(q.correctAnswerIndex);
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) {
        throw new Error("correctAnswerIndex invalid");
      }
      valid.push({
        question: q.question.trim(),
        options,
        correctAnswerIndex: idx,
        explanation: q.explanation ? String(q.explanation).trim() : undefined,
        category: q.category ? String(q.category).trim() : "Current Affairs"
      });
    } catch (err) {
      rejected.push({ reason: err.message });
    }
  }

  return { valid, rejected };
}

function buildQuizSet(questions, { dateKey }) {
  const createdAt = new Date().toISOString();
  const prettyDate = dateKey
    .split("-")
    .reverse()
    .join("-");
  return {
    id: `auto-ca-${dateKey}`,
    title: `Daily Current Affairs — ${prettyDate}`,
    description: "Auto-generated from live news sources via RapidQuizzes pipeline.",
    category: "Current Affairs",
    tags: ["daily", "auto", dateKey],
    totalQuestions: questions.length,
    createdAt,
    questions: questions.map(({ _hash, ...q }, i) => ({ ...q, id: `q${i + 1}-${dateKey}` }))
  };
}

module.exports = { extractJsonArray, normalizeQuestionText, validateQuestions, buildQuizSet };
