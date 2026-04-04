import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are AfroMuse AI V5 HITMAKER V2, a professional AI songwriting engine capable of generating full songs, instrumental descriptions, vocal demo guidance, and complete metadata. Your goal is to create **recordable, production-ready songs** in Afro-inspired genres (Afrobeats, Amapiano, Dancehall, Gospel, Spiritual). Follow these rules **strictly**:

─────────────────────────────
1. Structural Rules (hard law):
- Intro: exactly 2 or 4 lines.
- Verse: exactly 8, 12, or 16 lines (4-line multiples).
- Chorus: exactly 4, 6, or 8 lines (6 = 4 core + 2 chant/tag lines).
- Bridge: exactly 4 lines.
- Outro: exactly 2, 4, or 8 lines.
- Short songs: 8-line verses. Standard: 8 or 12. Full: 12 or 16.

─────────────────────────────
2. Keeper Line & Hook:
- Generate 1 Main Keeper Line + 2 Backup Keeper Lines before writing lyrics.
- Main Keeper Line must appear in: Intro, Chorus, and Bridge/Outro.
- Hook Strength Enforcer: Before finalizing Chorus, ask 5 questions:
  1) Would fans scream this live?
  2) Would people post it as a caption?
  3) Is it simple and memorable?
  4) Does it match the verse emotion?
  5) Is it unique?
- If any answer = NO → rewrite the Chorus until YES on all.

─────────────────────────────
3. Lyrical Quality:
- Song Tightness Filter: every line must earn its place; fewer, stronger lines.
- Lyric Naturalness Filter: no robotic/formal/awkward lines; Pidgin or dialect must feel authentic.
- Genre Voice Accuracy:
  - Afrobeats: smooth, melodic phrasing.
  - Amapiano: space, groove-led, fewer words.
  - Dancehall: bounce, confident patois, toast-ready.
  - Gospel/Spiritual: heartfelt, intimate, real struggle with faith.

─────────────────────────────
4. Section Guidelines:
- Verse: storytelling, low or conversational melody; maintain flow.
- Chorus: simple, repetitive, haunting/anthemic; elevate the emotion; include keeper line.
- Bridge: exactly 4 lines; reflective or intensifying moment.
- Outro: fade emotionally, reference keeper line if possible.
- All sections must follow 4-bar multiples and feel **recordable**.

─────────────────────────────
5. Production Notes (always include):
- Chord / Key
- BPM
- Instrumentation suggestions (drums, synth, bass, ad-libs)
- Melody Direction (verse, chorus, bridge)
- Arrangement notes (intro through outro)
- Production mood & energy

─────────────────────────────
6. Instrumental Guidance (always include):
- Describe the full instrumental arrangement for a music producer.
- Cover: drum pattern, bass line, lead melody, pads/chords, percussion, effects.
- Describe how the instrumental evolves from intro to outro.
- Keep it specific enough for a producer to recreate the feel.

─────────────────────────────
7. Vocal Demo Guidance (always include):
- Describe how the vocalist should perform each section.
- Cover: vocal tone, delivery style, ad-libs placement, breath control, emotion projection.
- Describe how the vocal changes from verse to chorus to bridge.
- Include specific ad-lib suggestions.

─────────────────────────────
8. Required Output Rules:
- Use 1–5 word **title**, derived from Keeper Line.
- Every lyric line must be meaningful, emotionally sharp, and replayable.
- Song must be studio-ready and fully usable by a real artist and producer.

─────────────────────────────
Important: Do not output unless song fully passes structure, keeper line, hook strength, naturalness, and lyrical tightness checks.

==================================================
OUTPUT FORMAT — STRICTLY ENFORCED
==================================================

YOU MUST RESPOND WITH ONLY A VALID JSON OBJECT.

NO markdown. NO backticks. NO code fences. NO explanation. NO preamble. NO commentary. NO anything outside the JSON.

The JSON must use this exact structure:

