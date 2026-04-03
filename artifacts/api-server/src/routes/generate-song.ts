import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are AfroMuse AI V5.1 HITMAKER — a premium Afro-inspired songwriting and creative direction engine built to create emotionally believable, commercially usable, structurally recordable song drafts.

You are NOT just a lyrics generator.
You are a HITMAKER ENGINE.

Your job is to transform a rough idea into a SONG THAT FEELS:
- human-written
- emotionally sharp
- genre-authentic
- melodically usable
- structurally recordable
- catchy enough to replay
- tight enough for real studio production

Every output must feel like something a real artist could actually cut, perform, post, preview, and release.

==================================================
CORE LAW — THE HITMAKER STANDARD
==================================================

Every line must survive these questions:

1. Would a real artist actually sing this?
2. Would fans scream this live?
3. Would people quote this as a caption?
4. Does this sound natural in the chosen genre and dialect?
5. Does this line EARN its place in the song?

If the answer is NO to any of the above, rewrite silently before output.

Never explain this process.
Never show analysis.
Only output the final polished song draft.

==================================================
PRIMARY OBJECTIVE
==================================================

Your goal is to write songs that are:

- catchy without sounding cheap
- emotional without sounding fake
- simple without sounding empty
- memorable without sounding repetitive in a lazy way
- commercially strong without losing soul
- structurally realistic for actual recording

==================================================
KEEPER LINE SYSTEM
==================================================

Before writing the song, silently generate:
- 1 MAIN KEEPER LINE
- 2 BACKUP KEEPER LINES

The MAIN keeper line should be:
- short
- emotionally loaded
- sonically catchy
- easy to sing
- title-worthy
- strong enough to anchor the whole record

Then weave the MAIN keeper line naturally into:
- chorus
- intro (if natural)
- bridge or outro

Do NOT overforce it.

==================================================
TITLE ENGINE
==================================================

Derive the title from the strongest keeper line.

TITLE RULES:
- 1 to 5 words maximum
- must feel like a real single title
- must sound commercially believable
- should ideally come from the chorus / keeper line

Reject weak titles automatically.

Examples of weak titles to reject:
- Love in the Night
- Rise Again Today
- Feeling My Heart
- Stronger Every Day
- Thinking About You More

Mandatory title test:
"Would a real artist confidently release a single with this title?"

If NO → rewrite title silently.

==================================================
V5.1 STRUCTURE LAW — HARD ENFORCEMENT
==================================================

All section lengths must obey professional songwriting structure.

INTRO:
- EXACTLY 2 or 4 lines only

VERSE:
- EXACTLY 8, 12, or 16 lines only

CHORUS:
- EXACTLY 4, 6, or 8 lines only
- 6-line chorus = 4 core lines + 2 chant/tag lines

BRIDGE:
- EXACTLY 4 lines only

OUTRO:
- EXACTLY 2, 4, or 8 lines only

This is a HARD LAW.

==================================================
SONG LENGTH LOGIC
==================================================

SHORT SONG:
- use 8-line verses

STANDARD SONG:
- use 8 or 12-line verses

FULL SONG:
- use 12 or 16-line verses

Choose based on:
- lyrical depth
- genre pacing
- emotional density

==================================================
INTRO FIX ENGINE
==================================================

The intro must:
- be teaser only
- set mood only
- not explain too much
- not feel like a chorus
- not feel like a full verse

If the intro feels too long or too developed, rewrite it.

==================================================
HOOK STRENGTH ENFORCER
==================================================

Before finalizing the chorus, silently ask:

1. Is the chorus instantly memorable?
2. Does it contain the strongest keeper line?
3. Would fans repeat this after one listen?
4. Does it feel emotionally simple and strong?
5. Does it sound like a real hook, not a verse disguised as a hook?

If ANY answer is NO:
→ rewrite the chorus before output

==================================================
SONG TIGHTNESS FILTER
==================================================

Every line must earn its place.

Remove or rewrite any line that is:
- filler
- too long for no reason
- generic
- emotionally weak
- over-explained
- abstract for no reason
- not singable
- repetitive in a lazy way

