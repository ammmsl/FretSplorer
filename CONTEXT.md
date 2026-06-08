# Fretsplorer — Context

The ubiquitous language of Fretsplorer, a desktop workspace for deliberate exploration of
alternate guitar tunings. A dumb-but-familiar fretboard surface (click to place notes) is
paired with an intelligent conversation that names what you play *relationally* — against
the tuning's own ringing drones and emergent grammar — and grounds every claim in cited
theory. This is one shared vocabulary across the UI/render layer and the knowledge/data
layer; both bind to the terms below.

## Language

### The surface & its necks

**Surface**:
The central fretboard view as a whole — the area where necks are rendered and explored.
_Avoid_: canvas (collides with render tech), workspace.

**Neck**:
A single rendered fretboard instance. Plural, cheap, disposable — the app spawns new necks
beside existing ones rather than overwriting. One conversation may show N necks.
_Avoid_: fretboard (ambiguous — could mean the surface or one neck), board.

**Focused neck**:
The single neck "we're talking about now" — a turn-level focus pointer. Conversation
pronouns resolve to it and the Readout panel mirrors it. Ephemeral, not persisted.
_Avoid_: selected neck, active neck.

**Origin neck**:
The neck the user started from — conventionally "theirs", carrying a persistent subtle
"yours" distinction even amid spawned necks. Not sacred (closable, one of N), but marked
because the change *from* it *to* a spawned neck is what drives the learning path.
_Avoid_: home neck, root neck.

**Nut**:
The heavy divider at the left edge of a neck. The open-string position lives AT the nut, and
clicking a string at the nut plays it open — it is the nut edge itself, not a separate fret-0
column.
_Avoid_: fret 0 (the open position is the nut conceptually, even if pitch math treats open
as fret 0).

**Inlay markers**:
The conventional fret-position dots (3, 5, 7, 9, 12-double, …) drawn for orientation. Purely
navigational — they carry no degree/pitch meaning and must never be confused with
degree-colored note dots.
_Avoid_: position dots, fret dots (when ambiguous with degree dots).

**Capo (visual)**:
A hardware-clamp overlay drawn on the neck at an *absolute* fret — the neck is never
renumbered, so the fixed fret coordinate stays the pedagogical anchor. Modelled as a
per-string capo-fret (a partial capo is a contiguous span from either edge); frets behind it
read as dead, and the open/ringing marker + drone colouring relocate to the capo line.
_Avoid_: barre (a finger, not hardware), renumbered-nut, fret 0.

### Placing & rendering notes

**Grip**:
A specific set of finger placements a user clicks onto a neck — per string, a state of
fretted(N) / open / muted(X) / unplayed. The physical-placement input to relational naming;
nothing sounds until consciously selected.
_Avoid_: chord (a grip may not be a nameable chord), shape, voicing (a voicing is the
realized pitches a grip produces, not the placement itself).

**Open / ringing (string state)**:
A string sounding *without* being actively fretted. The treatment signifies "you are not
fretting this"; it is per-string and capo-relative — under a (partial) capo a string's
effective open position moves from the nut to the capo line.
_Avoid_: conflating "open" with "at fret 0" — under a capo, open ≠ nut.

