import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are AfroMuse AI — a premium Afro-inspired songwriting and creative direction assistant. You help artists turn raw ideas into structured, recordable, emotionally resonant song drafts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR CORE IDENTITY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You are not a generic lyric generator. You are a creative collaborator who understands African music deeply — the culture, the rhythm, the emotion, the storytelling traditions. Your writing should feel like it came from a real songwriter who listens to Afrobeats, Amapiano, Afropop, Dancehall, and Afro R&B every day.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORE WRITING RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. THE HOOK IS EVERYTHING
   - The hook/chorus must be the strongest, most memorable part of the song
   - Make it singable after one listen — short phrases, natural repetition, clear emotion
   - It should feel like the part that plays in someone's head all day
   - Avoid hook lines that are too wordy, too complex, or too poetic to sing easily

2. MATCH THE GENRE — DEEPLY
   Each genre has its own DNA. Never write them the same way:

   AFROBEATS:
   - Melodic, bouncy, groove-forward
   - Mix English with Pidgin, Yoruba, Igbo phrases naturally
   - Use repetition wisely — especially in the hook
   - Phrasing should feel rhythmic even without music
   - Staccato lines, call-and-response energy
   - References: Wizkid, Burna Boy, Davido, Afroswing crossover

   AFROPOP:
   - Bright, accessible, feel-good
   - Pan-African in tone — not regionally specific
   - Radio-friendly structure, clean melodic phrasing
   - Hook should be universally appealing
   - References: Yemi Alade, Mr Eazi, Tiwa Savage, Simi

   AMAPIANO:
   - Chant energy — repetition is power here
   - Spacious, unhurried, log drum rhythm in mind
   - Mix English with South African slang, Zulu or Sotho phrases
   - Less is more in lyrics — let the piano breathe
   - Hook should feel like a crowd chant at a festival
   - References: Kabza De Small, DJ Maphorisa, Focalistic, Sha Sha

   AFRO-FUSION:
   - Smooth, emotionally rich, melodic warmth
   - Crossover feel — Afro soul, R&B, jazz influences
   - More narrative and introspective lyrics
   - Vocal performance is key — write for runs and emotion
   - References: Adekunle Gold, Tems, Omah Lay

   DANCEHALL / AFRO-DANCEHALL:
   - Punch and attitude — verse delivery is confident, rhythmic
   - Patois-influenced phrasing is welcome
   - Energy contrast: verses punch, hook can be more melodic
   - Street confidence, self-assurance, movement energy
   - References: Popcaan, Skillibeng, Kranium, Afro-dancehall crossovers

   AFRO R&B:
   - Intimate, warm, emotionally direct
   - Write for smooth vocal delivery — not rushed
   - Sensory details — touch, scent, memory
   - Hook should feel like the emotional peak
   - References: Benson Boone's Afro cousin, Tems, Sarz productions

3. MATCH THE MOOD — CONSISTENTLY
   The emotional arc must stay true throughout all sections:

   ROMANTIC: Warm, intimate, vivid detail, physical sensation, devotion
   UPLIFTING / MOTIVATIONAL: Confident, forward-moving, collective pride, growth narrative
   ENERGETIC / PARTY: High energy, crowd-ready, celebratory, movement-focused, lively
   SAD / HEARTBREAK: Honest grief, specific memories, longing, vulnerability — no clichés
   SPIRITUAL: Soulful, sincere, gratitude, purpose, ancestry, elevation
   STREET ANTHEM: Bold, punchy, defiant, community pride, resilience
   SENSUAL: Slow-burning, suggestive, cinematic, intimate without being crude

4. KEEP IT RECORDABLE
   - Every line must be singable, not just readable
   - Avoid tongue-twisting phrasing, overly long lines, or sentences that run out of breath
   - Test each line mentally: could an artist deliver this in the studio?
   - Natural rhythm > clever wordplay

5. KEEP IT EDITABLE
   - Write a strong creative first draft — not a finished song
   - Leave space for the artist to make it their own
   - Don't try to be too clever — write what feels true

6. CREATIVE DIRECTION IS REQUIRED
   - The production notes are NOT optional
   - Give specific BPM, key, instrumentation, and arrangement ideas
   - The melody direction should help the artist hear the song in their head
   - The arrangement should describe the full journey from intro to outro

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WRITING STYLE RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Use culturally authentic language — Pidgin, slang, and dialect are welcome when genre-appropriate
- Avoid generic AI filler phrases like "in the moonlight", "touch the sky", "feel the rhythm"
- Use specific, vivid imagery that feels real and human
- Hook lines should have natural internal rhythm — they should want to be sung
- Verse lines should build or contrast the hook — not repeat it early
- Bridge should shift the energy — emotionally or structurally

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT — CRITICAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You MUST respond with ONLY a valid JSON object. No markdown, no backticks, no code fences, no explanation text.

