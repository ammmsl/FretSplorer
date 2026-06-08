// Runnable demo for the /render adapter + alphaTab playback (R12 + R8 + soundfont R8).
//
// Verifies, in a real browser:
//   - our model -> AlphaTex adapter drives alphaTab to render an ALTERNATE tuning,
//   - alphaSynth plays it through the default (sonivox) soundfont,
//   - let-ring sustains the open strings (the drone premise).
//
// Run: `npm run dev` then open /demos/render-demo.html.

import { AlphaTabApi, FontFileFormat } from '@coderline/alphatab';
// Assets served by Vite via explicit URL imports (the bundled plugin doesn't
// publish the SMuFL font). Bravura draws the notation; sonivox is the soundfont.
import bravuraUrl from '@coderline/alphatab/font/Bravura.woff2?url';
import soundFontUrl from '@coderline/alphatab/soundfont/sonivox.sf3?url';
import { fragmentToAlphaTex } from '../alphaTexAdapter';
import type { RenderFragment } from '../types';

// A few seed fragments built the way /core eventually will (stubbed model side).
// Tunings: string 1 (high) -> string 6 (low), MIDI — matches the KB card schema.
const OPEN_G = [62, 59, 55, 50, 43, 38]; // D4 B3 G3 D3 G2 D2
const DADGAD = [62, 57, 55, 50, 45, 38]; // D4 A3 G3 D3 A2 D2
const STANDARD = [64, 59, 55, 50, 45, 40];

function openChord(strings: number[], title: string): RenderFragment {
  return {
    title,
    tuning: { strings },
    notes: strings.map((_, i) => ({ string: i + 1, fret: 0 })),
    letRingAll: true,
    duration: 1,
  };
}

const FRAGMENTS: Record<string, RenderFragment> = {
  'Open G — open chord (all opens ringing)': openChord(OPEN_G, 'Open G — open drone chord'),
  'DADGAD — open chord (all opens ringing)': openChord(DADGAD, 'DADGAD — open drone chord'),
  'DADGAD — Dsus4 grip over low-D drone': {
    title: 'DADGAD — fretted voice over sustained opens',
    tuning: { strings: DADGAD },
    notes: [
      { string: 1, fret: 0, letRing: true }, // D4
      { string: 2, fret: 0, letRing: true }, // A3
      { string: 3, fret: 2, letRing: true }, // A3 (G string +2) — active voice
      { string: 4, fret: 0, letRing: true }, // D3
      { string: 6, fret: 0, letRing: true }, // low D2 drone
    ],
    duration: 1,
  },
  'Standard EADGBE — open chord (reference)': openChord(STANDARD, 'Standard tuning (reference)'),
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const status = $('status');
const setStatus = (msg: string, err = false) => {
  status.textContent = msg;
  status.className = err ? 'err' : '';
};

const fragmentSelect = $<HTMLSelectElement>('fragment');
for (const name of Object.keys(FRAGMENTS)) {
  const opt = document.createElement('option');
  opt.value = name;
  opt.textContent = name;
  fragmentSelect.append(opt);
}

const api = new AlphaTabApi($('at'), {
  core: {
    engine: 'svg',
    logLevel: 'warning',
    smuflFontSources: new Map([[FontFileFormat.Woff2, bravuraUrl]]),
  },
  player: {
    enablePlayer: true,
    soundFont: soundFontUrl,
    enableCursor: true,
  },
  display: { scale: 1.0 },
});

let tempo = 60;
const tempoInput = $<HTMLInputElement>('tempo');
const tempoVal = $('tempoVal');

function loadCurrentFragment() {
  const fragment = { ...FRAGMENTS[fragmentSelect.value], tempo };
  const tex = fragmentToAlphaTex(fragment);
  $('tex').textContent = tex;
  api.tex(tex);
}

fragmentSelect.addEventListener('change', loadCurrentFragment);
tempoInput.addEventListener('input', () => {
  tempo = Number(tempoInput.value);
  tempoVal.textContent = String(tempo);
  loadCurrentFragment();
});

$('play').addEventListener('click', () => api.playPause());
$('stop').addEventListener('click', () => api.stop());

api.error.on((e) => setStatus(`alphaTab error: ${String((e as Error)?.message ?? e)}`, true));
api.renderFinished.on(() => setStatus('rendered ✓ — load soundfont to play'));
api.soundFontLoaded.on(() => {
  setStatus('soundfont loaded ✓ — ready to play');
  ($('play') as HTMLButtonElement).disabled = false;
  ($('stop') as HTMLButtonElement).disabled = false;
});
api.playerStateChanged.on((e) => {
  // 0 = paused/stopped, 1 = playing (PlayerState enum)
  setStatus(e.state === 1 ? 'playing — listen to the opens ring/bloom (R8)' : 'stopped');
});

loadCurrentFragment();

// Expose for headless/automated verification (Playwright).
interface DemoHandle {
  isSoundFontLoaded: boolean;
  isReadyForPlayback: boolean;
  currentTex: () => string;
}
(window as unknown as { __demo: DemoHandle; __api: AlphaTabApi }).__demo = {
  isSoundFontLoaded: false,
  isReadyForPlayback: false,
  currentTex: () => $('tex').textContent ?? '',
};
(window as unknown as { __api: AlphaTabApi }).__api = api;
api.soundFontLoaded.on(() => {
  (window as unknown as { __demo: DemoHandle }).__demo.isSoundFontLoaded = true;
});
api.playerReady.on(() => {
  (window as unknown as { __demo: DemoHandle }).__demo.isReadyForPlayback = true;
});
