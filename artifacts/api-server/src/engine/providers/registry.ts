/**
 * AfroMuse Provider Registry
 *
 * The central catalogue of every provider AfroMuse knows about.
 * Each entry declares its category, display name, description,
 * operational status, and a live-activation flag.
 *
 * To connect a real provider:
 *  1. Set status to "live-ready" and isLive to true in its entry.
 *  2. Replace the mock logic inside the corresponding provider module.
 *  3. Update its capability profile in engine/capabilities.ts if needed.
 *  4. Nothing in routes or the UI changes.
 */

import type { ProviderCategory, ProviderStatus } from "../types.js";
import { getCapabilities } from "../capabilities.js";

// ─── Provider Config ──────────────────────────────────────────────────────────

export interface ProviderConfig {
  category: ProviderCategory;
  name: string;
  description: string;
  /**
   * Operational status of this provider slot.
   *   mock        — AI brief / mock audio (current default for all providers)
   *   live-ready  — real API integrated and ready (set isLive = true to activate)
   *   unavailable — provider is temporarily down or rate-limited
   *   disabled    — intentionally off; jobs will not be dispatched
   */
  status: ProviderStatus;
  /** Convenience shorthand — true when status === "live-ready". */
  isLive: boolean;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

const REGISTRY: Record<ProviderCategory, ProviderConfig> = {
  instrumental: {
    category: "instrumental",
    name: "AfroMuse Instrumental Engine",
    description:
      "Generates AI session briefs for instrumental tracks. " +
      "Slot: real beat-generation API (e.g. Udio, Suno, Stability Audio).",
    status: "mock",
    isLive: false,
  },
  vocal: {
    category: "vocal",
    name: "AfroMuse Vocal Engine",
    description:
      "Generates vocal session briefs and demo guidance. " +
      "Slot: real vocal synthesis API (e.g. ElevenLabs, Musicfy).",
    status: "mock",
    isLive: false,
  },
  mastering: {
    category: "mastering",
    name: "AfroMuse Mix & Master Engine",
    description:
      "Generates professional mix and mastering briefs. " +
      "Slot: real mastering API (e.g. LANDR, CloudBounce, iZotope).",
    status: "mock",
    isLive: false,
  },
  stems: {
    category: "stems",
    name: "AfroMuse Stem Engine",
    description:
      "Generates stem extraction briefs. " +
      "Slot: real stem-splitter API (e.g. Demucs, Spleeter, iZotope RX).",
    status: "mock",
    isLive: false,
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getProvider(category: ProviderCategory): ProviderConfig {
  return REGISTRY[category];
}

export function listProviders(): Array<ProviderConfig & { capabilities: ReturnType<typeof getCapabilities> }> {
  return Object.values(REGISTRY).map((config) => ({
    ...config,
    capabilities: getCapabilities(config.category),
  }));
}

/**
 * Returns true only if the provider slot has a live API connected and
 * is not in an unavailable or disabled state.
 */
export function isProviderActive(category: ProviderCategory): boolean {
  const cfg = REGISTRY[category];
  return cfg.isLive && cfg.status === "live-ready";
}