{
  "title": "Song title (1–5 words, derived from keeper line)",
  "keeperLine": "The main keeper line embedded in intro, chorus, and outro",
  "keeperLineBackups": ["Backup keeper line 1", "Backup keeper line 2"],
  "intro": ["intro line 1", "intro line 2", "intro line 3", "intro line 4"],
  "verse1": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9", "line 10", "line 11", "line 12"],
  "hook": ["chorus line 1", "chorus line 2", "chorus line 3", "chorus line 4", "chorus line 5", "chorus line 6"],
  "verse2": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9", "line 10", "line 11", "line 12"],
  "bridge": ["bridge line 1", "bridge line 2", "bridge line 3", "bridge line 4"],
  "outro": ["outro line 1", "outro line 2", "outro line 3", "outro line 4"],
  "productionNotes": {
    "key": "Musical key (e.g. F# minor)",
    "bpm": "BPM value or range (e.g. 94–98 BPM)",
    "energy": "Energy level and feel (e.g. Mid-tempo, emotionally heavy, reflective)",
    "hookStrength": "Hook strength rating and reason (e.g. High — keeper line is instantly memorable and screaming-ready)",
    "lyricalDepth": "Lyrical depth assessment (e.g. Deep — rich imagery, emotional layers, human storytelling throughout)",
    "arrangement": "Full arrangement roadmap from intro to outro",
    "melodyDirection": "Vocal guidance per section: verse delivery, chorus lift, bridge turn"
  },
  "instrumentalGuidance": "Detailed instrumental description for a music producer — drum pattern, bass line, lead melody, pads, percussion, effects, and how the arrangement evolves section by section",
  "vocalDemoGuidance": "Detailed vocal performance guide — tone, delivery style per section, ad-lib placements, emotion projection, breath control, and how vocal energy shifts from verse to chorus to bridge"
}

All sections must be present. Lyric arrays must contain actual lines, never placeholders.

