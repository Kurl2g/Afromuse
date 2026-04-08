/**
 * AfroMuse Provider Credential Slots
 *
 * Clean configuration placeholders for future live provider API credentials.
 * Each provider category has a dedicated slot with all the fields a real
 * integration would need: apiKey, endpoint, model, region, timeout.
 *
 * Rules:
 *   - Do NOT add real secrets here. Use environment variables (process.env).
 *   - All fields default to null — they are inert until a real provider is connected.
 *   - When activating a live provider, set the corresponding env vars and
 *     update the registry status to "live-ready" (isLive: true).
 *
 * Env variable naming convention per provider:
 *   <CATEGORY>_API_KEY, <CATEGORY>_API_ENDPOINT, <CATEGORY>_MODEL,
 *   <CATEGORY>_REGION, <CATEGORY>_TIMEOUT_MS
 *
 * Example (instrumental live provider):
 *   INSTRUMENTAL_API_KEY=sk-...
 *   INSTRUMENTAL_API_ENDPOINT=https://api.udio.com/v1/generate
 *   INSTRUMENTAL_MODEL=udio-v2
 *   INSTRUMENTAL_REGION=us-east-1
 *   INSTRUMENTAL_TIMEOUT_MS=45000
 */

import type { ProviderCategory } from "./types.js";

// ─── Credential Slot Shape ────────────────────────────────────────────────────

export interface ProviderCredentialSlot {
  /** Primary authentication key for the live provider API. */
  apiKey: string | null;
  /** Base URL / endpoint for the live provider API. */
  endpoint: string | null;
  /** Model or variant identifier to use (e.g. "udio-v2", "eleven_multilingual_v2"). */
  model: string | null;
  /** Cloud region for the provider, if applicable. */
  region: string | null;
  /** Request timeout in milliseconds. */
  timeoutMs: number;
}

// ─── Credential Slots Registry ────────────────────────────────────────────────

const CREDENTIAL_SLOTS: Record<ProviderCategory, ProviderCredentialSlot> = {
  /**
   * Instrumental / Beat Generation — ElevenLabs Music API
   * Primary key: ELEVENLABS_API_KEY
   * Fallback key: INSTRUMENTAL_API_KEY (legacy slot)
   * Endpoint defaults to the ElevenLabs Music compose endpoint so that
   * isCredentialReady() returns true as soon as ELEVENLABS_API_KEY is set.
   */
  instrumental: {
    apiKey:    process.env.ELEVENLABS_API_KEY ?? process.env.AI_MUSIC_API_KEY ?? process.env.INSTRUMENTAL_API_KEY ?? null,
    endpoint:  process.env.INSTRUMENTAL_API_ENDPOINT ?? process.env.AI_MUSIC_API_BASE ?? "https://api.elevenlabs.io/v1/music/compose",
    model:     process.env.INSTRUMENTAL_MODEL ?? null,
    region:    process.env.INSTRUMENTAL_REGION ?? null,
    timeoutMs: Number(process.env.INSTRUMENTAL_TIMEOUT_MS ?? 90_000),
  },

  /**
   * Vocal Synthesis — ElevenLabs Instant Voice Clone + TTS
   *
   * Live path uses two ElevenLabs endpoints:
   *   1. POST /v1/voices/add          — Instant Voice Clone (upload user's audio sample)
   *   2. POST /v1/text-to-speech/{id} — TTS with the cloned voice
   *   3. DELETE /v1/voices/{id}        — Cleanup after generation
   *
   * Required env var:
   *   ELEVENLABS_API_KEY — same key used by the instrumental provider
   *
   * Optional overrides:
   *   VOCAL_API_KEY      — alternative key slot (falls back to ELEVENLABS_API_KEY)
   *   VOCAL_API_ENDPOINT — override base URL (defaults to ElevenLabs API)
   *   VOCAL_MODEL        — TTS model override (defaults to eleven_multilingual_v2)
   *   VOCAL_TIMEOUT_MS   — request timeout in ms (defaults to 90 000)
   */
  vocal: {
    apiKey:    process.env.VOCAL_API_KEY ?? process.env.ELEVENLABS_API_KEY ?? null,
    endpoint:  process.env.VOCAL_API_ENDPOINT ?? "https://api.elevenlabs.io/v1",
    model:     process.env.VOCAL_MODEL ?? "eleven_multilingual_v2",
    region:    process.env.VOCAL_REGION ?? null,
    timeoutMs: Number(process.env.VOCAL_TIMEOUT_MS ?? 90_000),
  },

  /**
   * Mix & Mastering
   * Candidate APIs: LANDR, CloudBounce, iZotope Ozone API, Matchering
   */
  mastering: {
    apiKey:    process.env.MASTERING_API_KEY    ?? null,
    endpoint:  process.env.MASTERING_API_ENDPOINT ?? null,
    model:     process.env.MASTERING_MODEL     ?? null,
    region:    process.env.MASTERING_REGION    ?? null,
    timeoutMs: Number(process.env.MASTERING_TIMEOUT_MS ?? 60_000),
  },

  /**
   * Stem Extraction / Separation
   * Candidate APIs: Demucs, Spleeter, iZotope RX, AudioShake
   */
  stems: {
    apiKey:    process.env.STEMS_API_KEY    ?? null,
    endpoint:  process.env.STEMS_API_ENDPOINT ?? null,
    model:     process.env.STEMS_MODEL     ?? null,
    region:    process.env.STEMS_REGION    ?? null,
    timeoutMs: Number(process.env.STEMS_TIMEOUT_MS ?? 120_000),
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the full credential slot for a provider category. */
export function getProviderCredentials(category: ProviderCategory): ProviderCredentialSlot {
  return CREDENTIAL_SLOTS[category];
}

/**
 * Returns true only if both apiKey and endpoint are populated for this provider.
 * Used by the resolver to gate live-mode activation.
 */
export function isCredentialReady(category: ProviderCategory): boolean {
  const slot = CREDENTIAL_SLOTS[category];
  return slot.apiKey !== null && slot.endpoint !== null;
}

/**
 * Returns a safe summary of credential readiness (no actual secret values).
 * Suitable for diagnostics and admin endpoints.
 */
export function getCredentialSummary(category: ProviderCategory): {
  apiKeySet: boolean;
  endpointSet: boolean;
  modelSet: boolean;
  regionSet: boolean;
  timeoutMs: number;
} {
  const slot = CREDENTIAL_SLOTS[category];
  return {
    apiKeySet:   slot.apiKey   !== null,
    endpointSet: slot.endpoint !== null,
    modelSet:    slot.model    !== null,
    regionSet:   slot.region   !== null,
    timeoutMs:   slot.timeoutMs,
  };
}
