/**
 * AfroMuse External Engine Connector — Core Types
 *
 * These types form the internal contract between the generation engine and
 * the routes/UI layer. Swapping a provider only requires changing the provider
 * module — nothing in routes or the frontend needs to change.
 */

// ─── Provider Categories ──────────────────────────────────────────────────────

export type ProviderCategory =
  | "instrumental"
  | "vocal"
  | "mastering"
  | "stems";

// ─── Job Lifecycle ────────────────────────────────────────────────────────────

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export type AudioJobType =
  | "instrumental"
  | "vocal"
  | "lead-vocal"
  | "mix-master"
  | "stem-extraction";

// ─── Engine Job ───────────────────────────────────────────────────────────────

export interface EngineJob {
  jobId: string;
  provider: ProviderCategory;
  type: AudioJobType;
  status: JobStatus;
  createdAt: number;
  response: NormalizedResponse | null;
}

// ─── Normalized Response ──────────────────────────────────────────────────────
// All providers return this shape — the UI and output registry never see raw
// provider-specific payloads.

export interface NormalizedResponse {
  status: JobStatus;
  jobId: string;
  provider: ProviderCategory;
  audioUrl: string | null;
  wavUrl: string | null;
  stemsUrl: string | null;
  blueprintData: SessionBlueprintData | null;
  notes: string | null;
  error: ProviderError | null;
  outputRegistry: OutputRegistryMap;
}

// ─── Provider Error ───────────────────────────────────────────────────────────

export type ProviderFailureReason =
  | "missing_response"
  | "failed_generation"
  | "unsupported_mode"
  | "timeout"
  | "unknown";

export interface ProviderError {
  reason: ProviderFailureReason;
  message: string;
}

// ─── Session Blueprint Data ───────────────────────────────────────────────────
// Unified shape covering all AI session brief types. Fields are optional because
// each provider only populates the subset relevant to its category.

export interface SessionBlueprintData {
  // Shared metadata
  bpm?: number;
  key?: string;
  genre?: string;
  mood?: string;
  energy?: string;
  duration?: string;
  audioType?: string;
  hitmakerMode?: boolean;
  hookRepeatLevel?: string;
  vocalStyle?: string;

  // Instrumental brief fields
  beatSummary?: string;
  arrangementMap?: string;
  producerNotes?: string;
  hookFocus?: string;
  arrangementStyle?: string;
  sonicIdentity?: {
    coreBounce: string;
    atmosphere: string;
    mainTexture: string;
  };
  sessionBrief?: string;

  // Vocal / Lead Vocal brief fields
  vocalBrief?: string;
  phrasingGuide?: string;
  emotionalArc?: string;
  syncNotes?: string;
  performanceDirection?: string;
  deliveryStyle?: string;
  vocalProcessingNotes?: string;

  // Mix & Master brief fields
  mixBrief?: string;
  levelBalancing?: string;
  eqNotes?: string;
  compressionNotes?: string;
  spatialEffects?: string;
  masteringChain?: string;
  outputNotes?: string;
  stemsNotes?: string | null;

  // Stem Extraction brief fields
  extractionBrief?: string;
  stems?: Array<{
    name: string;
    extractionNotes: string;
    gainLevel: string;
    fileSpec: string;
  }>;
  phaseAlignmentNotes?: string;
  dawImportGuide?: string;
  recommendedTool?: string;
}

// ─── Output Registry Map ──────────────────────────────────────────────────────
// The canonical output surface that the UI and downstream consumers read from.
// URLs are null until a real audio provider is connected.

export interface OutputRegistryMap {
  instrumentalPreview: string | null;
  vocalPreview: string | null;
  arrangementBlueprint: string | null;
  masteredMp3: string | null;
  masteredWav: string | null;
  stemsZip: string | null;
}
