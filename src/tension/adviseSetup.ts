// advise_setup(tuning, gauges?, scaleLength) — the string-tension / setup advisor.
//
// A PURE function over a tuning's per-string target pitches (MIDI). It computes,
// per string: tension (lb / N / kgf), a feel band, a break-risk assessment, the
// three headline flags (floppy / fine / break-risk), and a gauge recommendation.
//
// Grounding discipline (docs/03-architecture.md): every checkable number traces to
// the validated formula + authoritative data. Editorial judgements (feel bands)
// are flagged as such; unknowable facts (wound-core break tension) are reported as
// uncertain rather than guessed.

import type {
  AdviseOptions,
  BreakAssessment,
  Flag,
  GaugeInput,
  GaugeResolved,
  GaugeSpec,
  Instrument,
  Material,
  Recommendation,
  SetupAdvice,
  StringAdvice,
  TensionBand,
  Tuning,
} from './types';
import {
  lbToKgf,
  lbToNewton,
  midiToFrequency,
  midiToNoteName,
  tensionLb,
} from './formula';
import {
  entriesForMaterial,
  nearestEntry,
  UNIT_WEIGHT_SOURCE,
  type UnitWeightEntry,
} from './data/unitWeights';
import { breakTensionLbPlainSteel, WIRE_STRENGTH_SOURCE } from './data/wireStrength';
import { BREAK_MARGIN, COMFORT_BANDS, COMFORT_SOURCE } from './data/comfort';

/** Gauges at or below this default to plain steel; thicker default to wound. */
const PLAIN_MAX_GAUGE = 0.018;

function woundMaterialFor(instrument: Instrument): Material {
  return instrument === 'acoustic' ? 'phosphor-bronze' : 'nickel-wound';
}

function inferMaterial(gauge: number, instrument: Instrument): Material {
  return gauge <= PLAIN_MAX_GAUGE ? 'plain-steel' : woundMaterialFor(instrument);
}

function normalizeGaugeInput(input: GaugeInput): GaugeSpec | null {
  if (input == null) return null;
  if (typeof input === 'number') return { gauge: input };
  return input;
}

/** Resolve a supplied gauge to a catalog entry (nearest match, flagged if approximated). */
function resolveSupplied(spec: GaugeSpec, instrument: Instrument): GaugeResolved {
  const material = spec.material ?? inferMaterial(spec.gauge, instrument);
  const entry = nearestEntry(spec.gauge, material);
  const approximated = Math.abs(entry.gauge - spec.gauge) > 1e-9;
  return {
    gauge: spec.gauge,
    material,
    estimated: false,
    item: entry.item,
    unitWeight: entry.uw,
    approximated,
  };
}

/**
 * Estimate a gauge for a target pitch: prefer a plain-steel gauge if one in the
 * comfortable feel range exists for this pitch, otherwise the closest wound gauge.
 */
function estimateGauge(midi: number, scaleLengthIn: number, instrument: Instrument): GaugeResolved {
  const freq = midiToFrequency(midi);
  const band = COMFORT_BANDS[instrument];
  const tensionOf = (e: UnitWeightEntry) => tensionLb(e.uw, scaleLengthIn, freq);

  // Plain-steel candidates that land within the playable feel range for this pitch.
  const plainInBand = entriesForMaterial('plain-steel')
    .filter((e) => e.gauge <= PLAIN_MAX_GAUGE)
    .filter((e) => {
      const t = tensionOf(e);
      return t >= band.floppyBelowLb && t <= band.tightAboveLb;
    });

  let pool: UnitWeightEntry[];
  if (plainInBand.length > 0) {
    pool = plainInBand;
  } else {
    pool = entriesForMaterial(woundMaterialFor(instrument));
  }

  let best = pool[0];
  let bestDist = Math.abs(tensionOf(best) - band.targetLb);
  for (const e of pool) {
    const d = Math.abs(tensionOf(e) - band.targetLb);
    if (d < bestDist) {
      best = e;
      bestDist = d;
    }
  }
  return {
    gauge: best.gauge,
    material: best.material,
    estimated: true,
    item: best.item,
    unitWeight: best.uw,
    approximated: false,
  };
}

function classifyBand(tLb: number, instrument: Instrument): TensionBand {
  const b = COMFORT_BANDS[instrument];
  if (tLb < b.floppyBelowLb) return 'very-loose';
  if (tLb < b.looseBelowLb) return 'loose';
  if (tLb <= b.tightAboveLb) return 'comfortable';
  if (tLb <= b.veryTightAboveLb) return 'tight';
  return 'very-tight';
}

