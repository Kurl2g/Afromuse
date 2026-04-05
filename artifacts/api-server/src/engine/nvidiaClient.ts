/**
 * AfroMuse NVIDIA Client Utility
 *
 * Single point for creating NVIDIA API clients and resolving model names.
 *
 * Key routing:
 *   deepseek-ai/* models → NVIDIA_DEEPSEEK_API_KEY (falls back to NVIDIA_API_KEY)
 *   all other models     → NVIDIA_API_KEY
 *
 * Model name env vars → confirmed-working fallbacks:
 *   GENERATE_INSTRUMENTAL_MODEL → qwen/qwen2.5-72b-instruct
 *   VOCAL_DEMO_MODEL            → qwen/qwen2.5-72b-instruct
 *   VOCAL_DIRECTION_MODEL       → qwen/qwen2.5-72b-instruct
 *   MASTERING_NOTES_MODEL       → qwen/qwen2.5-72b-instruct
 *   STEM_EXTRACTION             → qwen/qwen2.5-72b-instruct
 *   REASONING_MODEL             → deepseek-ai/deepseek-r1
 *   SONGWRITINGMODEL            → qwen/qwen2.5-72b-instruct
 *   LYRICS_MODEL                → qwen/qwen2.5-72b-instruct
 *   ARRANGEMENT_MODEL           → qwen/qwen2.5-72b-instruct
 */

import OpenAI from "openai";

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";

// ─── Default (confirmed-working) model fallbacks ───────────────────────────

const MODEL_DEFAULTS: Record<string, string> = {
  GENERATE_INSTRUMENTAL_MODEL: "meta/llama-3.3-70b-instruct",
  VOCAL_DEMO_MODEL:            "meta/llama-3.3-70b-instruct",
  VOCAL_DIRECTION_MODEL:       "meta/llama-3.3-70b-instruct",
  MASTERING_NOTES_MODEL:       "meta/llama-3.3-70b-instruct",
  STEM_EXTRACTION:             "meta/llama-3.3-70b-instruct",
  REASONING_MODEL:             "deepseek-ai/deepseek-r1-distill-qwen-32b",
  SONGWRITINGMODEL:            "qwen/qwen3.5-122b-a10b",
  GENERATE_MASTER_MIX:         "meta/llama-3.3-70b-instruct",
  LYRICS_MODEL:                "qwen/qwen3.5-122b-a10b",
  ARRANGEMENT_MODEL:           "qwen/qwen3.5-122b-a10b",
  SECTION_INTELEGENCE_MODEL:   "meta/llama-3.3-70b-instruct",
};

/**
 * Resolve a model name from an env var key, with a fallback.
 * Trims whitespace to handle any stray spaces in secret values.
 */
export function resolveModel(envKey: string): string {
  const raw = process.env[envKey];
  const trimmed = raw?.trim();
  if (trimmed) return trimmed;
  return MODEL_DEFAULTS[envKey] ?? "qwen/qwen2.5-72b-instruct";
}

/**
 * Return an OpenAI-compatible client pointed at NVIDIA NIM.
 * Automatically selects the correct API key based on the model name:
 *   - DeepSeek models use NVIDIA_DEEPSEEK_API_KEY
 *   - All other models use NVIDIA_API_KEY
 *
 * Returns null if no API key is available for the selected model.
 */
export function getNvidiaClient(model: string): OpenAI | null {
  const isDeepSeek = model.startsWith("deepseek-ai/");
  const apiKey = isDeepSeek
    ? (process.env.NVIDIA_DEEPSEEK_API_KEY || process.env.NVIDIA_API_KEY)
    : process.env.NVIDIA_API_KEY;

  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL: NVIDIA_BASE_URL });
}

/**
 * Convenience: resolve model + get its client in one call.
 * Returns null client if the key for this model is not set.
 */
export function resolveModelAndClient(
  envKey: string,
): { model: string; client: OpenAI | null } {
  const model = resolveModel(envKey);
  const client = getNvidiaClient(model);
  return { model, client };
}
