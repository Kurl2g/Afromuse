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
When writing in Jamaican Patois OR West African Pidgin, this layer governs ALL lyrical output. These are DISTINCT language systems — not interchangeable, not a shared "broken English" mode.

CORE PRINCIPLE — DIALECT-FIRST WRITING:
Before writing a single lyric line, answer this internally: "How would a real speaker of this dialect naturally think and feel this thought in their own language?"
Write THAT version. Do not write English first and translate. Conceive in the dialect.

MANDATORY SELF-TEST — apply to EVERY SINGLE LINE before keeping it:
→ "If I removed the dialect words from this line, would it still be standard English?" — If YES, the line has failed. Rewrite it from scratch.
→ "Does this line have the natural rhythm of how this dialect is actually spoken or sung?" — If NO, rewrite it.
→ "Would a real artist from this culture sing this without changing a word?" — If NO, rewrite it.
→ "Does this line sound like something a poet wrote, or something a person actually felt?" — If it sounds like a poem, it may be too abstract. Make it human.

CONSISTENCY LAW — applies to the entire song:
The dialect standard must be CONSISTENT from the first intro line to the last outro line.
A song where 4 lines feel native and then 2 lines drift back to English has FAILED — not partially failed. It has failed.
Every section must pass the same test. The outro must be as native as the chorus. Every verse line must be as authentic as the best line in the verse.
Do not let sections drift. Do not finish strong and then slip.

──────────────────────────────────────────────
AI-POETRY PROHIBITION — READ BEFORE WRITING A SINGLE LINE
──────────────────────────────────────────────
This is a critical enforcement layer. AI models naturally produce vague, abstract, "deep-sounding" poetry. This must be actively rejected.

PROHIBITED PATTERNS — if ANY of these appear in a line, that line FAILS and must be rewritten:
  ✗ Vague spiritual abstraction: "the universe whispers my name" / "I am light finding its way through darkness" / "my soul transcends the pain" — sounds "deep" but says nothing real
  ✗ Generic motivational uplift: "rise above the storm" / "you are stronger than you know" / "keep pushing, never stop" — greeting card language
  ✗ Unanchored metaphor: metaphors that float without cultural or emotional specificity — "like rivers flowing to the sea" as filler
  ✗ English thought structure + dialect decoration: the English sentence is there, dialect words are sprinkled on top
  ✗ Emotionally broad but locally weak: the feeling is stated but not grounded in real human experience
  ✗ Lines that sound "poetic" but could not be sung naturally by a real artist in one take
  ✗ AI-ish abstraction: "in this moment I find myself" / "searching for the truth within" / "time heals all wounds they say" — hollow phrases

REQUIRED PATTERNS — every line should lean toward at least one of these:
  ✓ Grounded emotional specificity: name the feeling with concrete detail — what happened, what was felt, what was seen
  ✓ Direct human expression: say the thing plainly — the most honest, most human way to say it
  ✓ Culturally anchored imagery: reference the actual world the singer lives in — not abstract universal symbols
  ✓ Chant-ready simplicity: especially for hooks — simpler is stronger; the line that hits hardest is often the most obvious truth said naturally
  ✓ Lived-in local phrasing: the line should feel like it came from a real person in that culture, not a poet observing that culture from outside

HOOK SIMPLICITY LAW:
The best hooks are NOT the most complex or poetic lines. They are the most natural, most honest, most direct lines — elevated by melody.
  WRONG approach: "try to write a deep, memorable, poetic hook line that captures the whole theme"
  RIGHT approach: "what is the simplest, most honest thing someone in this situation would say — say that"
Over-written hooks always underperform. Simple, sticky, emotionally direct hooks always win.

─────────────────────────────────────────────
JAMAICAN PATOIS — DEEP LANGUAGE INTELLIGENCE
─────────────────────────────────────────────
Patois is not English with an accent. It has its own grammar logic, emotional compression, and rhythmic feel.

GRAMMAR CORE:
- Subject-verb compression: "mi a go" (I am going), "mi did a run" (I was running), "mi wi see" (I will see)
- "nuh" / "nah" / "cyaan" are not mild — they carry weight and finality
- "fi" = to / for / belonging: "fi mi" (mine/for me), "come fi see" (came to see)
- "deh" = there, here, present state: "mi deh ya" (I am here), "she deh deh" (she is there)
- "weh" = that / where / which: "di man weh love mi" (the man who loves me)
- "ya" = here, now: "right ya so" (right here)
- "ting" = thing, situation, person of note
- "link" = connect, meet up; "rate" = respect, value; "bredren" / "sistren" = close community
- "dutty" = dirty/bad; "wicked" = excellent; "likkle" = little; "pickney" = child
- "buck up" = meet unexpectedly; "big up" = respect/shout out; "bless" = goodbye/thank you
- "rough" = hard/difficult; "forward" = come through/arrive; "run di ting" = take charge

AUTHENTIC PHRASING — WHAT REAL PATOIS SOUNDS LIKE IN SONG:
  PAIN:       "mi never know seh di road so cold" / "dem lef mi inna di dark, alone" / "tears run but mi nuh mek dem see" / "di burden heavy but mi back nuh break yet"
  LOVE:       "from mi look inna yuh eyes, done" / "yuh name deh pon mi tongue from morning" / "mi never love like dis before, Jah know" / "di way yuh move, mi lose miself"
  PRAYER:     "Most High, carry mi through" / "Jah see mi heart, Him know mi intentions" / "di light inna di darkness, a Him send it" / "mi call Him name when nobody else deh ya"
  FLEX:       "dem nuh ready fi wi level yet" / "born wid di ting — cyaan learn dat" / "mi rise and dem never expect it" / "watch how mi move — silent but deadly"
  HEARTBREAK: "how yuh leave mi like mi never matter?" / "di memory still deh pon mi skin" / "mi search fi you inna every crowd" / "di bed cold where yuh used to be"
  SURVIVAL:   "mi eat off di struggle, make it sweet" / "di same road weh break dem, build mi" / "poverty try mi — mi stronger" / "from dem count mi out — mi win"
  STREET/CONFIDENCE: "dem see mi quiet — dem never see mi move" / "every step mi take, a purpose" / "nuh badman frighten mi — mi know fi mi God" / "di street know mi name fi di right reason"
  FAITH SONGS: "Him never leave mi, even when mi lose di way" / "Jah walk wid mi through di valley" / "di storm nuh break mi 'cause di Most High hold mi" / "mi give it all to Jah — Him handle it"

