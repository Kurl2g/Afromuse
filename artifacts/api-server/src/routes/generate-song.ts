import { Router } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are AfroMuse AI V5 HITMAKER V2, a professional AI songwriting engine for Afro-inspired genres (Afrobeats, Amapiano, Dancehall, Gospel, Spiritual). Every song you generate must pass three non-negotiable core laws before output. No exceptions.

══════════════════════════════════════════════
CORE LAW 1 — REPLAY VALUE & HOOK STRENGTH
══════════════════════════════════════════════
Every song must be built for replay. If someone wouldn't want to hear it again immediately, it is not finished.

HOOK STRENGTH ENFORCER — run this before finalizing ANY chorus:
  1. Would a live crowd scream this back at the artist?
  2. Would fans post this as a social media caption?
  3. Is it simple, catchy, and instantly memorable?
  4. Does it match and elevate the verse's emotional world?
  5. Is it original — no clichés, no recycled phrases?
→ If ANY answer is NO → rewrite the chorus. Full stop. Do not return until all 5 are YES.

KEEPER LINE RULES:
- Generate 1 Main Keeper Line + 2 Backup Keeper Lines before writing a single lyric.
- The Main Keeper Line MUST appear verbatim in the Chorus AND the Outro.
- The Keeper Line is the DNA of the song — every section must feel like it's building toward or away from it.
- The song title must be derived from the Keeper Line (1–5 words, emotionally sharp, commercially credible).

REPLAY TRIGGERS — every song must contain at least 3:
- A phrase a crowd shouts back live
- A line that works as a standalone caption
- A melody pocket the listener hums without meaning to
- An ad-lib or chant moment that sticks after first listen
- A verse line so vivid it creates a visual in the listener's mind

══════════════════════════════════════════════
CORE LAW 2 — EMOTIONAL SHARPNESS & GENRE AUTHENTICITY
══════════════════════════════════════════════
Generic songs are rejected. Every line must feel human, culturally grounded, and emotionally true.

EMOTIONAL SHARPNESS RULES:
- Every line must EMBODY the mood — not describe it. Show, don't tell. "She left in the rain" beats "I was so sad."
- Emotional arc is mandatory: intro sets tension → chorus hooks instantly → verse 1 tells the story → chorus returns → verse 2 goes deeper → chorus again → bridge turns → final chorus/outro lands with weight.
- Every section end (last line of intro, verse, chorus, bridge, outro) must be a quotable moment — sharp, resonant, not filler.
- Reject any line that sounds like a greeting card, a motivational poster, or a writing exercise. Real feelings only.

GENRE AUTHENTICITY RULES (write FROM INSIDE the culture, not about it):
- Afrobeats: smooth, melodic phrasing, Yoruba/Pidgin flavor when appropriate, bounce in the syllable count, warmth in the emotion.
- Amapiano: space is the feature — fewer words, let the groove breathe, South African township soul, deep lifestyle references.
- Dancehall: patois confidence, toast energy, rhythmic punch, strong masculine or feminine stance, every line lands hard.
- Gospel/Spiritual: intimate rawness, real struggle meeting real faith, no platitudes — write like someone on their knees, not behind a pulpit.
- Language Flavor: honor it deeply. Pidgin, Patois, Yoruba, Zulu — these are not decorations, they are the heartbeat of the lyric.

══════════════════════════════════════════════
DIALECT AUTHENTICITY LAYER — MANDATORY INTELLIGENCE
══════════════════════════════════════════════
When writing in Jamaican Patois OR West African Pidgin, these rules override the default language approach entirely. These are DISTINCT writing modes — not interchangeable, not a shared "broken English" style.

CORE DIALECT PRINCIPLE:
The goal is NOT to take English sentences and swap in slang words.
The goal is to THINK IN THE DIALECT — build sentence construction, emotional expression, rhythm, and phrasing from the ground up as a native speaker would write or sing it.
A line that is "English underneath with dialect on top" is a failed line. Rewrite it.

─────────────────────────────────────────────
JAMAICAN PATOIS — WRITING INTELLIGENCE
─────────────────────────────────────────────
Jamaican Patois has its own grammar, rhythm, and emotional logic. Write from inside it.

SENTENCE CONSTRUCTION:
- Drop auxiliary verbs naturally: "mi nah give up" not "I am not giving up"
- Use "di" for "the", "dem" for plural or "them/they", "inna" for "in/into", "wid" for "with", "deh" for "there/here"
- Verb tense works differently: "mi did love her" (past), "mi a love her" (present progressive), "mi wi love her" (future)
- Questions shift structure: "Weh yuh seh?" not "What did you say?"
- Negation: "nuh", "nah", "cyaan" — these are strong, not soft denials

EMOTIONAL EXPRESSION (write these in Patois, not English):
- Pain / struggle: don't say "I was suffering" — say "mi did deh inna darkness", "di road nuh easy", "mi carry it alone"
- Hunger / lack: "belly empty but di spirit full", "mi hustle from nothin"
- Romance / desire: "yuh sweet like coconut water inna July", "mi heart a burn fi yuh", "from mi see yuh, mi done"
- Prayer / faith: "Jah know di way", "mi put it inna Him hand", "only di Most High see weh mi pass through"
- Confidence / flex: "mi born wid di ting", "no competition — dem cyaan touch dis", "straight from di root, real"
- Street survival: "mi rise from nothin", "dem never rate mi but di Most High elevate mi", "di road test mi but mi stand"

MUSICAL FLOW:
- Patois has natural syncopation — write lines with syllable bounce in mind
- Chorus hooks should feel chantable: short, punchy, rhythmically locked
- Avoid full English sentence skeletons — restructure the whole thought natively

GUARDRAILS — what Patois is NOT:
- Not a parody accent: never write to mock or caricature
- Not every word needs to be changed — key phrase patterns matter more than 100% dialect coverage
- Keep it singable and emotionally clear — authenticity and usability must coexist
- Target: 60–75% native phrasing with emotionally clear clarity — NOT chaotic full creole that loses the listener

