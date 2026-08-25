const SYSTEM_PROMPT = [
  "You are an expert Indian competitive-exam question writer (UPSC/SSC/Banking style).",
  "You write accurate, fact-based multiple-choice questions from current-affairs material.",
  "You always respond with a raw JSON array and nothing else: no markdown fences, no commentary."
].join(" ");

function buildUserPrompt({ items, count, avoidTitles, avoidQuestions }) {
  const context = items
    .map(
      (item, i) =>
        `[${i + 1}] (${item.sourceName} | ${item.category}) ${item.title}${
          item.summary ? ` — ${item.summary}` : ""
        }`
    )
    .join("\n");

  const categories =
    "National, International, Economy, Sports, Science & Technology, Government Schemes, Environment";

  return [
    `Below is today's scraped current-affairs material from ${new Set(items.map((i) => i.sourceName)).size} sources.`,
    "",
    "MATERIAL START",
    context,
    "MATERIAL END",
    "",
    `Write exactly ${count} multiple-choice questions based strictly on the facts in the material above.`,
    "Rules:",
    "- Each question must have exactly 4 options and one clearly correct answer.",
    "- Spread questions across these categories as the material allows: " + categories + ".",
    "- Mix difficulty: ~40% easy factual recall, ~40% medium analysis, ~20% hard.",
    "- Every question must include a one-to-two-sentence explanation naming the key fact.",
    "- Do NOT create near-duplicate questions about the same single fact.",
    "- Do NOT reuse or paraphrase any of these previously asked topics: " +
      (avoidTitles.length ? avoidTitles.slice(0, 60).join("; ") : "(none)") +
      ".",
    "- STRICTLY do not repeat (even with different wording or from a different angle) any question semantically similar to these previously generated questions: " +
      (avoidQuestions.length ? avoidQuestions.slice(0, 150).join(" || ") : "(none)") +
      ".",
    'Return ONLY a JSON array where each element is:',
    '{"question": string, "options": [string, string, string, string], "correctAnswerIndex": 0|1|2|3, "explanation": string, "category": string}'
  ].join("\n");
}

module.exports = { SYSTEM_PROMPT, buildUserPrompt };
