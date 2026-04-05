/**
 * AfroMuse Instrumental Provider
 *
 * Supports two execution modes resolved at runtime by the engine control layer:
 *
 *   mock — AI session brief (NVIDIA) + null audio placeholders (current default)
 *   live — real beat-generation API call + AI brief enrichment + real audio URLs
 *
 * Mode is resolved by resolveProviderMode("instrumental") which reads:
 *   → runtime overrides → environment config → registry status → safety guards
 *
 * Live path is structurally complete and ready for a real provider to be
 * dropped in. See: callLiveInstrumentalProvider() below.
 *
 * Fallback behavior (live → mock or live → clean failure) is driven by the
 * environment config's fallbackToMock flag for the instrumental category.
 *
 * ─── Live Provider Drop-in Checklist ──────────────────────────────────────────
 *   [ ] Set registry status → "live-ready", isLive → true  (providers/registry.ts)
 *   [ ] Set env config mode → "live"                       (engineConfig.ts)
 *   [ ] Set env vars: INSTRUMENTAL_API_KEY, INSTRUMENTAL_API_ENDPOINT,
 *                     INSTRUMENTAL_MODEL, INSTRUMENTAL_TIMEOUT_MS
 *   [ ] Implement the body of callLiveInstrumentalProvider() below
 *   [ ] Nothing in routes, adapters, or the UI changes
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { logger } from "../../lib/logger.js";
import type { NormalizedResponse, SessionBlueprintData } from "../types.js";
import { adaptInstrumental, type RawInstrumentalResponse } from "../adapters.js";
import { resolveProviderMode } from "../providerResolver.js";
import { executeFallback, buildFailureResponse } from "../fallback.js";
import { getProviderCredentials } from "../providerCredentials.js";
import { resolveModelAndClient } from "../nvidiaClient.js";

// ─── Payload ──────────────────────────────────────────────────────────────────

export interface InstrumentalPayload {
  title?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  key?: string;
  songLength?: string;
  energy?: string;
  hitmakerMode?: boolean;
  lyricalDepth?: string;
  hookRepeatLevel?: string;
  soundReference?: string;
  mixFeel?: string;
  styleReference?: string;
  productionNotes?: { chordVibe?: string; melodyDirection?: string; arrangement?: string };
  introBehavior?: string;
  chorusLift?: string;
  drumDensity?: string;
  bassWeight?: string;
  transitionStyle?: string;
  outroStyle?: string;
  // Extended session intelligence fields
  buildMode?: string;
  emotionalTone?: string;
  theme?: string;
}

// ─── Live Provider Response Shape ─────────────────────────────────────────────
// This represents the expected raw response from a real beat-generation API.
// When integrating a real provider (Udio, Suno, Stability Audio, etc.),
// map its response fields into this shape inside callLiveInstrumentalProvider().

export interface LiveInstrumentalProviderResponse {
  /** The primary audio preview URL returned by the real provider (MP3/stream). */
  previewUrl: string | null;
  /** Full-quality WAV download URL, if the provider returns one. */
  wavUrl: string | null;
  /** The provider's own internal track/job ID for reference and polling. */
  externalJobId: string | null;
  /** Human-readable title or name the provider assigned to this generation. */
  generationTitle: string | null;
  /** Any sonic or generation notes the provider returns (e.g. model used, tags). */
  sonicNotes: string | null;
  /** Duration string if the provider returns it (e.g. "3:22"). */
  duration: string | null;
  /** Cover art URL if the provider generates one. */
  coverArtUrl: string | null;
  /**
   * Optional waveform-ready metadata for future UI waveform rendering.
   * Shape is intentionally flexible — populate once a real provider is connected.
   */
  waveformMeta?: {
    peaks?: number[];
    durationSeconds?: number;
    sampleRate?: number;
  } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBpm(chordVibe: string, genre: string): number {
  const m = chordVibe?.match(/(\d{2,3})\s*BPM/i);
  if (m) return parseInt(m[1], 10);
  const defaults: Record<string, number> = {
    Afrobeats: 98, Afropop: 104, Amapiano: 112, Dancehall: 90,
    "R&B": 75, "Afro-fusion": 96, "Street Anthem": 100, Spiritual: 72,
  };
  return defaults[genre] ?? 96;
}

