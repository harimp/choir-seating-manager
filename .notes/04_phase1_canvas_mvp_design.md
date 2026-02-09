# Phase 1 Design Doc — Canvas MVP Shell (v2)

## Context

Phase 0 established shared v2 models, serialization, and Konva integration scaffolding. Phase 1 focuses on the editor workspace experience so users can place and manipulate blocks reliably before seating-specific semantics are introduced in Phase 2.

## Goals

1. Deliver practical pan + zoom canvas navigation with configurable zoom guardrails.
2. Support basic block placement and movement on the canvas.
3. Support z-layer ordering behaviors for overlapping blocks.
4. Implement always-on edge snapping between blocks during movement.
5. Keep rendering mechanics separate from domain/business rules.

## Non-goals

- Full seating semantics (seat assignment and reset warnings).
- Snapshot/autosave workflows.
- Export pipeline.
- Touch-optimized interactions beyond baseline Konva defaults.

## Interaction Model

### Camera

- Camera state continues to live in `activeProfile.camera`.
- Users can zoom with controls and mouse wheel.
- Users pan by dragging on empty canvas space.
- Zoom is clamped to `MIN_ZOOM`/`MAX_ZOOM` from `config/camera.ts`.

### Blocks

- MVP supports adding two block primitives:
  - seating block (visual shell)
  - decoration block (visual shell)
- Blocks are draggable.
- Selected block can move backward/forward in z-order.

### Snapping

- Snapping is always enabled during block drag.
- Axis-aligned edge snapping compares moving block edges to nearby block edges.
- Threshold-based snap (`SNAP_THRESHOLD_PX`) prevents sticky long-range behavior.
- X and Y snapping are resolved independently and applied together.

## Architecture

### Files

- `src/canvas/adapter.ts`
  - interface for camera transforms (clamp, pan, zoom, pointer-anchored zoom).
- `src/canvas/konvaAdapter.ts`
  - implementation of camera math + guardrails.
- `src/canvas/blockGeometry.ts`
  - block size defaults + edge snapping helpers.
- `src/App.tsx`
  - stage/layer composition, interaction wiring, block state updates, z-order controls.
- `src/App.css`
  - workspace shell and control-panel styling for MVP usability.

### Layering strategy

- Stage
  - World layer (camera-transformed): grid/background + draggable block nodes.
  - Overlay layer (screen-space): lightweight status text and interaction hints.

This keeps interaction feedback readable while world content pans/zooms.

## Data strategy for Phase 1

- Persistent source of truth remains `activeProfile.blocks`.
- Block geometry (width/height) is maintained in a lightweight UI map keyed by block id.
- This avoids prematurely expanding shared domain models before Phase 2 confirms canonical sizing semantics.

## Z-Order behavior

- Blocks render sorted by `zIndex` ascending.
- Ordering actions swap selected block with adjacent neighbor and then normalize z-indices.
- New blocks are appended at top z-index.

## Risks and mitigations

- **Risk:** jitter while snapping during drag.
  - **Mitigation:** minimal threshold and deterministic nearest-edge selection.
- **Risk:** coupling camera math to view component.
  - **Mitigation:** keep camera transforms in adapter implementation.
- **Risk:** block geometry drift from domain.
  - **Mitigation:** explicit Phase 1-local geometry helper with documented temporary scope.

## Exit criteria (Phase 1)

- [ ] User can pan and zoom workspace reliably.
- [ ] Zoom cannot exceed min/max guardrails.
- [ ] User can add and drag blocks.
- [ ] User can reorder overlapping blocks in z-layers.
- [ ] Blocks snap to neighboring block edges while dragging.
