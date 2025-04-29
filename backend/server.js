/* -------- server.js -------- */
import dotenv         from "dotenv";
import express        from "express";
import cors           from "cors";
import { OpenAI }     from "openai";
import path           from "path";
import { fileURLToPath } from "url";

/* 1. .env → process.env */
dotenv.config();

/* 2. OpenAI */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* 3. basic express */
const app  = express();
const port = process.env.PORT || 8000;

/* 4. __dirname in ES-modules */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ---------- middlewares ---------- */
app.use(cors());
app.use(express.json());

/* ---------- static + SPA fallback ---------- */
app.use(express.static(path.join(__dirname, "../frontend")));
app.get("*", (_, res) =>
  res.sendFile(path.join(__dirname, "../frontend/index.html"))
);

/* ---------- /api/generate ---------- */
app.post("/api/generate", async (req, res) => {
  /* front-тен келетін өрістер  */
  const {
    language   = "Kazakh",
    subject    = "",
    difficulty = "easy",
    count      = 5
  } = req.body;

  const prompt = `
Generate ${count} ${difficulty}-level multiple-choice quiz questions in ${language}.
Topic (school subject): "${subject}".

Return pure JSON array where each object is:
{
  "question": "...",
  "options":  ["A","B","C","D"],
  "answerIndex": 0
}
NO markdown, NO comments.`;

  try {
    const chat = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }]
    });

    /* GPT sometimes wraps in ```json ... ``` */
    let raw = chat.choices?.[0]?.message?.content?.trim() ?? "[]";
    if (raw.startsWith("```")) raw = raw.replace(/```[a-z]*|```/g, "");

    /* {{q,answers,correct}} → {{question,options,answerIndex}} fallback */
    const legacy = JSON.parse(raw);
    const normalized = legacy.map(o => ({
      question:     o.question     ?? o.q,
      options:      o.options      ?? o.answers,
      answerIndex:  o.answerIndex  ?? o.correct
    }));

    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OpenAI error" });
  }
});

/* ---------- start ---------- */
app.listen(port, () =>
  console.log(`🚀  Server ready → http://localhost:${port}`)
);