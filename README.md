# Glossa

**English to ASL, grammar first.** Glossa turns an English sentence into American Sign Language (ASL) gloss with generative AI, checks its own work, plans each sign, and previews it. Visitors need **no account and no key**.

Mini project: *An End-to-End Generative AI Application for English-to-ASL Translation and Learning.*

## How the key stays private

The page never sees an API key. It sends requests to `/api/generate`, a small serverless function (`api/generate.js`) that holds the Google Gemini key in a Vercel environment variable and forwards the request. The function only accepts requests from its own site, limits each visitor address, caps input size, and only allows two fixed models.

```
index.html  --->  /api/generate  --->  Google Gemini
(no key)          (holds the key)
```

## Deploy (free)

1. **Get a free Gemini key:** <https://aistudio.google.com/apikey> (any Google account, no card).
2. **Put these files in your GitHub repo** (`Anikaa1308/glossa`):
   - `index.html` (replace the old one)
   - `api/generate.js` (in GitHub use **Add file, Create new file**, type `api/generate.js` as the name, paste the contents)
   - `vercel.json`
3. **Import the repo in Vercel:** <https://vercel.com/new>, choose the repo, leave Framework Preset as **Other**.
4. **Add the key before deploying:** open **Environment Variables**, set Name `GEMINI_API_KEY`, Value = your key, then click **Deploy**.
5. Open the `.vercel.app` address Vercel gives you.

If you add or change the variable after deploying, go to **Deployments** and **Redeploy** so it takes effect.

GitHub Pages cannot run server code, so this version is hosted on Vercel only. If you already enabled GitHub Pages or uploaded the `.github` folder, ignore them or delete them.

## Limits and honesty

- Google's free tier allows only about 5 to 10 requests a minute across **all** visitors, and one translation uses three requests. If the page seems slow it is waiting and retrying once; heavy use will hit the limit.
- On the free tier Google may use prompts to improve its models. Do not enter personal information.
- Anyone with the link uses your free quota. The per-visitor limit is best effort. If the link is abused, delete the key in Google AI Studio and make a new one.
- The preview is a **schematic**, not video of a signer. Sign details come from a language model and can be wrong; check a sign dictionary.
- Gloss is a written approximation and cannot show facial grammar or speed.
- Handshapes X, claw and bent flat hand have no diagram; C, O and F are stylised.
- Reference glosses in the Evaluate tab were written for this project and have not been checked by a fluent signer.
- Built without Deaf community input so far.

## Files

```
index.html          the whole front end (HTML, CSS, JavaScript)
api/generate.js     serverless function that holds the key
vercel.json         allows the function up to 60 seconds
README.md  LICENSE  .gitignore
```

## Models

Set in `api/generate.js`: Fast uses `gemini-2.5-flash-lite`, Accurate uses `gemini-2.5-flash`. Model names change over time; if you see a model-not-found error under **Details** on the page, update the names there and redeploy.

## License

MIT, see `LICENSE`.
