import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const CURATED_PROMPTS = [
  "Minimalist weather card widget with soft gradient sun and temperature forecast",
  "Geometric origami humming bird logo with crisp vector contours",
  "Sleek mobile finance dashboard with spending category breakdown and balance tracker",
  "Generative golden ratio spiral pattern rendered in soft monochrome slate",
  "Clean music player card with waveform visualizer and playback controls",
  "Minimalist architectural isometric loft layout with fine linework",
  "Zen botanical Monstera leaf illustration with fine lineart and soft sage accents",
  "Smart home thermostat dial with temperature range and circular progress ring",
  "Modern coffee shop loyalty card with stamps and minimal typography",
  "Generative concentric ripple interference pattern with soft shadow depth",
  "Minimalist task manager daily habit checklist with streak progress bar",
  "Abstract quantum particle orbits with delicate glowing paths and nodes"
];

const systemInstruction = `
You are an "AI Image Engineer" specialized in generating high-quality visual content through code. 
Your task is to write functional, modern, and aesthetically pleasing code that renders the requested visual.

YOUR CAPABILITIES:
1. React & Tailwind CSS: Use these to create UI/UX designs, landing page mockups, mobile app screens, or clean card layouts. Return standard HTML/JSX structure with Tailwind classes that fits inside a <div>.
2. SVG: Use this for logos, icons, diagrams, and illustrations. Return a complete <svg> string with xmlns, viewBox, crisp paths, and modern clean aesthetics.
3. HTML Canvas: Use this for complex 2D drawings, generative art, or recursive geometric patterns. Return Javascript commands that draw on 'canvas' using 2D 'context'.

AESTHETIC STYLE (MINIMALIST):
- Use clean, minimal, and lightweight aesthetics.
- Backgrounds: Use crisp white (#FFFFFF) or very light gray (#F9FAFB / #F3F4F6).
- Typography: Use clean sans-serif typography.
- Accents: Subtle dark grays, slate, or a tasteful accent (emerald, indigo, sky blue).
- Layouts: Generous whitespace, precise alignment, and balanced visual weight.

OUTPUT RULES:
- Prioritize "Mobile-First" (Phone Style) layouts by default for REACT and CANVAS outputs, unless desktop was specifically requested.
- Ensure all text within the visual is crisp and correctly spelled.
- Provide clean, executable code.
- Response MUST be valid JSON according to the schema.
- For type SVG: The code MUST be a valid, standalone <svg>...</svg> string.
- For type REACT: The code MUST be a <div>...</div> with Tailwind classes.
- For type CANVAS: The code string will be evaluated. Target 'canvas-target' and use 'context'.
`;

// Helper with model fallback and retry
async function generateVisualFromPrompt(promptText: string) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ['SVG', 'REACT', 'CANVAS'] },
              code: { type: Type.STRING },
              explanation: { type: Type.STRING },
            },
            required: ['type', 'code'],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text);
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} failed:`, err?.message || err);
      // Wait 500ms before trying fallback
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  throw lastError || new Error('Failed to generate visual content');
}

// API Routes
app.post('/api/generate-visual', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Valid prompt is required' });
    }

    const result = await generateVisualFromPrompt(prompt.trim());
    return res.json(result);
  } catch (error: any) {
    console.error('Error generating visual:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate visual content. Please try again.',
    });
  }
});

// Endpoint to get a random prompt
app.get('/api/random-prompt', (req, res) => {
  const randomIndex = Math.floor(Math.random() * CURATED_PROMPTS.length);
  res.json({ prompt: CURATED_PROMPTS[randomIndex] });
});

// Vite middleware in dev or static files in prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
