// /naming/tier1-relational — the Tier-1 RELATIONAL namer (the M2 differentiator).
//
// nameTier1 computes the spec §2 A-E taxonomy FROM FACTS and JOINS to the GLOBAL,
// tuning-agnostic rules (ADR 0002): the engine computes the keys (frame, droneDegree,
// intervalClass), the KB supplies the matching rule's phrase template + provenance, and
// the engine fills the {slots} with computed values (spec §5; ADR 0003 grounding). Every
// checkable claim carries a trace (the rule id, or "computed"). The frame taxonomy
// doubles as the T1<->T2 router (R4): no A-C frame -> handoff to Tier-2 absolute naming.
//
// Pure function, no hidden state (matches /core, /projection conventions). The card +
// rule bundle are passed IN (loaded by /kb), so this stays a pure transform of data.

import type { GradedTension, PlacedPosition, Tuning } from '../../core';
import { intervalClass, pitchClass, spell, toPitchClass } from '../../core';
import type { GrammarCard, Rule, RuleBundle } from '../../kb';
import { detectChord, droneDegree, romanNumeral } from './theory';
import type {
  ActiveVoice,
  Decomposition,
  DroneRole,
  DroneVoice,
  Frame,
  Tier1Result,
  TensionVsPedal,
  Trace,
} from './types';

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Fill {slot} tokens in a KB phrase template with computed values (spec §5). Unknown
 *  slots are left intact so a template/engine mismatch is visible rather than silent. */
function fillSlots(phrase: string, slots: Readonly<Record<string, string | number>>): string {
  return phrase.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in slots ? String(slots[name]) : whole,
  );
}

/** Find a rule by id within a rule-set array. */
function ruleById(set: readonly Rule[], id: string): Rule | undefined {
  return set.find((r) => r.id === id);
}

/** Match a tension-table rule by interval class (its `key.intervalClass` may be a
 *  single number or an array of classes, e.g. ic [3,4]). */
function tensionRuleForIc(set: readonly Rule[], ic: number): Rule | undefined {
  return set.find((r) => {
    const k = (r.key as { intervalClass?: number | number[] }).intervalClass;
    if (Array.isArray(k)) return k.includes(ic);
    return k === ic;
  });
}

/** Match a drone-role rule by the computed drone degree (its `key.droneDegree`). */
function droneRoleRuleForDegree(set: readonly Rule[], degree: number): Rule | undefined {
  return set.find(
    (r) =>
      r.category === 'drone-role' &&
      (r.key as { droneDegree?: number }).droneDegree === degree,
  );
}

/** Pitch-class set of the home chord = the open-string sonority of the tuning. */
function homePcSet(card: GrammarCard): ReadonlySet<number> {
  return new Set(card.strings.map((m) => ((m % 12) + 12) % 12));
}

/** Is this shape a flat FULL barre (every string fretted at the same fret N>0)? Such a
 *  shape transposes the home chord up N (the og-major-barre movable shape). */
function fullBarreFret(
  positions: readonly PlacedPosition[],
  stringCount: number,
): number | null {
  if (positions.length !== stringCount) return null;
  const frets = new Set(positions.map((p) => p.fret));
  if (frets.size !== 1) return null;
  const fret = positions[0].fret;
  return fret > 0 ? fret : null;
}

/** A tonic-name slot value for phrases (e.g. "G major"'s key center -> "G"). */
function tonicName(tonicPc: number): string {
  return SHARP_NAMES[((tonicPc % 12) + 12) % 12];
}

/**
 * nameTier1 — compute the relational reading of a shape and join it to the global rules.
 *
 * @param positions  the placed shape (string + fret). Fret 0 = open (a ringing drone).
 * @param tuning     the tuning (open-string pitches; index carries no order meaning).
 * @param card       the grammar card for this tuning (home chord, movable shapes).
 * @param rules      the global rule bundle (relational vocabulary + tension + tendencies).
 */
