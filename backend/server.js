/* -------- server.js -------- */
import dotenv            from 'dotenv';
import express           from 'express';
import cors              from 'cors';
import { OpenAI }        from 'openai';
import path              from 'path';
import { fileURLToPath } from 'url';

/* -------- .env → process.env -------- */
dotenv.config();

/* -------- OpenAI -------- */
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* -------- express -------- */
const app  = express();
const port = process.env.PORT || 8000;

/* __dirname in ES-modules */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

/* -------- middlewares -------- */
app.use(cors());
app.use(express.json());

/* -------- static + SPA fallback -------- */
app.use(express.static(path.join(__dirname, '../frontend')));
app.get('*', (_, res) =>
  res.sendFile(path.join(__dirname, '../frontend/index.html'))
);

/* -------- /api/generate -------- */
app.post('/api/generate', async (req, res) => {
  const {
    language   = 'Kazakh',
    subject    = '',
    difficulty = 'easy',
    count      = 5,
  } = req.body;

  const prompt = `
Generate ${count} ${difficulty}-level multiple-choice quiz questions in ${language}.
School subject: "${subject}".

Return *pure JSON* array, each object:
{
  "question": "...",
  "options":  ["A", "B", "C", "D"],
  "answerIndex": 0
}
No markdown, no commentary.`;

  try {
    /* — Chat completion — */
    const chat = await openai.chat.completions.create({
      model: 'gpt-4o-mini',                      // ◀️  жаңа модель
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    /* — cleanup — */
    let raw = chat.choices?.[0]?.message?.content?.trim() ?? '[]';
    if (raw.startsWith('```')) raw = raw.replace(/```[a-z]*|```/g, '');

    /* — normalisation (art-back-compat) — */
    const legacy = JSON.parse(raw);
    const data   = legacy.map(o => ({
      question:    o.question    ?? o.q,
      options:     o.options     ?? o.answers,
      answerIndex: o.answerIndex ?? o.correct,
    }));

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI error' });
  }
});

/* -------- start -------- */
app.listen(port, () =>
  console.log(`🚀  Server ready → http://localhost:${port}`)
);