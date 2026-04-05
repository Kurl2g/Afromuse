/**
 * AfroMuse V2 Project Library
 *
 * Local-first session persistence layer. Architecture is designed so every
 * load / save call can be swapped for a real backend call without touching
 * the UI layer — just replace the localStorage stubs below with fetch calls.
 */

import type { SongDraft } from "./songGenerator";
import type { OutputRegistryEntry } from "./engine/outputRegistry";

// ─── Session Status ───────────────────────────────────────────────────────────

export type SessionStatus =
  | "Draft"
  | "In Progress"
  | "Beat Ready"
  | "Live Audio Ready"
  | "Vocal Ready"
  | "Export Ready";

// ─── Saved Session Model ──────────────────────────────────────────────────────

export interface SavedSession {
  sessionId: string;
  sessionTitle: string;

  // Song form state
  topic: string;
  genre: string;
  mood: string;
  songLength: string;
  lyricsSource: string;
  lyricsText: string; // raw paste-lyrics if used
  languageFlavor: string;
  customFlavor: string;
  style: string;
  notes: string;
  commercialMode: boolean;
  lyricalDepth: string;
  hookRepeat: string;
  genderVoiceModel: string;
  performanceFeel: string;

  // Metadata derived from draft
  bpm: string | null;
  key: string | null;
  energy: string | null;
  atmosphere: string | null;
  leadVoice: string | null;
  mixFeel: string | null;

  // Beat DNA
  bounceStyle?: string;
  melodyDensity?: string;
  drumCharacter?: string;
  hookLift?: string;

  // Stage tracking
  buildMode: "artist" | "producer" | null;
  currentStage: SessionStatus;
  exportStatus: "none" | "partial" | "ready";

  // Content
  draft: SongDraft | null;
  outputRegistry: Partial<OutputRegistryEntry> | null;

  // Timestamps
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

// ─── Status Intelligence ──────────────────────────────────────────────────────

export function deriveSessionStatus(
  draft: SongDraft | null,
  outputRegistry: Partial<OutputRegistryEntry> | null,
): SessionStatus {
  if (!draft) return "Draft";

  const reg = outputRegistry ?? {};

  if (reg.masteredMp3 || reg.masteredWav) return "Export Ready";
  if (reg.vocalPreview || reg.vocalBrief) return "Vocal Ready";

  // Distinguish real generated audio from AI session blueprint output.
  // A live ElevenLabs result is stored as a data: URL in instrumentalPreview.
  if (
    typeof reg.instrumentalPreview === "string" &&
    reg.instrumentalPreview.startsWith("data:audio/")
  ) {
    return "Live Audio Ready";
  }
  if (reg.sessionBrief || reg.producerNotes || reg.beatSummary || reg.instrumentalPreview) {
    return "Beat Ready";
  }

  if (reg.arrangementMap || reg.mixBrief || reg.extractionBrief) return "In Progress";

  return "Draft";
}

export function deriveExportStatus(
  outputRegistry: Partial<OutputRegistryEntry> | null,
): SavedSession["exportStatus"] {
  const reg = outputRegistry ?? {};
  if (reg.masteredMp3 || reg.masteredWav || reg.stemsZip) return "ready";
  if (reg.instrumentalPreview || reg.vocalPreview) return "partial";
  return "none";
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "afromuse_v2_project_library";
const MAX_SESSIONS = 50;

function generateId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSession[];
  } catch {
    return [];
  }
}

