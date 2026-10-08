// Vercel serverless function: forwards requests from the Glossa page to the Gemini API.
// The API key lives in the GEMINI_API_KEY environment variable and never reaches the browser.

const MODELS = {
  quick: "gemini-2.5-flash-lite",
  default: "gemini-2.5-flash",
};

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

  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" + model +
    (stream ? ":streamGenerateContent?alt=sse" : ":generateContent");

  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    return fail(res, 502, "Could not reach the model service.");
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
