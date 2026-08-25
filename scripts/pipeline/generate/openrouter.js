const BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const MODEL = process.env.OPENROUTER_MODEL || "stealth/ox-alpha";

function requireApiKey() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to .env.local locally or GitHub repo secrets for Actions."
    );
  }
  return key;
}

async function chatOnce(messages, { maxTokens, temperature }) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireApiKey()}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/sagar-anmol/Rapidquizzes",
      "X-Title": "RapidQuizzes Auto Generator"
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 300)}`), {
      status: res.status
    });
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  return {
    content: choice?.message?.content || "",
    finishReason: choice?.finish_reason || null,
    usage: data.usage || null
  };
}

async function withRetries(fn, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const retryable = !err.status || err.status === 429 || err.status >= 500;
      if (!retryable) throw err;
      await new Promise((r) => setTimeout(r, (i + 1) * 5000));
    }
  }
  throw lastErr;
}

async function chat(messages, options = {}) {
  return withRetries(async () => {
    const result = await chatOnce(messages, {
      maxTokens: options.maxTokens ?? 16000,
      temperature: options.temperature ?? 0.8
    });
    if (!result.content.trim()) {
      throw new Error(
        `Empty model response (finish_reason=${result.finishReason}, usage=${JSON.stringify(result.usage)})`
      );
    }
    return result;
  });
}

module.exports = { chat, MODEL };
