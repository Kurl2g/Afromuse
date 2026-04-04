import { Router } from "express";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "processing" | "completed" | "failed";
type AudioJobType = "instrumental" | "vocal" | "lead-vocal" | "mix-master";

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

export interface LeadVocalSessionData {
  vocalBrief: string;
  phrasingGuide: string;
  emotionalArc: string;
  syncNotes: string;
  performanceDirection: string;
  deliveryStyle: string;
  vocalProcessingNotes: string;
}

export interface MixMasterSessionData {
  mixBrief: string;
  levelBalancing: string;
  eqNotes: string;
  compressionNotes: string;
  spatialEffects: string;
  masteringChain: string;
  outputNotes: string;
  stemsNotes: string | null;
}

interface AudioJob {
  id: string;
  type: AudioJobType;
  status: JobStatus;
  audioUrl: string | null;
  duration: string | null;
  metadata: InstrumentalMetadata | VocalMetadata | null;
  sessionData: AiSessionData | null;
  leadVocalSessionData: LeadVocalSessionData | null;
  mixMasterSessionData: MixMasterSessionData | null;
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
    leadVocalSessionData: null,
    mixMasterSessionData: null,
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

// ─── Lead Vocal Generator ────────────────────────────────────────────────────

interface LeadVocalPayload {
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
}

const LEAD_VOCAL_SYSTEM_PROMPT = `You are AfroMuse Vocal Intelligence — an elite AI vocal director and session engineer specialising in Afro-inspired music (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion).

You receive a vocal session configuration and return a detailed lead vocal session brief as structured JSON.
Your output shapes the performance, recording, and processing direction for a real studio session.

Rules:
- Write like a top-tier vocal producer handing notes to a session vocalist and recording engineer
- Be specific to genre, energy, and emotional context — never generic
- Every note must be actionable in a real recording session
- Phrasing, breathing, and sync notes must reference the actual lyric structure if provided
- ALWAYS return valid JSON only — no markdown, no explanation, no code fences`;

function buildLeadVocalPrompt(payload: LeadVocalPayload): string {
  const gender       = payload.gender       ?? "male";
  const feel         = payload.performanceFeel ?? "Smooth";
  const style        = payload.vocalStyle   ?? "Melodic";
  const tone         = payload.emotionalTone ?? "Uplifting";
  const buildMode    = payload.buildMode    ?? "full";
  const genre        = payload.genre        ?? "Afrobeats";
  const bpm          = payload.bpm          ?? 98;
  const key          = payload.key          ?? "F# minor";
  const hasUrl       = payload.instrumentalUrl ? `Instrumental track provided at: ${payload.instrumentalUrl}` : "No instrumental URL provided — use genre/BPM/key context";
  const lyricsBlock  = payload.lyrics
    ? `LYRICS PROVIDED:\n${payload.lyrics.slice(0, 2000)}`
    : "No lyrics provided — give general vocal direction for this configuration.";

  return `Generate a lead vocal session brief for this configuration:

VOCAL IDENTITY:
  Gender: ${gender}
  Performance Feel: ${feel}
  Vocal Style: ${style}
  Emotional Tone: ${tone}

TRACK CONTEXT:
  Genre: ${genre}
  BPM: ${bpm}
  Key: ${key}
  ${hasUrl}
  Build Mode: ${buildMode === "full" ? "Full Session (all sections)" : "Vocal Demo (hook + one verse)"}

${lyricsBlock}

Return ONLY this JSON object with no markdown, no code fences, no extra text:
{
  "vocalBrief": "One compelling headline brief (max 25 words) describing this vocal session's identity and direction — be specific to genre, feel, and tone",
  "phrasingGuide": "Detailed phrasing, breathing and flow notes mapped to song sections (Intro → Verse → Hook → Bridge → Outro). Mention specific breath placement, held notes, and rhythmic emphasis. 4-6 sentences.",
  "emotionalArc": "How the emotional delivery should evolve from the opening line to the final bar. Where to hold back and where to open up. 3-4 sentences.",
  "syncNotes": "Specific guidance on how vocals sit in time with the instrumental — pocket feel, anticipation vs on-beat landing, ad-lib placement relative to gaps in the groove. 3 sentences.",
  "performanceDirection": "Studio performance coaching — posture, mic distance, where to lean in, where to pull back, ad-lib timing, and energy control for this specific genre and feel. 4 sentences.",
  "deliveryStyle": "Precise description of the vocal colour, texture, and delivery approach for this session — tone of voice, vibrato use, consonant sharpness, vocal warmth. 2-3 sentences.",
  "vocalProcessingNotes": "Recommended processing chain — auto-tune level (natural/moderate/heavy), pitch correction style, compression attack/release direction, reverb depth, delay use, harmonic doubling notes. 3-4 sentences."
}`;
}

async function callNvidiaForLeadVocalBrief(payload: LeadVocalPayload): Promise<LeadVocalSessionData | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.warn("NVIDIA_API_KEY not set — skipping lead vocal AI brief generation");
    return null;
  }

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const response = await ai.chat.completions.create({
    model: "qwen/qwen3.5-122b-a10b",
    messages: [
      { role: "system", content: LEAD_VOCAL_SYSTEM_PROMPT },
      { role: "user",   content: buildLeadVocalPrompt(payload) },
    ],
    temperature: 0.72,
    max_tokens: 1400,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/gi, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd   = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in lead vocal model response");

  return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as LeadVocalSessionData;
}

async function runLeadVocalProvider(job: AudioJob, payload: LeadVocalPayload): Promise<void> {
  const genre = payload.genre ?? "Afrobeats";
  const chordVibe = "";

  try {
    const leadVocalSessionData = await callNvidiaForLeadVocalBrief(payload);
    job.leadVocalSessionData = leadVocalSessionData;
  } catch (err) {
    logger.warn({ err, jobId: job.id }, "Lead vocal AI brief failed — continuing with metadata only");
  }

  job.status   = "completed";
  job.audioUrl = null;
  job.duration = getDuration(undefined);
  job.metadata = {
    vocalStyle:   `${payload.performanceFeel ?? "Smooth"} / ${payload.vocalStyle ?? "Melodic"}`,
    bpm:          payload.bpm ?? parseBpm(chordVibe, genre),
    key:          payload.key ?? parseKey(chordVibe, payload.emotionalTone ?? "Uplifting"),
    duration:     job.duration,
    genre,
    mood:         payload.emotionalTone ?? "Uplifting",
    hitmakerMode: false,
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

router.post("/generate-lead-vocals", (req, res) => {
  const payload = req.body as LeadVocalPayload;
  const job = createJob("lead-vocal");

  runLeadVocalProvider(job, payload).catch((err) => {
    job.status = "failed";
    job.error  = "Lead vocal generation failed";
    logger.error({ err, jobId: job.id }, "Lead vocal provider error");
  });

  logger.info({ jobId: job.id, gender: payload.gender, feel: payload.performanceFeel }, "Lead vocal job created");
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
      jobId:                  job.id,
      status:                 "completed",
      audioUrl:               job.audioUrl,
      duration:               job.duration,
      metadata:               job.metadata,
      sessionData:            job.sessionData,
      leadVocalSessionData:   job.leadVocalSessionData,
      mixMasterSessionData:   job.mixMasterSessionData,
    });
    return;
  }

  if (job.status === "failed") {
    res.json({ jobId: job.id, status: "failed", error: job.error ?? "Unknown error" });
    return;
  }

  res.json({ jobId: job.id, status: "processing" });
});