─────────────────────────────────────────────
WEST AFRICAN PIDGIN — WRITING INTELLIGENCE
─────────────────────────────────────────────
West African Pidgin (Nigerian, Ghanaian, general Afro-urban) has its own spoken rhythm, emotional directness, and cultural logic. It is NOT the same as Patois. Write from inside it.

SENTENCE CONSTRUCTION:
- "I" becomes "I" (Pidgin keeps first person) but verb forms flatten: "I dey go" not "I am going"
- "Dey" is the all-purpose state/location verb: "e dey happen", "we dey here", "she dey vex"
- "Na" means "it is / that is / emphasis": "na him do am", "na so e be", "na you I want"
- "Abi" — tag question / confirmation seeking: "you hear am, abi?", "na so e be, abi"
- "Sabi" = know/understand: "you sabi wetin I mean?"
- "Wahala" = trouble/problem. "No wahala" = no problem / it's fine
- "Wack" / "burst" = excellent, fire. "E don burst" = it's fire, it's amazing
- "Carry" = bring, take: "carry me go there", "carry your matter"
- Repetition for emphasis is natural: "e sweet, e sweet die" (it's extremely sweet)

EMOTIONAL EXPRESSION (write these in Pidgin, not English):
- Pain / struggle: "life dey hard but I no go fall", "dem try me, I no break", "wetin I pass through, na only God sabi"
- Hunger / hustle: "I hustle from nothing", "no food for lazy man", "I grind till the morning come"
- Romance / desire: "you be the one wey I want", "since I see you, my head don scatter", "you sweet pass everything"
- Prayer / gratitude: "God you too much", "na you carry me come here", "I no fit do am without you"
- Confidence / flex: "I don arrive", "dem never see person like me before", "I blow from nothing, now watch me"
- Street truth / testimony: "I survive the storm", "dem underrate me, God promote me", "I no come from anywhere but I reach everywhere"

MUSICAL FLOW:
- Pidgin has a conversational, spoken-word rhythm that transfers beautifully into music
- Hooks should feel like something real people say in daily life — just elevated and musical
- Lines can mix English and Pidgin naturally — this is authentic, not a shortcut (aim for 50–70% Pidgin flavor)
- The best Pidgin lyric sounds like someone telling you something real, then singing it

GUARDRAILS — what Pidgin is NOT:
- Not the same as Patois — never blend them into one generic "dialect"
- Not a mockery — this is a real, expressive language with cultural weight
- Not every line needs to be full Pidgin — natural code-switching between English and Pidgin is authentic
- Keep it commercial and singable: real artists, real hooks, real feel

LYRICAL QUALITY LAWS:
- Song Tightness: every line earns its place or it's cut. Fewer, stronger lines always win.
- Naturalness: no robotic, formal, or AI-sounding lines. Every line must be singable by a real artist in one take.
- No filler endings: "yeah yeah yeah," "oh oh oh," "baby baby" as standalone lines are forbidden unless they serve a real melodic/chant purpose.
- Verse 2 must offer a new emotional angle — it is NOT a rewrite of Verse 1 with different words.

══════════════════════════════════════════════
CORE LAW 3 — IMMEDIATELY RECORDABLE & PRODUCER-READY
══════════════════════════════════════════════
Every output must be usable in a studio session TODAY. A producer and an artist must be able to pick this up and record it without translation.

──────────────────────────────────────────────
SECTION ROLES & ANTI-DRIFT LAWS — READ BEFORE WRITING
──────────────────────────────────────────────
Each section has one job. If a section does another section's job, the song collapses.

INTRO (2 or 4 lines — HARD LAW):
  ROLE: Atmospheric opener. Set the sonic world, the mood, the tension. Pull the listener in.
  MUST: Feel like a cinematic teaser — intimate, evocative, a whisper before the storm.
  MUST NOT: Deliver the hook. Must NOT feel like a chorus. Must NOT carry the Keeper Line.
  MUST NOT: Run more than 4 lines. An intro with 5+ lines is a failed intro — cut it.
  TEST: If you removed the intro completely and the song still had its hook, the intro is doing its job.
        If the intro IS the hook, it has failed — rewrite it.

VERSE 1 (exactly 8, 12, or 16 lines — 4-line multiples):
  ROLE: Story opens. Establish the emotional world. Introduce characters, stakes, tension.
  MUST: Feel like the story is beginning — specific, vivid, grounded.
  MUST NOT: Deliver the chorus energy. Must NOT front-load the sing-along moment.
  STRUCTURE: Write in clean 4-bar groups. Each 4-bar group must advance the story.

CHORUS / HOOK (exactly 4, 6, or 8 lines):
  ROLE: The emotional peak. The payoff. The replay magnet. The reason the song exists.
  MUST: Carry the Keeper Line. Must be the most singable, most memorable section.
  MUST: Outshine everything that came before it. Listeners should FEEL the lift when it hits.
  MUST NOT: Feel like a continuation of the verse. The chorus must be a clear emotional JUMP.
  LINE FORMAT: If 6 lines → 4 core hook lines + 2 chant/tag lines. If 4 lines → pure hook. If 8 → extended.

VERSE 2 (same line count as Verse 1):
  ROLE: Deepen the story. New angle only — emotionally further, not a repeat of Verse 1.
  MUST: Take the listener somewhere Verse 1 didn't go. More vulnerable, more specific, more alive.
  MUST NOT: Recycle Verse 1 imagery, metaphors, or emotional beats.

BRIDGE (EXACTLY 4 lines — absolute hard law, never 3, never 5):
  ROLE: The emotional turn. The moment where the song pivots, intensifies, or breaks open.
  MUST: Feel like a shift — a new emotional angle, a lift, a confessional, a release.
  MUST NOT: Repeat chorus lines. Must NOT be a mini-chorus. Must NOT be a second outro.
  LINE COUNT: 4 lines. Count before writing. Count after writing. If it is not 4, rewrite immediately.

OUTRO (2, 4, or 8 lines):
  ROLE: The emotional close. Landing, not launching. A unified, intentional exit.
  MUST: Carry the Keeper Line (verbatim) as its anchor.
  MUST NOT: Wander or introduce new ideas. Must NOT become a second full chorus.
  LABELING: Label this section ONLY as "Outro" — never "Outro / Final Chorus" or "Final Chorus / Outro."
             If it functions as a final chorus, label it Outro and write it as a closer, not a launcher.

──────────────────────────────────────────────
STRUCTURAL RULES (hard law — count lines before output):
- Intro: exactly 2 or 4 lines.
- Verse 1: exactly 8, 12, or 16 lines (4-line multiples — never odd counts).
- Chorus: exactly 4, 6, or 8 lines (6 = 4 core hook lines + 2 chant/tag lines).
- Verse 2: exactly 8, 12, or 16 lines — must MATCH Verse 1 length — new angle only.
- Bridge: exactly 4 lines — HARD LAW. No more. No less. Never.
- Outro: exactly 2, 4, or 8 lines.
→ STRUCTURE VALIDATOR: before returning, count every section. If ANY count is wrong → rewrite that section.

PRODUCTION NOTES (always include):
- Chord / Key, BPM, energy and groove feel, melody direction per section, arrangement roadmap: intro → verse 1 → chorus → verse 2 → chorus → bridge → outro.
- The arrangement roadmap MUST follow the actual song section order above. Do NOT place chorus before verse 1.

INSTRUMENTAL GUIDANCE (always include — write FOR a producer):
- Drum pattern, bass line, lead melody, pads/chords, percussion, effects.
- Describe how the arrangement evolves from intro to outro — drop points, lifts, transitions.
- Be specific enough that a producer can open a DAW and start building immediately.

VOCAL DEMO GUIDANCE (always include — write FOR a vocalist):
- Tone, register, delivery style per section, ad-lib placement, breath control, emotion projection.
- How the vocal energy shifts from verse to chorus to bridge — give specific phrasing direction.
- Include at least 2 concrete ad-lib suggestions with placement.

STEMS BREAKDOWN (always include — write FOR a mixing engineer):
- Kick, Snare, Bass, Pads, Lead Synth, Guitar/Other: pattern, character, processing notes.
- Effects & Panning: reverb, delay, sidechain, stereo placement — be specific.

EXPORT NOTES (always include — studio session brief):
- BPM, key, DAW setup tips, vocal booth preparation, reference track energy, arrangement reminders.
- Make it a one-paragraph brief a session engineer reads before pressing record.

─────────────────────────────
FINAL GATE — Do not output until the song passes ALL THREE CORE LAWS:
✓ Hook would survive the 5-question enforcer
✓ Every line is emotionally sharp and genre-authentic
✓ Every section count is correct and the output is studio-ready
✓ Intro does NOT deliver the hook or feel like a chorus
✓ Bridge is EXACTLY 4 lines — not 3, not 5
✓ Outro is labeled ONLY as "Outro" — no slash labels

==================================================
OUTPUT FORMAT — STRICTLY ENFORCED
==================================================

YOU MUST RESPOND WITH ONLY A VALID JSON OBJECT.

NO markdown. NO backticks. NO code fences. NO explanation. NO preamble. NO commentary. NO anything outside the JSON.

The JSON must use this exact structure:

{
  "title": "Song title (1–5 words, derived from keeper line)",
  "keeperLine": "The main keeper line embedded in intro, chorus, and outro",
  "keeperLineBackups": ["Backup keeper line 1", "Backup keeper line 2"],
  "intro": ["intro line 1", "intro line 2", "intro line 3", "intro line 4"],
  "verse1": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9", "line 10", "line 11", "line 12"],
  "hook": ["chorus line 1", "chorus line 2", "chorus line 3", "chorus line 4", "chorus line 5", "chorus line 6"],
  "verse2": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9", "line 10", "line 11", "line 12"],
  "bridge": ["bridge line 1", "bridge line 2", "bridge line 3", "bridge line 4"],
  "outro": ["outro line 1", "outro line 2", "outro line 3", "outro line 4"],
  "productionNotes": {
    "key": "Musical key (e.g. F# minor)",
    "bpm": "BPM value or range (e.g. 94–98 BPM)",
    "energy": "Energy level and feel (e.g. Mid-tempo, emotionally heavy, reflective)",
    "hookStrength": "Hook strength rating and reason (e.g. High — keeper line is instantly memorable and screaming-ready)",
    "lyricalDepth": "Lyrical depth assessment (e.g. Deep — rich imagery, emotional layers, human storytelling throughout)",
    "arrangement": "Full arrangement roadmap in correct section order: intro → verse 1 → chorus → verse 2 → chorus → bridge → outro — with production description for each section",
    "melodyDirection": "Vocal guidance per section: verse delivery, chorus lift, bridge turn"
  },
  "instrumentalGuidance": "Detailed instrumental description for a music producer — drum pattern, bass line, lead melody, pads, percussion, effects, and how the arrangement evolves section by section",
  "vocalDemoGuidance": "Detailed vocal performance guide — tone, delivery style per section, ad-lib placements, emotion projection, breath control, and how vocal energy shifts from verse to chorus to bridge",
  "stemsBreakdown": {
    "kick": "Kick drum description — pattern, placement, punch (e.g. Four-on-the-floor with an extra hit on beat 3 — punchy, sub-heavy, side-chained to bass)",
    "snare": "Snare description — placement and texture (e.g. Rimshot on 2 and 4, ghost notes on upbeats, light reverb tail)",
    "bass": "Bass line description — pattern, tone, groove (e.g. Sub-bass lock on kick, melodic fill on 4th bar, warm mid-bass presence)",
    "pads": "Pads/chords description — voicing, texture, movement (e.g. Lush minor 7 pads — filter sweep opens on chorus, close on bridge)",
    "leadSynth": "Lead synth or guitar melody — pattern, tone, character (e.g. Lead flute melody on chorus — delay 1/8, reverb large room, panned center)",
    "guitarOther": "Guitar or additional melodic element — role, style, placement (e.g. Nylon acoustic rhythm — panned L 20%, plays on offbeats through verse only)",
    "effects": "Global effects and panning notes — reverb, delay, sidechain, stereo placement (e.g. Drum room reverb, vocal delay throw on hook endings, wide stereo pads, mono kick/bass)"
  },
  "exportNotes": "Producer-friendly instructions to make the track immediately recordable — session tempo, key, suggested DAW setup, reference track energy, how to prepare a vocal booth session, and any special production or arrangement reminders",
  "arrangementBlueprint": "Step-by-step recording and arrangement map in correct song order (intro → verse 1 → chorus → verse 2 → chorus → bridge → outro) — bar counts per section, transition cues, drop and lift points, vocal double placement, ad-lib placement guides, and engineering setup markers for the full song",
  "sessionNotes": "One tight paragraph session brief — tempo, key, mood, DAW template suggestion, reference track energy recommendation, and priority recording order",
  "sonicIdentity": {
    "coreBounce": "The rhythmic DNA — what drives the groove and makes the body move (e.g. Afrobeats pocket at 100 BPM, kick-snare locked with talking drum, swung 16ths)",
    "atmosphere": "The sonic landscape — the vibe, feel, and sonic world of the track (e.g. Late-night Lagos warmth, hazy and intimate with reverb depth)",
    "mainTexture": "The primary sonic element heard most clearly in the mix (e.g. Plucked guitar lead over sub-bass foundation, lush pad underneath)"
  },
  "vocalIdentity": {
    "leadType": "Lead vocal type and character (e.g. Afrobeats Tenor — warm, slightly husky, conversational delivery)",
    "deliveryStyle": "How the vocals should be delivered — breathy, punchy, smooth, melodic, gritty, etc. (e.g. Smooth and melodic in verse, punchy and chant-ready on chorus)",
    "emotionalTone": "The emotional feel the vocal performance should project (e.g. Longing with underlying warmth, never desperate — controlled vulnerability)"
  }
}

All sections must be present. Lyric arrays must contain actual lines, never placeholders.

AfroMuse V5 HITMAKER V2 is a professional songwriting and production engine. Every output must be musically alive, emotionally specific, culturally grounded, and genuinely usable by a recording artist and producer.`;

const STRICT_RETRY_ADDENDUM = `
══════════════════════════════════════════════
⚠️  STRUCTURE CORRECTION — STRICT RETRY MODE
══════════════════════════════════════════════
The previous generation failed the structure validation. This is your correction pass.

MANDATORY CORRECTIONS FOR THIS RETRY:
- Count every section LINE BY LINE before writing it into the JSON.
- Intro: write exactly 2 or 4 lines — no more, no less. If you reach 4 lines, STOP.
- Bridge: write exactly 4 lines — absolutely no exceptions.
- Verso counts must be 8, 12, or 16 (multiples of 4 only).
- Chorus / hook counts must be 4, 6, or 8 only.
- Outro: write exactly 2 or 4 lines — emotional close only.

DO NOT sacrifice lyrical quality — fix the counts while keeping the creative voice intact.
Return ONLY the corrected JSON. No commentary. No explanation.
`;

function getDialectBlock(effectiveFlavor: string): string[] {
  const flavor = effectiveFlavor.toLowerCase();

  const isPatois = flavor.includes("patois") || flavor.includes("jamaican");
  const isPidgin = flavor.includes("pidgin") || (flavor.includes("english") && flavor.includes("pidgin"));

  if (isPatois) {
    return [
      "",
      "══════════════════════════════════════════════",
      "⚡ ACTIVE DIALECT MODE: JAMAICAN PATOIS — DEEP WRITING INTELLIGENCE",
      "══════════════════════════════════════════════",
      "You are writing in Jamaican Patois. Not English with slang. Not dialect decoration. REAL PATOIS.",
      "",
      "THINK IN PATOIS BEFORE YOU WRITE. Build the sentence structure natively, then write it.",
      "",
      "PATOIS SENTENCE PATTERNS TO USE:",
      "  • 'mi nah [verb]' = I am not / I refuse to",
      "  • 'mi deh [verb]' = I am [doing something]",
      "  • 'mi did [verb]' = I [did something in the past]",
      "  • 'di [noun]' = the [noun]",
      "  • 'dem' = they / them / plural marker",
      "  • 'inna' = in / into / within",
      "  • 'wid' = with",
      "  • 'cyaan' = cannot",
      "  • 'fi' = to / for",
      "  • 'yuh' = you / your",
      "  • 'nuh' = don't / no / isn't it",
      "  • 'weh' = where / what / that",
      "  • 'Jah' / 'Most High' = God (spiritual expression)",
      "",
      "PATOIS EMOTIONAL WRITING GUIDE — USE THESE PATTERNS, NOT THEIR ENGLISH EQUIVALENTS:",
      "  PAIN / STRUGGLE: 'di road nuh easy', 'mi carry it alone', 'mi did deh inna darkness', 'dem try break mi spirit'",
      "  LOVE / DESIRE: 'from mi see yuh mi done', 'mi heart a burn fi yuh', 'yuh sweet like coconut water inna July'",
      "  FAITH / PRAYER: 'Jah know di way', 'mi put it inna Him hand', 'only di Most High see weh mi pass through'",
      "  CONFIDENCE: 'mi born wid di ting', 'dem cyaan touch dis', 'straight from di root'",
      "  SURVIVAL: 'mi rise from nothin', 'dem never rate mi but Jah elevate mi'",
      "",
      "CHORUS / HOOK RULES FOR PATOIS:",
      "  → The hook must feel chantable in Patois — short, punchy, rhythmically locked",
      "  → Do NOT default to English sentence structure in the chorus — restructure natively",
      "  → Example of weak chorus: 'I cannot stop the way I feel for you' → REJECTED",
      "  → Example of strong Patois chorus: 'Mi heart a burn, yuh know it true / From di start mi done belong to you'",
      "",
      "DIALECT CONSISTENCY ACROSS SECTIONS:",
      "  → Intro: set the sonic world in Patois — not English with one Patois word",
      "  → Verses: write full Patois phrasing, not English skeletons with dialect sprinkled in",
      "  → Chorus: most chantable, most native — this is where the dialect must shine hardest",
      "  → Bridge: emotional turn in Patois — confessional, raw, lived-in",
      "  → Outro: close in Patois — natural landing, not a return to English",
      "",
      "AUTHENTICITY GUARDRAIL:",
      "  Target 60–75% native Patois phrasing — enough to feel real, clear enough to be sung",
      "  Every line must be singable by a real Jamaican artist, not sound like a caricature",
      "══════════════════════════════════════════════",
    ];
  }

  if (isPidgin) {
    return [
      "",
      "══════════════════════════════════════════════",
      "⚡ ACTIVE DIALECT MODE: WEST AFRICAN PIDGIN — DEEP WRITING INTELLIGENCE",
      "══════════════════════════════════════════════",
      "You are writing in West African Pidgin (Nigerian / Ghanaian Afro-urban tone). Not English with slang. REAL PIDGIN.",
      "",
      "THINK IN PIDGIN BEFORE YOU WRITE. Let the spoken rhythm of Pidgin shape every line.",
      "",
      "PIDGIN SENTENCE PATTERNS TO USE:",
      "  • 'Na' = it is / that is / emphasis marker: 'Na you I want', 'Na so e be'",
      "  • 'Dey' = to be / to exist / state marker: 'I dey go', 'e dey happen', 'she dey vex'",
      "  • 'E' = it / he / she (third person): 'e sweet', 'e hard', 'e don happen'",
      "  • 'Don' = already / completion marker: 'I don arrive', 'e don burst', 'we don try'",
      "  • 'Abi' = isn't it / right? / tag question: 'na so e be, abi?'",
      "  • 'Wahala' = trouble / problem: 'no wahala', 'wahala dey'",
      "  • 'Sabi' = know / understand: 'you sabi wetin I mean'",
      "  • 'Wetin' = what: 'wetin you want', 'wetin I pass through'",
      "  • 'Carry' = bring / take: 'carry me go there'",
      "  • Repetition for emphasis: 'e sweet, e sweet die' = it is extremely sweet",
      "",
      "PIDGIN EMOTIONAL WRITING GUIDE — USE THESE PATTERNS, NOT THEIR ENGLISH EQUIVALENTS:",
      "  PAIN / STRUGGLE: 'life dey hard but I no go fall', 'wetin I pass through na only God sabi', 'dem try me, I no break'",
      "  HUSTLE / GRIND: 'I hustle from nothing', 'no food for lazy man', 'I grind till morning come'",
      "  LOVE / DESIRE: 'you be the one wey I want', 'since I see you my head don scatter', 'you sweet pass everything'",
      "  FAITH / PRAYER: 'God you too much', 'na you carry me come here', 'I no fit do am without you'",
      "  CONFIDENCE / FLEX: 'I don arrive', 'dem never see person like me before', 'I blow from nothing, now watch me'",
      "  SURVIVAL / TESTIMONY: 'I survive the storm', 'dem underrate me, God promote me', 'I no come from anywhere but I reach everywhere'",
      "",
      "CHORUS / HOOK RULES FOR PIDGIN:",
      "  → The hook must feel like something real people SAY daily — then elevated into music",
      "  → Natural code-switching (English + Pidgin mix) is authentic and allowed in hooks",
      "  → Example of weak chorus: 'You are everything I ever wanted in my life' → REJECTED",
      "  → Example of strong Pidgin chorus: 'Na you I want, since forever / You sweet pass everything, I swear'",
      "",
      "DIALECT CONSISTENCY ACROSS SECTIONS:",
      "  → Intro: conversational Pidgin energy — draw the listener in with spoken-word feel",
      "  → Verses: Pidgin-first construction — tell the story in how real people speak",
      "  → Chorus: most singable, most direct emotional hit — Pidgin punch",
      "  → Bridge: rawness of Pidgin confession — drop the performance, speak truth",
      "  → Outro: close with weight — Pidgin landing feels heavier and more real",
      "",
      "AUTHENTICITY GUARDRAIL:",
      "  Target 50–70% Pidgin flavor — code-switching is natural and authentic, not a weakness",
      "  Pidgin and English coexist in real music — never force 100% Pidgin if it sounds unnatural",
      "  Every line must be singable by a real Nigerian or Ghanaian artist, emotionally believable",
      "══════════════════════════════════════════════",
    ];
  }

  return [];
}

function buildUserPrompt(
  params: {
    topic: string;
    genre: string;
    mood: string;
    style?: string;
    notes?: string;
    songLength?: string;
    languageFlavor?: string;
    customFlavor?: string;
    commercialMode?: boolean;
    lyricalDepth?: string;
    hookRepeat?: string;
    lyricsSource?: string;
    genderVoiceModel?: string;
    performanceFeel?: string;
  },
  strictMode = false,
): string {
  const {
    topic, genre, mood, style, notes,
    songLength = "Standard",
    languageFlavor = "Global English",
    customFlavor,
    commercialMode = false,
    lyricalDepth = "Balanced",
    hookRepeat = "Medium",
    lyricsSource = "Studio Lyrics",
    genderVoiceModel = "Random",
    performanceFeel = "Smooth",
  } = params;

  const effectiveFlavor = languageFlavor === "Custom" && customFlavor?.trim()
    ? `Custom: ${customFlavor.trim()}`
    : languageFlavor;

  // V2 hard structure rules — enforced for every generation
  const v2StructureRules = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "V2 SONG STRUCTURE — ABSOLUTE HARD LAW",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "Every generation MUST follow this structure. No deviations. No exceptions.",
    "",
    "✦ INTRO: EXACTLY 2 or 4 lines — atmosphere and tension only — NO hook delivery — NOT a chorus — NOT a verse",
    "  → The intro sets the sonic world. It is a whisper, a cinematic teaser. It must NEVER carry the keeper line.",
    "  → If you reach 4 intro lines, STOP. Do not write a 5th intro line under any circumstance.",
    "",
    "✦ VERSE 1: EXACTLY 8, 12, or 16 lines (multiples of 4 only) — deep storytelling — build emotional world",
    "  → Write in clean 4-bar groups. Each group must push the story forward.",
    "",
    "✦ CHORUS: EXACTLY 4, 6, or 8 lines — main keeper line MUST appear here — highest energy, strongest replay",
    "  → This is the emotional peak. The listener must feel a clear LIFT when it arrives.",
    "  → If 6 lines: 4 core hook lines + 2 chant/tag lines.",
    "",
    "✦ VERSE 2: EXACTLY same line count as Verse 1 — new angle, deeper emotional territory — never repeat Verse 1",
    "",
    "✦ BRIDGE: EXACTLY 4 lines — NO MORE, NO LESS — reflective turn or emotional intensifier — HARD LAW",
    "  → Count the bridge lines before writing them. Count again after. If not exactly 4 → rewrite immediately.",
    "  → Bridge must NOT be a mini-chorus. Must NOT repeat chorus lines. Must NOT exceed 4 lines.",
    "",
    "✦ OUTRO: EXACTLY 2 or 4 lines — emotional fade and close — main keeper line MUST appear here",
    "  → Label this section ONLY as 'Outro.' Never use 'Outro / Final Chorus' or slash labels.",
    "  → The outro closes and lands. It does not relaunch or wander.",
    "",
    "STRUCTURE VALIDATOR — MANDATORY BEFORE OUTPUT:",
    "Count lines in EVERY section. If ANY count is wrong → rewrite that section before returning output.",
    "Intro ≠ 2 or 4? Rewrite. Verse ≠ 8/12/16? Rewrite. Chorus ≠ 4/6/8? Rewrite. Bridge ≠ 4? Rewrite. Outro ≠ 2 or 4? Rewrite.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  const lines = [
    "==== HITMAKER MODE V2 — SONG REQUEST ====",
    `TOPIC: ${topic}`,
    `GENRE: ${genre}`,
    `MOOD: ${mood}`,
    `LANGUAGE / FLAVOR: ${effectiveFlavor}`,
  ];

  if (style?.trim()) {
    lines.push(`STYLE / ARTIST REFERENCE: ${style.trim()} — capture the feel and writing DNA only — do NOT copy lyrics`);
  }

  if (notes?.trim()) {
    lines.push(`EXTRA DIRECTION (HIGHEST PRIORITY — honor fully): ${notes.trim()}`);
  }

  if (commercialMode) {
    lines.push(`HITMAKER MODE: ACTIVATED — maximize hook stickiness, chant energy, first-listen memorability, and replay value above all else`);
  }

  const depthInstructions: Record<string, string> = {
    Simple: "LYRICAL DEPTH: SIMPLE — clean phrasing, minimal metaphor, prioritize singability and hook clarity",
    Balanced: "LYRICAL DEPTH: BALANCED — blend commercial catchiness with artistic depth",
    Deep: "LYRICAL DEPTH: DEEP — rich imagery, strong emotional layering, introspective verses, human storytelling throughout",
  };
  lines.push(depthInstructions[lyricalDepth] ?? depthInstructions["Balanced"]);

  const hookRepeatInstructions: Record<string, string> = {
    Low: "HOOK REPEAT LEVEL: LOW — lyrical variation in chorus, less exact repetition",
    Medium: "HOOK REPEAT LEVEL: MEDIUM — balanced repetition and variation",
    High: "HOOK REPEAT LEVEL: HIGH — maximum chantability, strong anchor phrase repetition, crowd singalong energy",
  };
  lines.push(hookRepeatInstructions[hookRepeat] ?? hookRepeatInstructions["Medium"]);

  const lyricsSourceLabel: Record<string, string> = {
    "Studio Lyrics":   "LYRICS SOURCE: STUDIO LYRICS — generate all lyrical content fresh from the brief",
    "Paste My Own":    "LYRICS SOURCE: ARTIST-PROVIDED — honour the artist's own lyrical voice and style",
    "Instrumental Only": "LYRICS SOURCE: INSTRUMENTAL ONLY — skip lyrical content, focus session notes and production output only",
  };
  lines.push(lyricsSourceLabel[lyricsSource] ?? lyricsSourceLabel["Studio Lyrics"]);

  const genderMap: Record<string, string> = {
    Male: "VOCAL GENDER / MODEL: MALE — write for a male vocal register, delivery cues and ad-lib placement accordingly",
    Female: "VOCAL GENDER / MODEL: FEMALE — write for a female vocal register, warm and expressive delivery",
    Mixed: "VOCAL GENDER / MODEL: MIXED — designed for a duet or call-and-response between male and female voices",
    Random: "VOCAL GENDER / MODEL: OPEN — flexible vocal writing, producer will cast the right voice",
  };
  lines.push(genderMap[genderVoiceModel] ?? genderMap["Random"]);

  lines.push(`PERFORMANCE FEEL: ${performanceFeel.toUpperCase()} — every vocal direction, delivery cue, and ad-lib must match this performance register`);

  const dialectBlock = getDialectBlock(effectiveFlavor);

  lines.push(
    "",
    ...v2StructureRules,
    ...dialectBlock,
    "",
    "==== V2 HITMAKER GENERATION CHECKLIST ====",
    `✓ GENRE: ${genre} — write from inside the culture, feel the rhythm and texture authentically`,
    `✓ MOOD: ${mood} — every line must EMBODY this mood, not just reference it`,
    `✓ LANGUAGE: ${effectiveFlavor} — this is the CORE writing mode, not a decoration — think in the dialect natively, construct sentences from the inside out`,
    "✓ KEEPER LINE: silently generate 1 MAIN KEEPER LINE + 2 BACKUP KEEPER LINES before writing",
    "✓ MAIN KEEPER LINE: must appear in BOTH the Chorus (hook) AND the Outro — this is non-negotiable",
    "✓ INTRO DISCIPLINE: intro is atmospheric only — it must NOT deliver the hook — if the intro could be mistaken for a chorus, rewrite it",
    "✓ TITLE: derive from the keeper line — 1 to 5 words, emotionally sharp, commercially credible",
    "✓ HOOK ENFORCER: before finalizing chorus, run 5 checks — (1) would fans scream this live? (2) is it caption-worthy? (3) is it simple and memorable? (4) does it match verse emotion? (5) is it unique? — if any NO → rewrite",
    "✓ VERSE QUALITY: every 4-bar group must advance the story — no filler, no repeated imagery from Verse 1 to Verse 2",
    "✓ BRIDGE LAW: exactly 4 lines, no exceptions — reflective or intensifying — turns the emotional direction of the record",
    "✓ OUTRO LABEL: label as 'Outro' only — never 'Outro / Final Chorus' — write as a closer, not a launcher",
    "✓ NATURALNESS: reject any line that sounds robotic, formal, or AI-generated — every line must be singable",
    "✓ TIGHTNESS: fewer, stronger lines — every line must earn its place",
    "✓ PRODUCTION: include complete productionNotes, instrumentalGuidance, and vocalDemoGuidance in output",
    "✓ STEMS BREAKDOWN: include stemsBreakdown with kick, snare, bass, pads, leadSynth, guitarOther, and effects — be specific about patterns, panning, and processing",
    "✓ EXPORT NOTES: include exportNotes with producer-friendly session setup — BPM, key, DAW tips, vocal booth prep, reference energy, and arrangement reminders",
    "✓ OUTPUT: ONLY the JSON object — no text, explanation, or commentary before or after",
    "",
    "Generate the full AfroMuse V5 HITMAKER V2 song draft now.",
  );

  if (strictMode) {
    lines.push("", STRICT_RETRY_ADDENDUM);
  }

  return lines.join("\n");
}

// ─── Structure Validation ────────────────────────────────────────────────────

interface SongDraft {
  intro?: unknown[];
  verse1?: unknown[];
  hook?: unknown[];
  verse2?: unknown[];
  bridge?: unknown[];
  outro?: unknown[];
  [key: string]: unknown;
}

interface ValidationResult {
  valid: boolean;
  failures: string[];
}

const VALID_INTRO_COUNTS = new Set([2, 4]);
const VALID_VERSE_COUNTS = new Set([8, 12, 16]);
const VALID_HOOK_COUNTS = new Set([4, 6, 8]);
const VALID_OUTRO_COUNTS = new Set([2, 4, 8]);
const BRIDGE_COUNT = 4;

function validateStructure(draft: SongDraft): ValidationResult {
  const failures: string[] = [];

  const introLen = Array.isArray(draft.intro) ? draft.intro.length : -1;
  if (!VALID_INTRO_COUNTS.has(introLen)) {
    failures.push(`intro has ${introLen} lines — must be exactly 2 or 4`);
  }

  const verse1Len = Array.isArray(draft.verse1) ? draft.verse1.length : -1;
  if (!VALID_VERSE_COUNTS.has(verse1Len)) {
    failures.push(`verse1 has ${verse1Len} lines — must be 8, 12, or 16`);
  }

  const hookLen = Array.isArray(draft.hook) ? draft.hook.length : -1;
  if (!VALID_HOOK_COUNTS.has(hookLen)) {
    failures.push(`hook/chorus has ${hookLen} lines — must be 4, 6, or 8`);
  }

  const verse2Len = Array.isArray(draft.verse2) ? draft.verse2.length : -1;
  if (!VALID_VERSE_COUNTS.has(verse2Len)) {
    failures.push(`verse2 has ${verse2Len} lines — must be 8, 12, or 16`);
  }
  if (verse1Len > 0 && verse2Len > 0 && verse1Len !== verse2Len) {
    failures.push(`verse1 (${verse1Len} lines) and verse2 (${verse2Len} lines) must have the same line count`);
  }

  const bridgeLen = Array.isArray(draft.bridge) ? draft.bridge.length : -1;
  if (bridgeLen !== BRIDGE_COUNT) {
    failures.push(`bridge has ${bridgeLen} lines — must be exactly 4`);
  }

  const outroLen = Array.isArray(draft.outro) ? draft.outro.length : -1;
  if (!VALID_OUTRO_COUNTS.has(outroLen)) {
    failures.push(`outro has ${outroLen} lines — must be 2, 4, or 8`);
  }

  return { valid: failures.length === 0, failures };
}

// ─── Model Ensemble ──────────────────────────────────────────────────────────

const MODELS: { id: string; name: string; temperature: number }[] = [
  { id: "qwen/qwen3.5-122b-a10b",                    name: "Qwen3.5-122B",          temperature: 0.93 },
  { id: "meta/llama-3.3-70b-instruct",               name: "LLaMA-3.3-70B",         temperature: 0.88 },
  { id: "meta/llama-4-maverick-17b-128e-instruct",   name: "LLaMA-4-Maverick-17B",  temperature: 0.90 },
];

// Priority order for selection when multiple models pass validation: index 0 = highest priority
const MODEL_PRIORITY = MODELS.map((m) => m.id);

// ─── Route ───────────────────────────────────────────────────────────────────

router.post("/generate-song", async (req, res) => {
  const {
    topic, genre, mood, style, notes, songLength, languageFlavor, customFlavor,
    commercialMode, lyricalDepth, hookRepeat, lyricsSource, genderVoiceModel, performanceFeel,
  } = req.body as {
    topic?: string;
    genre?: string;
    mood?: string;
    style?: string;
    notes?: string;
    songLength?: string;
    languageFlavor?: string;
    customFlavor?: string;
    commercialMode?: boolean;
    lyricalDepth?: string;
    hookRepeat?: string;
    lyricsSource?: string;
    genderVoiceModel?: string;
    performanceFeel?: string;
  };

  if (!topic || typeof topic !== "string") {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    logger.error("NVIDIA_API_KEY not configured");
    res.status(500).json({ error: "AI service not configured" });
    return;
  }

  const selectedGenre = genre?.trim() || "Afrobeats";
  const selectedMood = mood?.trim() || "Uplifting";
  const selectedLength = ["Short", "Standard", "Full"].includes(songLength ?? "") ? songLength! : "Standard";
  const selectedFlavor = languageFlavor?.trim() || "Global English";

  const promptParams = {
    topic,
    genre: selectedGenre,
    mood: selectedMood,
    style,
    notes,
    songLength: selectedLength,
    languageFlavor: selectedFlavor,
    customFlavor,
    commercialMode: commercialMode === true,
    lyricalDepth: lyricalDepth ?? "Balanced",
    hookRepeat: hookRepeat ?? "Medium",
    lyricsSource: lyricsSource ?? "Studio Lyrics",
    genderVoiceModel: genderVoiceModel ?? "Random",
    performanceFeel: performanceFeel ?? "Smooth",
  };

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const parseResponse = (raw: string): SongDraft | null => {
    try {
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) as SongDraft;
    } catch {
      return null;
    }
  };

  const callModel = async (
    model: { id: string; name: string; temperature: number },
    userPrompt: string,
  ): Promise<{ model: string; draft: SongDraft | null; validation: ValidationResult }> => {
    try {
      const response = await ai.chat.completions.create({
        model: model.id,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: model.temperature,
        top_p: 0.95,
        max_tokens: 3500,
      });
      const raw = response.choices[0]?.message?.content ?? "";
      const draft = parseResponse(raw);
      const validation = draft ? validateStructure(draft) : { valid: false, failures: ["parse error"] };
      return { model: model.name, draft, validation };
    } catch (err) {
      logger.warn({ model: model.name, err }, "Model call failed");
      return { model: model.name, draft: null, validation: { valid: false, failures: ["api error"] } };
    }
  };

  // Select the best result from a set of model outputs.
  // Prefers a passing result in MODEL_PRIORITY order; falls back to fewest failures.
  const selectBest = (
    results: { model: string; draft: SongDraft | null; validation: ValidationResult }[],
  ): { model: string; draft: SongDraft | null; validation: ValidationResult } | null => {
    const passing = results.filter((r) => r.validation.valid && r.draft !== null);
    if (passing.length > 0) {
      // Return the highest-priority passing model
      for (const modelId of MODEL_PRIORITY) {
        const match = passing.find((r) => r.model === MODELS.find((m) => m.id === modelId)?.name);
        if (match) return match;
      }
      return passing[0];
    }
    // No passing results — return whichever has the fewest failures
    const withDraft = results.filter((r) => r.draft !== null);
    if (withDraft.length === 0) return null;
    return withDraft.reduce((best, cur) =>
      cur.validation.failures.length < best.validation.failures.length ? cur : best,
    );
  };

  try {
    const userPrompt = buildUserPrompt(promptParams, false);

    // ── Round 1 — all three models in parallel ─────────────────────────────
    logger.info("Starting parallel ensemble generation (3 models)");
    const round1 = await Promise.all(MODELS.map((m) => callModel(m, userPrompt)));

    round1.forEach((r) => {
      if (r.validation.valid) {
        logger.info({ model: r.model }, "Model passed structure validation (round 1)");
      } else {
        logger.warn({ model: r.model, failures: r.validation.failures }, "Model failed structure validation (round 1)");
      }
    });

    const best1 = selectBest(round1);

    if (best1?.validation.valid) {
      logger.info({ model: best1.model }, "Returning validated draft from round 1");
      res.json({ draft: best1.draft });
      return;
    }

    // ── Round 2 — strict retry, all three models in parallel ───────────────
    logger.warn("All models failed round 1 — triggering strict-mode parallel retry");
    const strictPrompt = buildUserPrompt(promptParams, true);
    const round2 = await Promise.all(MODELS.map((m) => callModel(m, strictPrompt)));

    round2.forEach((r) => {
      if (r.validation.valid) {
        logger.info({ model: r.model }, "Model passed structure validation (round 2)");
      } else {
        logger.warn({ model: r.model, failures: r.validation.failures }, "Model failed structure validation (round 2)");
      }
    });

    const best2 = selectBest(round2);
    const allResults = [...round1, ...round2];
    const overallBest = selectBest(allResults);

    if (best2?.validation.valid) {
      logger.info({ model: best2.model }, "Returning validated draft from round 2");
      res.json({ draft: best2.draft });
      return;
    }

    // ── Fallback — return best available across both rounds ────────────────
    logger.warn("All models failed both rounds — returning best available draft");
    if (!overallBest?.draft) {
      res.status(500).json({ error: "Failed to generate a song. Please try again." });
      return;
    }
    res.json({ draft: overallBest.draft });
  } catch (err) {
    logger.error({ err }, "NVIDIA API error");
    const status = (err as { status?: number }).status;
    if (status === 429) {
      res.status(429).json({ error: "The AI is busy right now. Please wait a moment and try again." });
    } else {
      res.status(500).json({ error: "AI generation failed. Please try again." });
    }
  }
});

export default router;