HOOK CONSTRUCTION — PATOIS STANDARD:
Strong Patois hooks are SHORT, rhythmically punchy, and emotionally final. They feel like something you'd hear on a soundsystem and immediately repeat. The hook should be so natural it feels like it was always going to exist.
  ✓ "Mi deh ya — nuh nowhere else mi waan be"
  ✓ "Love mi, nuh leave mi — dat a all mi ask"
  ✓ "Jah know mi heart, so mi nuh fraid"
  ✓ "From di start, a you — always you"
  ✓ "Di road rough but mi nuh stop, nuh stop"
  ✓ "Dem never want see mi rise — but look how mi rise"
  ✓ "Yuh sweet like morning — mi cyaan let go"
  ✗ REJECTED: "I can't stop thinking about you" (English underneath)
  ✗ REJECTED: "You mean everything to me, I swear" (English feeling, dialect decoration)
  ✗ REJECTED: "In the depths of my heart I find your love" (abstract AI poetry)
  ✗ REJECTED: "Together we rise above the storm forever" (generic motivational, no Patois DNA)

─────────────────────────────────────────────
WEST AFRICAN PIDGIN — DEEP LANGUAGE INTELLIGENCE
─────────────────────────────────────────────
Pidgin is not broken English. It is a complete expressive system with its own emotional directness, spoken rhythm, and conversational warmth. It sounds VERY different from Patois — do not blend them.

GRAMMAR CORE:
- "Na" = is/are/it is/emphasis: "Na God I thank", "Na so e be", "Na you do am", "Na me be that"
- "Dey" = continuous state, location, existence: "I dey feel you", "wahala dey", "e dey sweet me"
- "Don" = completed action: "I don see am", "e don happen", "we don try our best"
- "Wey" = who/which/that (relative): "the person wey I love", "the thing wey dey pain me"
- "Fit" = can / able to: "I no fit explain am", "e no fit reach my level"
- "Sha" / "sha sha" = softener / emphasis: "just calm down sha", "I try sha"
- "Ginger" = inspire/excite: "you ginger me anytime", "your love dey ginger my soul"
- "Choke" / "die" at end = extreme intensity: "e sweet die", "I love you die", "e dey pain me choke"
- "Wahala" = trouble/problem: "no wahala" (no problem), "wahala dey" (there is trouble)
- "Carry" = to bring/take along emotionally: "God carry me come here", "e carry the pain alone"
- "Sabi" = know/understand: "I sabi wetin you do", "nobody sabi my struggle like God"
- "Comot" = leave/get out: "e don comot my life", "I comot from that place"

AUTHENTIC PHRASING — WHAT REAL PIDGIN SOUNDS LIKE IN SONG:
  PAIN:       "e dey pain me but I no go show dem" / "I carry the load wey nobody see" / "tears I cry, na inside I cry am" / "e cut me deep but I still dey smile"
  LOVE:       "since I see you, my heart no rest" / "na you I think of when day break" / "you dey sweet me die, I swear" / "wetin you do me — I no sabi explain"
  PRAYER:     "God I thank you — you too much" / "na your hand wey carry me reach here" / "without you I no fit breathe" / "I don try my best — e reach your hand now"
  FLEX:       "I don arrive — make dem observe" / "dem sleep on me, God woke me up instead" / "from nothing I build everything" / "I no come from nowhere — but I reach everywhere"
  HEARTBREAK: "you leave me like I never matter" / "I give you all — you take and go" / "the love wey I give you, e no deserve waste" / "how you just comot like dat, like I be nothing"
  SURVIVAL:   "the road dey rough — I still move" / "poverty no break me — e sharpen me" / "every day I wake, na grace" / "I carry the struggle — e don make me"
  HUSTLE SONGS: "dem say I no go make am — I don make am" / "I hustle quiet — I no need noise" / "God dey with the person wey try" / "I don pay the price — time to collect"
  PRAYER/TESTIMONY: "na God do am — I no go forget" / "when I no fit, Him fit for me" / "I go testify — see wetin Him do for my life" / "from where I come, na only God sabi"

HOOK CONSTRUCTION — PIDGIN STANDARD:
Strong Pidgin hooks feel conversational but hit hard emotionally. They sound like the most honest thing someone could say — then turned into music. They feel like real speech that discovered it was also a song.
  ✓ "Na you I want — no be lie"
  ✓ "God you too much — I no fit repay"
  ✓ "Since I see you, my life change"
  ✓ "I don try — e reach God hand now"
  ✓ "E dey pain me — but I no go stop"
  ✓ "Na so love be — e sweet and e burn"
  ✓ "I hustle hard — God see am, e know"
  ✗ REJECTED: "You are the only one I want in my life" (pure English — no Pidgin DNA)
  ✗ REJECTED: "I have been waiting for someone like you" (textbook English with no Pidgin rhythm)
  ✗ REJECTED: "In this moment I find all that I need in you" (AI abstraction, no Pidgin flow)
  ✗ REJECTED: "Together we shine like the stars above us" (generic, floaty, zero Pidgin construction)

