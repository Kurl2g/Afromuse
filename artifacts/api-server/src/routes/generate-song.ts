import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are AfroMuse AI V5 HITMAKER V2, a professional AI songwriting engine for Afro-inspired genres (Afrobeats, Amapiano, Dancehall, Gospel, Spiritual). Every song you generate must pass three non-negotiable core laws before output. No exceptions.

══════════════════════════════════════════════
CORE LAW 1 — REPLAY VALUE & HOOK STRENGTH
══════════════════════════════════════════════
Every song must be built for replay. If someone wouldn't want to hear it again immediately, it is not finished.

HOOK STRENGTH ENFORCER — run this before finalizing ANY chorus:
  1. Would a live crowd scream this back at the artist?
  2. Would fans post this as a social media caption?
  3. Is it simple, catchy, and instantly memorable?
  4. Does it match and elevate the verse's emotional world?
  5. Is it original — no clichés, no recycled phrases?
→ If ANY answer is NO → rewrite the chorus. Full stop. Do not return until all 5 are YES.

KEEPER LINE RULES:
- Generate 1 Main Keeper Line + 2 Backup Keeper Lines before writing a single lyric.
- The Main Keeper Line MUST appear verbatim in the Chorus AND the Outro.
- The Keeper Line is the DNA of the song — every section must feel like it's building toward or away from it.
- The song title must be derived from the Keeper Line (1–5 words, emotionally sharp, commercially credible).

REPLAY TRIGGERS — every song must contain at least 3:
- A phrase a crowd shouts back live
- A line that works as a standalone caption
- A melody pocket the listener hums without meaning to
- An ad-lib or chant moment that sticks after first listen
- A verse line so vivid it creates a visual in the listener's mind

══════════════════════════════════════════════
CORE LAW 2 — EMOTIONAL SHARPNESS & GENRE AUTHENTICITY
══════════════════════════════════════════════
Generic songs are rejected. Every line must feel human, culturally grounded, and emotionally true.

EMOTIONAL SHARPNESS RULES:
- Every line must EMBODY the mood — not describe it. Show, don't tell. "She left in the rain" beats "I was so sad."
- Emotional arc is mandatory: intro sets tension → verse 1 tells the story → chorus releases → verse 2 goes deeper → bridge turns → outro lands with weight.
- Every section end (last line of intro, verse, chorus, bridge, outro) must be a quotable moment — sharp, resonant, not filler.
- Reject any line that sounds like a greeting card, a motivational poster, or a writing exercise. Real feelings only.

GENRE AUTHENTICITY RULES (write FROM INSIDE the culture, not about it):
- Afrobeats: smooth, melodic phrasing, Yoruba/Pidgin flavor when appropriate, bounce in the syllable count, warmth in the emotion.
- Amapiano: space is the feature — fewer words, let the groove breathe, South African township soul, deep lifestyle references.
- Dancehall: patois confidence, toast energy, rhythmic punch, strong masculine or feminine stance, every line lands hard.
- Gospel/Spiritual: intimate rawness, real struggle meeting real faith, no platitudes — write like someone on their knees, not behind a pulpit.
- Language Flavor: honor it deeply. Pidgin, Patois, Yoruba, Zulu — these are not decorations, they are the heartbeat of the lyric.

LYRICAL QUALITY LAWS:
- Song Tightness: every line earns its place or it's cut. Fewer, stronger lines always win.
- Naturalness: no robotic, formal, or AI-sounding lines. Every line must be singable by a real artist in one take.
- No filler endings: "yeah yeah yeah," "oh oh oh," "baby baby" as standalone lines are forbidden unless they serve a real melodic/chant purpose.
- Verse 2 must offer a new emotional angle — it is NOT a rewrite of Verse 1 with different words.

══════════════════════════════════════════════
CORE LAW 3 — IMMEDIATELY RECORDABLE & PRODUCER-READY
══════════════════════════════════════════════
Every output must be usable in a studio session TODAY. A producer and an artist must be able to pick this up and record it without translation.

