// /kb loader — declarative YAML KB -> typed, runtime-loadable records (ADR 0001, 0002).
//
// The authored KB lives under /kb as pure YAML (ADR 0001: "YAML-authored, JSON-schema-
// validated"). This loader is the seam that turns that data into the typed shapes the
// engine consumes. It does NOT re-validate against the JSON schema at runtime (that is a
// build/CI concern); it parses, light-checks the discriminating fields, and returns the
// typed records. No naming/matching logic lives here — that is the engine's job (ADR 0002).
//
// IMPORT STRATEGY: we read each YAML file as a RAW string via Vite's `import.meta.glob`
// with `{ query: '?raw', import: 'default', eager: true }`, then parse with the `yaml`
// package. The glob form is used (over per-file `?raw` imports) because it resolves
// identically under both Vite and Vitest and keeps the file set declarative. kb/ sits
// inside the project root, so this is permitted (the task brief's stated fallback).

import { parse } from 'yaml';
import type {
  AffectiveDictionary,
  AffectiveVibe,
  GrammarCard,
  RankingWeights,
  Rule,
  RuleBundle,
  SourceEntry,
} from './types';

// Eagerly slurp every KB YAML as a raw string. Keys are absolute-from-root paths,
// e.g. "/kb/tunings/open-g.yaml". Vite rewrites these to bundled string modules; Vitest
// resolves them from disk. eager:true so the maps are plain string records, not thunks.
const RAW: Record<string, string> = import.meta.glob('/kb/**/*.yaml', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** Find a raw YAML string by its path suffix (e.g. "tunings/open-g.yaml"). */
function rawBySuffix(suffix: string): string | null {
  const want = suffix.startsWith('/') ? suffix : `/${suffix}`;
  for (const path of Object.keys(RAW)) {
    if (path.endsWith(want)) return RAW[path];
  }
  return null;
}

/** Parse a raw YAML string into an untyped object (or null on empty/failure). */
function parseYaml(raw: string | null): unknown {
  if (raw == null) return null;
  return parse(raw) as unknown;
}

/**
 * loadGrammarCard(id): parse kb/tunings/<id>.yaml into a typed GrammarCard, or null
 * when no such card exists (only "open-g" exists today). Light-checks the required
 * discriminating fields so a malformed file fails loudly rather than silently typing.
 */
export function loadGrammarCard(id: string): GrammarCard | null {
  const raw = rawBySuffix(`tunings/${id}.yaml`);
  if (raw == null) return null;
  const obj = parseYaml(raw) as Partial<GrammarCard> | null;
  if (
    obj == null ||
    obj.id !== id ||
    !Array.isArray(obj.strings) ||
    typeof obj.tonic !== 'number' ||
    obj.provenance == null
  ) {
    return null;
  }
  return obj as GrammarCard;
}

/** Shape of a parsed rule-set file (rule.schema.json top level). */
interface RuleFile {
  schemaVersion: number;
  set: string;
  entries: Rule[];
}

/** Parse a rule-set file by name (e.g. "relational-vocabulary"); returns its entries
 *  array (empty if the file is missing or malformed — a defensive default, since the
 *  three global files are expected to be present). */
function loadRuleEntries(setName: string): Rule[] {
  const obj = parseYaml(rawBySuffix(`rules/${setName}.yaml`)) as RuleFile | null;
  if (obj == null || !Array.isArray(obj.entries)) return [];
  return obj.entries;
}

/** Parse kb/rules/ranking-weights.yaml (a flat tunable config, NOT a rule-set). */
function loadRankingWeights(): RankingWeights {
  const obj = parseYaml(rawBySuffix('rules/ranking-weights.yaml')) as
    | Partial<RankingWeights>
    | null;
  return {
    weights: obj?.weights ?? {},
    surfacePolicy: obj?.surfacePolicy ?? {},
    provenance: obj?.provenance,
  };
}

/** Parse kb/sources/references.yaml into an id -> entry map (cheap; for traces). */
function loadSources(): ReadonlyMap<string, SourceEntry> {
  const obj = parseYaml(rawBySuffix('sources/references.yaml')) as
    | { sources?: SourceEntry[] }
    | null;
  const map = new Map<string, SourceEntry>();
  for (const s of obj?.sources ?? []) {
    if (s && typeof s.id === 'string') map.set(s.id, s);
  }
  return map;
}

/**
 * loadRules(): the full global RuleBundle — the three tuning-agnostic rule sets
 * (relational vocabulary, tension table, function tendencies) each as a typed array,
 * plus the ranking weights and a sources map. Joined to cards by computed facts at
 * naming time (ADR 0002), never by stored pointers.
 */
export function loadRules(): RuleBundle {
  return {
    relationalVocabulary: loadRuleEntries('relational-vocabulary'),
    tensionTable: loadRuleEntries('tension-table'),
    functionTendencies: loadRuleEntries('function-tendencies'),
    rankingWeights: loadRankingWeights(),
    sources: loadSources(),
  };
}

/**
 * loadAffective(): parse kb/affective/dictionary.yaml into the typed (PROVISIONAL)
 * affective dictionary — vibe words mapped to ordered, executable theory operations
 * (affective.schema.json). The mapping is EDITORIAL: each vibe's provenance.kind is
 * 'editorial', so any spoken vibe claim MUST be hedged (ADR 0003); the op RESULTS that
 * the MCP feeling_to_options path computes are still fully grounded. Returns an empty
 * dictionary if the file is missing/malformed (defensive; the file is expected present).
 */
export function loadAffective(): AffectiveDictionary {
  const obj = parseYaml(rawBySuffix('affective/dictionary.yaml')) as
    | Partial<AffectiveDictionary>
    | null;
  const vibes: AffectiveVibe[] = [];
  for (const v of obj?.vibes ?? []) {
    if (v && typeof v.id === 'string' && Array.isArray(v.operations) && v.provenance != null) {
      vibes.push(v);
    }
  }
  return { schemaVersion: obj?.schemaVersion ?? 1, vibes };
}
