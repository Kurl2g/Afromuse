/**
 * AfroMuse Instrumental Provider
 *
 * Current mode: AI session brief (NVIDIA) + mock audio placeholders.
 *
 * Live swap pattern:
 *   1. Call the real beat-generation API with `p` (already translated by toInstrumentalPayload).
 *   2. Map the API's response to RawInstrumentalResponse.
 *   3. Pass it to adaptInstrumental() — NormalizedResponse comes out.
 *   4. Set registry status to "live-ready" and isLive to true.
 *   Nothing in routes or the UI changes.
 */

import OpenAI from "openai";
import { logger } from "../../lib/logger.js";
import type { NormalizedResponse, SessionBlueprintData } from "../types.js";
import { adaptInstrumental, type RawInstrumentalResponse } from "../adapters.js";

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

// ─── AI Session Brief (NVIDIA) ────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are AfroMuse Audio Intelligence — a specialist AI producer brain for Afro-inspired music genres (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion).

You receive a session configuration and return a detailed instrumental session brief as structured JSON.
Your output shapes the sonic direction for real studio sessions and beat builds.

Rules:
- Write like a top-tier record producer, not a text generator
- Be genre-specific, culturally grounded, and musically precise
- Every description must be actionable in a real studio session
- ALWAYS return valid JSON only — no markdown, no explanation, no code fences`;

function buildPrompt(p: InstrumentalPayload): string {
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

async function fetchAiSessionBrief(p: InstrumentalPayload): Promise<Partial<SessionBlueprintData> | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.warn("NVIDIA_API_KEY not set — skipping instrumental AI brief");
    return null;
  }

  const ai = new OpenAI({ apiKey, baseURL: "https://integrate.api.nvidia.com/v1" });
  const res = await ai.chat.completions.create({
    model: "qwen/qwen3.5-122b-a10b",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(p) },
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

// ─── Provider Entry Point ─────────────────────────────────────────────────────

export async function run(jobId: string, p: InstrumentalPayload): Promise<NormalizedResponse> {
  const genre = p.genre ?? "Afrobeats";
  const mood = p.mood ?? "Uplifting";
  const chordVibe = p.productionNotes?.chordVibe ?? "";

  const metadata: Partial<SessionBlueprintData> = {
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

  let aiBrief: Partial<SessionBlueprintData> | null = null;
  try {
    aiBrief = await fetchAiSessionBrief(p);
  } catch (err) {
    logger.warn({ err, jobId }, "Instrumental AI brief failed — using metadata only");
  }

  const blueprintData: Partial<SessionBlueprintData> = { ...metadata, ...(aiBrief ?? {}) };

  // Build the raw response, then normalise through the adapter.
  // When a real beat-gen API is connected, replace this block with the live API call
  // and map its response to RawInstrumentalResponse before calling adaptInstrumental().
  const raw: RawInstrumentalResponse = {
    jobId,
    status: "completed",
    audioUrl: null,           // slot: real beat audio URL
    wavUrl: null,             // slot: WAV download URL
    blueprintData,
    externalJobId: null,      // slot: provider's own track/job ID
    previewUrl: null,         // slot: short beat preview clip URL
    coverArt: null,           // slot: generated cover art URL
  };

  return adaptInstrumental(raw);
}
