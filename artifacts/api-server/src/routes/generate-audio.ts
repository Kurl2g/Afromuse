import { Router } from "express";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "processing" | "completed" | "failed";
type AudioJobType = "instrumental" | "vocal";

export interface InstrumentalMetadata {
  genre: string;
  mood: string;
  bpm: number;
  key: string;
  energy: string;
  duration: string;
  hitmakerMode: boolean;
  hookRepeatLevel: string;
  audioType: "Instrumental Preview";
}

export interface VocalMetadata {
  vocalStyle: string;
  bpm: number;
  key: string;
  duration: string;
  genre: string;
  mood: string;
  hitmakerMode: boolean;
  audioType: "Vocal Demo";
}

export interface AiSessionData {
  beatSummary: string;
  arrangementMap: string;
  producerNotes: string;
  hookFocus: string;
  arrangementStyle: string;
  sonicIdentity: {
    coreBounce: string;
    atmosphere: string;
    mainTexture: string;
  };
  sessionBrief: string;
}

interface AudioJob {
  id: string;
  type: AudioJobType;
  status: JobStatus;
  audioUrl: string | null;
  duration: string | null;
  metadata: InstrumentalMetadata | VocalMetadata | null;
  sessionData: AiSessionData | null;
  error: string | null;
  createdAt: number;
}

interface ProductionNotes {
  chordVibe?: string;
  melodyDirection?: string;
  arrangement?: string;
}

interface InstrumentalPayload {
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
  productionNotes?: ProductionNotes;
  introBehavior?: string;
  chorusLift?: string;
  drumDensity?: string;
  bassWeight?: string;
  transitionStyle?: string;
  outroStyle?: string;
}

interface VocalPayload {
  title?: string;
  genre?: string;
  mood?: string;
  bpm?: number;
  key?: string;
  songLength?: string;
  hitmakerMode?: boolean;
  lyrics?: {
    hook?: string[];
    verse1?: string[];
    chorus?: string[];
  };
  keeperLine?: string;
  melodyDirection?: string;
  productionNotes?: ProductionNotes;
}

// ─── In-memory job store ───────────────────────────────────────────────────────

const JOB_TTL_MS = 30 * 60 * 1000;
const jobs = new Map<string, AudioJob>();

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }
}, 5 * 60 * 1000).unref();