LYRICAL QUALITY LAWS:
- Song Tightness: every line earns its place or it's cut. Fewer, stronger lines always win.
- Naturalness: no robotic, formal, or AI-sounding lines. Every line must be singable by a real artist in one take.
- No filler endings: "yeah yeah yeah," "oh oh oh," "baby baby" as standalone lines are forbidden unless they serve a real melodic/chant purpose.
- Verse 2 must offer a new emotional angle — it is NOT a rewrite of Verse 1 with different words.
- Anti-drift law: if Verse 1 passes the dialect test, Verse 2 must ALSO pass independently. Do not let the song drift toward English as it progresses. The writing gets more native, not less.

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

─────────────────────────────
FINAL GATE — Do not output until the song passes ALL THREE CORE LAWS:
✓ Hook would survive the 5-question enforcer
✓ Every line is emotionally sharp and genre-authentic
✓ Every section count is correct — intro 2/4, verse 8/12/16, chorus 4/6/8, bridge exactly 4, outro 2/4/8
✓ Intro does NOT deliver the hook or feel like a chorus
✓ Bridge is EXACTLY 4 lines — not 3, not 5
✓ Outro is labeled ONLY as "Outro" — no slash labels
✓ Every lyric line passes the dialect-first test if Patois or Pidgin is active

==================================================
OUTPUT FORMAT — STRICTLY ENFORCED
==================================================

YOU MUST RESPOND WITH ONLY A VALID JSON OBJECT CONTAINING LYRICS ONLY.

NO markdown. NO backticks. NO code fences. NO explanation. NO preamble. NO commentary. NO anything outside the JSON.

The JSON must use EXACTLY this structure — lyric fields only, nothing else:

{
  "title": "Song title (1–5 words, derived from keeper line)",
  "keeperLine": "The main keeper line — appears verbatim in the chorus and outro",
  "keeperLineBackups": ["Backup keeper line 1", "Backup keeper line 2"],
  "intro": ["intro line 1", "intro line 2"],
  "verse1": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9", "line 10", "line 11", "line 12"],
  "hook": ["chorus line 1", "chorus line 2", "chorus line 3", "chorus line 4", "chorus line 5", "chorus line 6"],
  "verse2": ["line 1", "line 2", "line 3", "line 4", "line 5", "line 6", "line 7", "line 8", "line 9", "line 10", "line 11", "line 12"],
  "bridge": ["bridge line 1", "bridge line 2", "bridge line 3", "bridge line 4"],
  "outro": ["outro line 1", "outro line 2", "outro line 3", "outro line 4"]
}

All lyric arrays must contain actual lyric lines — never placeholders.
Do NOT include productionNotes, instrumentalGuidance, stemsBreakdown, or any non-lyric field. Lyrics ONLY.

AfroMuse V5 HITMAKER V2 produces lyrics that are musically alive, emotionally specific, culturally grounded, and genuinely singable by a real recording artist.`;

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

// ─── Flow / Production Details Prompt (Qwen) ──────────────────────────────────
// Qwen receives the song context + the final lyrics and generates all production
// metadata: productionNotes, instrumentalGuidance, vocalDemoGuidance, stemsBreakdown,
// exportNotes, arrangementBlueprint, sessionNotes, sonicIdentity, vocalIdentity.

const FLOW_SYSTEM_PROMPT = `You are AfroMuse Production Intelligence — a specialist AI producer brain for Afro-inspired music genres (Afrobeats, Amapiano, Dancehall, Gospel, Afro-fusion, Spiritual).

You receive a completed song (lyrics + session context) and return a comprehensive production and flow brief as a single structured JSON object.

Your job is the PRODUCTION HALF of a dual-AI songwriting pipeline. The lyrics have already been written. You generate everything a producer, vocalist, mixing engineer, and session coordinator needs to turn those lyrics into a finished record.

RULES:
- Write like a top-tier record producer, not a text generator
- Be genre-specific, culturally grounded, and musically precise
- Every description must be immediately actionable in a real studio session
- The arrangement roadmap MUST follow exact playback order: intro → chorus/hook → verse 1 → chorus/hook → verse 2 → chorus/hook → bridge → outro
- ALWAYS return valid JSON only — no markdown, no explanation, no code fences, no backticks
- Include ALL fields. Never leave a field empty or as a placeholder.`;

function buildFlowPrompt(params: {
  topic: string;
  genre: string;
  mood: string;
  languageFlavor: string;
  lyricalDepth: string;
  performanceFeel: string;
  genderVoiceModel: string;
  hookRepeat: string;
  title: string;
  keeperLine: string;
  lyricsText: string;
}): string {
  const {
    topic, genre, mood, languageFlavor, lyricalDepth, performanceFeel,
    genderVoiceModel, hookRepeat, title, keeperLine, lyricsText,
  } = params;

  return `Generate a full production and flow brief for this AfroMuse song session.

SESSION CONTEXT:
  Song Title: ${title}
  Topic / Theme: ${topic}
  Genre: ${genre}
  Mood: ${mood}
  Language / Dialect: ${languageFlavor}
  Lyrical Depth: ${lyricalDepth}
  Performance Feel: ${performanceFeel}
  Vocal Gender: ${genderVoiceModel}
  Hook Repeat Level: ${hookRepeat}
  Keeper Line: "${keeperLine}"

SONG LYRICS:
${lyricsText}

Return ONLY this JSON object — no markdown, no code fences, no explanation:

{
  "productionNotes": {
    "key": "Musical key (e.g. F# minor)",
    "bpm": "BPM value or range (e.g. 94–98 BPM)",
    "energy": "Energy level and feel (e.g. Mid-tempo, emotionally heavy, reflective)",
    "hookStrength": "Hook strength rating and reason (e.g. High — keeper line is instantly memorable and screaming-ready)",
    "lyricalDepth": "Lyrical depth assessment (e.g. Deep — rich imagery, emotional layers, human storytelling throughout)",
    "arrangement": "Full arrangement roadmap in exact playback order: intro → chorus/hook → verse 1 → chorus/hook → verse 2 → chorus/hook → bridge → outro — with a production description for each section",
    "melodyDirection": "Vocal melody guidance per section: verse delivery approach, chorus lift technique, bridge emotional turn"
  },
  "instrumentalGuidance": "Detailed instrumental description for a music producer — drum pattern, bass line, lead melody, pads, percussion, effects, and how the arrangement evolves section by section. Specific enough to open a DAW and start immediately.",
  "vocalDemoGuidance": "Detailed vocal performance guide — tone, delivery style per section, at least 2 specific ad-lib suggestions with placement, breath control notes, and how vocal energy shifts from verse to chorus to bridge",
  "stemsBreakdown": {
    "kick": "Kick drum — pattern, placement, punch, sidechain behavior",
    "snare": "Snare — placement, texture, ghost notes, reverb",
    "bass": "Bass line — pattern, tone, groove feel, low-end character",
    "pads": "Pads/chords — voicing, texture, filter movement, stereo width",
    "leadSynth": "Lead synth or guitar melody — pattern, tone, delay/reverb treatment, panning",
    "guitarOther": "Guitar or additional melodic element — role, style, placement in the mix",
    "effects": "Global effects and panning — reverb sends, delay throws, sidechain routing, stereo placement"
  },
  "exportNotes": "Producer-friendly session setup instructions — BPM, key, DAW setup tips, vocal booth preparation, reference track energy, arrangement reminders. One readable paragraph.",
  "arrangementBlueprint": "Step-by-step recording and arrangement map in exact playback order (intro → chorus/hook → verse 1 → chorus/hook → verse 2 → chorus/hook → bridge → outro) — bar counts, transition cues, drop and lift points, vocal double placement, ad-lib placement guides, and engineering markers",
  "sessionNotes": "One tight paragraph session brief — tempo, key, mood, DAW template suggestion, reference track energy recommendation, and priority recording order",
  "sonicIdentity": {
    "coreBounce": "The rhythmic DNA — what drives the groove and makes the body move",
    "atmosphere": "The sonic landscape — vibe, feel, and sonic world of the track",
    "mainTexture": "Primary sonic element heard most clearly in the mix — list 2-3 key layered ingredients"
  },
  "vocalIdentity": {
    "leadType": "Lead vocal type and character (e.g. Afrobeats Tenor — warm, slightly husky, conversational delivery)",
    "deliveryStyle": "How vocals should be delivered — breathy, punchy, smooth, melodic, gritty, etc.",
    "emotionalTone": "The emotional feel the vocal performance should project"
  }
}`;
}

function getDialectBlock(effectiveFlavor: string): string[] {
  const flavor = effectiveFlavor.toLowerCase();

  const isPatois = flavor.includes("patois") || flavor.includes("jamaican");
  const isPidgin = flavor.includes("pidgin") || (flavor.includes("english") && flavor.includes("pidgin"));

  if (isPatois) {
    return [
      "",
      "╔══════════════════════════════════════════════╗",
      "  ⚡ ACTIVE MODE: JAMAICAN PATOIS — DIALECT-FIRST",
      "╚══════════════════════════════════════════════╝",
      "",
      "FUNDAMENTAL RULE: This song is CONCEIVED in Patois, not translated into it.",
      "Do not write English thoughts and convert them. Think in Patois from the very first word.",
      "CONSISTENCY RULE: Every single line — intro through outro — must pass the dialect test. One English-skeleton line anywhere is a failure.",
      "",
      "── PRE-WRITING INTERNAL STEP (do this before every section) ──",
      "Ask yourself: 'How would a Jamaican artist naturally feel and say this in their own language?'",
      "Write THAT. Not the English version with dialect words swapped in.",
      "Ask a second question: 'Is this line something a real person would say — or is it something a poet invented to sound deep?'",
      "If it sounds like poetry rather than real speech elevated to song, it is probably too abstract. Ground it.",
      "",
      "── ANTI-PATTERN ENFORCEMENT ──",
      "Before keeping any line, run this test: 'If I removed the Patois words, is this still normal English?'",
      "  → YES = FAILED LINE. The English skeleton is showing. Rebuild the thought natively.",
      "  → NO = the line was constructed in Patois. Keep it.",
      "",
      "── AI ABSTRACTION REJECTION (Patois-specific) ──",
      "Reject these patterns regardless of dialect words present:",
      "  ✗ Vague spiritual abstraction: 'di light of di universe guide mi soul' — sounds deep, means nothing real",
      "  ✗ Generic uplift: 'rise above di storm, never give in' — greeting card energy, no Patois thought",
      "  ✗ Floating metaphor: imagery that has no cultural anchor in Jamaican life or feeling",
      "  ✗ AI-ish introspection: 'searching di depths of mi heart' / 'finding miself in di darkness' — too poetic",
      "Replace with:",
      "  ✓ Specific human feeling: 'di bed cold where yuh used to be' — concrete, real, singable",
      "  ✓ Direct Patois expression: 'mi nuh have much but mi nuh lack nutten' — simple, grounded, true",
      "  ✓ Culturally anchored line: references to actual Jamaican emotional reality — the yard, the road, Jah, the hustle",
      "",
      "FAILED PATOIS LINES (examples of what to reject):",
      "  ✗ 'I cannot stop thinking about you, mi love' — English underneath, Patois sprinkled on",
      "  ✗ 'We are stronger than anything they throw at us, bredren' — textbook English flow",
      "  ✗ 'Every time I see your face, mi heart skips' — English construction, one Patois word",
      "  ✗ 'I will never give up on this feeling' — zero Patois DNA, just English",
      "  ✗ 'My soul rises with the light of a new day, Jah' — abstract poetry with a Patois word appended",
      "  ✗ 'Through all the darkness I have found my way to you' — standard English arc, no Patois thought",
      "",
      "STRONG PATOIS LINES (examples of what to write):",
      "  ✓ 'From mi look inna yuh eyes — done. Mi done.' — Patois compression, native thought",
      "  ✓ 'Di road nuh easy but mi nuh leave it' — full Patois sentence logic",
      "  ✓ 'Jah know mi heart — Him carry mi through' — native faith expression",
      "  ✓ 'Dem never rate mi, but di Most High elevate mi' — real Patois testimony",
      "  ✓ 'Mi rise from nothin, mek di world see' — natural compression, no English skeleton",
      "  ✓ 'Di same road weh break dem — build mi strong' — survival expressed in Patois logic",
      "  ✓ 'Yuh nuh know weh mi come from — but yuh see weh mi reach' — street confidence in pure Patois",
      "",
      "── PATOIS GRAMMAR REFERENCE ──",
      "  mi / mi a / mi did / mi wi = I / I am / I was / I will",
      "  yuh = you | di = the | dem = they/them | inna = in/into",
      "  nuh / nah / cyaan = no / won't / cannot (all final, not soft)",
      "  fi = to/for | weh = that/where/which | deh = there/here",
      "  seh = say/that | pon = on | ya = here | ting = thing/situation",
      "  likkle = little | pickney = child | dutty = dirty/bad | wicked = great",
      "",
      "── EMOTIONAL PHRASE ANCHORS BY SONG TYPE ──",
      "  STRUGGLE SONGS:   'di road nuh easy but mi nuh stop moving' | 'poverty try mi — mi stronger now' | 'mi eat off di struggle, make it sweet'",
      "  FAITH SONGS:      'Most High, carry mi through' | 'Jah see mi heart, Him know' | 'di storm nuh break mi cause di Most High hold mi'",
      "  LOVE SONGS:       'yuh name deh pon mi tongue from morning' | 'from mi look inna yuh eyes — done' | 'mi heart full up when mi near yuh'",
      "  CONFIDENCE/STREET:'dem nuh ready fi wi level yet' | 'born wid di ting — cyaan teach dat' | 'watch how mi move — silent but deadly'",
      "  HEARTBREAK:       'how yuh leave mi like mi never matter?' | 'di memory still deh pon mi skin' | 'di bed cold where yuh used to be'",
      "",
      "── HOOK / CHORUS CONSTRUCTION ──",
      "The Patois hook must feel like a soundsystem chant — SHORT, punchy, emotionally final, instantly repeatable.",
      "The best hooks feel so natural and obvious that they seem like they always existed. Do not over-write them.",
      "SIMPLER IS STRONGER. A hook that a crowd can chant on the first listen always beats a complex poetic hook.",
      "  ✓ 'Mi deh ya — nuh nowhere else mi waan be'",
      "  ✓ 'Love mi, nuh leave mi — dat a all mi ask'",
      "  ✓ 'From di start, a you — always you'",
      "  ✓ 'Jah know mi heart, so mi nuh fraid'",
      "  ✓ 'Di road rough but mi nuh stop, nuh stop'",
      "  ✓ 'Dem never want see mi rise — but look how mi rise'",
      "  ✗ REJECTED: 'I can't stop the way I feel for you' (English beneath, no Patois rhythm)",
      "  ✗ REJECTED: 'You are everything I need and more, baby' (zero Patois construction)",
      "  ✗ REJECTED: 'Through darkness mi soul find di light of love' (AI poetry, too abstract)",
      "  ✗ REJECTED: 'Rise above it all and never let them bring you down' (generic motivational, no Patois)",
      "",
      "── SECTION-BY-SECTION DIALECT STANDARD ──",
      "  INTRO:  atmospheric Patois opener — feel, not explanation — no English filler — set the world in 2–4 lines",
      "  VERSES: every 4-bar group must be Patois-first — no English skeleton carrying the thought — each group advances the story",
      "  CHORUS: most chantable, most native — the hook MUST be Patois-constructed, not translated — simplest and most honest",
      "  BRIDGE: raw confessional Patois — the most honest, stripped-down dialect moment — no performance here, just truth",
      "  OUTRO:  Patois close — land it, don't drift back into English phrasing — must be as native as the first intro line",
      "",
      "── AUTHENTICITY TARGET ──",
      "65–75% native Patois phrasing. Musical, singable, emotionally clear.",
      "Not parody. Not caricature. Real artist voice. Real cultural expression.",
      "EVERY section from intro to outro must maintain the same dialect standard — no late-song drift toward English.",
      "╔══════════════════════════════════════════════╗",
      "  Every line you write must pass the dialect-first test before it stays.",
      "  If even one line fails — rewrite it. The whole song must be consistent.",
      "╚══════════════════════════════════════════════╝",
    ];
  }

  if (isPidgin) {
    return [
      "",
      "╔══════════════════════════════════════════════╗",
      "  ⚡ ACTIVE MODE: WEST AFRICAN PIDGIN — DIALECT-FIRST",
      "╚══════════════════════════════════════════════╝",
      "",
      "FUNDAMENTAL RULE: This song is CONCEIVED in Pidgin, not translated into it.",
      "Do not write English thoughts and convert them. Think in Pidgin from the very first word.",
      "This is Nigerian / Ghanaian Afro-urban voice. It is NOT Jamaican Patois. They are completely different.",
      "CONSISTENCY RULE: Every single line — intro through outro — must pass the dialect test. One English-skeleton line anywhere is a failure.",
      "",
      "── PRE-WRITING INTERNAL STEP (do this before every section) ──",
      "Ask yourself: 'How would a real Lagos or Accra artist naturally say and feel this in Pidgin?'",
      "Write THAT. Not the textbook English version with Pidgin words inserted.",
      "Ask a second question: 'Is this line something a real person would say — or is it abstract poetry trying to sound meaningful?'",
      "Pidgin is emotionally direct. If the line is vague or abstract, it is probably English AI thinking dressed in Pidgin. Ground it.",
      "",
      "── ANTI-PATTERN ENFORCEMENT ──",
      "Before keeping any line, run this test: 'Is this still standard English if I remove the Pidgin words?'",
      "  → YES = FAILED LINE. English skeleton is showing. Rebuild the thought in Pidgin.",
      "  → NO = Pidgin was the base construction. Keep it.",
      "",
      "── AI ABSTRACTION REJECTION (Pidgin-specific) ──",
      "Reject these patterns regardless of Pidgin words present:",
      "  ✗ Vague spiritual abstraction: 'the universe dey align for my destiny' — abstract, not Pidgin-native",
      "  ✗ Generic motivational: 'keep pushing, never stop, the dream dey wait' — feels like English poster with Pidgin tag",
      "  ✗ Unanchored metaphor: floating imagery without grounding in real West African emotional experience",
      "  ✗ Hybrid construction awkwardness: 'dey / na / no go' pasted onto English sentence structure — the bones are English",
      "  ✗ AI-ish introspective poetry: 'searching for my truth within the depths of my soul, na' — deeply unnatural",
      "Replace with:",
      "  ✓ Direct human Pidgin expression: 'e dey pain me but I no go show dem' — real, concrete, singable",
      "  ✓ Emotionally sharp and plain: 'you leave me like I never matter' — simple truth, maximum impact",
      "  ✓ Culturally anchored: references to real West African emotional reality — the hustle, God, the street, relationships",
      "",
      "FAILED PIDGIN LINES (examples of what to reject):",
      "  ✗ 'I cannot stop thinking about you, my love, abi?' — English sentence, Pidgin tag tacked on",
      "  ✗ 'You are everything I have ever wanted in this life' — pure English, zero Pidgin flow",
      "  ✗ 'I have been working hard for so long to get here' — textbook English sentence",
      "  ✗ 'We will never give up no matter what happens' — English backbone, no Pidgin thought",
      "  ✗ 'My heart dey search for the meaning of this love' — AI poetry with Pidgin word inserted",
      "  ✗ 'Through every storm I rise, na so e be for me' — mostly English with Pidgin ending",
      "",
      "STRONG PIDGIN LINES (examples of what to write):",
      "  ✓ 'Na you I want — no be lie, I swear' — Pidgin-first construction with emotional hit",
      "  ✓ 'Life dey hard but I no go fall — God dey' — Pidgin rhythm and logic throughout",
      "  ✓ 'Wetin I pass through, na only God sabi' — full Pidgin sentence with weight",
      "  ✓ 'I don arrive — make dem observe now' — completion + flex in Pidgin",
      "  ✓ 'Since I see you, my heart no rest again' — Pidgin thought structure naturally",
      "  ✓ 'How you just comot like dat — like I be nothing?' — raw heartbreak in pure Pidgin",
      "  ✓ 'I hustle quiet — God dey see am for me' — hustle and faith in natural Pidgin voice",
      "",
      "── PIDGIN GRAMMAR REFERENCE ──",
      "  Na = is/are/it is/emphasis: 'Na you I need', 'Na so e be', 'Na God I thank'",
      "  Dey = continuous state/location: 'I dey feel you', 'wahala dey', 'e dey sweet me'",
      "  Don = completed: 'I don see am', 'e don happen', 'we don try'",
      "  Wey = who/which/that: 'person wey I love', 'thing wey dey pain me'",
      "  Fit = can/able: 'I no fit explain', 'e no fit reach my level'",
      "  E = it/he/she: 'e sweet', 'e hard', 'e dey pain me choke'",
      "  Choke/die at end = extreme intensity: 'e sweet die', 'I love you die'",
      "  Abi = tag question/confirmation: 'na so e be, abi?' | Sha = softener/emphasis",
      "  Wahala = trouble: 'no wahala' / 'wahala dey' | Sabi = know: 'I sabi', 'nobody sabi'",
      "  Carry = bring/take emotionally: 'God carry me come here' | Comot = leave: 'e comot my life'",
      "",
      "── EMOTIONAL PHRASE ANCHORS BY SONG TYPE ──",
      "  AFROBEATS/STREET:    'I don arrive — make dem observe' | 'e dey sweet me anytime I see you' | 'na you ginger me, nobody else fit'",
      "  HEARTBREAK:          'you leave me like I never matter' | 'how you just comot like dat?' | 'the love wey I give you, e no deserve waste'",
      "  HUSTLE SONGS:        'I hustle quiet — God dey see am' | 'dem say I no go make am — I don make am' | 'from nothing I build everything'",
      "  PRAYER/TESTIMONY:    'God I thank you — you too much' | 'na your hand wey carry me reach here' | 'I go testify, see wetin Him do'",
      "  PAIN:                'e dey pain me but I no go show dem' | 'tears I cry, na inside I cry am' | 'I carry the load wey nobody see'",
      "  LOVE:                'since I see you, my heart no rest' | 'you dey sweet me die, I no go lie' | 'wetin you do me — I no sabi explain'",
      "",
      "── HOOK / CHORUS CONSTRUCTION ──",
      "The Pidgin hook feels like the most honest thing someone could say — then turned into music.",
      "It should sound like real speech elevated into song, not a slogan or an English idea in Pidgin disguise.",
      "SIMPLER IS STRONGER. The hook that hits hardest is often the one that says the most obvious truth in the most natural way.",
      "Do not over-write the chorus. A short, chantable, honest hook ALWAYS outperforms a complex poetic one.",
      "  ✓ 'Na you I want — no be lie'",
      "  ✓ 'God you too much — I no fit repay'",
      "  ✓ 'Since I see you, my life change'",
      "  ✓ 'I don try — e reach God hand now'",
      "  ✓ 'E dey pain me — but I no go stop'",
      "  ✓ 'I hustle hard — God see am, e know'",
      "  ✗ REJECTED: 'You are the only one I want in my life' (pure English — no Pidgin DNA)",
      "  ✗ REJECTED: 'I have been waiting for someone like you forever' (textbook English flow)",
      "  ✗ REJECTED: 'Through every struggle my soul dey rise to the top' (AI abstraction with Pidgin word)",
      "  ✗ REJECTED: 'Together we shine like the stars, na so e be' (generic motivational, English-first)",
      "",
      "── SECTION-BY-SECTION DIALECT STANDARD ──",
      "  INTRO:  Pidgin conversational opener — pull them in with real spoken-word authenticity — set the world simply",
      "  VERSES: Pidgin-first storytelling — how real people speak, elevated to song — every 4-bar group must advance the story",
      "  CHORUS: most singable, most emotionally direct — Pidgin construction, not English idea — simplest and most honest",
      "  BRIDGE: raw Pidgin confession — most honest moment, drop the performance — truth over craft here",
      "  OUTRO:  close with Pidgin weight — must be as native as the intro — do not drift toward English at the end",
      "",
      "── AUTHENTICITY TARGET ──",
      "55–70% Pidgin flavor with natural code-switching. Commercial, singable, emotionally real.",
      "Not mockery. Not caricature. Real Nigerian / Ghanaian artist voice.",
      "EVERY section from intro to outro must maintain the same dialect standard — no late-song drift toward English.",
      "╔══════════════════════════════════════════════╗",
      "  Every line you write must pass the dialect-first test before it stays.",
      "  If even one line fails — rewrite it. The whole song must be consistent.",
      "╚══════════════════════════════════════════════╝",
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
    `✓ LANGUAGE: ${effectiveFlavor} — DIALECT-FIRST, not English-first. Conceive every line in the dialect. Do NOT write in English then translate.`,
    `✓ DIALECT SELF-TEST: before keeping ANY line, ask — 'If I removed the dialect words, is this still standard English?' — If YES, the line fails. Rebuild it natively.`,
    `✓ ANTI-PATTERN: reject any line that feels like 'English with slang decoration'. Every line must have native dialect construction at its core.`,
    `✓ AI-ABSTRACTION CHECK: before keeping any line, ask — 'Is this concrete and human, or vague and poetic?' — reject vague spiritual abstraction, generic motivational uplift, and floating metaphors with no cultural anchor.`,
    `✓ CONSISTENCY ENFORCEMENT: the dialect standard must hold from the first intro line to the last outro line. If ANY section drifts toward English-first construction, rewrite it before returning the output.`,
    `✓ HOOK SIMPLICITY: the best hook is the simplest, most honest, most natural version of what this song is feeling — not the most poetic or complex. If the hook sounds over-written, simplify it.`,
    "✓ KEEPER LINE: silently generate 1 MAIN KEEPER LINE + 2 BACKUP KEEPER LINES before writing",
    "✓ MAIN KEEPER LINE: must appear in BOTH the Chorus (hook) AND the Outro — this is non-negotiable",
    "✓ INTRO DISCIPLINE: intro is atmospheric only — it must NOT deliver the hook — if the intro could be mistaken for a chorus, rewrite it",
    "✓ TITLE: derive from the keeper line — 1 to 5 words, emotionally sharp, commercially credible",
    "✓ HOOK ENFORCER: before finalizing chorus, run 5 checks — (1) would fans scream this live? (2) is it caption-worthy? (3) is it simple and memorable? (4) does it match verse emotion? (5) is it unique? — if any NO → rewrite",
    "✓ VERSE QUALITY: every 4-bar group must advance the story — no filler, no repeated imagery from Verse 1 to Verse 2",
    "✓ BRIDGE LAW: exactly 4 lines, no exceptions — reflective or intensifying — turns the emotional direction of the record",
    "✓ OUTRO LABEL: label as 'Outro' only — never 'Outro / Final Chorus' — write as a closer, not a launcher",
    "✓ NATURALNESS: reject any line that sounds robotic, formal, or AI-generated — every line must be singable by a real artist in one take",
    "✓ TIGHTNESS: fewer, stronger lines — every line must earn its place — simpler and more direct always beats longer and more elaborate",
    "✓ OUTPUT: ONLY the lyrics JSON object (title, keeperLine, keeperLineBackups, intro, verse1, hook, verse2, bridge, outro) — no production fields, no text, no commentary",
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

// ─── Models ───────────────────────────────────────────────────────────────────
// Llama-4-Maverick: primary lyrics author (creative writing, dialect authenticity)
// Qwen3.5-122B:     flow / production details (metadata, stems, guidance, notes)

const LLAMA_MAVERICK_MODEL = { id: "meta/llama-4-maverick-17b-128e-instruct", name: "Llama-4-Maverick", temperature: 0.92 };
const QWEN_FLOW_MODEL      = { id: "qwen/qwen3.5-122b-a10b",                  name: "Qwen3.5-122B",    temperature: 0.80 };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function draftToLyricsText(draft: SongDraft): string {
  const sections: string[] = [];
  if (Array.isArray(draft.intro))   sections.push(`[Intro]\n${(draft.intro as string[]).join("\n")}`);
  if (Array.isArray(draft.verse1))  sections.push(`[Verse 1]\n${(draft.verse1 as string[]).join("\n")}`);
  if (Array.isArray(draft.hook))    sections.push(`[Chorus]\n${(draft.hook as string[]).join("\n")}`);
  if (Array.isArray(draft.verse2))  sections.push(`[Verse 2]\n${(draft.verse2 as string[]).join("\n")}`);
  if (Array.isArray(draft.bridge))  sections.push(`[Bridge]\n${(draft.bridge as string[]).join("\n")}`);
  if (Array.isArray(draft.outro))   sections.push(`[Outro]\n${(draft.outro as string[]).join("\n")}`);
  return sections.join("\n\n");
}

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

  const selectedGenre  = genre?.trim()          || "Afrobeats";
  const selectedMood   = mood?.trim()            || "Uplifting";
  const selectedLength = ["Short", "Standard", "Full"].includes(songLength ?? "") ? songLength! : "Standard";
  const selectedFlavor = languageFlavor?.trim()  || "Global English";
  const selectedDepth  = lyricalDepth            ?? "Balanced";
  const selectedRepeat = hookRepeat              ?? "Medium";
  const selectedGender = genderVoiceModel        ?? "Random";
  const selectedFeel   = performanceFeel         ?? "Smooth";

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
    lyricalDepth: selectedDepth,
    hookRepeat: selectedRepeat,
    lyricsSource: lyricsSource ?? "Studio Lyrics",
    genderVoiceModel: selectedGender,
    performanceFeel: selectedFeel,
  };

  const ai = new OpenAI({
    apiKey,
    baseURL: "https://integrate.api.nvidia.com/v1",
  });

  const parseJson = (raw: string): Record<string, unknown> | null => {
    try {
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : cleaned) as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  // ── Call lyrics model (Llama-4-Maverick) ─────────────────────────────────
  const callLyricsModel = async (
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
      const raw  = response.choices[0]?.message?.content ?? "";
      const draft = parseJson(raw) as SongDraft | null;
      const validation = draft ? validateStructure(draft) : { valid: false, failures: ["parse error"] };
      return { model: model.name, draft, validation };
    } catch (err) {
      logger.warn({ model: model.name, err }, "Lyrics model call failed");
      return { model: model.name, draft: null, validation: { valid: false, failures: ["api error"] } };
    }
  };

  // ── Call flow/production model (Qwen) ───────────────────────────────────
  const callFlowModel = async (lyricsDraft: SongDraft): Promise<Record<string, unknown> | null> => {
    try {
      const effectiveFlavor = promptParams.languageFlavor === "Custom" && promptParams.customFlavor?.trim()
        ? `Custom: ${promptParams.customFlavor.trim()}`
        : promptParams.languageFlavor;

      const flowPrompt = buildFlowPrompt({
        topic,
        genre: selectedGenre,
        mood: selectedMood,
        languageFlavor: effectiveFlavor,
        lyricalDepth: selectedDepth,
        performanceFeel: selectedFeel,
        genderVoiceModel: selectedGender,
        hookRepeat: selectedRepeat,
        title: (lyricsDraft.title as string) ?? topic,
        keeperLine: (lyricsDraft.keeperLine as string) ?? "",
        lyricsText: draftToLyricsText(lyricsDraft),
      });

      const response = await ai.chat.completions.create({
        model: QWEN_FLOW_MODEL.id,
        messages: [
          { role: "system", content: FLOW_SYSTEM_PROMPT },
          { role: "user", content: flowPrompt },
        ],
        temperature: QWEN_FLOW_MODEL.temperature,
        top_p: 0.9,
        max_tokens: 2800,
      });

      const raw = response.choices[0]?.message?.content ?? "";
      return parseJson(raw);
    } catch (err) {
      logger.warn({ err }, "Flow model (Qwen) call failed — production details will be omitted");
      return null;
    }
  };

  try {
    const userPrompt = buildUserPrompt(promptParams, false);

    // ── Round 1 — Llama-4-Maverick lyrics generation ──────────────────────
    logger.info("Starting Llama-4-Maverick lyrics generation (round 1)");
    const result1 = await callLyricsModel(LLAMA_MAVERICK_MODEL, userPrompt);

    let finalLyricsDraft: SongDraft | null = null;

    if (result1.validation.valid) {
      logger.info({ model: result1.model }, "Llama-4-Maverick passed structure validation (round 1)");
      finalLyricsDraft = result1.draft;
    } else {
      logger.warn({ model: result1.model, failures: result1.validation.failures }, "Llama-4-Maverick failed structure validation — triggering strict retry");

      // ── Round 2 — strict retry ─────────────────────────────────────────
      const strictPrompt = buildUserPrompt(promptParams, true);
      const result2 = await callLyricsModel(LLAMA_MAVERICK_MODEL, strictPrompt);

      if (result2.validation.valid) {
        logger.info({ model: result2.model }, "Llama-4-Maverick passed structure validation (round 2)");
        finalLyricsDraft = result2.draft;
      } else {
        logger.warn({ model: result2.model, failures: result2.validation.failures }, "Llama-4-Maverick failed both rounds — using best available draft");
        // Use whichever round had fewer failures
        finalLyricsDraft = (result1.draft && result2.draft)
          ? (result2.validation.failures.length <= result1.validation.failures.length ? result2.draft : result1.draft)
          : (result1.draft ?? result2.draft);
      }
    }

    if (!finalLyricsDraft) {
      res.status(500).json({ error: "Failed to generate a song. Please try again." });
      return;
    }

    // ── Qwen flow/production details — runs after lyrics are finalized ────
    logger.info("Starting Qwen3.5-122B flow/production details generation");
    const flowData = await callFlowModel(finalLyricsDraft);

    if (flowData) {
      logger.info("Qwen flow details generated — merging with lyrics draft");
    } else {
      logger.warn("Qwen flow details unavailable — returning lyrics-only draft");
    }

    // ── Merge lyrics + production details into final draft ────────────────
    const mergedDraft: SongDraft = {
      ...finalLyricsDraft,
      ...(flowData ?? {}),
    };

    res.json({ draft: mergedDraft });
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
