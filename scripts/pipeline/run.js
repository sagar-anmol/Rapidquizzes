const fs = require("fs/promises");
const path = require("path");
const { loadProjectEnv } = require("./lib/env");
const { scrapeAll } = require("./scraper/engine");
const { chat, MODEL } = require("./generate/openrouter");
const {
  SYSTEM_PROMPT,
  buildUserPrompt
} = require("./generate/prompt");
const {
  extractJsonArray,
  validateQuestions,
  buildQuizSet
} = require("./generate/validate");
const {
  loadHashes,
  saveHashes,
  filterDuplicates,
  getRecentQuestionTexts
} = require("./dedup/hashes");

const GENERATED_DIR = path.join(process.cwd(), "data", "generated");
const RAW_DIR = path.join(process.cwd(), "data", "raw");

function parseArgs(argv) {
  const args = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [key, value] = arg.replace(/^--/, "").split("=");
    args[key] = value === undefined ? true : value;
  }
  return args;
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

async function writeIndex(setMeta) {
  const indexPath = path.join(GENERATED_DIR, "index.json");
  let index = { generatedAt: null, sets: [] };
  try {
    index = JSON.parse(await fs.readFile(indexPath, "utf8"));
    if (!Array.isArray(index.sets)) index.sets = [];
  } catch {}

  index.generatedAt = new Date().toISOString();
  index.sets = index.sets.filter((s) => s.id !== setMeta.id);
  index.sets.unshift(setMeta);

  await fs.writeFile(indexPath, JSON.stringify(index, null, 2), "utf8");
}

async function generateBatch({ items, count, avoidTitles, avoidQuestions }) {
  const result = await chat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserPrompt({ items, count, avoidTitles, avoidQuestions })
      }
    ],
    { maxTokens: Math.min(32000, count * 700 + 4000), temperature: 0.85 }
  );
  if (result.finishReason !== "stop") {
    console.log(
      `    [warn] finish_reason=${result.finishReason} usage=${JSON.stringify(result.usage)}`
    );
  }
  return extractJsonArray(result.content);
}

async function main() {
  loadProjectEnv();
  const args = parseArgs(process.argv.slice(2));

  const targetQuestions = num(args["questions"], 30);
  const bufferPerBatch = num(args.buffer, 6);
  const batchSize = num(args.batch, 10);
  const minAcceptable = num(args.min, Math.max(10, Math.floor(targetQuestions * 0.7)));
  const maxBatches = num(args["max-batches"], Math.ceil(targetQuestions / batchSize) + 3);
  const limitSources = args.sources === undefined ? null : num(args.sources, null);
  const dryRun = Boolean(args.dry);

  const configRaw = await fs.readFile(
    path.join(__dirname, "config", "sources.json"),
    "utf8"
  );
  const config = JSON.parse(configRaw);
  const sources = limitSources
    ? { ...config, sources: config.sources.slice(0, limitSources) }
    : config;

  console.log(`[1/4] Scraping ${sources.sources.length} sources...`);
  const { pool, failures } = await scrapeAll(sources);
  console.log(
    `Scraped ${pool.length} items from ${new Set(pool.map((p) => p.sourceId)).size} sources; ` +
      `${failures.length} sources failed.`
  );
  failures.forEach((f) => console.log(`  FAIL ${f.message}`));

  if (pool.length < 5) {
    console.error("Too little scraped material to build a quiz set.");
    process.exit(1);
  }

  const dateKey = new Date().toISOString().slice(0, 10);
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.writeFile(
    path.join(RAW_DIR, `${dateKey}.json`),
    JSON.stringify({ dateKey, pool }, null, 2),
    "utf8"
  );

  if (dryRun) {
    console.log("[dry] Scrape-only run complete. Raw saved to data/raw/. Exiting before AI step.");
    return;
  }

  console.log(`[2/4] Loading question-hash history for dedup...`);
  const knownHashes = await loadHashes();
  const knownCount = Object.keys(knownHashes).length;
  console.log(`Known hashes: ${knownCount}`);

  const contextItems = pool.slice(0, 400);
  const avoidTitles = pool.map((p) => p.title).slice(0, 80);
  const avoidQuestions = getRecentQuestionTexts(knownHashes, 150);
  console.log(`Feeding ${avoidQuestions.length} previously-asked questions to the model for avoidance.`);

  console.log(`[3/4] Generating up to ${targetQuestions} questions via ${MODEL}...`);
  const collected = [];
  let totalDuplicates = 0;

  for (let batch = 1; batch <= maxBatches && collected.length < targetQuestions; batch++) {
    const remaining = targetQuestions - collected.length;
    const askCount = remaining + bufferPerBatch;
    console.log(`  Batch ${batch}: requesting ${askCount} questions (need ${remaining} more)...`);

    try {
      const raw = await generateBatch({
        items: contextItems,
        count: askCount,
        avoidTitles,
        avoidQuestions
      });
      const { valid, rejected } = validateQuestions(raw);
      const { unique, duplicates } = await filterDuplicates(valid, knownHashes);
      totalDuplicates += duplicates + rejected.length;
      collected.push(...unique.slice(0, remaining));
      console.log(
        `    got ${raw.length}, valid ${valid.length}, unique ${unique.length}, kept ${
          unique.length
        }; total kept ${collected.length}/${targetQuestions}`
      );
    } catch (err) {
      console.error(`    Batch ${batch} failed: ${err.message}`);
    }
  }

  if (collected.length < minAcceptable) {
    console.error(
      `Only ${collected.length} usable questions (minimum ${minAcceptable}). Aborting without writing a set.`
    );
    process.exit(1);
  }

  const finalQuestions = collected.slice(0, targetQuestions);
  const quizSet = buildQuizSet(finalQuestions, { dateKey });

  console.log(`[4/4] Saving set "${quizSet.title}" (${quizSet.totalQuestions} questions)...`);
  await fs.mkdir(GENERATED_DIR, { recursive: true });
  const setFile = path.join(GENERATED_DIR, `${quizSet.id}.json`);
  await fs.writeFile(setFile, JSON.stringify(quizSet, null, 2), "utf8");

  for (const q of finalQuestions) {
    knownHashes[q._hash] = {
      setId: quizSet.id,
      text: q.question,
      addedAt: new Date().toISOString()
    };
  }
  await saveHashes(knownHashes);

  await writeIndex({
    id: quizSet.id,
    title: quizSet.title,
    file: `${quizSet.id}.json`,
    category: quizSet.category,
    totalQuestions: quizSet.totalQuestions,
    createdAt: quizSet.createdAt,
    sourcesUsed: [...new Set(pool.map((p) => p.sourceName))].length,
    duplicatesSkipped: totalDuplicates
  });

  console.log(
    `Done. Set file: data/generated/${quizSet.id}.json | questions: ${quizSet.totalQuestions} | dups/rejected skipped: ${totalDuplicates}`
  );
}

main().catch((err) => {
  console.error("Pipeline failed:", err.message);
  process.exit(1);
});
