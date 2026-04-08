/**
 * AfroMuse Vocal Provider
 *
 * Handles both vocal-demo and lead-vocal job types.
 * Current mode: AI session brief (NVIDIA) + mock placeholders.
 *
 * Live swap pattern:
 *   1. Call the real vocal synthesis API with the translated payload.
 *   2. Map its response to RawVocalResponse.
 *   3. Pass it to adaptVocal() — NormalizedResponse comes out.
 *   4. Set registry status to "live-ready" and isLive to true.
 *   Nothing in routes or the UI changes.
 */

import OpenAI from "openai";
import { logger } from "../../lib/logger.js";
import type { NormalizedResponse, SessionBlueprintData } from "../types.js";
import { adaptVocal, type RawVocalResponse } from "../adapters.js";

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface VocalDemoPayload {
  title?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  key?: string;
  songLength?: string;
  hitmakerMode?: boolean;
  lyrics?: { hook?: string[]; verse1?: string[]; chorus?: string[] };
  keeperLine?: string;
  melodyDirection?: string;
  productionNotes?: { chordVibe?: string; melodyDirection?: string; arrangement?: string };
}

export interface LeadVocalPayload {
  lyrics?: string;
  instrumentalUrl?: string;
  gender?: string;
  performanceFeel?: string;
  vocalStyle?: string;
  emotionalTone?: string;
  buildMode?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  // Voice Engine personalization
  artistReference?: string;
  dialectDepth?: string;
  voiceTexture?: string;
  singingStyle?: string;
  songMood?: string;
  keeperLines?: string;
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

function getVocalStyle(mood: string): string {
  const map: Record<string, string> = {
    Romantic: "Smooth / Intimate", Energetic: "Punchy / Assertive",
    Sad: "Soulful / Breathy", Spiritual: "Rich / Devotional", Confident: "Confident / Sharp",
  };
  return map[mood] ?? "Warm / Melodic";
}

function getDuration(songLength?: string): string {
  if (songLength === "Short") return "2:15";
  if (songLength === "Full") return "4:30";
  return "3:20";
}

// ─── Lead Vocal AI Brief (NVIDIA) ─────────────────────────────────────────────

const LEAD_VOCAL_SYSTEM_PROMPT = `You are AfroMuse Vocal Intelligence — an elite AI vocal director and session engineer specialising in Afro-inspired music (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion).

You receive a vocal session configuration and return a detailed lead vocal session brief as structured JSON.
Your output shapes the performance, recording, and processing direction for a real studio session.

Rules:
- Write like a top-tier vocal producer handing notes to a session vocalist and recording engineer
- Be specific to genre, energy, and emotional context — never generic
- Every note must be actionable in a real recording session
- ALWAYS return valid JSON only — no markdown, no explanation, no code fences`;

function buildLeadVocalPrompt(p: LeadVocalPayload): string {
  const gender = p.gender ?? "male";
  const feel = p.performanceFeel ?? "Smooth";
  const style = p.vocalStyle ?? "Melodic";
  const tone = p.emotionalTone ?? "Uplifting";
  const buildMode = p.buildMode ?? "full";
  const genre = p.genre ?? "Afrobeats";
  const bpm = p.bpm ?? 98;
  const key = p.key ?? "F# minor";
  const dialectDepth = p.dialectDepth ?? "Medium";
  const voiceTexture = p.voiceTexture ?? "Warm";
  const singingStyle = p.singingStyle ?? "Afrobeat";
  const songMood = p.songMood ?? tone;
  const artistRef = p.artistReference ? `Artist Reference / Voice Clone Target: ${p.artistReference}` : "No artist reference provided";
  const keeperBlock = p.keeperLines
    ? `KEEPER LINES (preserve exact phrasing):\n${p.keeperLines}`
    : "No keeper lines specified — apply creative phrasing throughout.";
  const hasUrl = p.instrumentalUrl
    ? `Instrumental track provided at: ${p.instrumentalUrl}`
    : "No instrumental URL provided — use genre/BPM/key context";
  const lyricsBlock = p.lyrics
    ? `LYRICS PROVIDED:\n${p.lyrics.slice(0, 2000)}`
    : "No lyrics provided — give general vocal direction for this configuration.";

  return `Generate a complete voice engine session brief for this vocal configuration:

VOICE PERSONALIZATION:
  Gender / Voice Type: ${gender}
  Performance Feel: ${feel}
  Vocal Style: ${style}
  Dialect Depth / Accent: ${dialectDepth}
  Voice Texture: ${voiceTexture}
  Singing Style: ${singingStyle}
  Song Mood / Energy: ${songMood}
  ${artistRef}

TRACK CONTEXT:
  Genre: ${genre}
  BPM: ${bpm}
  Key: ${key}
  ${hasUrl}
  Build Mode: ${buildMode === "full" ? "Full Session (all sections)" : "Vocal Demo (hook + one verse)"}

${keeperBlock}

${lyricsBlock}

INSTRUCTIONS:
- Introduce natural variations in vibrato, breath, timing and emphasis for a human-like sound
- Respect dialect depth (${dialectDepth}) — ${dialectDepth === "Deep" ? "lean heavily into regional Afro dialect patterns" : dialectDepth === "Medium" ? "blend standard English with Afro dialect phrases" : "keep light Afro flavour with mostly standard English"}
- Voice texture (${voiceTexture}) shapes the processing and tone notes
- Adjust vocal dynamics and timing to complement the backing track
- Ensure keeper lines are phrased exactly as given
- Ad-libs should match ${songMood} mood and ${singingStyle} style

Return ONLY this JSON object with no markdown, no code fences, no extra text:
{
  "vocalBrief": "One compelling headline brief (max 25 words) describing this vocal session's identity and direction — specific to genre, feel, and texture",
  "phrasingGuide": "Detailed phrasing, breathing and flow notes mapped to song sections (Intro → Verse → Hook → Bridge → Outro), respecting dialect depth and keeper lines. 4-6 sentences.",
  "emotionalArc": "How the emotional delivery should evolve from the opening line to the final bar, matching the ${songMood} mood and ${voiceTexture} texture. 3-4 sentences.",
  "syncNotes": "Specific guidance on how vocals sit in time with the instrumental — pocket feel, anticipation vs on-beat landing, ad-lib placement, backing awareness. 3 sentences.",
  "performanceDirection": "Studio performance coaching — posture, mic distance, where to lean in, dialect cues, and energy control for ${singingStyle} style. 4 sentences.",
  "deliveryStyle": "Precise description of the vocal colour, texture (${voiceTexture}), and delivery approach — tone, vibrato use, consonant sharpness, breath moments. 2-3 sentences.",
  "vocalProcessingNotes": "Recommended processing chain tuned to ${voiceTexture} texture — auto-tune level, pitch correction style, compression, reverb depth, delay use, harmonic doubling. 3-4 sentences.",
  "adLibSuggestions": ["Short ad-lib phrase 1 matching mood", "Short ad-lib phrase 2", "Short ad-lib phrase 3", "Short ad-lib phrase 4"],
  "voiceMetadata": {
    "gender": "${gender}",
    "performanceFeel": "${feel}",
    "voiceTexture": "${voiceTexture}",
    "accentDepth": "${dialectDepth}",
    "singingStyle": "${singingStyle}",
    "songMood": "${songMood}",
    "keeperLines": "${p.keeperLines?.replace(/"/g, "'") ?? ""}",
    "artistReference": "${p.artistReference?.replace(/"/g, "'") ?? ""}"
  }
}`;
}

async function fetchLeadVocalBrief(p: LeadVocalPayload): Promise<Partial<SessionBlueprintData> | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.warn("NVIDIA_API_KEY not set — skipping lead vocal AI brief");
    return null;
  }

  const ai = new OpenAI({ apiKey, baseURL: "https://integrate.api.nvidia.com/v1" });
  const res = await ai.chat.completions.create({
    model: "qwen/qwen3.5-122b-a10b",
    messages: [
      { role: "system", content: LEAD_VOCAL_SYSTEM_PROMPT },
      { role: "user", content: buildLeadVocalPrompt(p) },
    ],
    temperature: 0.72,
    max_tokens: 1400,
  });

  const raw = res.choices[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON in lead vocal brief response");

  return JSON.parse(cleaned.slice(start, end + 1)) as Partial<SessionBlueprintData>;
}

