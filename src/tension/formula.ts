// Pure tension physics. No state, no I/O.
//
// Imperial (D'Addario) form:  T_lb = UW * (2 * L * F)^2 / 386.4
//   UW = unit weight (lb/in), L = scale length (in), F = frequency (Hz).
//   386.4 is g expressed in in/s^2 (= 9.81 m/s^2); it converts the lb-force-based
//   unit weight into the mass term the wave equation needs.
//
// Metric-native form:  T_N = mu * (2 * L * F)^2
//   mu = linear mass density (kg/m), L = scale length (m), F = frequency (Hz).
//   No constant: this is the textbook string equation f = (1/2L)*sqrt(T/mu).
//
// Both forms are validated to agree in src/tension/__tests__/formula.test.ts.

export const GRAVITY_IN_S2 = 386.4;
export const LB_TO_NEWTON = 4.4482216153;
export const LB_TO_KGF = 0.45359237;
export const IN_TO_M = 0.0254;

/** MIDI integer -> frequency in Hz (A4 = MIDI 69 = 440 Hz, 12-TET). */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Imperial tension in pounds. UW in lb/in, scale length in inches, frequency in Hz. */
export function tensionLb(unitWeightLbPerIn: number, scaleLengthIn: number, frequencyHz: number): number {
  const v = 2 * scaleLengthIn * frequencyHz;
  return (unitWeightLbPerIn * v * v) / GRAVITY_IN_S2;
}

/** Metric-native tension in Newtons. mu in kg/m, scale length in metres, frequency in Hz. */
export function tensionNewtonMetric(linearMassKgPerM: number, scaleLengthM: number, frequencyHz: number): number {
  const v = 2 * scaleLengthM * frequencyHz;
  return linearMassKgPerM * v * v;
}

export function lbToNewton(lb: number): number {
  return lb * LB_TO_NEWTON;
}

export function lbToKgf(lb: number): number {
  return lb * LB_TO_KGF;
}

export function inchesToMeters(inch: number): number {
  return inch * IN_TO_M;
}

/**
 * D'Addario unit weight (lb/in) -> linear mass density (kg/m).
 *
 * Derived through the SAME gravitational constant the imperial formula uses (386.4
 * in/s^2, D'Addario's rounded g), so the metric-native form reproduces the imperial
 * result exactly rather than drifting ~0.08% from it (386.4 vs the textbook 386.09).
 *   mu = UW[lbf/in] * (N/lbf) / (g[in/s^2] * (m/in)^2)
 */
export function unitWeightToLinearMass(unitWeightLbPerIn: number): number {
  return (unitWeightLbPerIn * LB_TO_NEWTON) / (GRAVITY_IN_S2 * IN_TO_M * IN_TO_M);
}

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI integer -> spelled note name with octave (sharps), e.g. 64 -> 'E4'. */
export function midiToNoteName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${SHARP_NAMES[pc]}${octave}`;
}
