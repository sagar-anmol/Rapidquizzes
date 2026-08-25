const fs = require("fs");
const path = require("path");

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.log("Supabase secrets not set; skipping database push (sets remain committed to repo).");
    return;
  }

  const generatedDir = path.join(process.cwd(), "data", "generated");
  const files = fs.readdirSync(generatedDir).filter((f) => /^auto-ca-.*\.json$/.test(f));
  if (!files.length) {
    console.log("No generated sets found to push.");
    return;
  }

  for (const file of files) {
    const filePath = path.join(generatedDir, file);
    const set = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/quiz_sets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        apikey: SERVICE_KEY,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify([{ id: set.id, data: set }])
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Supabase push failed HTTP ${res.status} for ${file}: ${body.slice(0, 300)}`);
    }
    console.log(`Pushed ${set.id} (${set.totalQuestions} questions) to Supabase.`);
  }
}

main().catch((err) => {
  console.error("Supabase push failed:", err.message);
  process.exit(1);
});