// ─── Provider Entry Points ────────────────────────────────────────────────────

export async function runVocalDemo(jobId: string, p: VocalDemoPayload): Promise<NormalizedResponse> {
  // Simulate async processing time (mirrors original behaviour)
  await new Promise<void>((r) => setTimeout(r, 4000 + Math.random() * 3000));

  const genre = p.genre ?? "Afrobeats";
  const mood = p.mood ?? "Uplifting";
  const chordVibe = p.productionNotes?.chordVibe ?? "";

  const blueprintData: Partial<SessionBlueprintData> = {
    vocalStyle: getVocalStyle(mood),
    bpm: p.bpm ?? parseBpm(chordVibe, genre),
    key: p.key ?? parseKey(chordVibe, mood),
    duration: getDuration(p.songLength),
    genre,
    mood,
    hitmakerMode: p.hitmakerMode ?? false,
    audioType: "Vocal Demo",
  };

  // Build raw response → adapter normalises.
  // When a real vocal synthesis API is connected, replace this block.
  const raw: RawVocalResponse = {
    jobId,
    status: "completed",
    audioUrl: null,           // slot: real vocal demo audio URL
    wavUrl: null,             // slot: WAV download URL
    blueprintData,
    externalJobId: null,      // slot: synthesis provider job ID
    vocalPreviewUrl: null,    // slot: short preview clip URL
    syncScore: null,          // slot: vocal-to-beat sync quality score
  };

  return adaptVocal(raw);
}