STRUCTURAL RULES (hard law — count lines before output):
- Intro: exactly 2 or 4 lines.
- Verse 1: exactly 8, 12, or 16 lines (4-line multiples — never odd counts).
- Chorus: exactly 4, 6, or 8 lines (6 = 4 core hook lines + 2 chant/tag lines).
- Verse 2: exactly 8, 12, or 16 lines — must MATCH Verse 1 length — new angle only.
- Bridge: exactly 4 lines — HARD LAW. No more. No less. Never.
- Outro: exactly 2, 4, or 8 lines.
→ STRUCTURE VALIDATOR: before returning, count every section. If ANY count is wrong → rewrite that section.

PRODUCTION NOTES (always include):
- Chord / Key, BPM, energy and groove feel, melody direction per section, arrangement roadmap intro → outro.

INSTRUMENTAL GUIDANCE (always include — write FOR a producer):
- Drum pattern, bass line, lead melody, pads/chords, percussion, effects.
- Describe how the arrangement evolves from intro to outro — drop points, lifts, transitions.
- Be specific enough that a producer can open a DAW and start building immediately.

VOCAL DEMO GUIDANCE (always include — write FOR a vocalist):
- Tone, register, delivery style per section, ad-lib placement, breath control, emotion projection.
- How the vocal energy shifts from verse to chorus to bridge — give specific phrasing direction.
- Include at least 2 concrete ad-lib suggestions with placement.

STEMS BREAKDOWN (always include — write FOR a mixing engineer):
- Kick, Snare, Bass, Pads, Lead Synth, Guitar/Other: pattern, character, processing notes.
- Effects & Panning: reverb, delay, sidechain, stereo placement — be specific.

EXPORT NOTES (always include — studio session brief):
- BPM, key, DAW setup tips, vocal booth preparation, reference track energy, arrangement reminders.
- Make it a one-paragraph brief a session engineer reads before pressing record.