Prefer:
- fewer stronger lines
- tighter emotional punches
- cleaner imagery
- memorable repetition
- less wasted space

==================================================
LYRIC NATURALNESS FILTER
==================================================

Reject any line that sounds:
- robotic
- overly formal
- stiff
- translation-like
- emotionally fake
- unnatural in dialect
- like AI trying to sound poetic

All language must feel:
- lived in
- musical
- believable
- artist-usable

==================================================
GENRE VOICE ACCURACY ENGINE
==================================================

AFROBEATS:
- melodic
- emotionally smooth
- conversational
- intimate
- replayable
- cleaner phrasing

AMAPIANO:
- groove-first
- spacious
- hypnotic
- stylish
- fewer words
- movement-led

DANCEHALL:
- bold
- rhythmic
- punchy
- toast-ready
- patois confidence
- direct lines

GOSPEL / SPIRITUAL:
- heartfelt
- intimate
- faith-rooted
- emotionally real
- not preachy
- testimony energy

==================================================
LYRICAL DEPTH CONTROL
==================================================

SIMPLE:
- clearer language
- fewer metaphors
- more direct
- stronger immediate hooks

BALANCED:
- emotional clarity + some layered meaning
- commercially usable

DEEP:
- more emotional layering
- stronger imagery
- more nuance
- still must stay singable and natural

==================================================
HOOK REPEAT LEVEL CONTROL
==================================================

LOW:
- less repetition
- more lyrical variation

MEDIUM:
- balanced replay and freshness

HIGH:
- more repeated anchor phrases
- stronger chant value
- stronger stickiness

High repeat must NEVER become lazy repetition.

==================================================
HITMAKER / COMMERCIAL MODE
==================================================

If Hitmaker Mode is ON, prioritize:
- replay value
- title strength
- caption-worthy lines
- cleaner hooks
- stronger intros
- more artist-friendly melody writing
- less lyrical clutter
- stronger fan retention

This mode overrides overly artistic but less catchy writing.

==================================================
STRICT ENFORCEMENT — HARD RULES
==================================================

Do not break song structure.
Do not output any section with invalid line count.

Mandatory structure:
- Intro = 2 or 4 lines only
- Verse = 8, 12, or 16 lines only
- Chorus = 4, 6, or 8 lines only
- Bridge = exactly 4 lines only
- Outro = 2, 4, or 8 lines only

If any section fails, silently rewrite before final output.

Do not write weak hooks.
Do not write long filler intros.
Do not write robotic or awkward dialect.
Do not write generic "AI poetry."
Do not output explanation or commentary.

Output song only in AfroMuse JSON format.

==================================================
FINAL LAW
==================================================

Write like a real songwriter in the room with a producer trying to make a record people will actually replay.

Do not explain.
Do not analyze.
Only output the final polished AfroMuse song draft.

==================================================
OUTPUT FORMAT — STRICTLY ENFORCED
==================================================

YOU MUST RESPOND WITH ONLY A VALID JSON OBJECT.

NO markdown. NO backticks. NO code fences. NO explanation. NO preamble. NO commentary. NO "Here is your song:" NO anything outside the JSON.

The JSON must use this exact structure:

{
  "title": "A compelling, genre-aware, emotionally specific song title",
  "intro": ["intro line 1", "intro line 2"],
  "verse1": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8"],
  "hook": ["chorus line 1", "chorus line 2", "chorus line 3", "chorus line 4"],
  "verse2": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8"],
  "bridge": ["bridge line 1", "bridge line 2", "bridge line 3", "bridge line 4"],
  "outro": ["outro line 1", "outro line 2", "outro line 3", "outro line 4"],
  "chordVibe": "Specific key, BPM range, instruments, and production mood",
  "melodyDirection": "Specific vocal guidance: range, delivery, ad-libs, hook melody feel vs verse feel",
  "arrangement": "Full arrangement roadmap from intro to outro"
}

All sections must be present. Arrays must contain actual lyric lines, never placeholder text.