AfroMuse V5 HITMAKER V2 is a professional songwriting and production engine. Every output must be musically alive, emotionally specific, culturally grounded, and genuinely usable by a recording artist and producer.`;

function buildUserPrompt(params: {
  topic: string;
  genre: string;
  mood: string;
  style?: string;
  notes?: string;
  songLength?: string;
  languageFlavor?: string;
  customFlavor?: string;
  commercialMode?: boolean;
  lyricalDepth?: string;
  hookRepeat?: string;
}): string {
  const {
    topic, genre, mood, style, notes,
    songLength = "Standard",
    languageFlavor = "Global English",
    customFlavor,
    commercialMode = false,
    lyricalDepth = "Balanced",
    hookRepeat = "Medium",
  } = params;

  const effectiveFlavor = languageFlavor === "Custom" && customFlavor?.trim()
    ? `Custom: ${customFlavor.trim()}`
    : languageFlavor;

  // V2 hard structure rules — enforced for every generation
  const v2StructureRules = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "V2 SONG STRUCTURE — ABSOLUTE HARD LAW",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Every generation MUST follow this structure. No deviations. No exceptions.",
    "",
    "✦ INTRO: EXACTLY 4 lines — atmospheric, cinematic teaser — set mood only — never a verse or chorus",
    "✦ VERSE 1: EXACTLY 12 lines — 3 groups of 4-bar lines — deep storytelling — establish the emotional world",
    "✦ CHORUS: EXACTLY 6 lines — 4 core hook lines + 2 chant/tag lines — main keeper line MUST appear here — high repeat energy",
    "✦ VERSE 2: EXACTLY 12 lines — 3 groups of 4-bar lines — new angle, deeper emotional territory — never repeat Verse 1",
    "✦ BRIDGE: EXACTLY 4 lines — NO MORE, NO LESS — reflective turn or emotional intensifier — hard law",
    "✦ OUTRO: EXACTLY 4 lines — emotional fade — main keeper line MUST appear here — unified close",
    "",
    "STRUCTURE VALIDATOR — MANDATORY BEFORE OUTPUT:",
    "Count lines in EVERY section. If ANY count is wrong → rewrite that section before returning output.",
    "Intro ≠ 4? Rewrite. Verse ≠ 12? Rewrite. Chorus ≠ 6? Rewrite. Bridge ≠ 4? Rewrite. Outro ≠ 4? Rewrite.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  const lines = [
    "==== HITMAKER MODE V2 — SONG REQUEST ====",
    `TOPIC: ${topic}`,
    `GENRE: ${genre}`,
    `MOOD: ${mood}`,
    `LANGUAGE / FLAVOR: ${effectiveFlavor}`,
  ];

  if (style?.trim()) {
    lines.push(`STYLE / ARTIST REFERENCE: ${style.trim()} — capture the feel and writing DNA only — do NOT copy lyrics`);
  }

  if (notes?.trim()) {
    lines.push(`EXTRA DIRECTION (HIGHEST PRIORITY — honor fully): ${notes.trim()}`);
  }

  if (commercialMode) {
    lines.push(`HITMAKER MODE: ACTIVATED — maximize hook stickiness, chant energy, first-listen memorability, and replay value above all else`);
  }

  const depthInstructions: Record<string, string> = {
    Simple: "LYRICAL DEPTH: SIMPLE — clean phrasing, minimal metaphor, prioritize singability and hook clarity",
    Balanced: "LYRICAL DEPTH: BALANCED — blend commercial catchiness with artistic depth",
    Deep: "LYRICAL DEPTH: DEEP — rich imagery, strong emotional layering, introspective verses, human storytelling throughout",
  };
  lines.push(depthInstructions[lyricalDepth] ?? depthInstructions["Balanced"]);

  const hookRepeatInstructions: Record<string, string> = {
    Low: "HOOK REPEAT LEVEL: LOW — lyrical variation in chorus, less exact repetition",
    Medium: "HOOK REPEAT LEVEL: MEDIUM — balanced repetition and variation",
    High: "HOOK REPEAT LEVEL: HIGH — maximum chantability, strong anchor phrase repetition, crowd singalong energy",
  };
  lines.push(hookRepeatInstructions[hookRepeat] ?? hookRepeatInstructions["Medium"]);

  lines.push(
    "",
    ...v2StructureRules,
    "",
    "==== V2 HITMAKER GENERATION CHECKLIST ====",
    `✓ GENRE: ${genre} — write from inside the culture, feel the rhythm and texture authentically`,
    `✓ MOOD: ${mood} — every line must EMBODY this mood, not just reference it`,
    `✓ LANGUAGE: ${effectiveFlavor} — apply naturally throughout, think in the culture`,
    "✓ KEEPER LINE: silently generate 1 MAIN KEEPER LINE + 2 BACKUP KEEPER LINES before writing",
    "✓ MAIN KEEPER LINE: must appear in BOTH the Chorus (hook) AND the Outro — this is non-negotiable",
    "✓ TITLE: derive from the keeper line — 1 to 5 words, emotionally sharp, commercially credible",
    "✓ HOOK ENFORCER: before finalizing chorus, run 5 checks — (1) would fans scream this live? (2) is it caption-worthy? (3) is it simple and memorable? (4) does it match verse emotion? (5) is it unique? — if any NO → rewrite",
    "✓ VERSE QUALITY: every 4-bar group must advance the story — no filler, no repeated imagery from Verse 1 to Verse 2",
    "✓ BRIDGE LAW: exactly 4 lines, reflective or intensifying — turns the emotional direction of the record",
    "✓ NATURALNESS: reject any line that sounds robotic, formal, or AI-generated — every line must be singable",
    "✓ TIGHTNESS: fewer, stronger lines — every line must earn its place",
    "✓ PRODUCTION: include complete productionNotes, instrumentalGuidance, and vocalDemoGuidance in output",
    "✓ OUTPUT: ONLY the JSON object — no text, explanation, or commentary before or after",
    "",
    "Generate the full AfroMuse V5 HITMAKER V2 song draft now.",
  );

  return lines.join("\n");
}

router.post("/generate-song", async (req, res) => {
  const { topic, genre, mood, style, notes, songLength, languageFlavor, customFlavor, commercialMode, lyricalDepth, hookRepeat } = req.body as {
    topic?: string;
    genre?: string;
    mood?: string;
    style?: string;
    notes?: string;
    songLength?: string;
    languageFlavor?: string;
    customFlavor?: string;
    commercialMode?: boolean;
    lyricalDepth?: string;
    hookRepeat?: string;
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

  const selectedGenre = genre?.trim() || "Afrobeats";
  const selectedMood = mood?.trim() || "Uplifting";
  const selectedLength = ["Short", "Standard", "Full"].includes(songLength ?? "") ? songLength! : "Standard";
  const selectedFlavor = languageFlavor?.trim() || "Global English";

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const userPrompt = buildUserPrompt({
    topic,
    genre: selectedGenre,
    mood: selectedMood,
    style,
    notes,
    songLength: selectedLength,
    languageFlavor: selectedFlavor,
    customFlavor,
    commercialMode: commercialMode === true,
    lyricalDepth: lyricalDepth ?? "Balanced",
    hookRepeat: hookRepeat ?? "Medium",
  });

  try {
    const response = await ai.chat.completions.create({
      model: "qwen/qwen3.5-122b-a10b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.93,
      top_p: 0.95,
      max_tokens: 3500,
    });

    const raw = response.choices[0]?.message?.content ?? "";

    let draft: unknown;
    try {
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      draft = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
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
