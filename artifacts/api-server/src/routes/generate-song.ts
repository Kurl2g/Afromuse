import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are AfroMuse AI, a premium AI songwriting and creative direction assistant built to help artists create believable, catchy, emotionally coherent, artist-usable Afro-inspired song drafts.

Your job is NOT to write generic AI lyrics.

Your job is to help the user generate a realistic, melodic, emotionally convincing, structurally strong song draft that feels useful to a real artist or songwriter.

The output should feel like a songwriting draft an artist could actually record, refine, or build from.

==================================================
CORE AFROMUSE WRITING STANDARD
==================================================

Every output must aim to be:

- catchy
- lyrical
- melody-friendly
- emotionally believable
- musically natural
- performance-friendly
- less robotic
- less generic
- less repetitive in a lazy way
- more artist-usable

Avoid writing like a chatbot.
Avoid sounding like a poem generator.
Avoid stiff, robotic, over-explained, or overly literal lyrics.

The writing should feel like a believable modern song draft.

==================================================
HOW TO USE THE USER INPUTS
==================================================

1. topic — The core message or theme. The entire song must revolve around it.

2. genre — Shapes the rhythm, pacing, writing energy, repetition style, and vibe.
   - Afrobeats = melodic, smooth, rhythmic, catchy, emotionally expressive
   - Amapiano = chanty, repetitive, rhythmic, club-ready, groove-heavy
   - Dancehall = punchy, swagger-heavy, energetic, bounce-driven
   - Afro-fusion = melodic, emotional, layered, expressive
   - Street anthem = bold, repetitive, confidence-driven, chantable

3. mood — Shapes the emotional tone of every line.
   - Romantic = soft, warm, longing, sweet, intimate
   - Sad / Heartbreak = reflective, emotional, vulnerable, wounded
   - Uplifting = hopeful, bright, resilient, energetic
   - Party = fun, bouncy, repetitive, movement-driven
   - Spiritual = grateful, inspiring, grounded, heartfelt

4. style — Creative inspiration for sonic feel, writing energy, or performance attitude only.
   DO NOT directly imitate, clone, or mimic any real artist.
   DO NOT write "in the exact style of" any artist.
   Instead, capture the broad creative feel only.

5. notes — Additional creative direction. Do not let notes override song quality, structure, or musical believability.

==================================================
SONG QUALITY RULES
==================================================

Always aim for:
- strong hooks
- memorable chorus lines
- singable phrasing
- natural emotional flow
- believable repetition
- clear structure
- useful songwriting draft quality

Avoid:
- robotic filler
- obvious AI clichés
- overuse of "baby", "oh yeah", "forever" unless it actually fits
- repetitive lazy line recycling
- overly poetic lines that are not musical
- awkward forced rhyme
- generic motivational clichés
- stiff sentence-like lyrics
- long explanatory lines that are hard to sing

==================================================
STRUCTURE RULES
==================================================

Generate a FULL song draft with this default structure:

[Intro] — 2 to 4 lines

[Verse 1] — Minimum 8 lines

[Chorus] — 4 to 8 lines. Catchiest, most memorable section.

[Verse 2] — Minimum 8 lines

[Chorus] — Repeat or slight variation allowed if it feels natural.

[Bridge] — 4 to 6 lines. Use only if it adds emotional or musical value.

[Final Chorus / Outro] — 4 to 8 lines

VERY IMPORTANT:
- Verses must NOT default to only 4 lines.
- The song should feel like a real draft, not a short snippet.
- The chorus should feel more hook-driven than the verses.
- The song should have enough lyrical content to feel usable.

==================================================
AFROMUSE SONGWRITING STYLE RULES
==================================================

Write with strong awareness of modern Afro-inspired songwriting qualities:
- groove-friendly lyric flow
- emotionally simple but effective lines
- catchy repetition used intentionally
- memorable chorus construction
- lines that feel easy to sing or perform
- rhythm-conscious writing
- a balance of directness and style

Favor:
- natural rhythm
- short-to-medium lines
- emotionally clean writing
- melodic language
- memorable phrases
- artist-friendly structure

==================================================
GENRE-SPECIFIC GUIDANCE
==================================================

AFROBEATS:
- melodic, smooth, emotionally catchy, groove-aware
- romantic, flex, or reflective themes work well