function createJob(type: AudioJobType): AudioJob {
  const job: AudioJob = {
    id: randomUUID(),
    type,
    status: "processing",
    audioUrl: null,
    duration: null,
    metadata: null,
    sessionData: null,
    error: null,
    createdAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

// ─── Music analysis helpers ───────────────────────────────────────────────────

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
  const majorM = chordVibe?.match(/\b([A-G][b#]?)\s*(?:maj(?:or)?)?[-\u2013\s,]/);
  if (minorM) return `${minorM[1]} Minor`;
  if (majorM) return `${majorM[1]} Major`;
  const byMood: Record<string, string> = {
    Sad: "D Minor", Uplifting: "G Major", Romantic: "A\u266d Major",
    Energetic: "E Minor", Spiritual: "F Major", Confident: "B\u266d Major",
  };
  return byMood[mood] ?? "F\u266f Minor";
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

function getVocalStyle(mood: string): string {
  const map: Record<string, string> = {
    Romantic: "Smooth / Intimate", Energetic: "Punchy / Assertive",
    Sad: "Soulful / Breathy", Spiritual: "Rich / Devotional", Confident: "Confident / Sharp",
  };
  return map[mood] ?? "Warm / Melodic";
}

// ─── NVIDIA AI session brief generator ───────────────────────────────────────

const INSTRUMENTAL_SYSTEM_PROMPT = `You are AfroMuse Audio Intelligence — a specialist AI producer brain for Afro-inspired music genres (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion).

You receive a session configuration and return a detailed instrumental session brief as structured JSON.
Your output shapes the sonic direction for real studio sessions and beat builds.

Rules:
- Write like a top-tier record producer, not a text generator
- Be genre-specific, culturally grounded, and musically precise
- Every description must be actionable in a real studio session
- ALWAYS return valid JSON only — no markdown, no explanation, no code fences`;

function buildInstrumentalPrompt(payload: InstrumentalPayload): string {
  const genre = payload.genre ?? "Afrobeats";
  const mood = payload.mood ?? "Uplifting";
  const energy = payload.energy ?? "Medium";
  const bpm = payload.bpm ?? 96;
  const key = payload.key ?? "F# Minor";
  const style = payload.soundReference ?? payload.styleReference ?? "";
  const mixFeel = payload.mixFeel ?? "Balanced";
  const introBehavior = payload.introBehavior ?? "Build up";
  const chorusLift = payload.chorusLift ?? "Gradual swell";
  const drumDensity = payload.drumDensity ?? "Mid";
  const bassWeight = payload.bassWeight ?? "Punchy sub";

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

async function callNvidiaForSessionBrief(payload: InstrumentalPayload): Promise<AiSessionData | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.warn("NVIDIA_API_KEY not set — skipping AI session brief generation");
    return null;
  }

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const response = await ai.chat.completions.create({
    model: "qwen/qwen3.5-122b-a10b",
    messages: [
      { role: "system", content: INSTRUMENTAL_SYSTEM_PROMPT },
      { role: "user",   content: buildInstrumentalPrompt(payload) },
    ],
    temperature: 0.75,
    max_tokens: 1200,
  });

  const raw = response.choices[0]?.message?.content ?? "";

  // Strip any thinking tags or markdown fences the model may emit
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd   = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in model response");

  const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as AiSessionData;
  return parsed;
}

// ─── Provider functions ───────────────────────────────────────────────────────

async function runInstrumentalProvider(job: AudioJob, payload: InstrumentalPayload): Promise<void> {
  const genre = payload.genre ?? "Afrobeats";
  const mood  = payload.mood ?? "Uplifting";
  const chordVibe = payload.productionNotes?.chordVibe ?? "";

  try {
    const sessionData = await callNvidiaForSessionBrief(payload);
    job.sessionData = sessionData;
  } catch (err) {
    logger.warn({ err, jobId: job.id }, "AI session brief failed — continuing with metadata only");
  }

  job.status   = "completed";
  job.audioUrl = null;
  job.duration = getDuration(payload.songLength);
  job.metadata = {
    genre,
    mood,
    bpm:            payload.bpm ?? parseBpm(chordVibe, genre),
    key:            payload.key ?? parseKey(chordVibe, mood),
    energy:         payload.energy ?? getEnergy(mood),
    duration:       job.duration,
    hitmakerMode:   payload.hitmakerMode ?? false,
    hookRepeatLevel: payload.hookRepeatLevel ?? "Medium",
    audioType:      "Instrumental Preview",
  } satisfies InstrumentalMetadata;
}

async function runVocalProvider(job: AudioJob, payload: VocalPayload): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 4000 + Math.random() * 3000));

  const genre = payload.genre ?? "Afrobeats";
  const mood  = payload.mood ?? "Uplifting";
  const chordVibe = payload.productionNotes?.chordVibe ?? "";

  job.status   = "completed";
  job.audioUrl = null;
  job.duration = getDuration(payload.songLength);
  job.metadata = {
    vocalStyle:   getVocalStyle(mood),
    bpm:          payload.bpm ?? parseBpm(chordVibe, genre),
    key:          payload.key ?? parseKey(chordVibe, mood),
    duration:     job.duration,
    genre,
    mood,
    hitmakerMode: payload.hitmakerMode ?? false,
    audioType:    "Vocal Demo",
  } satisfies VocalMetadata;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/generate-instrumental-preview", (req, res) => {
  const payload = req.body as InstrumentalPayload;
  const job = createJob("instrumental");

  runInstrumentalProvider(job, payload).catch((err) => {
    job.status = "failed";
    job.error  = "Instrumental generation failed";
    logger.error({ err, jobId: job.id }, "Instrumental provider error");
  });

  logger.info({ jobId: job.id, genre: payload.genre, mood: payload.mood }, "Instrumental job created");
  res.json({ success: true, jobId: job.id, status: "processing" });
});

router.post("/generate-vocal-demo", (req, res) => {
  const payload = req.body as VocalPayload;
  const job = createJob("vocal");

  runVocalProvider(job, payload).catch((err) => {
    job.status = "failed";
    job.error  = "Vocal generation failed";
    logger.error({ err, jobId: job.id }, "Vocal provider error");
  });

  logger.info({ jobId: job.id, genre: payload.genre, mood: payload.mood }, "Vocal job created");
  res.json({ success: true, jobId: job.id, status: "processing" });
});

router.get("/audio-job/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);

  if (!job) {
    res.status(404).json({ error: "Job not found or expired" });
    return;
  }

  if (job.status === "completed") {
    res.json({
      jobId:       job.id,
      status:      "completed",
      audioUrl:    job.audioUrl,
      duration:    job.duration,
      metadata:    job.metadata,
      sessionData: job.sessionData,
    });
    return;
  }

  if (job.status === "failed") {
    res.json({ jobId: job.id, status: "failed", error: job.error ?? "Unknown error" });
    return;
  }

  res.json({ jobId: job.id, status: "processing" });
});

export default router;
