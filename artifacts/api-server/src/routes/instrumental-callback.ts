/**
 * instrumental-callback.ts
 *
 * POST /api/instrumental/callback
 *
 * Publicly accessible webhook called by AI Music API when a generation
 * job completes. No auth required — results are keyed by task_id which
 * only the server knows. Unknown task_ids are silently accepted (200) to
 * avoid leaking information about which tasks are pending.
 *
 * Expected body from AI Music API:
 * {
 *   "code": 200,
 *   "data": [
 *     {
 *       "task_id":   "abc123",
 *       "audio_url": "https://...",
 *       "image_url": "https://...",
 *       "title":     "My Song"
 *     }
 *   ]
 * }
 */

import { Router } from "express";
import { logger } from "../lib/logger.js";
import { deliverCallback } from "../engine/callbackStore.js";

const router = Router();

router.post("/instrumental/callback", (req, res) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = req.body as Record<string, any>;

    const entries: unknown[] = Array.isArray(body?.data)
      ? body.data
      : body?.data
        ? [body.data]
        : [];

    let delivered = 0;

    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = entry as Record<string, any>;
      const taskId   = String(e.task_id   ?? e.workId ?? "");
      const audioUrl = String(e.audio_url ?? e.audioUrl ?? "");

      if (!taskId || !audioUrl) continue;

      const delivered_ = deliverCallback(taskId, {
        audioUrl,
        imageUrl:   e.image_url ?? e.imageUrl ?? null,
        title:      e.title     ?? null,
        receivedAt: Date.now(),
      });

      logger.info({ taskId, audioUrl: audioUrl.slice(0, 80), delivered: delivered_ },
        "AI Music API callback received");
      delivered++;
    }

    res.status(200).json({ ok: true, delivered });
  } catch (err) {
    logger.error({ err }, "AI Music API callback handler threw");
    res.status(200).json({ ok: true, delivered: 0 });
  }
});

export default router;