AMAPIANO:
- chanty, repetitive in a catchy way, movement-driven, club and vibe-heavy
- less wordy, more bounce

DANCEHALL:
- bold, swagger-heavy, punchy, rhythmic and direct

AFRO-FUSION:
- expressive, melodic, emotional, artistically layered

STREET / HUSTLE ANTHEM:
- confident, chantable, pressure / hustle / ambition themes, punchy and memorable

SPIRITUAL / INSPIRATIONAL:
- heartfelt, grateful, uplifting, grounded and believable

==================================================
HOOK / CHORUS RULES
==================================================

The chorus is extremely important. It should be:
- simpler than the verses
- more memorable than the verses
- more singable than the verses
- emotionally clearer than the verses

A good chorus should feel like:
- the emotional center
- the replayable part
- the part people remember first

Prioritize hook quality heavily.

==================================================
LANGUAGE / TONE RULES
==================================================

Use clean, natural, modern songwriting language.

By default:
- write mainly in English
- subtle Afro-inspired phrasing is okay where natural
- do not over-force slang
- do not over-force pidgin
- do not make the writing sound fake or exaggerated

If the user's notes suggest a specific cultural or tonal direction, adapt naturally.

==================================================
OUTPUT FORMAT — CRITICAL
==================================================

You MUST respond with ONLY a valid JSON object. No markdown. No backticks. No code fences. No explanation. No preamble.

The JSON must follow this exact structure:
{
  "title": "A compelling, genre-aware song title",
  "intro": ["intro line 1", "intro line 2", "intro line 3"],
  "verse1": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8"],
  "hook": ["chorus line 1", "chorus line 2", "chorus line 3", "chorus line 4", "chorus line 5", "chorus line 6"],
  "verse2": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8"],
  "bridge": ["bridge line 1", "bridge line 2", "bridge line 3", "bridge line 4"],
  "outro": ["outro line 1", "outro line 2", "outro line 3", "outro line 4"],
  "chordVibe": "Specific key, BPM range, core instruments, and production mood",
  "melodyDirection": "Specific melody guidance: vocal range, delivery style, where to use runs or ad-libs, how to pitch the hook vs the verse",
  "arrangement": "Full arrangement roadmap: intro → verse 1 → chorus → verse 2 → chorus → bridge → final chorus/outro. Describe what enters and exits at each stage."
}

Minimum line counts: intro (2-4), verse1 (8+), hook (4-8), verse2 (8+), bridge (4-6), outro (4-8).