function parseKey(chordVibe: string, mood: string): string {
  const minorM = chordVibe?.match(/\b([A-G][b#]?)m\b/);
  const majorM = chordVibe?.match(/\b([A-G][b#]?)\s*(?:maj(?:or)?)?[-–\s,]/);
  if (minorM) return `${minorM[1]} Minor`;
  if (majorM) return `${majorM[1]} Major`;
  const byMood: Record<string, string> = {
    Sad: "D Minor", Uplifting: "G Major", Romantic: "A♭ Major",
    Energetic: "E Minor", Spiritual: "F Major", Confident: "B♭ Major",
  };
  return byMood[mood] ?? "F♯ Minor";
}

function getEnergy(mood: string): string {
  if (["Energetic", "Confident"].includes(mood)) return "High";
  if (["Sad", "Spiritual"].includes(mood)) return "Low";
  return "Mid";
}

function getDuration(songLength?: string): string {
  if (songLength === "Short") return "2:15";
  if (songLength === "Full") return "4:30";
  return "3:20";
}

function buildBaseMetadata(p: InstrumentalPayload): Partial<SessionBlueprintData> {
  const genre = p.genre ?? "Afrobeats";
  const mood = p.mood ?? "Uplifting";
  const chordVibe = p.productionNotes?.chordVibe ?? "";
  return {
    genre,
    mood,
    bpm: p.bpm ?? parseBpm(chordVibe, genre),
    key: p.key ?? parseKey(chordVibe, mood),
    energy: p.energy ?? getEnergy(mood),
    duration: getDuration(p.songLength),
    hitmakerMode: p.hitmakerMode ?? false,
    hookRepeatLevel: p.hookRepeatLevel ?? "Medium",
    audioType: "Instrumental Preview",
  };
}

// ─── AI Session Brief (NVIDIA) ────────────────────────────────────────────────
// Always runs in both mock and live modes to enrich the blueprint data.
// Gracefully skipped if NVIDIA_API_KEY is not set.

const AI_SYSTEM_PROMPT = `You are AfroMuse Audio Intelligence — a specialist AI producer brain for Afro-inspired music genres (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion).

You receive a session configuration and return a detailed instrumental session brief as structured JSON.
Your output shapes the sonic direction for real studio sessions and beat builds.

Rules:
- Write like a top-tier record producer, not a text generator
- Be genre-specific, culturally grounded, and musically precise
- Every description must be actionable in a real studio session
- ALWAYS return valid JSON only — no markdown, no explanation, no code fences`;

function buildAiPrompt(p: InstrumentalPayload): string {
  const genre = p.genre ?? "Afrobeats";
  const mood = p.mood ?? "Uplifting";
  const energy = p.energy ?? "Medium";
  const bpm = p.bpm ?? 96;
  const key = p.key ?? "F# Minor";
  const style = p.soundReference ?? p.styleReference ?? "";
  const mixFeel = p.mixFeel ?? "Balanced";
  const introBehavior = p.introBehavior ?? "Build up";
  const chorusLift = p.chorusLift ?? "Gradual swell";
  const drumDensity = p.drumDensity ?? "Mid";
  const bassWeight = p.bassWeight ?? "Punchy sub";

  return `Generate an instrumental session brief for this configuration:

GENRE: ${genre}
BPM: ${bpm}
KEY: ${key}
ENERGY: ${energy}
MOOD/ATMOSPHERE: ${mood}
SOUND / ARTIST REFERENCE: ${style || "original AfroMuse direction — no specific reference"}
MIX FEEL: ${mixFeel}
INTRO BEHAVIOR: ${introBehavior}
CHORUS LIFT: ${chorusLift}
DRUM DENSITY: ${drumDensity}
BASS WEIGHT: ${bassWeight}

Return ONLY this JSON object with no markdown, no code fences, no extra text:
{
  "beatSummary": "One compelling line (max 20 words) describing this beat's groove character and feel — be specific to genre + BPM",
  "arrangementMap": "Full arrangement breakdown with specific producer notes for each section: Intro → Verse → Chorus/Hook → Bridge → Outro. 3-4 sentences total.",
  "producerNotes": "Detailed production direction — instruments, layering approach, sonic signature, recording tips. 4-6 sentences. Write as if handing notes to a session engineer.",
  "hookFocus": "One sentence on where the hook hits hardest and how to engineer maximum replay value for this specific genre at this energy level",
  "arrangementStyle": "One sentence describing the overall arrangement philosophy and structural feel of this track",
  "sonicIdentity": {
    "coreBounce": "The exact rhythmic feel and groove pocket — be specific to ${genre} at ${bpm} BPM with ${energy} energy",
    "atmosphere": "The tonal and spatial atmosphere — reverb depth, density, emotional temperature of the mix",
    "mainTexture": "Primary sonic texture — list 2-3 key layered ingredients that define this session's sound identity"
  },
  "sessionBrief": "2-3 sentence quick producer brief written as if handing notes to a session engineer walking into the studio right now for this exact record"
}`;
}

async function fetchAiSessionBrief(
  p: InstrumentalPayload,
  jobId: string,
): Promise<Partial<SessionBlueprintData> | null> {
  const { model, client: ai } = resolveModelAndClient("GENERATE_INSTRUMENTAL_MODEL");
  if (!ai) {
    logger.warn({ jobId }, "NVIDIA_API_KEY not set — skipping instrumental AI brief");
    return null;
  }

  const res = await ai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: AI_SYSTEM_PROMPT },
      { role: "user", content: buildAiPrompt(p) },
    ],
    temperature: 0.75,
    max_tokens: 1200,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in instrumental brief response");

  return JSON.parse(cleaned.slice(start, end + 1)) as Partial<SessionBlueprintData>;
}

// ─── Mock Execution Path ──────────────────────────────────────────────────────
// Current default for all environments. Generates an AI session brief and
// returns null audio URLs (structural placeholders for when real audio arrives).

async function runMock(jobId: string, p: InstrumentalPayload): Promise<NormalizedResponse> {
  const metadata = buildBaseMetadata(p);

  let aiBrief: Partial<SessionBlueprintData> | null = null;
  try {
    aiBrief = await fetchAiSessionBrief(p, jobId);
  } catch (err) {
    logger.warn({ err, jobId }, "Instrumental AI brief failed — using metadata only");
  }

  const blueprintData: Partial<SessionBlueprintData> = { ...metadata, ...(aiBrief ?? {}) };

  const raw: RawInstrumentalResponse = {
    jobId,
    status: "completed",
    audioUrl: null,        // slot: real beat audio URL
    wavUrl: null,          // slot: WAV download URL
    blueprintData,
    externalJobId: null,   // slot: provider's own track/job ID
    previewUrl: null,      // slot: short beat preview clip URL
    coverArt: null,        // slot: generated cover art URL
  };

  logger.info({ jobId, genre: p.genre, mood: p.mood }, "Instrumental mock execution complete");
  return adaptInstrumental(raw);
}

// ─── ElevenLabs Music API — AfroMuse Prompt Intelligence ─────────────────────
// Translates AfroMuse session fields into a rich, musical producer brief.
// The goal is a prompt that reads like a confident creative direction for a
// commercially viable Afro-inspired record — not a keyword-stuffed list.

// ── Genre groove vocabulary ────────────────────────────────────────────────────

const GENRE_GROOVE: Record<string, string> = {
  Afrobeats:      "syncopated Afrobeats groove",
  Amapiano:       "log drum-driven Amapiano groove",
  Afropop:        "bright, melodic Afropop feel",
  "Afro-fusion":  "hybrid Afro-fusion pocket",
  Dancehall:      "steppers Dancehall pattern",
  "R&B":          "smooth R&B pocket",
  "Street Anthem":"raw street-energy bounce",
  Spiritual:      "reverent spiritual groove",
  Gospel:         "uplifting Gospel swing",
};

const GENRE_DEFAULTS: Record<string, number> = {
  Afrobeats: 98, Afropop: 104, Amapiano: 112, Dancehall: 90,
  "R&B": 78, "Afro-fusion": 96, "Street Anthem": 100, Spiritual: 72, Gospel: 76,
};

// ── Mood / emotional lane vocabulary ──────────────────────────────────────────

interface MoodProfile {
  lane: string;
  texture: string;
  space: string;
}

const MOOD_PROFILES: Record<string, MoodProfile> = {
  Uplifting:  { lane: "uplifting and forward-moving", texture: "warm melodic layers with rhythmic brightness", space: "open and anthemic" },
  Romantic:   { lane: "intimate and warm", texture: "soft guitar runs, silky pads, and gentle melodic phrases", space: "spacious with breathing room" },
  Energetic:  { lane: "high-energy and driven", texture: "punchy transients, dense rhythmic movement", space: "tight and forward" },
  Confident:  { lane: "bold and assured", texture: "powerful chord stabs, assertive low end, sharp percussive hits", space: "commanding and crisp" },
  Sad:        { lane: "reflective and melancholic", texture: "minor-key piano or guitar, restrained percussion, emotional space", space: "slow-release and intimate" },
  Spiritual:  { lane: "reverent and elevated", texture: "choir pads, warm bass, light percussion", space: "vast and ethereal" },
  Playful:    { lane: "light and infectious", texture: "bright melodic stabs, swinging hi-hat patterns", space: "bouncy and open" },
  Aggressive: { lane: "intense and driving", texture: "hard-hitting drums, gritty synths, edgy low end", space: "compressed and punchy" },
};

function getMoodProfile(mood: string): MoodProfile {
  return MOOD_PROFILES[mood] ?? {
    lane: `${mood.toLowerCase()} and intentional`,
    texture: "balanced melodic and rhythmic layers",
    space: "well-balanced",
  };
}

// ── Energy modifiers ───────────────────────────────────────────────────────────

function resolveEnergyDescriptor(energy: string, mood: string): string {
  const e = energy.toLowerCase();
  if (e === "high" || e === "hard") {
    return "high-energy, club-ready intensity";
  }
  if (e === "low" || e === "soft") {
    return "low-key, laid-back groove";
  }
  // Mid — check mood for colour
  if (["Romantic", "Sad", "Spiritual"].includes(mood)) return "measured, emotive energy";
  return "mid-level, steady groove energy";
}

// ── Percussion character ───────────────────────────────────────────────────────

function resolvePercussionLine(
  drumDensity: string,
  bassWeight: string,
  genre: string,
  energy: string,
): string {
  const density = drumDensity.toLowerCase();
  const bass    = bassWeight.toLowerCase();
  const isAfro  = ["Afrobeats", "Afropop", "Afro-fusion"].includes(genre);
  const isAmapiano = genre === "Amapiano";
  const highEnergy = ["high", "hard"].includes(energy.toLowerCase());

  // Build percussion description
  let drumDesc: string;
  if (isAmapiano) {
    if (density.includes("heavy") || density.includes("dense")) {
      drumDesc = "dense log drum rolls with layered percussion";
    } else if (density.includes("light") || density.includes("minimal")) {
      drumDesc = "sparse log drum placement with open hi-hats";
    } else {
      drumDesc = "rolling log drum patterns with organic percussion texture";
    }
  } else if (density.includes("heavy") || density.includes("dense")) {
    drumDesc = isAfro
      ? "heavy layered Afro drums with tight snare and stacked percussion"
      : "dense, driving drum arrangement with layered hits";
  } else if (density.includes("light") || density.includes("minimal")) {
    drumDesc = "minimal, tasteful drum placement with room to breathe";
  } else {
    drumDesc = isAfro
      ? `syncopated ${genre} drum pattern with clean snare placement`
      : "balanced drum arrangement with natural movement";
  }

  // Build bass description
  let bassDesc: string;
  if (bass.includes("heavy") || bass.includes("sub") || bass.includes("deep")) {
    bassDesc = highEnergy
      ? "deep sub bass driving the low end with club-ready weight"
      : "warm sub-heavy bass grounding the mix";
  } else if (bass.includes("light") || bass.includes("thin")) {
    bassDesc = "clean, restrained bass sitting behind the groove";
  } else if (bass.includes("punchy")) {
    bassDesc = "punchy, well-defined bass with tight transient attack";
  } else {
    bassDesc = "solid, well-balanced low end";
  }

  return `${drumDesc.charAt(0).toUpperCase()}${drumDesc.slice(1)}, with ${bassDesc}.`;
}

// ── Mix feel character ─────────────────────────────────────────────────────────

function resolveMixFeel(mixFeel: string): string {
  const mf = mixFeel.toLowerCase();
  if (mf.includes("bright") || mf.includes("crisp")) {
    return "bright, airy mix with clear transient definition and open high end";
  }
  if (mf.includes("dark") || mf.includes("gritty")) {
    return "dark, gritty mix with textured low-mids and raw sonic edge";
  }
  if (mf.includes("warm") || mf.includes("analog")) {
    return "warm, analog-feeling mix with rich midrange and gentle saturation";
  }
  if (mf.includes("club") || mf.includes("loud")) {
    return "loud, punchy club mix with heavy limiting and forward impact";
  }
  if (mf.includes("cinematic") || mf.includes("wide")) {
    return "wide, cinematic mix with deep stereo imaging and spatial reverb";
  }
  return "balanced, clean mix with natural space and clarity";
}

// ── Sound reference interpreter ────────────────────────────────────────────────
// Translates artist/style references into sonic direction without imitating
// specific copyrighted songs. Describes the lane, not the track.

const ARTIST_LANES: Record<string, string> = {
  "burna":   "Afrofusion lane — evolving sonic layers, deep cultural groove, and international crossover feel",
  "burna boy": "Afrofusion lane — evolving sonic layers, deep cultural groove, and international crossover feel",
  "wizkid":  "smooth, melodic Afrobeats lane — effortless groove, intimate atmosphere, and understated percussion",
  "asake":   "high-energy Afropop/Amapiano lane — log-drum movement, call-and-response melody, and raw street energy",
  "tems":    "atmospheric Afro-soul lane — expansive space, emotional warmth, and slow-building tension",
  "davido":  "anthem-ready Afrobeats lane — commercial hook structure, punchy percussion, and celebratory energy",
  "ayra starr": "cool Afropop lane — smooth melodic lines, light percussion, and modern production clarity",
  "omah lay": "introspective Afropop lane — intimate vocal space, soft guitar runs, and laid-back groove",
  "shallipopi": "street-energy Amapiano lane — raw bounce, log drum pressure, and working-class spirit",
  "ckay":    "melodic Afrobeats lane — emotional chord progressions, romantic energy, and international softness",
  "fireboy": "Afro-RnB lane — lush melodies, smooth bass, and emotional lyrical space",
};

function interpretSoundReference(soundRef: string): string | null {
  if (!soundRef.trim()) return null;
  const lower = soundRef.toLowerCase();
  for (const [key, desc] of Object.entries(ARTIST_LANES)) {
    if (lower.includes(key)) return `${desc}`;
  }
  // Generic reference — describe the direction, not the artist
  return `${soundRef.trim()} sonic lane and production aesthetic`;
}

// ── Build mode awareness ───────────────────────────────────────────────────────

function resolveBuildModeIntent(buildMode: string): string | null {
  const bm = buildMode.toLowerCase();
  if (bm.includes("instrumental") || bm === "producer") {
    return "Focus entirely on the beat arrangement, harmonic movement, and percussive dynamics — no vocal accommodation needed";
  }
  if (bm.includes("vocal demo") || bm.includes("demo setup")) {
    return "Leave consistent pocket and breathing room for a vocalist — melodic leads should support, not compete";
  }
  if (bm.includes("full") || bm.includes("session")) {
    return "Arrange with hook lift, verse build, and vocal space in mind — the track should breathe and support full song structure";
  }
  if (bm.includes("artist")) {
    return "Build for artist performance — leave room for lead vocal delivery with strong hook arrangement";
  }
  return null;
}

// ── Hitmaker mode additions ────────────────────────────────────────────────────

function resolveHitmakerAdditions(hitmaker: boolean, genre: string, energy: string): string | null {
  if (!hitmaker) return null;
  const highEnergy = ["high", "hard"].includes((energy ?? "").toLowerCase());
  if (genre === "Amapiano") {
    return "Engineered for commercial impact — peak log drum movement, singable melodic hook, and radio-ready arrangement";
  }
  if (highEnergy) {
    return "Hitmaker mode — maximum replay value, strong hook architecture, and club-tested rhythm dynamics";
  }
  return "Hitmaker mode — commercially balanced production with strong melodic identity and replay-engineered arrangement";
}

// ── Production notes weaver ────────────────────────────────────────────────────

function extractProductionContext(notes?: { chordVibe?: string; melodyDirection?: string; arrangement?: string }): string | null {
  if (!notes) return null;
  const parts: string[] = [];
  if (notes.chordVibe?.trim())       parts.push(notes.chordVibe.trim());
  if (notes.melodyDirection?.trim()) parts.push(notes.melodyDirection.trim());
  // Skip arrangement — it can be verbose and conflict with prompt intent
  if (!parts.length) return null;
  // Keep brief — one sentence worth of context only
  const combined = parts.join("; ");
  return combined.length > 120 ? combined.slice(0, 117) + "…" : combined;
}

// ── Main prompt builder ────────────────────────────────────────────────────────

export interface BuiltPrompt {
  /** Final prompt string sent to ElevenLabs */
  prompt: string;
  /** Human-readable brief for debug/diagnostic logging */
  brief: string;
}

export function buildElevenLabsPrompt(p: InstrumentalPayload): BuiltPrompt {
  const genre      = p.genre       ?? "Afrobeats";
  const mood       = p.mood        ?? "Uplifting";
  const bpm        = p.bpm         ?? (GENRE_DEFAULTS[genre] ?? 96);
  const key        = p.key         ?? "F♯ Minor";
  const energy     = p.energy      ?? "Mid";
  const soundRef   = (p.soundReference ?? "").trim();
  const mixFeel    = (p.mixFeel    ?? "").trim();
  const drumDens   = (p.drumDensity ?? "Mid").trim();
  const bassWt     = (p.bassWeight  ?? "Balanced").trim();
  const hitmaker   = p.hitmakerMode ?? false;
  const buildMode  = (p.buildMode   ?? "").trim();

  const moodProfile   = getMoodProfile(mood);
  const grooveWord    = GENRE_GROOVE[genre] ?? `${genre} groove`;
  const energyDesc    = resolveEnergyDescriptor(energy, mood);
  const percLine      = resolvePercussionLine(drumDens, bassWt, genre, energy);
  const soundLane     = interpretSoundReference(soundRef);
  const mixDesc       = mixFeel ? resolveMixFeel(mixFeel) : null;
  const buildIntent   = buildMode ? resolveBuildModeIntent(buildMode) : null;
  const hitmakerLine  = resolveHitmakerAdditions(hitmaker, genre, energy);
  const productionCtx = extractProductionContext(p.productionNotes);

  // ── Sentence 1: Core musical identity ────────────────────────────────────────
  // Genre · groove feel · tempo · key · energy descriptor
  const sentence1 =
    `A ${energyDesc} ${grooveWord} in ${key} at ${bpm} BPM.`;

  // ── Sentence 2: Emotional lane + texture + space ──────────────────────────────
  const sentence2 =
    `${moodProfile.lane.charAt(0).toUpperCase()}${moodProfile.lane.slice(1)} emotional lane` +
    ` — ${moodProfile.texture}, ${moodProfile.space} sonic space.`;

  // ── Sentence 3: Percussion + low end ─────────────────────────────────────────
  const sentence3 = percLine;

  // ── Sentence 4: Mix feel / sound lane / production context ───────────────────
  const sentence4Parts: string[] = [];
  if (mixDesc)        sentence4Parts.push(mixDesc.charAt(0).toUpperCase() + mixDesc.slice(1));
  if (soundLane)      sentence4Parts.push(`Direction: ${soundLane}`);
  if (productionCtx)  sentence4Parts.push(productionCtx);
  const sentence4 = sentence4Parts.length ? sentence4Parts.join(". ") + "." : null;

  // ── Sentence 5: Build mode / hitmaker intent ──────────────────────────────────
  const sentence5Parts: string[] = [];
  if (buildIntent)   sentence5Parts.push(buildIntent);
  if (hitmakerLine)  sentence5Parts.push(hitmakerLine);
  const sentence5 = sentence5Parts.length ? sentence5Parts.join(". ") + "." : null;

  // ── Assemble final prompt ─────────────────────────────────────────────────────
  // Keep it to ≤ 5 sentences. Trim anything empty.
  const sentences = [sentence1, sentence2, sentence3, sentence4, sentence5]
    .filter((s): s is string => Boolean(s?.trim()));

  // Guardrails: prevent contradictory or cluttered language
  // Join with space, append the instrumental instruction
  const prompt = sentences.join(" ") + " Instrumental only, no vocals.";

  // Brief for diagnostic logging (stored in sonicNotes)
  const brief = [
    `Genre: ${genre} | BPM: ${bpm} | Key: ${key} | Energy: ${energy} | Mood: ${mood}`,
    soundRef ? `Sound ref: ${soundRef}` : null,
    mixFeel  ? `Mix feel: ${mixFeel}`   : null,
    hitmaker ? "Hitmaker: ON"           : null,
    buildMode ? `Build mode: ${buildMode}` : null,
  ].filter(Boolean).join(" · ");

  return { prompt, brief };
}

// ─── ElevenLabs Music API — Duration Mapper ───────────────────────────────────

function resolveDurationMs(songLength?: string): number {
  const overrideSecs = process.env.ELEVENLABS_DEFAULT_DURATION_SECONDS
    ? parseInt(process.env.ELEVENLABS_DEFAULT_DURATION_SECONDS, 10)
    : NaN;
  if (!isNaN(overrideSecs) && overrideSecs >= 3 && overrideSecs <= 600) {
    return overrideSecs * 1000;
  }
  if (songLength === "Short") return 135_000; // 2:15
  if (songLength === "Full")  return 270_000; // 4:30
  return 200_000;                              // 3:20 default
}

// ─── Live Request Execution Block — ElevenLabs Music API ──────────────────────
// Calls POST /v1/music/compose, receives binary MP3 audio, converts to a
// base64 data URL that the client can use as a direct <audio> src.
//
// Supported env vars (all optional beyond ELEVENLABS_API_KEY):
//   ELEVENLABS_MUSIC_ENABLED          — "true" | "1" activates live mode
//   ELEVENLABS_PROVIDER_MODE          — "live" | "mock" | "disabled" explicit override
//   ELEVENLABS_OUTPUT_FORMAT          — informational; ElevenLabs returns MP3 by default
//   ELEVENLABS_DEFAULT_DURATION_SECONDS — integer, overrides per-session duration

async function callLiveInstrumentalProvider(
  p: InstrumentalPayload,
  jobId: string,
): Promise<LiveInstrumentalProviderResponse> {
  const creds = getProviderCredentials("instrumental");

  if (!creds.apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not configured. " +
      "Set the secret to enable live instrumental generation.",
    );
  }

  const { prompt, brief } = buildElevenLabsPrompt(p);
  const durationMs = resolveDurationMs(p.songLength);
  const endpoint   = creds.endpoint!; // always set — defaults in providerCredentials.ts

  logger.info(
    { jobId, prompt, brief, durationMs },
    "ElevenLabs Music API — requesting generation",
  );

  const response = await fetch(endpoint, {
    method:  "POST",
    headers: {
      "xi-api-key":   creds.apiKey,
      "Content-Type": "application/json",
      "Accept":       "audio/mpeg, audio/*, */*",
    },
    body: JSON.stringify({
      prompt,
      duration_ms:        durationMs,
      force_instrumental: true,
    }),
    signal: AbortSignal.timeout(creds.timeoutMs),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`ElevenLabs Music API error: ${response.status} — ${errText}`);
  }

  // ElevenLabs returns raw binary audio — convert to a base64 data URL so the
  // client can use it as an <audio> src without needing file storage.
  const audioBuffer = await response.arrayBuffer();
  const base64      = Buffer.from(audioBuffer).toString("base64");
  const dataUrl     = `data:audio/mpeg;base64,${base64}`;

  const durationSecs = Math.round(durationMs / 1000);
  const mins  = Math.floor(durationSecs / 60);
  const secs  = durationSecs % 60;
  const durationStr = `${mins}:${secs.toString().padStart(2, "0")}`;

  logger.info(
    { jobId, durationStr, audioBytes: audioBuffer.byteLength },
    "ElevenLabs Music API — audio received",
  );

  // sonicNotes stores: the diagnostic brief + the first 120 chars of the built prompt.
  // This is safe for internal inspection/tuning — it is NOT exposed to the main UI.
  const sonicNotes = `[AfroMuse Brief] ${brief} | Prompt: ${prompt.slice(0, 120)}${prompt.length > 120 ? "…" : ""}`;

  return {
    previewUrl:      dataUrl,
    wavUrl:          null,
    externalJobId:   null,
    generationTitle: `${p.genre ?? "Afrobeats"} Instrumental — ${p.mood ?? "Uplifting"}`,
    sonicNotes,
    duration:        durationStr,
    coverArtUrl:     null,
    waveformMeta: {
      durationSeconds: durationSecs,
    },
  };
}

// ─── Live Execution Path ──────────────────────────────────────────────────────
// Calls the real provider, enriches the response with the AI session brief,
// maps everything into RawInstrumentalResponse, and normalizes through the adapter.

async function runLive(jobId: string, p: InstrumentalPayload): Promise<NormalizedResponse> {
  logger.info({ jobId, genre: p.genre, mood: p.mood }, "Instrumental live execution starting");

  // Call the real beat-generation provider
  const liveResponse = await callLiveInstrumentalProvider(p, jobId);

  // Base metadata from the payload
  const metadata = buildBaseMetadata(p);

  // Overlay the provider's duration if it returned one
  if (liveResponse.duration) {
    metadata.duration = liveResponse.duration;
  }

  // Enrich with AI session brief (runs alongside live audio — always attempted)
  let aiBrief: Partial<SessionBlueprintData> | null = null;
  try {
    aiBrief = await fetchAiSessionBrief(p, jobId);
  } catch (err) {
    logger.warn({ err, jobId }, "Instrumental AI brief failed during live run — continuing without enrichment");
  }

  const blueprintData: Partial<SessionBlueprintData> = { ...metadata, ...(aiBrief ?? {}) };

  // Map the live response into the RawInstrumentalResponse shape
  const raw: RawInstrumentalResponse = {
    jobId,
    status: "completed",
    audioUrl: liveResponse.previewUrl,          // real beat audio URL from provider
    wavUrl: liveResponse.wavUrl,                // WAV download URL from provider
    blueprintData,
    externalJobId: liveResponse.externalJobId,  // provider's own track/job ID
    previewUrl: liveResponse.previewUrl,         // short preview clip (same as audioUrl here)
    coverArt: liveResponse.coverArtUrl,          // generated cover art from provider
  };

  logger.info(
    {
      jobId,
      hasAudio: !!raw.audioUrl,
      externalJobId: raw.externalJobId,
      hasAiBrief: !!aiBrief,
    },
    "Instrumental live execution complete",
  );

  return adaptInstrumental(raw);
}

// ─── Provider Entry Point ─────────────────────────────────────────────────────
// Resolves the engine mode and dispatches to the correct execution path.
// Routes and the UI always call this function — they never see mock vs live.

export async function run(jobId: string, p: InstrumentalPayload): Promise<NormalizedResponse> {
  const resolved = resolveProviderMode("instrumental");

  logger.info(
    {
      jobId,
      resolvedMode: resolved.resolvedMode,
      modeSource: resolved.source,
      canRun: resolved.canRun,
    },
    "Instrumental provider resolved",
  );

  // ── Disabled ─────────────────────────────────────────────────────────────────
  if (!resolved.canRun || resolved.resolvedMode === "disabled") {
    const reason = resolved.disabledReason ?? "Instrumental provider is disabled";
    logger.warn({ jobId, reason }, "Instrumental provider disabled — returning clean failure");
    return buildFailureResponse(jobId, "instrumental", "unsupported_mode", reason);
  }

  // ── Live ──────────────────────────────────────────────────────────────────────
  if (resolved.resolvedMode === "live") {
    try {
      return await runLive(jobId, p);
    } catch (err) {
      logger.error({ err, jobId }, "Instrumental live provider failed — evaluating fallback");
      const fallback = await executeFallback(
        jobId,
        "instrumental",
        err,
        () => runMock(jobId, p),
      );
      if (!fallback.usedFallback) {
        logger.warn({ jobId, reason: fallback.reason }, "Instrumental: clean failure (no fallback)");
      } else {
        logger.info({ jobId }, "Instrumental: fell back to mock successfully");
      }
      return fallback.response;
    }
  }

  // ── Mock (default) ───────────────────────────────────────────────────────────
  return runMock(jobId, p);
}
