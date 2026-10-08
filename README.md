# Glossa

**English to ASL, grammar first.** Glossa is a single-page web app that uses generative AI to turn an English sentence into American Sign Language (ASL) gloss, plan how each sign is produced, and preview it.

> Mini project: *An End-to-End Generative AI Application for English-to-ASL Translation and Learning.*

## Why

ASL is not English with hands. It puts time first, drops articles and "to be" verbs, puts question words last and puts negation after the verb. A word-for-word swap gets it wrong, so Glossa translates grammar first and motion second.

## What it does

| Stage | What happens | Generative AI? |
|---|---|---|
| 1. Gloss | A rules-and-examples prompt turns English into ASL gloss, with a list of the changes made | Yes |
| 2. Self-check | A reviewer call reads the gloss back into English, checks meaning, and repairs the gloss | Yes |
| 3. Sign planning | For each sign the model picks a standard handshape, direction, location, movement, facial expression and a confidence level | Yes |
| 4. Preview | Code draws the chosen handshape and moves a dot through signing space | No (code) |

Also included: a streaming **ASL tutor chat** that knows the current translation, an AI-written **practice quiz**, and an **Evaluate** tab that compares a plain prompt with a rules-and-examples prompt using code-based scores (token F1, word-order match, exact match) and an AI judge with alternating order to reduce position bias.

The model **chooses** handshapes from a library of 20 standard ASL shapes defined in code; code draws them. Letting a model draw hands freehand gave unreliable shapes.

## Use it

**Live page:** `https://Anikaa1308.github.io/glossa/` (after you deploy, see below)

1. Open the page and paste an Anthropic API key into the key box, then press **Save for this tab**.
2. Type a sentence and press **Translate**. Use **Fast** mode for demos.

The key stays in your browser tab (`sessionStorage`) and is sent only to `api.anthropic.com`. It is never stored in this repository or on a server. Use a key with a low spending limit, and never commit a key.

## Run locally

No build step.

```bash
git clone https://github.com/Anikaa1308/glossa.git
cd glossa
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create an empty repository on GitHub.
2. Push these files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Glossa: English to ASL with generative AI"
   git branch -M main
   git remote add origin https://github.com/Anikaa1308/glossa.git
   git push -u origin main
   ```
3. In the repository go to **Settings, Pages**, and set **Source** to **GitHub Actions**.
4. The included workflow (`.github/workflows/pages.yml`) publishes the site. The URL appears in the **Actions** tab and under **Settings, Pages**.

## Models

Defined in `index.html` in the `MODELS` object of the standalone runtime. Fast mode uses `claude-haiku-4-5-20251001`; Accurate mode uses `claude-sonnet-5-5`. Edit them if you want different models.

## Repository layout

```
index.html                    the whole app (HTML, CSS, JavaScript, no dependencies)
.github/workflows/pages.yml   GitHub Pages deployment
README.md  LICENSE  .gitignore  .nojekyll
```

## Limitations

- The preview is a **schematic**, not video of a signer. Sign details come from a language model and can be wrong; check a sign dictionary before relying on them.
- Gloss is a written approximation. It cannot show facial grammar, body shift or speed, which carry meaning in ASL.
- Handshapes X, claw and bent flat hand have no diagram. C, O and F are stylised.
- Reference glosses in the Evaluate tab were written for this project; real ASL often has several valid glosses. Replace them with references checked by a fluent signer or a published corpus before reporting final numbers.
- Calling a model API directly from a browser exposes the key to the person using the page. For a public deployment, put a small proxy in front of the API instead.
- Built without Deaf community input so far. A real deployment should involve Deaf signers.

## License

MIT, see `LICENSE`. Replace the copyright line with your name or team.
