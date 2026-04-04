import { Router } from "express";
import { randomUUID } from "crypto";
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

interface AudioJob {
  id: string;
  type: AudioJobType;
  status: JobStatus;
  audioUrl: string | null;
  duration: string | null;
  metadata: InstrumentalMetadata | VocalMetadata | null;
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
  hitmakerMode?: boolean;
  lyricalDepth?: string;
  hookRepeatLevel?: string;
  soundReference?: string;
  productionNotes?: ProductionNotes;
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

// Prune expired jobs every 5 minutes
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
    Afrobeats: 98,
    Afropop: 104,
    Amapiano: 112,
    Dancehall: 90,
    "R&B": 75,
    "Afro-fusion": 96,
    "Street Anthem": 100,
    Spiritual: 72,
  };
  return defaults[genre] ?? 96;
}

function parseKey(chordVibe: string, mood: string): string {
  const minorM = chordVibe?.match(/\b([A-G][b#]?)m\b/);
  const majorM = chordVibe?.match(/\b([A-G][b#]?)\s*(?:maj(?:or)?)?[-\u2013\s,]/);
  if (minorM) return `${minorM[1]} Minor`;
  if (majorM) return `${majorM[1]} Major`;
  const byMood: Record<string, string> = {
    Sad: "D Minor",
    Uplifting: "G Major",
    Romantic: "A\u266d Major",
    Energetic: "E Minor",
    Spiritual: "F Major",
    Confident: "B\u266d Major",
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
    Romantic: "Smooth / Intimate",
    Energetic: "Punchy / Assertive",
    Sad: "Soulful / Breathy",
    Spiritual: "Rich / Devotional",
    Confident: "Confident / Sharp",
  };
  return map[mood] ?? "Warm / Melodic";
}

// ─── Provider interface ───────────────────────────────────────────────────────
// Swap these functions for a real audio engine (e.g. Suno, Udio, Stability Audio)
// without touching any frontend code. The job store and polling route remain unchanged.

async function runInstrumentalProvider(job: AudioJob, payload: InstrumentalPayload): Promise<void> {
  // TODO: Replace setTimeout with real audio engine API call.
  // When the engine returns, set job.audioUrl to the real MP3/stream URL.
  await new Promise<void>((resolve) => setTimeout(resolve, 3000 + Math.random() * 2000));

  const genre = payload.genre ?? "Afrobeats";
  const mood = payload.mood ?? "Uplifting";
  const chordVibe = payload.productionNotes?.chordVibe ?? "";

  job.status = "completed";
  job.audioUrl = null; // Replace with real URL from audio engine
  job.duration = getDuration(payload.songLength);
  job.metadata = {
    genre,
    mood,
    bpm: payload.bpm ?? parseBpm(chordVibe, genre),
    key: payload.key ?? parseKey(chordVibe, mood),
    energy: getEnergy(mood),
    duration: job.duration,
    hitmakerMode: payload.hitmakerMode ?? false,
    hookRepeatLevel: payload.hookRepeatLevel ?? "Medium",
    audioType: "Instrumental Preview",
  } satisfies InstrumentalMetadata;
}

async function runVocalProvider(job: AudioJob, payload: VocalPayload): Promise<void> {
  // TODO: Replace setTimeout with real audio engine API call.
  await new Promise<void>((resolve) => setTimeout(resolve, 4000 + Math.random() * 3000));

  const genre = payload.genre ?? "Afrobeats";
  const mood = payload.mood ?? "Uplifting";
  const chordVibe = payload.productionNotes?.chordVibe ?? "";

  job.status = "completed";
  job.audioUrl = null; // Replace with real URL from audio engine
  job.duration = getDuration(payload.songLength);
  job.metadata = {
    vocalStyle: getVocalStyle(mood),
    bpm: payload.bpm ?? parseBpm(chordVibe, genre),
    key: payload.key ?? parseKey(chordVibe, mood),
    duration: job.duration,
    genre,
    mood,
    hitmakerMode: payload.hitmakerMode ?? false,
    audioType: "Vocal Demo",
  } satisfies VocalMetadata;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/generate-instrumental-preview", (req, res) => {
  const payload = req.body as InstrumentalPayload;
  const job = createJob("instrumental");

  runInstrumentalProvider(job, payload).catch((err) => {
    job.status = "failed";
    job.error = "Instrumental generation failed";
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
    job.error = "Vocal generation failed";
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
      jobId: job.id,
      status: "completed",
      audioUrl: job.audioUrl,
      duration: job.duration,
      metadata: job.metadata,
    });
    return;
  }

  if (job.status === "failed") {
    res.json({
      jobId: job.id,
      status: "failed",
      error: job.error ?? "Unknown error",
    });
    return;
  }

  res.json({ jobId: job.id, status: "processing" });
});

export default router;
