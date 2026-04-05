/**
 * AfroMuse V2 Project Library Context
 *
 * Provides CRUD operations and state for the local session library.
 * All operations are kept behind this context so swapping to a real
 * backend later requires changes only here.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SongDraft } from "@/lib/songGenerator";
import type { OutputRegistryEntry } from "@/lib/engine/outputRegistry";
import {
  type SavedSession,
  type SaveSessionParams,
  loadSessions,
  saveSession,
  deleteSessionById,
  duplicateSessionById,
} from "@/lib/projectLibrary";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface ProjectLibraryContextValue {
  sessions: SavedSession[];

  /** Save (or update) the current session. Returns the persisted session. */
  saveCurrentSession: (params: SaveSessionParams) => SavedSession;

  /** Remove a session by ID. */
  deleteSession: (sessionId: string) => void;

  /** Clone a session with a new ID. Returns the clone. */
  duplicateSession: (sessionId: string) => SavedSession | null;

  /** Refresh sessions from storage (call after external mutations). */
  refresh: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ProjectLibraryContext = createContext<ProjectLibraryContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProjectLibraryProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SavedSession[]>(() => loadSessions());

  const refresh = useCallback(() => {
    setSessions(loadSessions());
  }, []);

  const saveCurrentSession = useCallback((params: SaveSessionParams): SavedSession => {
    const saved = saveSession(params);
    setSessions(loadSessions());
    return saved;
  }, []);

  const deleteSession = useCallback((sessionId: string) => {
    const updated = deleteSessionById(sessionId);
    setSessions(updated);
  }, []);

  const duplicateSession = useCallback((sessionId: string): SavedSession | null => {
    const clone = duplicateSessionById(sessionId);
    if (clone) setSessions(loadSessions());
    return clone;
  }, []);

  return (
    <ProjectLibraryContext.Provider
      value={{ sessions, saveCurrentSession, deleteSession, duplicateSession, refresh }}
    >
      {children}
    </ProjectLibraryContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProjectLibrary() {
  const ctx = useContext(ProjectLibraryContext);
  if (!ctx) throw new Error("useProjectLibrary must be used inside ProjectLibraryProvider");
  return ctx;
}

// ─── Resume Helper Type ───────────────────────────────────────────────────────

/** All state that Studio.tsx needs to restore when resuming a session. */
export interface ResumedSessionState {
  topic: string;
  genre: string;
  mood: string;
  songLength: string;
  lyricsSource: string;
  languageFlavor: string;
  customFlavor: string;
  style: string;
  notes: string;
  commercialMode: boolean;
  lyricalDepth: string;
  hookRepeat: string;
  genderVoiceModel: string;
  performanceFeel: string;
  draft: SongDraft | null;
  outputRegistry: Partial<OutputRegistryEntry> | null;
  sessionId: string;
  sessionTitle: string;
}

export function extractResumeState(session: SavedSession): ResumedSessionState {
  return {
    topic: session.topic,
    genre: session.genre,
    mood: session.mood,
    songLength: session.songLength,
    lyricsSource: session.lyricsSource,
    languageFlavor: session.languageFlavor,
    customFlavor: session.customFlavor,
    style: session.style,
    notes: session.notes,
    commercialMode: session.commercialMode,
    lyricalDepth: session.lyricalDepth,
    hookRepeat: session.hookRepeat,
    genderVoiceModel: session.genderVoiceModel,
    performanceFeel: session.performanceFeel,
    draft: session.draft,
    outputRegistry: session.outputRegistry,
    sessionId: session.sessionId,
    sessionTitle: session.sessionTitle,
  };
}