function assessBreak(resolved: GaugeResolved, tLb: number): BreakAssessment {
  if (resolved.material === 'plain-steel') {
    const breakTensionLb = breakTensionLbPlainSteel(resolved.gauge);
    const fraction = tLb / breakTensionLb;
    let level: BreakAssessment['level'];
    if (fraction >= 1) level = 'over-limit';
    else if (fraction >= BREAK_MARGIN.highFraction) level = 'high';
    else if (fraction >= BREAK_MARGIN.cautionFraction) level = 'caution';
    else level = 'safe';
    return {
      level,
      breakTensionLb,
      fractionOfBreak: fraction,
      model: 'astm-a228-plain-steel',
      uncertain: false,
    };
  }
  // Wound: break tension is core-limited and the core diameter is unpublished.
  // Reporting a guess here could mark an unsafe setup as fine, so we don't.
  return {
    level: 'unknown',
    breakTensionLb: null,
    fractionOfBreak: null,
    model: 'wound-core-unavailable',
    uncertain: true,
    note:
      'Wound-string break tension is borne by an unpublished steel core; it cannot ' +
      'be computed from the outer gauge. Treat very-tight wound strings cautiously.',
  };
}

function deriveFlag(band: TensionBand, breakRisk: BreakAssessment): Flag {
  if (breakRisk.level === 'high' || breakRisk.level === 'over-limit') return 'break-risk';
  if (band === 'very-loose') return 'floppy';
  return 'fine';
}

/** Pick the gauge of `material` whose tension is closest to `targetLb` for this pitch. */
function bestGaugeForTarget(
  freq: number,
  scaleLengthIn: number,
  material: Material,
  targetLb: number,
): { entry: UnitWeightEntry; tensionLb: number } {
  const pool = entriesForMaterial(material);
  let best = pool[0];
  let bestT = tensionLb(best.uw, scaleLengthIn, freq);
  let bestDist = Math.abs(bestT - targetLb);
  for (const e of pool) {
    const t = tensionLb(e.uw, scaleLengthIn, freq);
    const d = Math.abs(t - targetLb);
    if (d < bestDist) {
      best = e;
      bestT = t;
      bestDist = d;
    }
  }
  return { entry: best, tensionLb: bestT };
}