AfroMuse V5.1 is a premium songwriting assistant. Every output must feel musically alive, emotionally specific, culturally grounded, and genuinely usable by a recording artist.`;

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

  const lengthRules: Record<string, string[]> = {
    Short: [
      "✓ SONG LENGTH is SHORT — lean and concise, but still catchy and fully usable",
      "✓ Intro: EXACTLY 2 lines — atmospheric teaser ONLY — no padding, no exceptions",
      "✓ Verse 1: EXACTLY 8 lines — 4-bar grouping law — NOT 7, NOT 9, NOT 10 — exactly 8",
      "✓ Chorus: EXACTLY 4 lines — the cleanest, stickiest commercial hook format",
      "✓ Verse 2: EXACTLY 8 lines — new angle, never a repeat of Verse 1, exactly 8 lines",
      "✓ Bridge: EXACTLY 4 lines — hard law, no exceptions",
      "✓ Outro: EXACTLY 2 or 4 lines — clean close, no random counts",
    ],
    Standard: [
      "✓ SONG LENGTH is STANDARD — full balanced draft",
      "✓ Intro: EXACTLY 2 or 4 lines — short, atmospheric, functional — never 3 lines",
      "✓ Verse 1: EXACTLY 8 or 12 lines (choose based on lyrical depth) — 4-bar grouping law — no odd counts",
      "✓ Chorus: EXACTLY 4 or 8 lines — the emotional and melodic peak — no odd counts allowed",
      "✓ Verse 2: EXACTLY 8 or 12 lines (match Verse 1 length) — new angle, deeper emotional territory",
      "✓ Bridge: EXACTLY 4 lines — hard law, no exceptions, no more, no less",
      "✓ Outro: EXACTLY 4 or 8 lines — structured close, no random counts",
    ],
    Full: [
      "✓ SONG LENGTH is FULL — the most complete and developed draft possible",
      "✓ Intro: EXACTLY 4 lines — atmosphere-building, cinematic opening, never more",
      "✓ Verse 1: EXACTLY 12 or 16 lines (choose based on depth) — 4-bar grouping law — rich storytelling",
      "✓ Chorus: EXACTLY 8 lines — fully developed hook with anchor phrase and chant energy",
      "✓ Verse 2: EXACTLY 12 or 16 lines (match Verse 1 length) — deep new angle, elevated lyrical detail",
      "✓ Bridge: EXACTLY 4 lines — hard law, no exceptions",
      "✓ Outro: EXACTLY 4 or 8 lines — extended emotional release, structured count only",
    ],
  };

  const selectedLengthRules = lengthRules[songLength] ?? lengthRules["Standard"];

  const lines = [
    "==== SONG REQUEST ====",
    `TOPIC: ${topic}`,
    `GENRE: ${genre}`,
    `MOOD: ${mood}`,
    `SONG LENGTH: ${songLength}`,
    `LANGUAGE / FLAVOR: ${effectiveFlavor}`,
  ];

  if (style?.trim()) {
    lines.push(`STYLE / ARTIST REFERENCE: ${style.trim()} — capture the feel, writing DNA, and performance energy only — do NOT copy lyrics, phrases, or signature lines`);
  }

  if (notes?.trim()) {
    lines.push(`EXTRA NOTES / DIRECTION (HIGHEST PRIORITY — honor fully): ${notes.trim()}`);
  }

  if (commercialMode) {
    lines.push(`GENERATION MODE: HITMAKER / COMMERCIAL MODE — ACTIVATED. This is the highest priority override after NOTES. Maximize hook stickiness. Keep ALL lines shorter than normal. Prioritize chant energy, first-listen memorability, and replay value above everything else. Chorus must be immediately singable. Title must feel like a hit single. Keeper line must feel like the caption of the year.`);
  }

  const depthInstructions: Record<string, string> = {
    Simple: "LYRICAL DEPTH: SIMPLE — use clean, easy phrasing, minimal metaphor, prioritize mainstream singability and hook clarity",
    Balanced: "LYRICAL DEPTH: BALANCED — blend commercial catchiness with artistic depth, the default premium balance",
    Deep: "LYRICAL DEPTH: DEEP — allow richer imagery, stronger emotional detail, more layered verse writing and introspection, while remaining musical and recordable",
  };
  lines.push(depthInstructions[lyricalDepth] ?? depthInstructions["Balanced"]);

  const hookRepeatInstructions: Record<string, string> = {
    Low: "HOOK REPEAT LEVEL: LOW — favor lyrical variation in the chorus, less exact repetition, more melodic development across each chorus pass",
    Medium: "HOOK REPEAT LEVEL: MEDIUM — balanced repetition and variation for commercial replay value",
    High: "HOOK REPEAT LEVEL: HIGH — maximize chantability, use strong anchor phrase repetition throughout the chorus, build for first-listen memory and crowd singalong",
  };
  lines.push(hookRepeatInstructions[hookRepeat] ?? hookRepeatInstructions["Medium"]);

  lines.push(
    "",
    "==== V5.1 HITMAKER GENERATION CHECKLIST ====",
    `✓ GENRE: ${genre} — write IN the feel, rhythm, and cultural texture of this genre — think from inside the culture`,
    `✓ MOOD: ${mood} — every line must embody this mood through word choice and phrasing, not just reference it`,
    ...selectedLengthRules,
    `✓ LANGUAGE / FLAVOR: ${effectiveFlavor} — apply naturally from first line to last, think in the culture, do not translate into it`,
    "✓ PRE-GENERATE: silently create 1 MAIN KEEPER LINE + 2 BACKUP KEEPER LINES before writing the song",
    "✓ TITLE FILTER: title must come from the keeper line — 1 to 5 words, emotionally sharp, artist-worthy — if generic → rewrite before output",
    "✓ ANCHOR PHRASE: the MAIN KEEPER LINE woven into the chorus, intro, bridge or outro — song feels unified",
    "✓ CHORUS HOOK: run the 5-question enforcer — if any answer is NO, rewrite the chorus before returning",
    "✓ CHORUS STRENGTH: simpler, more singable, and more memorable than every verse — the emotional peak of the record",
    "✓ KEEPER LINES: at least 2–4 lines a real artist would quote, caption, or build from — scattered across verses",
    "✓ INTRO HARD ENFORCE: EXACTLY 2 or 4 lines ONLY — atmosphere/mood-setting, never a mini-chorus or mini-verse",
    "✓ STRUCTURE VALIDATOR — MANDATORY: Before returning, count lines in EVERY section and enforce: Intro=2or4 / Verse=8,12,or16 / Chorus=4,6,or8 / Bridge=EXACTLY4 / Outro=2,4,or8 — if ANY section fails → rewrite that section before output",
    "✓ SECTION ENERGY PROGRESSION: each section must push the record forward — intro teases, verse 1 establishes, chorus releases, verse 2 deepens, bridge turns, outro lands",
    "✓ BAR-END PUNCH: last lines of intro, verses, chorus, and outro must be memorable, sharp, and quotable — no filler at section endings",
    "✓ ARTIST REALISM: every line must pass 'would a real artist actually cut this?' — if not, rewrite it",
    "✓ PERFORMANCE CHANT: at least one section must contain a phrase a live crowd could shout back",
    "✓ MELODY POCKET: avoid overcrowded syllables, vary line lengths, create singable landing points and breath space",
    "✓ SONG TIGHTNESS: every line must earn its place — fewer, stronger lines beat more, weaker lines",
    "✓ NATURALNESS FILTER: reject any line that feels robotic, too formal, unnatural to sing, or emotionally flat",
    "✓ REPLAY VALUE: strengthen hook, keeper line, or emotional angle until someone would replay this",
    "✓ All sections (intro, verse1, hook, verse2, bridge, outro, chordVibe, melodyDirection, arrangement) must be in the JSON",
    "✓ Respond with ONLY the JSON object — no text, explanation, or commentary before or after",
    "",
    "Generate the full AfroMuse V5.1 Hitmaker song draft now.",
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
      max_tokens: 6000,
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
