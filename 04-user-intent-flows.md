# User Intent Flows

How a confused player actually converses, mapped to intent verbs, tool calls, and what happens on the necks. Every interesting question is **relational**, not factual — design the tool surface around intents, not internal functions.

---

## The intent verbs

| Intent (how the user says it) | Verb | Returns |
|---|---|---|
| "What am I holding?" | `identify(grip)` | name, bass, pitches, each note's degree vs drone, one-line why, neighbor moves |
| "Show me a [chord] I can play here" | `find_voicings(chord, tuning, constraints)` | ranked fingerable voicings (with playability flags) |
| "What does this do?" | `function_of(grip, key)` | role in key (relational), pull/resolution tendency |
| "Where can I go from here?" | `neighbors(grip)` | adjacency/voice-leading options |
| "What's this in [other tuning]?" | `translate(grip, fromTuning, toTuning)` | morphed grip(s), spawned on a new neck |
| "Make it dreamier / darker / more open" | `feeling_to_options(grip, vibeWord)` | theory operations + resulting voicings |
| "Will this tuning feel bad on my strings?" | `advise_setup(tuning, gauges?, scaleLength)` | per-string tension, flags, gauge rec |

Each verb returns **truth + explanation + reasoning chain.** The model narrates; it never computes the fret math itself.

## Deixis / focus

There are multiple necks but no sessions. The conversation still needs a referent: a single **focus pointer** to "the neck we're talking about now." "Move the third up," "drop that to an open string," "what about that one" all resolve against focus. Ephemeral — dies with the conversation.

## Board behavior

- Mutation is **non-destructive** — it's exploration, the user can try anything on the physical guitar, nothing is "lost."
- The model prefers **spawning a new neck beside** the user's over overwriting, because **comparison is the teaching act**.
- The user's own neck is conventionally theirs but not sacred; it's one of N.

---

## Flow 1 — "What is this thing I found?" (the trace-back cure)

```
User taps a grip on the neck, asks: "what even is this?"
  → identify(grip, tuning=OpenG, context=homeKey:G)
  → tool returns: name candidates [Gsus2/... ], bass=G2 (lowest pitch),
    degrees vs drone {open D = 9, fretted B = ...}, why, neighbors
Model: "You're holding the I, but you've got the open D ringing through
  as a 9th — that shimmer is the added 9th, not a 'wrong note'. If you
  want it plainer, lift that and you're back to a clean G."
[focus stays on user's neck]
```
Resolves: "they cannot trace back voicings."

## Flow 2 — "Make it dreamier" (vibe → mechanism)

```
User: "this is nice but make it dreamier"
  → feeling_to_options(grip, "dreamier")
  → affective dictionary: dreamier => add 9ths, let opens ring, drop the 3rd
  → find_voicings applies ops, returns 2-3 results
Model: "Dreamy usually means add 9ths and let the open strings bloom, and
  often dropping the 3rd so it's less 'major/minor decided.' Here are two —"
[spawns neck B and neck C with the options, beside user's neck A]
```
Resolves: meeting naive players in their actual vocabulary.

## Flow 3 — "What's my standard chord in DADGAD?" (translate / morph)

```
User: "I play this G shape in standard — what is it in DADGAD?"
  → translate(grip, EADGBE -> DADGAD)
  → morph: retune each string by δ, frets move -δ, preserve pitch
  → flag any note that falls off neck / below open string
Model: "Same notes land here — but your old root on the low E is now below
  the open D, so it drops out; you gain the low D as a drone instead."
[neck A = standard grip, neck B = DADGAD result, shown side by side]
```
Resolves: alt tunings as a usable device, not a guessing game.

## Flow 4 — "Tell the pianist what I'm doing" (Tier 3 outward translation)

```
User: "the keys player asked what chord this is, I said 'G' and they
  looked confused"
  → identify(grip) -> full multiset -> music21 (key context = G from T1)
Model: "Here's the honest version: G major, root tripled, third doubled,
  no fifth in the low octave, open voicing spanning two octaves —
  functioning as the I. That's why 'G' wasn't enough; tell them the bass
  is G and the third's doubled up top so they don't double it again."
```
Resolves: the communication failure that keeps guitarists mute in arranging rooms.

## Flow 5 — "Why does this feel awful?" (tension/setup, V1)

```
User retunes to Open C, complains it "feels floppy and buzzes"
  → advise_setup(OpenC, gauges=user's current set?, scaleLength=25.5")
  → per-string tension; low string flagged FLOPPY
Model: "It's not the tuning — your low string is way under tension at that
  pitch, that's the buzz and mush. Bump that string to ~[gauge] and it'll
  feel solid. Nothing wrong with your playing."
```
Resolves: the *physical* reason alt tunings get abandoned.

## Flow 6 — onboarding to a tuning (shape discovery)

```
User: "I just put it in open D, I'm lost"
  → grammar card (resource) already in context
Model: "Two rules unlock most of it: a flat barre anywhere is just D major
  moved up — barre at 5 is G, at 7 is A. And these 3 movable shapes against
  the open strings give you minors, sus, and the bluesy stuff. Want me to
  put them on necks so you can see them?"
[on yes: spawns necks with the emergent movable shapes]
```
Resolves: onboarding to the tuning's *native grammar* rather than labeling guesses.

---

## Design tests for the tool surface

- Could a user ask this in their own words without knowing theory? (If not, the verb is mis-shaped.)
- Does every checkable claim in the model's reply trace to a tool result? (If not, grounding is leaking.)
- Does the flow benefit from a *second* neck rather than mutating the first? (Usually yes.)