// ─── Mix & Master ─────────────────────────────────────────────────────────────

interface MixMasterPayload {
  instrumentalUrl?: string;
  vocalUrl?: string;
  mixFeel?: string;
  genre?: string;
  bpm?: number;
  key?: string;
  includeStems?: boolean;
}

const MIX_MASTER_SYSTEM_PROMPT = `You are AfroMuse Mix Intelligence — an elite AI mix engineer and mastering specialist with deep expertise in Afro-inspired music (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion).

You receive a session configuration and return a detailed mix and master brief as structured JSON.
Your output provides studio-grade guidance for mixing levels, EQ, compression, spatial effects, and mastering chain decisions that translate directly to a professional, commercially-ready stereo master.

Return ONLY a raw JSON object — no markdown fences, no commentary — with these exact keys:
{
  "mixBrief": "Concise single-sentence headline summary of the mix vision and final sound character",
  "levelBalancing": "Detailed level and gain-staging instructions: kick/bass relationship, vocal vs instrumental balance, bus gain structure, headroom targets",
  "eqNotes": "Frequency-specific EQ guidance: low-end cleanup (sub/bass), low-mid mud reduction, midrange presence, high-end air and clarity, genre-specific considerations",
  "compressionNotes": "Compression settings per element: attack/release characteristics, ratio recommendations, parallel compression use, bus compression approach, dynamic feel target",
  "spatialEffects": "Reverb, delay, and stereo width guidance: room sizes, pre-delay, stereo spread per element, centre-vs-sides balance, mono-compatibility check",
  "masteringChain": "Mastering chain walkthrough: limiting ceiling, LUFS target for genre and platform, multiband approach, final EQ shaping, stereo enhancement, brick-wall limiter settings",
  "outputNotes": "Final output specs: recommended MP3 (320kbps) and WAV (24-bit/48kHz) export settings, metadata tagging notes, platform-specific loudness considerations",
  "stemsNotes": "Stems export guidance (only if requested): recommended stem groupings, format, naming convention, and levels for DAW re-import"
}`;

