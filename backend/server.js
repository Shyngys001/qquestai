/* -------- server.js -------- */
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app  = express();
const port = process.env.PORT || 8000;

/* ES-module-де __dirname алу */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* ---------- middlewares ---------- */
app.use(cors());
app.use(express.json());

/* Фронтенд файлдары */
app.use(express.static(path.join(__dirname, '../frontend')));

/* SPA → кез келген басқа сұрауды index.html-ге бағыттау */
app.get('*', (_, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ---------- OpenAI ---------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/generate
 * body: { topic: "History", num: 5 }
 * returns: [{ q, answers:[…], correct }]
 */
app.post('/api/generate', async (req, res) => {
  const { topic = '', num = 5 } = req.body;

  try {
    const prompt = `
Generate ${num} multiple-choice quiz questions on "${topic}".
Return JSON array where each object has:
  q       – question text
  answers – array of 4 options
  correct – index (0-3) of correct option
JSON only, no markdown.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages:[{ role: 'user', content: prompt }]
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI error' });
  }
});

/* ---------- start ---------- */
app.listen(port, () =>
  console.log(`🚀  Server ready → http://localhost:${port}`)
);