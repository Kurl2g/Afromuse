import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface ProductionNotes {
  chordVibe?: string;
  melodyDirection?: string;
  arrangement?: string;
}

router.post("/api/generate-instrumental-preview", async (req, res) => {
  try {
    const {
      genre,
      mood,
      songLength,
      hitmakerMode,
      productionNotes,
    } = req.body as {
      genre?: string;
      mood?: string;
      songLength?: string;
      hitmakerMode?: boolean;
      productionNotes?: ProductionNotes;
    };

    const chordVibe = productionNotes?.chordVibe ?? "";
    const bpm = parseBpm(chordVibe, genre ?? "Afrobeats");
    const key = parseKey(chordVibe, mood ?? "Uplifting");
    const energy = getEnergy(mood ?? "Uplifting");
    const duration = getDuration(songLength);

    await sleep(3000 + Math.random() * 2000);

    logger.info({ genre, mood, bpm, key }, "Instrumental preview generated");

    res.json({
      status: "ready",
      audioUrl: null,
      metadata: {
        genre: genre ?? "Afrobeats",
        mood: mood ?? "Uplifting",
        bpm,
        key,
        energy,
        duration,
        hitmakerMode: hitmakerMode ?? false,
        hookRepeatLevel: req.body.hookRepeatLevel ?? "Medium",
        audioType: "Instrumental Preview",
      },
    });
  } catch (err) {
    logger.error({ err }, "Instrumental preview error");
    res.status(500).json({ error: "Failed to generate instrumental preview" });
  }
});

router.post("/api/generate-vocal-demo", async (req, res) => {
  try {
    const {
      genre,
      mood,
      songLength,
      hitmakerMode,
      productionNotes,
    } = req.body as {
      genre?: string;
      mood?: string;
      songLength?: string;
      hitmakerMode?: boolean;
      productionNotes?: ProductionNotes;
    };

    const chordVibe = productionNotes?.chordVibe ?? "";
    const bpm = parseBpm(chordVibe, genre ?? "Afrobeats");
    const key = parseKey(chordVibe, mood ?? "Uplifting");
    const duration = getDuration(songLength);

    const vocalStyle =
      mood === "Romantic" ? "Smooth / Intimate"
      : mood === "Energetic" ? "Punchy / Assertive"
      : mood === "Sad" ? "Soulful / Breathy"
      : mood === "Spiritual" ? "Rich / Devotional"
      : mood === "Confident" ? "Confident / Sharp"
      : "Warm / Melodic";

    await sleep(4000 + Math.random() * 3000);

    logger.info({ genre, mood, bpm, key, vocalStyle }, "Vocal demo generated");

    res.json({
      status: "ready",
      audioUrl: null,
      metadata: {
        vocalStyle,
        bpm,
        key,
        duration,
        genre: genre ?? "Afrobeats",
        mood: mood ?? "Uplifting",
        hitmakerMode: hitmakerMode ?? false,
        audioType: "Vocal Demo",
      },
    });
  } catch (err) {
    logger.error({ err }, "Vocal demo error");
    res.status(500).json({ error: "Failed to generate vocal demo" });
  }
});

export default router;