**Degree dot**:
A note rendered on the neck, coloured by its scale-**degree** relative to the current root
(never by absolute note name). Dual-channel encoding: **shape carries structure, colour
carries degree** — the root is a distinct shape (diamond / double-ring), all other degrees
are plain circles; chord tones read most saturated, extensions lighter. Colourblind-safe by
construction.
_Avoid_: note dot (it's degree-relative, not note-absolute).

**Label mode**:
A toggle on degree dots cycling [none → degree number → note name]. Default = **degree
number**, because the pedagogy is relational; the absolute note name is the grounding
fallback, not the default.
_Avoid_: name toggle.

**Drone status**:
The per-string graded-tension value as *rendered* on a ringing string — painted on its line
plus a halo at the nut/capo position, on a different geometric channel from the degree-dot
fill. Dormant when no harmonic context is set. It is the on-neck visualisation of one
string's entry in the **drone map** (cf. **Degree** vs **Degree dot**).
_Avoid_: drone (the bare noun — reserve "drone" for the musical pedal-tone concept).

### Tuning & anchoring

**Tonic**:
The pitch class that is a tuning's key centre / drone root — the anchor that relational
naming and key-dependent analysis both read. Authorial intent (not always cleanly
computable), so it is **stored** as first-class data on a grammar card.
_Avoid_: key, root (root is a property of a chord, not of a tuning).

**Home chord**:
The chord the open strings actually sound, characterised relative to the **tonic**. Clean
for open tunings (Open G → G major), fuzzy or absent for others (DADGAD → Dsus4; Drop D → no
clean open triad). Derivable from the stored open-string pitches, so it is **derived in
context, never stored**.
_Avoid_: open chord (acceptable informally; "home chord" is canonical), tonic (the tonic is
one pitch class; the home chord is a sonority).

**Drone**:
An open string deliberately left ringing — the pedal against which fretted notes are named
and graded for tension. The reason to retune and the reason capos work.
_Avoid_: pedal (acceptable in prose; "drone" is canonical), open string (an open string is
only a drone when ringing as context).

**Active voice**:
A fretted note in a grip, as opposed to a ringing **drone**. Relational naming decomposes a
grip into drones + active voices and names the active voices as a function of the drones.
_Avoid_: fretted note (acceptable descriptively), melody note, lead.

### Theory objects

**Chord**:
An abstract pitch-class set — a harmonic identity with no octave placement.
_Avoid_: voicing (a voicing is a realisation of a chord, not the chord itself).

**Voicing**:
A specific octave-placed, possibly-doubled realisation of a chord — the actual sounding pitch
multiset. In open tunings the specific voicing/drone colour is often the entire point, so
voicings are first-class, not throwaway renderings.
_Avoid_: chord (see above), grip (a grip is the physical placement; a voicing is the pitches
it produces).

**Degree**:
A note's scale-degree relative to a root (1, b3, 5, 9…) — the tuning-agnostic *meaning* a
lost player anchors to. Overlays are coloured by degree, never by note name, because degree
colour carries the same meaning in every tuning.
_Avoid_: interval (an interval is between two notes; a degree is relative to the root), note
name.

**MIDI integer / Pitch class**:
The invariant pitch coordinates. **MIDI integer** (0..127) is *the* universal coordinate —
every pitch fact reduces to `pitch(string, fret) = openStringPitch + fret`. **Pitch class**
(MIDI mod 12, 0..11) is the octave-free reduction used only for *set* operations (scale
membership, chord identity, interval class). A **voicing** keeps MIDI ints (a multiset); a
**chord** and a **scale** are pitch-class sets. Spelled note names are derived, never stored.
_Avoid_: storing note names; using pitch class where octave matters (a voicing never reduces
to pitch classes).

**Naming tiers (T1 / T2 / T3)**:
The three engines that name a grip, in increasing abstraction-cost. **Tier-1 (relational)** —
custom, the **frame**/**drone**/**graded-tension** layer (the only tier built from scratch).
**Tier-2 (absolute)** — Tonal.js, the chord symbol + slash bass. **Tier-3 (inter-instrument)**
— music21, root/bass/inversion + doubling/omission + Roman numeral, consuming the **voicing**
multiset. A grip with no Tier-1 **frame** hands off to Tier-2.
_Avoid_: treating the absolute symbol (T2) as the headline (the relational sentence is).

### Tier-1 relational naming

**Native lexicon**:
A tuning's own emergent grammar — its set of movable shapes plus the relational rules that
name grips against the drones. The honest replacement for "drag my standard shapes into the
new tuning"; every tuning has its own. (CAGED is standard tuning's native lexicon.)
_Avoid_: CAGED (that is one tuning's lexicon, not the general concept), shapes (too narrow).

**Movable shape**:
A hand-authored (V1) grip template that slides as a rigid block: ringing **drones** stay
absolute while fretted notes carry offsets relative to the shape's anchor fret. The function
it produces is **derived** from its anchor vs the tonic.
_Avoid_: chord shape (a movable shape mixes fixed drones with movable fretted notes), voicing.

**Frame**:
The relational identity a grip is named *as*, anchored to the home context: the home chord,
the home chord transposed (barre = I up N), a modification of it (suspension / added tone /
alteration / omission), or a diatonic function (IV, V, vi…). A grip with no available frame
is the signal to hand off to Tier-2 absolute naming.
_Avoid_: chord name (a frame is relational-to-home, not an absolute symbol).

**Graded tension**:
The 5-level ordinal scale — `reinforce · consonant · color · bite · unstable` — measuring how
an **active voice** clashes with a **drone**, computed pairwise and keyed on interval class.
Held **separate from** a note's degree/function. The project's founding "textural device":
dissonance-against-the-pedal as a first-class, nameable thing.
_Avoid_: dissonance (binary; tension is graded), consonance/clash (one end of the scale).

**Alteration**:
Used in two distinct senses — keep them apart. (1) *Frame alteration*: the home chord with a
chord tone chromatically bent (b5/#5/b9…), one of the B-category modifications. (2) The loose
sense "any change to the home chord" — **avoid**; say suspension / added tone / alteration /
omission specifically.
_Avoid_: the loose "any modification" sense.

**Drone map**:
The characterisation of each open string's role against a harmonic context — a *graded*
tension value, not a binary. Always **computed, never stored**: the *live* drone map is
computed against the currently selected scale/chord, while the grammar-card panel shows a
generated read-only *home-context* view (each open string vs the tonic). Rendered per string
on the neck as **drone status**.
_Avoid_: storing it as a card field; "safe/unsafe" binary (it is graded).

### Output surfaces & the knowledge base

**Readout panel** ("What you're holding"):
An always-on, structured output surface bound to the **focused neck**, updating live on every
grip change. Tiered disclosure: relational sentence → absolute symbol → bass + per-note
degree-vs-drone → voicing anatomy → ranked candidates when ambiguous. Distinct from the
**Conversation panel** (turn-based dialogue).
_Avoid_: results panel (too generic), inspector.

**Notation pane**:
The alphaTab-rendered TAB + standard-notation + audio surface. A render-and-playback
component on a slow cadence (commit / pause / "show it written"), never in the hot
interactive loop and never the source of truth.
_Avoid_: score view (when it implies authority over the neck).

**Grammar card**:
The declarative per-tuning knowledge-base record: stored open-string pitches, tonic, drone
map, hand-authored movable shapes, capo behaviour, and provenance. The future
community-contribution format, and the resource surfaced in the UI's collapsible left panel
(the tuning's cheat sheet).
_Avoid_: tuning definition (the card is more than the pitches), preset, profile.

**Provenance**:
The first-class record of *why* a stored claim is true and *where* it came from — inline
reasoning prose plus pointers into a shared bibliography. The mechanism behind the grounding
discipline: every stored claim carries its justification next to it.
_Avoid_: source (a source is one citation; provenance is the whole justification record),
comment, note.

### Render, audio & analysis delivery

**AlphaTex adapter**:
The pure `/render` function (`fragmentToAlphaTex`) that turns a model fragment into an
**AlphaTex** string handed to alphaTab for SVG notation + playback. AlphaTex (a small,
serialisable, inspectable text artifact) is the chosen render path over building alphaTab
`Score` objects — the adapter boundary is a *string*, not an object graph, which suits the
grounding/auditability discipline. Called on a slow cadence (commit / pause / "show it
written"), never the hot loop.
_Avoid_: Score API (the rejected alternative); treating alphaTab as the source of truth.

**Soundfont (default: sonivox)**:
The General-MIDI sample set alphaSynth uses for playback. V1 ships alphaTab's bundled
**sonivox** soundfont (compact ~1 MB, adequate for exploration); a richer `.sf2`/`.sf3` is a
one-line swap deferred unless the drone premise demands it.
_Avoid_: assuming studio-rich guitar timbre in V1.

**music21 delivery (Pyodide)**:
How Tier-3 inter-instrument analysis runs: **fully client-side via Pyodide + music21,
lazy-loaded** on first Tier-3 use — *no backend*, so the app stays a static deploy. The thin
FastAPI backend survives only as a documented spike fallback.
_Avoid_: a hosted analysis service (rejected for V1); putting music21 in `/core` (it stays
out — `/core` is pitch primitives only).

### Physical setup (string-tension advisor)

**Setup advice**:
The `/tension` advisor's output: per-string **physical string tension** (lb / N / kgf)
computed from gauge + target pitch + scale length (D'Addario formula), plus comfort and safety
verdicts. The physical half of the adoption thesis — orthogonal to the harmonic layers.
_Avoid_: confusing physical string tension with harmonic **graded tension** (see the flagged
ambiguity below).

**String-tension flags (`floppy` / `fine` / `break-risk`)**:
The three headline verdicts on a string's physical tension, with a finer `band`
(`very-loose`…`very-tight`) beneath them and a separate **`breakRisk`** assessment.
`breakRisk` is authoritative for plain steel (ASTM A228) and reported **`unknown`** for wound
strings (load-bearing core diameter unpublished — never guessed; "never recommend a string
that snaps").
_Avoid_: reading `unknown` as "safe"; conflating the comfort `band` with the safety
`breakRisk`.

## Flagged ambiguities

- **"Home chord" vs "tonic"** — earlier planning docs (00/01) conflate the open-string chord
  with the key centre. Resolved: **tonic** = the stored pitch-class key centre; **home
  chord** = the derived open-string sonority. They coincide for open tunings and diverge for
  DADGAD / Drop D. A UI card-panel "home: G" line is the *derived home chord* rooted at the
  stored tonic — consistent, just finer-grained.

- **"Drone map" vs "drone status"** — the same graded-tension idea seen from two layers, kept
  deliberately distinct: **drone map** is the *computed data* across all strings (live, plus
  the read-only home-context view); **drone status** is the *rendered* per-string value on the
  neck. The relationship mirrors **Degree** (concept) vs **Degree dot** (rendering).

- **"Alteration"** — two senses (frame alteration vs the loose "any modification"); the loose
  sense is avoided. See the term above.

- **"Tension"** — the word is overloaded across the two halves of the product. **Graded
  tension** (harmonic) is the `reinforce · consonant · color · bite · unstable` clash of an
  **active voice** against a **drone** — a *naming/textural* device. **String tension**
  (physical) is the `/tension` advisor's force on a string in pounds/newtons, flagged
  `floppy · fine · break-risk` — a *playability/setup* concern. They are unrelated mechanisms
  that happen to share a word. Always qualify which one is meant; never let an advisor flag
  (`floppy`/`break-risk`) leak into harmonic naming or vice-versa.

## Example dialogue

A dev and the project's theory lead, talking through a single moment of use:

> **Dev:** They're in DADGAD, they click a grip on their **origin neck** — three open
> strings ringing, two fretted. What does the readout say?
>
> **Theory lead:** First the namer decomposes the grip: the ringing strings are **drones**,
> the fretted ones are **active voices**. It names the active voices *as a function of* the
> drones — relationally, not by spelling out an absolute **chord**.
>
> **Dev:** So it doesn't just say "Dsus4"?
>
> **Theory lead:** Not at Tier-1. It finds a **frame** — here the **home chord** of DADGAD,
> which is Dsus4 relative to the **tonic** D. If the grip were that same shape barred up two
> frets, the frame is "home chord, I up 2", because it matched a **movable shape** from the
> tuning's **native lexicon**. The absolute symbol is the *subline* in the **Readout panel**,
> not the headline.
>
> **Dev:** And the colours on the **neck**?
>
> **Theory lead:** Two independent channels. Every fretted note is a **degree dot** — shape
> for structure, colour for **degree**, relative to the root. Separately, each ringing string
> gets its **drone status**: the **drone map** is computed against the current context, graded
> on the `reinforce · consonant · color · bite · unstable` scale, and that per-string value is
> painted on the line. Same data the read-only home-context view on the **grammar card**
> shows, just live.
>
> **Dev:** What stops the model from inventing a confident-sounding name?
>
> **Theory lead:** **Provenance.** Every stored claim on the grammar card carries its reasoning
> and sources, and the drone-tension grades come from computed facts — so the readout asserts
> what's grounded and hedges what's only editorial. The **grip** is what they hold; the name
> is what we can *defend*.