function buildMixMasterPrompt(p: MixMasterPayload): string {
  const parts: string[] = [];
  if (p.genre)           parts.push(`Genre: ${p.genre}`);
  if (p.bpm)             parts.push(`BPM: ${p.bpm}`);
  if (p.key)             parts.push(`Key: ${p.key}`);
  if (p.mixFeel)         parts.push(`Mix Feel / Vibe: ${p.mixFeel}`);
  if (p.instrumentalUrl) parts.push(`Instrumental Track URL: ${p.instrumentalUrl}`);
  if (p.vocalUrl)        parts.push(`Vocal Track URL: ${p.vocalUrl}`);
  else                   parts.push("Session Type: Instrumental-only mix (no separate vocal track)");
  parts.push(`Include Stems Export Guidance: ${p.includeStems ? "Yes" : "No"}`);

  return `Mix & Master session configuration:\n${parts.join("\n")}\n\nGenerate a complete, professional mix and master brief for this session. Be specific, technical, and actionable — this brief will be handed directly to a mix engineer.`;
}

async function callNvidiaForMixMasterBrief(payload: MixMasterPayload): Promise<MixMasterSessionData | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "qwen/qwen3.5-122b-a10b",
      messages: [
        { role: "system", content: MIX_MASTER_SYSTEM_PROMPT },
        { role: "user",   content: buildMixMasterPrompt(payload) },
      ],
      temperature: 0.55,
      max_tokens: 1400,
    }),
  });

  if (!response.ok) {
    logger.warn({ status: response.status }, "NVIDIA mix master brief call failed");
    return null;
  }

  const json = await response.json() as { choices?: { message?: { content?: string } }[] };
  const raw = json?.choices?.[0]?.message?.content ?? "";
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;

  const data = JSON.parse(match[0]) as MixMasterSessionData;
  if (!payload.includeStems) data.stemsNotes = null;
  return data;
}

async function runMixMasterProvider(job: AudioJob, payload: MixMasterPayload): Promise<void> {
  try {
    const mixMasterSessionData = await callNvidiaForMixMasterBrief(payload);
    job.mixMasterSessionData = mixMasterSessionData;
  } catch (err) {
    logger.warn({ err, jobId: job.id }, "Mix master AI brief failed — continuing with metadata only");
  }

  job.status = "completed";
}

router.post("/mix-master", async (req, res) => {
  const payload = req.body as MixMasterPayload;
  const job = createJob("mix-master");

  runMixMasterProvider(job, payload).catch((err) => {
    logger.error({ err, jobId: job.id }, "Mix master provider error");
    job.status = "failed";
    job.error = "Mix master generation failed";
  });

  logger.info({ jobId: job.id, feel: payload.mixFeel, genre: payload.genre }, "Mix master job created");
  res.json({ success: true, jobId: job.id, status: "processing" });
});

export default router;