export async function runLeadVocal(jobId: string, p: LeadVocalPayload): Promise<NormalizedResponse> {
  const genre = p.genre ?? "Afrobeats";
  const chordVibe = "";

  const metadata: Partial<SessionBlueprintData> = {
    vocalStyle: `${p.performanceFeel ?? "Smooth"} / ${p.vocalStyle ?? "Melodic"}`,
    bpm: p.bpm ?? parseBpm(chordVibe, genre),
    key: p.key ?? parseKey(chordVibe, p.emotionalTone ?? "Uplifting"),
    duration: getDuration(undefined),
    genre,
    mood: p.emotionalTone ?? "Uplifting",
    hitmakerMode: false,
    audioType: "Vocal Demo",
    voiceMetadata: {
      gender: p.gender ?? "male",
      performanceFeel: p.performanceFeel ?? "Smooth",
      voiceTexture: p.voiceTexture ?? "Warm",
      accentDepth: p.dialectDepth ?? "Medium",
      singingStyle: p.singingStyle ?? "Afrobeat",
      songMood: p.songMood ?? p.emotionalTone ?? "Uplifting",
      keeperLines: p.keeperLines ?? "",
      artistReference: p.artistReference ?? "",
    },
  };

  let aiBrief: Partial<SessionBlueprintData> | null = null;
  try {
    aiBrief = await fetchLeadVocalBrief(p);
  } catch (err) {
    logger.warn({ err, jobId }, "Lead vocal AI brief failed — using metadata only");
  }

  const blueprintData: Partial<SessionBlueprintData> = { ...metadata, ...(aiBrief ?? {}) };

  // Build raw response → adapter normalises.
  // When a real lead vocal API is connected, replace this block.
  const raw: RawVocalResponse = {
    jobId,
    status: "completed",
    audioUrl: null,           // slot: full lead vocal audio URL
    wavUrl: null,             // slot: WAV download URL
    blueprintData,
    externalJobId: null,      // slot: synthesis provider job ID
    vocalPreviewUrl: null,    // slot: preview clip URL
    syncScore: null,          // slot: vocal-to-beat sync quality score
  };

  return adaptVocal(raw);
}