export function nameTier1(
  positions: readonly PlacedPosition[],
  tuning: Tuning,
  card: GrammarCard,
  rules: RuleBundle,
): Tier1Result {
  const traces: Trace[] = [];
  const addTrace = (claim: string, source: string) => traces.push({ claim, source });

  // ── Decomposition (spec §1): drones (open, fret 0) vs active voices (fretted) ──
  const drones: DroneVoice[] = [];
  const activeVoices: ActiveVoice[] = [];
  for (const p of positions) {
    const pitch = (tuning.openStrings[p.string] as number) + p.fret;
    const pc = toPitchClass(pitch);
    if (p.fret === 0) {
      drones.push({ string: p.string, pitch, pitchClass: pc });
    } else {
      activeVoices.push({ string: p.string, fret: p.fret, pitch, pitchClass: pc });
    }
  }
  const decomposition: Decomposition = { drones, activeVoices };

  const tonicPc = tuning.tonic as number;
  const allPcs = new Set(positions.map((p) => toPitchClass((tuning.openStrings[p.string] as number) + p.fret) as number));
  const home = homePcSet(card);

  // ── FRAME classification (priority order; spec §2 A-C) ──
  let frame: Frame | null = null;
  // The chord root the drone roles + roman numeral are read against (set by the frame).
  let chordRootPc: number | null = null;

  const setsEqual = (a: ReadonlySet<number>, b: ReadonlySet<number>): boolean => {
    if (a.size !== b.size) return false;
    for (const x of a) if (!b.has(x)) return false;
    return true;
  };

  // 1. HOME — the shape's pitch-classes equal the open-string sonority (the I).
  if (positions.length > 0 && setsEqual(allPcs, home)) {
    const rule = ruleById(rules.relationalVocabulary, 'frame-home');
    chordRootPc = tonicPc;
    const phrase = rule?.phrase
      ? fillSlots(rule.phrase, { tonicName: tonicName(tonicPc) })
      : `you're holding the home chord -- the I in ${tonicName(tonicPc)}`;
    frame = {
      category: 'home',
      term: rule?.term ?? 'the home chord (I)',
      phrase,
      romanNumeral: 'I',
      chordRoot: pitchClass(tonicPc),
      chordName: `${tonicName(tonicPc)} major`,
      ruleId: 'frame-home',
      provenanceKind: rule?.provenance.kind ?? 'theory',
    };
    addTrace('frame', 'frame-home');
  }

  // 2. HOME-TRANSPOSED — a flat full barre at fret N transposes the home chord up N.
  if (frame === null) {
    const barreFret = fullBarreFret(positions, tuning.openStrings.length);
    if (barreFret !== null) {
      const newRoot = ((tonicPc + barreFret) % 12 + 12) % 12;
      const rn = romanNumeral(newRoot, tonicPc);
      chordRootPc = newRoot;
      const rule = ruleById(rules.relationalVocabulary, 'frame-home-transposed');
      const phrase = rule?.phrase
        ? fillSlots(rule.phrase, {
            fret: barreFret,
            chordRoot: SHARP_NAMES[newRoot],
            romanNumeral: rn,
          })
        : `a flat barre at fret ${barreFret} -- the home chord up to ${SHARP_NAMES[newRoot]} (${rn})`;
      frame = {
        category: 'home-transposed',
        term: rule?.term ?? 'the I, moved up',
        phrase,
        romanNumeral: rn,
        chordRoot: pitchClass(newRoot),
        chordName: `${SHARP_NAMES[newRoot]} major`,
        ruleId: 'frame-home-transposed',
        provenanceKind: rule?.provenance.kind ?? 'theory',
      };
      addTrace('frame', 'frame-home-transposed');
    }
  }

  // 4. DIATONIC-FUNCTION — active voices (+ drones) spell another chord in the key;
  //    name it by its function relative to the tonic. (Modification, B/§3, is folded
  //    into this path: an unmatched modifier still resolves via the detected chord.)
  if (frame === null) {
    // Prefer the ACTIVE-voice sonority for the chord identity (the fretted notes carry
    // it; the drones are read as roles against it — spec §6). Fall back to all pitches.
    const activePcs = activeVoices.map((a) => a.pitchClass as number);
    const bassActive = activeVoices.length
      ? activeVoices.reduce((lo, a) => (a.pitch < lo.pitch ? a : lo)).pitchClass as number
      : undefined;
    const detected =
      detectChord(activePcs.length ? activePcs : Array.from(allPcs), bassActive) ??
      detectChord(Array.from(allPcs));

    if (detected) {
      chordRootPc = detected.rootPc as number;
      const rn = romanNumeral(chordRootPc, tonicPc);
      const rule = ruleById(rules.relationalVocabulary, 'frame-diatonic-function');
      const phrase = rule?.phrase
        ? fillSlots(rule.phrase, {
            tonicName: tonicName(tonicPc),
            romanNumeral: rn,
            chordName: detected.name,
          })
        : `over the ${tonicName(tonicPc)} drones this is the ${rn} (${detected.name})`;
      frame = {
        category: 'diatonic-function',
        term: rule?.term ?? 'diatonic function',
        phrase,
        romanNumeral: rn,
        chordRoot: pitchClass(chordRootPc),
        chordName: detected.name,
        ruleId: 'frame-diatonic-function',
        provenanceKind: rule?.provenance.kind ?? 'theory',
      };
      addTrace('frame', 'frame-diatonic-function');

      // Add the function tendency as a supporting trace when one matches the numeral.
      const tendency = rules.functionTendencies.find(
        (r) => (r.key as { function?: string }).function === rn,
      );
      if (tendency) addTrace('function-tendency', tendency.id);
    }
  }

  // ── DRONE ROLES (D): each open string's degree vs the resulting chord root ──
  const droneRoles: DroneRole[] = [];
  if (chordRootPc !== null) {
    for (const d of drones) {
      const degree = droneDegree(d.pitchClass as number, chordRootPc);
      const rule = droneRoleRuleForDegree(rules.relationalVocabulary, degree);
      const droneNote = spell(d.pitchClass, { tonic: pitchClass(tonicPc) });
      const phrase = rule?.phrase
        ? fillSlots(rule.phrase, { droneNote })
        : `the open ${droneNote} rings through as the ${degree}`;
      droneRoles.push({
        string: d.string,
        droneDegree: degree,
        term: rule?.term ?? `the ${degree}`,
        phrase,
        tension: rule?.tension,
        ruleId: rule?.id ?? 'computed',
      });
      addTrace('drone-role', rule?.id ?? 'computed');
    }
  }

  // ── TENSION-VS-PEDAL (E): pairwise active voice x drone, graded on interval class ──
  const tensionVsPedal: TensionVsPedal[] = [];
  for (const a of activeVoices) {
    for (const d of drones) {
      const ic = intervalClass((a.pitchClass as number) - (d.pitchClass as number));
      const rule = tensionRuleForIc(rules.tensionTable, ic);
      const tension: GradedTension = rule?.tension ?? 'consonant';
      const rank = rule?.rank ?? 1;
      tensionVsPedal.push({
        activeString: a.string,
        droneString: d.string,
        intervalClass: ic,
        tension,
        rank,
        ruleId: rule?.id ?? 'computed',
      });
      addTrace('tension-vs-pedal', rule?.id ?? 'computed');
    }
  }

  // ── HANDOFF (R4): no A-C frame fits -> hand off to Tier-2 absolute naming ──
  const handoff =
    frame === null
      ? {
          toTier2: true,
          reason: 'no home / transposed / diatonic frame fits this shape; needs absolute (Tier-2) naming',
        }
      : { toTier2: false, reason: 'a relational frame was found' };

  // ── SENTENCE: assemble from the filled phrase templates (frame + drone roles) ──
  const sentence = assembleSentence(frame, droneRoles, tensionVsPedal);

  return { decomposition, frame, droneRoles, tensionVsPedal, sentence, traces, handoff };
}

