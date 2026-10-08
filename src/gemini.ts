export interface GeneratedContent {
  type: 'SVG' | 'REACT' | 'CANVAS';
  code: string;
  explanation?: string;
}

export async function generateVisual(prompt: string): Promise<GeneratedContent> {
  const response = await fetch('/api/generate-visual', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server error: ${response.status}`);
  }

  return response.json();
}

export async function getRandomPrompt(): Promise<string> {
  try {
    const response = await fetch('/api/random-prompt');
    if (response.ok) {
      const data = await response.json();
      if (data.prompt) return data.prompt;
    }
  } catch (err) {
    console.warn('Failed to fetch from random-prompt API, using fallback:', err);
  }

  const FALLBACK_PROMPTS = [
    "Minimalist weather card widget with soft gradient sun and temperature forecast",
    "Geometric origami humming bird logo with crisp vector contours",
    "Sleek mobile finance dashboard with spending category breakdown and balance tracker",
    "Generative golden ratio spiral pattern rendered in soft monochrome slate",
    "Clean music player card with waveform visualizer and playback controls",
    "Minimalist architectural isometric loft layout with fine linework",
    "Zen botanical Monstera leaf illustration with fine lineart and soft sage accents",
    "Smart home thermostat dial with temperature range and circular progress ring",
    "Modern coffee shop loyalty card with stamps and minimal typography",
    "Generative concentric ripple interference pattern with soft shadow depth"
  ];
  return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
}