function buildRecommendation(
  resolved: GaugeResolved,
  band: TensionBand,
  flag: Flag,
  midi: number,
  scaleLengthIn: number,
  instrument: Instrument,
): Recommendation | null {
  // Only suggest a change when there is something to fix.
  const needsChange =
    flag === 'break-risk' || band === 'very-loose' || band === 'very-tight' || band === 'tight' || band === 'loose';
  if (!needsChange) return null;

  const freq = midiToFrequency(midi);
  const target = COMFORT_BANDS[instrument].targetLb;
  // Keep the same material family where it can reach target; otherwise let the
  // material switch (e.g. break-risk plain string -> a wound string at this pitch).
  const sameFamily = bestGaugeForTarget(freq, scaleLengthIn, resolved.material, target);

  let chosen = sameFamily;
  let switched = false;
  if (flag === 'break-risk' && resolved.material === 'plain-steel') {
    // A plain string near its breaking point at this pitch — a wound string is safer.
    const wound = bestGaugeForTarget(freq, scaleLengthIn, woundMaterialFor(instrument), target);
    if (Math.abs(wound.tensionLb - target) < Math.abs(sameFamily.tensionLb - target)) {
      chosen = wound;
      switched = true;
    }
  }

  if (chosen.entry.item === resolved.item && !switched) return null;

  const reason =
    flag === 'break-risk'
      ? `Current choice is in break-risk territory at this pitch; ${chosen.entry.item} ` +
        `(${chosen.entry.gauge}") lands near a comfortable ${chosen.tensionLb.toFixed(1)} lb.`
      : `${chosen.entry.item} (${chosen.entry.gauge}") brings this string nearer a ` +
        `comfortable ${chosen.tensionLb.toFixed(1)} lb (target ~${target} lb).`;

  return {
    gauge: chosen.entry.gauge,
    material: chosen.entry.material,
    item: chosen.entry.item,
    tensionLb: round2(chosen.tensionLb),
    reason,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function adviseString(
  midi: number,
  stringIndex: number,
  gaugeInput: GaugeInput,
  scaleLengthIn: number,
  instrument: Instrument,
): StringAdvice {
  const freq = midiToFrequency(midi);
  const spec = normalizeGaugeInput(gaugeInput);
  const resolved = spec ? resolveSupplied(spec, instrument) : estimateGauge(midi, scaleLengthIn, instrument);

  const tLb = tensionLb(resolved.unitWeight, scaleLengthIn, freq);
  const tension = { lb: round2(tLb), newton: round2(lbToNewton(tLb)), kgf: round2(lbToKgf(tLb)) };
  const band = classifyBand(tLb, instrument);
  const breakRisk = assessBreak(resolved, tLb);
  const flag = deriveFlag(band, breakRisk);

  const notes: string[] = [];
  if (resolved.estimated) {
    notes.push(
      `Gauge estimated (${resolved.item}, ${resolved.gauge}") — no string specified; ` +
        'supply the real gauge for an exact reading.',
    );
  }
  if (resolved.approximated) {
    notes.push(`No exact catalog entry for the supplied gauge; used nearest (${resolved.item}).`);
  }
  if (breakRisk.note) notes.push(breakRisk.note);
  if (flag === 'break-risk') {
    const frac = breakRisk.fractionOfBreak;
    notes.push(
      `BREAK RISK: ~${tension.lb} lb is ${frac ? (frac * 100).toFixed(0) : '?'}% of this ` +
        `string's conservative breaking tension (${breakRisk.breakTensionLb?.toFixed(1)} lb).`,
    );
  }

  const recommendation = buildRecommendation(resolved, band, flag, midi, scaleLengthIn, instrument);
  const uncertain = resolved.estimated || breakRisk.uncertain;

  return {
    stringIndex,
    midi,
    noteName: midiToNoteName(midi),
    frequencyHz: round2(freq),
    gauge: resolved,
    tension,
    band,
    breakRisk,
    flag,
    recommendation,
    uncertain,
    notes,
  };
}

/**
 * Advise on string tension and setup for a tuning.
 *
 * @param tuning  Per-string target pitches (MIDI), string 1 -> string N.
 * @param options Gauges (optional, per string), scale length, instrument.
 */
export function adviseSetup(tuning: Tuning, options: AdviseOptions = {}): SetupAdvice {
  const instrument = options.instrument ?? 'electric';
  const rawScale = options.scaleLength ?? 25.5;
  const scaleLengthIn = options.scaleLengthUnits === 'mm' ? rawScale / 25.4 : rawScale;

  const strings = tuning.strings.map((midi, i) =>
    adviseString(midi, i + 1, options.gauges?.[i], scaleLengthIn, instrument),
  );

  const totalLb = strings.reduce((sum, s) => sum + s.tension.lb, 0);

  const warnings: string[] = [];
  for (const s of strings) {
    if (s.flag === 'break-risk') {
      warnings.push(
        `String ${s.stringIndex} (${s.noteName}, ${s.gauge.item}): break risk at ${s.tension.lb} lb.`,
      );
    }
  }
  if (strings.some((s) => s.gauge.estimated)) {
    warnings.push('Some gauges were estimated; readings for those strings are approximate.');
  }
  if (strings.some((s) => s.gauge.material !== 'plain-steel')) {
    warnings.push(
      'Break risk is computed for plain-steel strings only; wound strings report it as unknown.',
    );
  }

  return {
    scaleLengthIn: round2(scaleLengthIn),
    instrument,
    strings,
    totalTensionLb: round2(totalLb),
    totalTensionNewton: round2(lbToNewton(totalLb)),
    warnings,
    provenance: {
      formula: 'T_lb = UW * (2 * L * F)^2 / 386.4  (UW lb/in, L in, F Hz)',
      constant: 386.4,
      unitWeightSource: `${UNIT_WEIGHT_SOURCE.title} (${UNIT_WEIGHT_SOURCE.retrieved})`,
      wireStrengthSource: `${WIRE_STRENGTH_SOURCE.title} (${WIRE_STRENGTH_SOURCE.retrieved})`,
      comfortBands: COMFORT_SOURCE.note,
      notes: [
        UNIT_WEIGHT_SOURCE.attribution,
        'Feel bands are editorial/heuristic and instrument-dependent; spoken hedged.',
        'Metric: 1 lb = 4.4482216 N = 0.45359237 kgf; metric-native formula in formula.ts.',
      ],
    },
  };
}