/** Assemble the relational sentence from the grounded phrase templates. The frame leads;
 *  notable drone roles (9th/13th/pedal) and any `bite` tension are appended. The LLM may
 *  later rephrase this for warmth, but every slot fact here is computed/traced (spec §5). */
function assembleSentence(
  frame: Frame | null,
  droneRoles: readonly DroneRole[],
  tension: readonly TensionVsPedal[],
): string {
  if (frame === null) {
    return "this shape doesn't sit as a relational frame -- read it as an absolute chord name instead";
  }
  const parts: string[] = [frame.phrase];

  // Surface the colour-bearing drone roles (9th / 13th / pedal 5th) inline, de-duped by
  // phrase: several strings can carry the SAME role (e.g. three open D's all pedalling the
  // 5th) — that is one relational statement, said once. Per-string roles + traces are still
  // reported in full on the structured result; only the prose clause collapses.
  const colourRoles = droneRoles.filter((r) => r.droneDegree === 9 || r.droneDegree === 13 || r.droneDegree === 5);
  const seenPhrases = new Set<string>();
  for (const r of colourRoles) {
    if (seenPhrases.has(r.phrase)) continue;
    seenPhrases.add(r.phrase);
    parts.push(r.phrase);
  }

  // Surface the strongest bite, if any (the textural payload, spec §E).
  const bite = tension.find((t) => t.tension === 'bite' || t.tension === 'unstable');
  if (bite) {
    parts.push(
      bite.tension === 'unstable'
        ? 'and there is a tritone against the drone that wants to resolve'
        : 'and one fretted note bites a semitone against the drone -- that is the texture, not a wrong note',
    );
  }
  return parts.join(', with ').replace(/, with and /g, ' and ');
}
