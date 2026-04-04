/**
 * AfroMuse Provider Registry
 *
 * Lightweight abstraction layer so future audio engines (instrumental beat-gen,
 * vocal synthesis, mastering APIs, stem splitters) can be plugged in here
 * without touching routes or UI code.
 *
 * To connect a real provider:
 *  1. Update isLive to true in its config entry.
 *  2. Replace the mock logic inside the corresponding provider module.
 *  3. Nothing else changes.
 */

import type { ProviderCategory } from "../types.js";

export interface ProviderConfig {
  category: ProviderCategory;
  name: string;
  description: string;
  /** false = AI-brief / mock mode.  true = live audio API is connected. */
  isLive: boolean;
}

const REGISTRY: Record<ProviderCategory, ProviderConfig> = {
  instrumental: {
    category: "instrumental",
    name: "AfroMuse Instrumental Engine",
    description:
      "Generates AI session briefs for instrumental tracks. " +
      "Slot: real beat-generation API (e.g. Udio, Suno, Stability Audio).",
    isLive: false,
  },
  vocal: {
    category: "vocal",
    name: "AfroMuse Vocal Engine",
    description:
      "Generates vocal session briefs and demo guidance. " +
      "Slot: real vocal synthesis API (e.g. ElevenLabs, Musicfy).",
    isLive: false,
  },
  mastering: {
    category: "mastering",
    name: "AfroMuse Mix & Master Engine",
    description:
      "Generates professional mix and mastering briefs. " +
      "Slot: real mastering API (e.g. LANDR, CloudBounce, iZotope).",
    isLive: false,
  },
  stems: {
    category: "stems",
    name: "AfroMuse Stem Engine",
    description:
      "Generates stem extraction briefs. " +
      "Slot: real stem-splitter API (e.g. Demucs, Spleeter, iZotope RX).",
    isLive: false,
  },
};

export function getProvider(category: ProviderCategory): ProviderConfig {
  return REGISTRY[category];
}

export function listProviders(): ProviderConfig[] {
  return Object.values(REGISTRY);
}