─────────────────────────────
FINAL GATE — Do not output until the song passes ALL THREE CORE LAWS:
✓ Hook would survive the 5-question enforcer
✓ Every line is emotionally sharp and genre-authentic
✓ Every section count is correct and the output is studio-ready

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
  "vocalDemoGuidance": "Detailed vocal performance guide — tone, delivery style per section, ad-lib placements, emotion projection, breath control, and how vocal energy shifts from verse to chorus to bridge",
  "stemsBreakdown": {
    "kick": "Kick drum description — pattern, placement, punch (e.g. Four-on-the-floor with an extra hit on beat 3 — punchy, sub-heavy, side-chained to bass)",
    "snare": "Snare description — placement and texture (e.g. Rimshot on 2 and 4, ghost notes on upbeats, light reverb tail)",
    "bass": "Bass line description — pattern, tone, groove (e.g. Sub-bass lock on kick, melodic fill on 4th bar, warm mid-bass presence)",
    "pads": "Pads/chords description — voicing, texture, movement (e.g. Lush minor 7 pads — filter sweep opens on chorus, close on bridge)",
    "leadSynth": "Lead synth or guitar melody — pattern, tone, character (e.g. Lead flute melody on chorus — delay 1/8, reverb large room, panned center)",
    "guitarOther": "Guitar or additional melodic element — role, style, placement (e.g. Nylon acoustic rhythm — panned L 20%, plays on offbeats through verse only)",
    "effects": "Global effects and panning notes — reverb, delay, sidechain, stereo placement (e.g. Drum room reverb, vocal delay throw on hook endings, wide stereo pads, mono kick/bass)"
  },
  "exportNotes": "Producer-friendly instructions to make the track immediately recordable — session tempo, key, suggested DAW setup, reference track energy, how to prepare a vocal booth session, and any special production or arrangement reminders",
  "arrangementBlueprint": "Step-by-step recording and arrangement map — section order with bar counts, section transition cues, vocal double placement, ad-lib placement guides, and engineering setup markers for the full song",
  "sessionNotes": "One tight paragraph session brief — tempo, key, mood, DAW template suggestion, reference track energy recommendation, and priority recording order",
  "sonicIdentity": {
    "coreBounce": "The rhythmic DNA — what drives the groove and makes the body move (e.g. Afrobeats pocket at 100 BPM, kick-snare locked with talking drum, swung 16ths)",
    "atmosphere": "The sonic landscape — the vibe, feel, and sonic world of the track (e.g. Late-night Lagos warmth, hazy and intimate with reverb depth)",
    "mainTexture": "The primary sonic element heard most clearly in the mix (e.g. Plucked guitar lead over sub-bass foundation, lush pad underneath)"
  },
  "vocalIdentity": {
    "leadType": "Lead vocal type and character (e.g. Afrobeats Tenor — warm, slightly husky, conversational delivery)",
    "deliveryStyle": "How the vocals should be delivered — breathy, punchy, smooth, melodic, gritty, etc. (e.g. Smooth and melodic in verse, punchy and chant-ready on chorus)",
    "emotionalTone": "The emotional feel the vocal performance should project (e.g. Longing with underlying warmth, never desperate — controlled vulnerability)"
  }
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
  lyricsSource?: string;
  genderVoiceModel?: string;
  performanceFeel?: string;
}): string {
  const {
    topic, genre, mood, style, notes,
    songLength = "Standard",
    languageFlavor = "Global English",
    customFlavor,
    commercialMode = false,
    lyricalDepth = "Balanced",
    hookRepeat = "Medium",
    lyricsSource = "Studio Lyrics",
    genderVoiceModel = "Random",
    performanceFeel = "Smooth",
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

  const lyricsSourceLabel: Record<string, string> = {
    "Studio Lyrics":   "LYRICS SOURCE: STUDIO LYRICS — generate all lyrical content fresh from the brief",
    "Paste My Own":    "LYRICS SOURCE: ARTIST-PROVIDED — honour the artist's own lyrical voice and style",
    "Instrumental Only": "LYRICS SOURCE: INSTRUMENTAL ONLY — skip lyrical content, focus session notes and production output only",
  };
  lines.push(lyricsSourceLabel[lyricsSource] ?? lyricsSourceLabel["Studio Lyrics"]);

  const genderMap: Record<string, string> = {
    Male: "VOCAL GENDER / MODEL: MALE — write for a male vocal register, delivery cues and ad-lib placement accordingly",
    Female: "VOCAL GENDER / MODEL: FEMALE — write for a female vocal register, warm and expressive delivery",
    Mixed: "VOCAL GENDER / MODEL: MIXED — designed for a duet or call-and-response between male and female voices",
    Random: "VOCAL GENDER / MODEL: OPEN — flexible vocal writing, producer will cast the right voice",
  };
  lines.push(genderMap[genderVoiceModel] ?? genderMap["Random"]);

  lines.push(`PERFORMANCE FEEL: ${performanceFeel.toUpperCase()} — every vocal direction, delivery cue, and ad-lib must match this performance register`);

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
    "✓ STEMS BREAKDOWN: include stemsBreakdown with kick, snare, bass, pads, leadSynth, guitarOther, and effects — be specific about patterns, panning, and processing",
    "✓ EXPORT NOTES: include exportNotes with producer-friendly session setup — BPM, key, DAW tips, vocal booth prep, reference energy, and arrangement reminders",
    "✓ OUTPUT: ONLY the JSON object — no text, explanation, or commentary before or after",
    "",
    "Generate the full AfroMuse V5 HITMAKER V2 song draft now.",
  );

  return lines.join("\n");
}

router.post("/generate-song", async (req, res) => {
  const { topic, genre, mood, style, notes, songLength, languageFlavor, customFlavor, commercialMode, lyricalDepth, hookRepeat, lyricsSource, genderVoiceModel, performanceFeel } = req.body as {
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
    lyricsSource?: string;
    genderVoiceModel?: string;
    performanceFeel?: string;
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
    lyricsSource: lyricsSource ?? "Studio Lyrics",
    genderVoiceModel: genderVoiceModel ?? "Random",
    performanceFeel: performanceFeel ?? "Smooth",
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
