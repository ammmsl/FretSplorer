// /kb — barrel. The shared KB loader: declarative YAML KB -> typed, runtime-loadable
// records (ADR 0001 YAML-authored/schema-validated; ADR 0002 global-rules-join).
//
// Public API:
//   loadGrammarCard(id): GrammarCard | null   — parse kb/tunings/<id>.yaml (only "open-g" today).
//   loadRules(): RuleBundle                    — the three global rule sets + weights + sources.

export { loadGrammarCard, loadRules, loadAffective } from './load';

export type {
  AffectiveDictionary,
  AffectiveVibe,
  AffectiveOperation,
  AffectiveOp,
  GrammarCard,
  MovableShape,
  ShapeString,
  ShapeProduces,
  SlideExample,
  Provenance,
  ProvenanceKind,
  Rule,
  RuleSet,
  RuleCategory,
  RuleBundle,
  RankingWeights,
  SourceEntry,
} from './types';