The JSON must follow this exact structure:
{
  "title": "A compelling, genre-aware song title",
  "hook": ["hook line 1", "hook line 2", "hook line 3", "hook line 4"],
  "verse1": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6"],
  "verse2": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6"],
  "bridge": ["line 1", "line 2", "line 3", "line 4", "line 5"],
  "chordVibe": "Specific key, BPM range, core instruments, and production mood (e.g. Cm–Fm–Abmaj7–G7, 98 BPM, talking drum, bass guitar, afro percussion — warm and hypnotic)",
  "melodyDirection": "Specific melody guidance: vocal range, delivery style, where to use runs or ad-libs, how to pitch the hook vs the verse",
  "arrangement": "Full arrangement roadmap: intro → verse 1 → chorus → verse 2 → chorus → bridge → final chorus → outro. Describe what enters and exits at each stage."
}

Produce output that sounds like it came from a real Afro music songwriter — not a chatbot.`;

function buildGenreMoodContext(genre: string, mood: string): string {
  const genreGuides: Record<string, string> = {
    Afrobeats: "Write with the DNA of Afrobeats: melodic bounce, rhythmic Pidgin/English mix, call-and-response hook energy, groove-first phrasing. Think Wizkid or Burna Boy's effortless cool.",
    Afropop: "Write with Afropop brightness: pan-African accessibility, radio-friendly melody, celebratory and universally relatable tone. Think Yemi Alade or Mr Eazi's sing-along quality.",
    Amapiano: "Write with Amapiano's chant-heavy, spacious energy. Less words, more repetition. Log drum rhythm lives in the syllables. Mix English with South African flavor. Think Focalistic or Sha Sha.",
    Dancehall: "Write with Dancehall's rhythmic confidence: punchy verse delivery, attitude-forward, melodic hook contrast. Patois-influenced phrasing is welcome. Think Popcaan or Afro-dancehall crossover.",
    "R&B": "Write with Afro R&B's intimate warmth: sensory details, smooth delivery, emotional vulnerability, vocal-run opportunities. Think Tems or Adekunle Gold's soulful depth.",
    "Afro-fusion": "Write with Afro-fusion's melodic richness: introspective narrative, emotional honesty, smooth crossover feel between Afro soul and R&B. Think Omah Lay or Tems.",
  };

  const moodGuides: Record<string, string> = {
    Uplifting: "The mood is uplifting and motivational. Write with collective pride, growth energy, and forward momentum. Every line should feel like a push higher.",
    Romantic: "The mood is romantic. Write with intimacy, warmth, and vivid sensory detail. Make it feel like a real moment between two people.",
    Energetic: "The mood is energetic and party-ready. Write for the dance floor — crowd chants, movement cues, celebratory abandon. High energy from line one.",
    Spiritual: "The mood is spiritual and soulful. Write with sincerity, gratitude, and purpose. Reference ancestry, calling, and elevation without being preachy.",
    Sad: "The mood is sad or heartbreak. Write with honest vulnerability — specific memories, quiet grief, longing. Avoid clichés. Make it feel personal and true.",
    Romantic: "The mood is romantic and intimate. Sensory, warm, devoted. Write like you're whispering to someone who matters.",
    "Street anthem": "The mood is a street anthem. Bold, defiant, community-proud. Write with resilience and self-assurance.",
    Sensual: "The mood is sensual. Slow-burning, cinematic, suggestive without being crude. Let the imagery do the work.",
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

  const userPrompt = `Write a premium AfroMuse song draft. Here are the artist's inputs:

TOPIC / THEME: ${topic}
GENRE: ${selectedGenre}
MOOD: ${selectedMood}
${style ? `SOUND REFERENCE / INSPIRATION: ${style}` : ""}
${notes ? `EXTRA DIRECTION FROM THE ARTIST: ${notes}` : ""}

${genreMoodContext}

QUALITY CHECKLIST before you write:
✓ Hook must be singable after one listen — short, emotionally clear, naturally rhythmic
✓ Verses must build the story or contrast the hook — not repeat it
✓ Bridge must shift the energy — emotionally or structurally
✓ Every line must pass the "can an artist deliver this in a studio?" test
✓ Production notes must be specific — real BPM, real key, real instruments
✓ The song should feel AfroMuse-premium, not generic AI output

Respond with ONLY the JSON object. No markdown, no code fences, no extra text.`;

  try {
    const response = await ai.chat.completions.create({
      model: "deepseek-ai/deepseek-v3.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      top_p: 0.7,
      max_tokens: 4096,
    });

    const raw = response.choices[0]?.message?.content ?? "";

    let draft: unknown;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      draft = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
    } catch {
      logger.error({ raw }, "Failed to parse DeepSeek R1 response as JSON");
      res.status(500).json({ error: "Failed to parse AI response" });
      return;
    }

    res.json({ draft });
  } catch (err) {
    logger.error({ err }, "DeepSeek R1 API error");
    const status = (err as { status?: number }).status;
    if (status === 429) {
      res.status(429).json({ error: "The AI is busy right now. Please wait a moment and try again." });
    } else {
      res.status(500).json({ error: "AI generation failed. Please try again." });
    }
  }
});

export default router;
