// ShapeDiscovery (/ui) — render the focused tuning's HAND-AUTHORED movable shapes as
// selectable shapes that PREVIEW on the neck (item 8; R3 auto-derivation stays deferred).
// Each card shape is listed with its invariant quality + its slide anchors; clicking an
// anchor realises the shape as a concrete Shape (realizeShape) and hands it up via
// onPreviewShape so the focused neck shows it. Card-less tunings say so honestly.
// PROVISIONAL: mounted in the Lab, not placed.

import type { Tuning } from '../core';
import { grammarCardResource } from '../mcp';
import type { Shape } from './shape';
import { shapeAnchors, realizeShape } from './shapes';

export function ShapeDiscovery({
  tuning,
  onPreviewShape,
}: {
  tuning: Tuning;
  onPreviewShape: (shape: Shape) => void;
}) {
  const { card } = grammarCardResource(tuning.id);

  if (!card || !card.movableShapes || card.movableShapes.length === 0) {
    return (
      <p className="panel-note">
        No hand-authored movable shapes for this tuning. (Auto-derivation of shapes is a
        deferred research item — only curated shapes are shown.)
      </p>
    );
  }

  return (
    <ul className="shape-list">
      {card.movableShapes.map((shape) => (
        <li key={shape.id} className="shape-item">
          <div className="shape-head">
            <strong>{shape.label}</strong>
            <span className="shape-quality">{shape.produces.quality}</span>
          </div>
          <div className="shape-anchors" role="group" aria-label={`${shape.label} anchors`}>
            {shapeAnchors(shape).map((anchor) => {
              const ex = shape.slideExamples?.find((e) => e.anchorFret === anchor);
              return (
                <button
                  key={`${shape.id}-${anchor}`}
                  type="button"
                  className="shape-anchor-btn"
                  title={ex ? ex.function : `anchor fret ${anchor}`}
                  onClick={() => onPreviewShape(realizeShape(shape, anchor))}
                >
                  fret {anchor}
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </ul>
  );
}
