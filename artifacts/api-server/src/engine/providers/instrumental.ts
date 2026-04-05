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

// ─── ElevenLabs Music API — Prompt Builder ────────────────────────────────────
// Translates AfroMuse session fields into a rich ElevenLabs music prompt.
// The prompt is the primary creative control surface for ElevenLabs generation.

function buildElevenLabsPrompt(p: InstrumentalPayload): string {
  const genre   = p.genre   ?? "Afrobeats";
  const mood    = p.mood    ?? "Uplifting";
  const bpm     = p.bpm     ?? 96;
  const key     = p.key     ?? "F# Minor";
  const energy  = p.energy  ?? "Medium";
  const parts: string[] = [genre];

  parts.push(`${mood.toLowerCase()} mood`);
  parts.push(`${bpm} BPM`);
  parts.push(`key of ${key}`);
  parts.push(`${energy.toLowerCase()} energy`);

  if (p.soundReference)                  parts.push(`inspired by ${p.soundReference}`);
  if (p.styleReference && p.styleReference !== p.soundReference)
                                          parts.push(p.styleReference);
  if (p.mixFeel)                          parts.push(`${p.mixFeel.toLowerCase()} mix feel`);
  if (p.drumDensity)                      parts.push(`${p.drumDensity.toLowerCase()} drum density`);
  if (p.bassWeight)                       parts.push(`${p.bassWeight.toLowerCase()} bass`);
  if (p.productionNotes?.chordVibe)       parts.push(p.productionNotes.chordVibe);
  if (p.productionNotes?.melodyDirection) parts.push(p.productionNotes.melodyDirection);
  if (p.productionNotes?.arrangement)     parts.push(p.productionNotes.arrangement);
  if (p.introBehavior)                    parts.push(`${p.introBehavior.toLowerCase()} intro`);
  if (p.chorusLift)                       parts.push(`${p.chorusLift.toLowerCase()} chorus lift`);

  return parts.join(", ") + ". Instrumental only, no vocals.";
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

  const prompt     = buildElevenLabsPrompt(p);
  const durationMs = resolveDurationMs(p.songLength);
  const endpoint   = creds.endpoint!; // always set — defaults in providerCredentials.ts

  logger.info({ jobId, prompt, durationMs }, "ElevenLabs Music API — requesting generation");

  const response = await fetch(endpoint, {
    method:  "POST",
    headers: {
      "xi-api-key":   creds.apiKey,
      "Content-Type": "application/json",
      "Accept":       "audio/mpeg, audio/*, */*",
    },
    body: JSON.stringify({
      prompt,
      duration_ms:       durationMs,
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

  return {
    previewUrl:      dataUrl,
    wavUrl:          null,
    externalJobId:   null,
    generationTitle: `${p.genre ?? "Afrobeats"} Instrumental — ${p.mood ?? "Uplifting"}`,
    sonicNotes:      `ElevenLabs Music — ${prompt.slice(0, 100)}`,
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