function persistSessions(sessions: SavedSession[]): void {
  try {
    // Keep only the most recent MAX_SESSIONS
    const trimmed = sessions.slice(0, MAX_SESSIONS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // Storage quota exceeded — silently fail
  }
}

// ─── CRUD Operations ──────────────────────────────────────────────────────────

export interface SaveSessionParams {
  sessionId?: string; // Provide to update existing
  sessionTitle?: string;
  topic: string;
  genre: string;
  mood: string;
  songLength: string;
  lyricsSource: string;
  lyricsText?: string;
  languageFlavor: string;
  customFlavor?: string;
  style?: string;
  notes?: string;
  commercialMode?: boolean;
  lyricalDepth?: string;
  hookRepeat?: string;
  genderVoiceModel?: string;
  performanceFeel?: string;
  buildMode?: "artist" | "producer" | null;
  mixFeel?: string;
  bounceStyle?: string;
  melodyDensity?: string;
  drumCharacter?: string;
  hookLift?: string;
  draft: SongDraft | null;
  outputRegistry?: Partial<OutputRegistryEntry> | null;
}

/**
 * Save (create or update) a session. Returns the saved session.
 */
export function saveSession(params: SaveSessionParams): SavedSession {
  const sessions = loadSessions();
  const now = new Date().toISOString();

  const draft = params.draft;
  const outputRegistry = params.outputRegistry ?? null;

  const session: SavedSession = {
    sessionId: params.sessionId ?? generateId(),
    sessionTitle:
      params.sessionTitle ??
      draft?.title ??
      (params.topic
        ? `${params.topic.slice(0, 32)} — ${params.genre}`
        : `Untitled · ${params.genre}`),

    topic: params.topic,
    genre: params.genre,
    mood: params.mood,
    songLength: params.songLength,
    lyricsSource: params.lyricsSource,
    lyricsText: params.lyricsText ?? "",
    languageFlavor: params.languageFlavor,
    customFlavor: params.customFlavor ?? "",
    style: params.style ?? "",
    notes: params.notes ?? "",
    commercialMode: params.commercialMode ?? false,
    lyricalDepth: params.lyricalDepth ?? "Balanced",
    hookRepeat: params.hookRepeat ?? "Medium",
    genderVoiceModel: params.genderVoiceModel ?? "Random",
    performanceFeel: params.performanceFeel ?? "Smooth",

    bpm: draft?.productionNotes?.bpm ?? null,
    key: draft?.productionNotes?.key ?? null,
    energy: draft?.productionNotes?.energy ?? null,
    atmosphere: draft?.sonicIdentity?.atmosphere ?? null,
    leadVoice: draft?.vocalIdentity?.leadType ?? null,
    mixFeel: params.mixFeel ?? null,

    bounceStyle: params.bounceStyle,
    melodyDensity: params.melodyDensity,
    drumCharacter: params.drumCharacter,
    hookLift: params.hookLift,

    buildMode: params.buildMode ?? null,
    currentStage: deriveSessionStatus(draft, outputRegistry),
    exportStatus: deriveExportStatus(outputRegistry),

    draft,
    outputRegistry,

    createdAt: now,
    updatedAt: now,
  };

  const existingIdx = sessions.findIndex((s) => s.sessionId === session.sessionId);
  if (existingIdx !== -1) {
    // Preserve original createdAt on update
    session.createdAt = sessions[existingIdx].createdAt;
    sessions[existingIdx] = session;
  } else {
    sessions.unshift(session); // newest first
  }

  persistSessions(sessions);
  return session;
}

/**
 * Delete a session by ID.
 */
export function deleteSessionById(sessionId: string): SavedSession[] {
  const sessions = loadSessions().filter((s) => s.sessionId !== sessionId);
  persistSessions(sessions);
  return sessions;
}

/**
 * Duplicate a session — creates a new sessionId and prepends "Copy of" to the title.
 */
export function duplicateSessionById(sessionId: string): SavedSession | null {
  const sessions = loadSessions();
  const original = sessions.find((s) => s.sessionId === sessionId);
  if (!original) return null;

  const now = new Date().toISOString();
  const clone: SavedSession = {
    ...original,
    sessionId: generateId(),
    sessionTitle: `Copy of ${original.sessionTitle}`,
    createdAt: now,
    updatedAt: now,
  };

  sessions.unshift(clone);
  persistSessions(sessions);
  return clone;
}

/**
 * Update just the outputRegistry for an existing session (called after audio engine completes).
 */
export function updateSessionOutputRegistry(
  sessionId: string,
  outputRegistry: Partial<OutputRegistryEntry>,
): void {
  const sessions = loadSessions();
  const idx = sessions.findIndex((s) => s.sessionId === sessionId);
  if (idx === -1) return;

  const session = sessions[idx];
  const merged = { ...(session.outputRegistry ?? {}), ...outputRegistry };
  sessions[idx] = {
    ...session,
    outputRegistry: merged,
    currentStage: deriveSessionStatus(session.draft, merged),
    exportStatus: deriveExportStatus(merged),
    updatedAt: new Date().toISOString(),
  };

  persistSessions(sessions);
}

// ─── Formatting Helpers ───────────────────────────────────────────────────────

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