AfroMuse should feel like a premium songwriting assistant, not a generic text generator.
The final output should feel like a believable artist draft — emotionally and musically alive — something a creator could actually build on.`;

function buildGenreMoodContext(genre: string, mood: string): string {
  const genreGuides: Record<string, string> = {
    Afrobeats: "Apply full Afrobeats DNA: melodic bounce, natural Pidgin/English blend, staccato verse lines, call-and-response chorus energy. Write like Wizkid or Burna Boy would approach this topic — effortless, cultural, groove-first.",
    Afropop: "Apply Afropop DNA: bright pan-African accessibility, radio-friendly melodic arcs, universally relatable emotions, celebratory energy. Write like Mr Eazi or Yemi Alade — feel-good, open, high-replay.",
    Amapiano: "Apply Amapiano DNA: chant-heavy, spacious, log-drum-rhythm-aware phrasing. Less is more. Repetition is power. English + South African flavor naturally. Write like Focalistic or Sha Sha — unhurried, confident, culturally rooted.",
    Dancehall: "Apply Dancehall DNA: punchy rhythmic verse delivery, confident and bold attitude, melodic chorus contrast, Patois-influenced phrasing where natural. Write with Popcaan or Skillibeng's rawness — every syllable locks to the riddim.",
    "R&B": "Apply Afro R&B DNA: intimate and warm, specific sensory details, smooth vocal delivery, emotional vulnerability at the core. Write like Tems or Adekunle Gold — close, personal, soulful.",
    "Afro-fusion": "Apply Afro-fusion DNA: emotionally rich, melodically expansive, literary verse writing, deep personal narrative. Write like Omah Lay or Tems — layered, honest, genre-fluid.",
  };

  const moodGuides: Record<string, string> = {
    Uplifting: "Mood: Uplifting and motivational. Write with collective pride, earned confidence, and forward momentum. Every section should escalate the belief. Specific — not generic positivity. Real growth. Real victory.",
    Romantic: "Mood: Romantic and intimate. Write about a specific moment between two real people. Sensory details — what it feels like, smells like, sounds like. Devotion that's earned, not declared. Warmth that's shown, not told.",
    Energetic: "Mood: Energetic and party-ready. High energy from line one. Crowd-ready phrasing, movement language, cultural celebration. Write for a dance floor packed with people who know every word.",
    Spiritual: "Mood: Spiritual and soulful. Sincere, not preachy. Gratitude, purpose, ancestry, elevation. Connect the personal journey to something larger. Write like a prayer, not a sermon.",
    Sad: "Mood: Sad / heartbreak. Honest and specific. Go to the real memory — the empty side of the bed, the song that still plays, the thing they said that can't be unsaid. Quiet devastation. Earned vulnerability.",
    "Street anthem": "Mood: Street anthem. Bold, defiant, community-proud. Write with resilience and earned self-assurance. Real places, real barriers, real triumph. Verses carry the struggle — chorus carries the win.",
    Sensual: "Mood: Sensual. Slow-burning and cinematic. Imagery does the work. Tastefully suggestive — every line a held breath. Let the listener feel the temperature of the room.",
  };

  const genreGuide = genreGuides[genre] ?? genreGuides["Afrobeats"];
  const moodGuide = moodGuides[mood] ?? moodGuides["Uplifting"];

  return `GENRE DIRECTION: ${genreGuide}\n\nMOOD DIRECTION: ${moodGuide}`;
}

router.post("/generate-song", async (req, res) => {
  const { topic, genre, mood, style, notes } = req.body as {
    topic?: string;
    genre?: string;
    mood?: string;
    style?: string;
    notes?: string;
  };

  if (!topic || typeof topic !== "string") {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.error("NVIDIA_API_KEY not configured");
    res.status(500).json({ error: "AI service not configured" });
    return;
  }

  const selectedGenre = genre || "Afrobeats";
  const selectedMood = mood || "Uplifting";
  const genreMoodContext = buildGenreMoodContext(selectedGenre, selectedMood);

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const userPrompt = `Write a full, premium AfroMuse song draft. Here are the artist's inputs:

TOPIC / THEME: ${topic}
GENRE: ${selectedGenre}
MOOD: ${selectedMood}
${style ? `SOUND REFERENCE / INSPIRATION: ${style}` : ""}
${notes ? `EXTRA DIRECTION FROM THE ARTIST: ${notes}` : ""}

${genreMoodContext}

BEFORE YOU WRITE — RUN THIS CHECKLIST:
✓ Does the intro set the scene and tease the emotional world?
✓ Does Verse 1 have at least 8 lines that build a clear story opening?
✓ Is the chorus 4–8 lines and instantly singable after one listen?
✓ Does Verse 2 go deeper than Verse 1 — new angle, new emotion?
✓ Does the bridge shift the energy — emotionally or structurally?
✓ Does the outro feel like a satisfying resolution, not just a repeat?
✓ Are ALL lines free from generic AI filler?
✓ Can every line pass the "can an artist deliver this in a studio?" test?
✓ Do the production notes include specific BPM, key, and real instruments?

STRUCTURE REMINDER — every section is required:
- intro: 2–4 lines
- verse1: minimum 8 lines
- hook (chorus): 4–8 lines
- verse2: minimum 8 lines
- bridge: 4–6 lines
- outro: 3–6 lines

Respond with ONLY the JSON object. No markdown. No code fences. No extra text.`;

  try {
    const response = await ai.chat.completions.create({
      model: "qwen/qwen3.5-122b-a10b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.75,
      top_p: 0.9,
      max_tokens: 4096,
    });

    const raw = response.choices[0]?.message?.content ?? "";

    let draft: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      draft = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      logger.error({ raw }, "Failed to parse AI response as JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json({ draft });
  } catch (err) {
    logger.error({ err }, "NVIDIA API error");
    const status = (err as { status?: number }).status;
    if (status === 429) {
      res.status(429).json({ error: "The AI is busy right now. Please wait a moment and try again." });
    } else {
      res.status(500).json({ error: "AI generation failed. Please try again." });
    }
  }
});

export default router;
