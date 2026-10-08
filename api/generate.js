// Vercel serverless function: forwards requests from the Glossa page to the Gemini API.
// The API key lives in the GEMINI_API_KEY environment variable and never reaches the browser.

const MODELS = {
  quick: "gemini-3.5-flash-lite",
  default: "gemini-3.8-flash",
};
// Tried in order when Google answers 503 (overloaded). All are on the free tier.
const FALLBACKS = [MODELS.quick, "gemini-3.1-flash-lite"];

const MAX_TURNS = 40;
const MAX_CHARS = 200000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 40; // per visitor address, best effort (resets when the function restarts)
const hits = new Map();

function limited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_REQUESTS_PER_WINDOW;
}

function fail(res, status, message) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: { message } }));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");

  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail(res, 500, "Server is missing the GEMINI_API_KEY setting.");

  // Only accept calls made by pages on this same site.
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) return fail(res, 403, "Origin not allowed.");
    } catch (e) {
      return fail(res, 403, "Origin not allowed.");
    }
  }

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return fail(res, 429, "Too many requests from this address. Wait a few minutes and try again.");

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { return fail(res, 400, "Body must be JSON."); }
  }
  if (!body || !Array.isArray(body.contents) || body.contents.length === 0 || body.contents.length > MAX_TURNS) {
    return fail(res, 400, "Invalid request.");
  }

  let chars = 0;
  const contents = [];
  for (const turn of body.contents) {
    const role = turn && turn.role;
    const text = turn && Array.isArray(turn.parts) && turn.parts[0] && turn.parts[0].text;
    if ((role !== "user" && role !== "model") || typeof text !== "string") return fail(res, 400, "Invalid turn.");
    chars += text.length;
    contents.push({ role, parts: [{ text }] });
  }
  if (chars > MAX_CHARS) return fail(res, 413, "Input is too long.");

  const model = MODELS[body.tier] || MODELS.default;
  const stream = body.stream === true;
  const payload = { contents, generationConfig: { maxOutputTokens: 8192 } };
  if (body.json === true) payload.generationConfig.responseMimeType = "application/json";

  // Same model twice, then the fallbacks, skipping repeats.
  const order = [model, model].concat(FALLBACKS.filter((m) => m !== model));
  let upstream;
  for (let i = 0; i < order.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1500));
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" + order[i] +
      (stream ? ":streamGenerateContent?alt=sse" : ":generateContent");
    try {
      upstream = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      if (i === order.length - 1) return fail(res, 502, "Could not reach the model service.");
      continue;
    }
    if (upstream.status !== 503) break;
  }

  if (!stream || !upstream.ok) {
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("content-type", "application/json");
    return res.end(text);
  }

  res.statusCode = 200;
  res.setHeader("content-type", "text/event-stream");
  res.setHeader("cache-control", "no-cache");
  try {
    for await (const chunk of upstream.body) res.write(chunk);
  } catch (e) {
    /* client went away or upstream closed */
  }
  res.end();
};
