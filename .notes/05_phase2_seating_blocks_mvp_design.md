# Phase 2 Design Doc — Seating Blocks MVP (v2)

## Context

Phase 1 delivered the canvas shell (pan/zoom, placement, drag, snapping, z-order). Phase 2 introduces choir seating semantics on top of that shell.

## Goals

1. Support seating block variants:
   - Grid
   - Gap block marker (text + color)
2. Provide per-instance block metadata/default controls.
3. Provide row/column configuration for seating blocks (grid-first).
4. Implement seat-assignment interaction where seats remain fixed and drag changes assignment only.
5. Disallow assignment drags outside the block bounds.
6. Provide reset-layout action with explicit confirmation.

## Non-goals

- Choir-wide roster UX and advanced assignment suggestions (Phase 3).
- Snapshot/autosave and API persistence flows (Phase 4).
- Export pipeline (Phase 5).

## Data and Model Strategy

### Shared model updates

For grid-first Phase 2, keep `SeatingBlock` metadata minimal and focused on core rows/columns behavior.

### Seat identity

- `Seat` ids remain stable when possible.
- Layout changes reconcile seat arrays by index to preserve assignments where possible.

## Layout Algorithms

### Grid

- Seats rendered in strict rows × columns matrix.
- Seat coordinates are deterministic from block origin + local spacing constants.

### Gap block

- Uses decoration block with `decorationType = 'gap'`.
- Rendered as colored marker block with text label.

## Assignment Interaction Model

- Seats are not draggable.
- Assigned seat token is draggable within block bounds.
- Drag end resolves nearest target seat in the same block.
  - Valid target: assignment moves (or swaps with existing target assignment).
  - Invalid target / outside bounds: assignment remains on origin seat.

## Block Inspector UX

For selected block:

- Name field (all blocks)
- Seating fields:
  - layout (grid)
  - rows / columns
- Gap fields:
  - marker text
  - marker color
- Reset layout button (seating only) with confirmation dialog.

## Architecture

- `src/canvas/seatingLayout.ts`
  - seating dimensions
  - seat position generation
  - row pattern normalization
- `src/canvas/blockGeometry.ts`
  - block bounds for snapping using seating dimensions helper
- `src/App.tsx`
  - inspector state/actions
  - assignment drag/swap logic
  - seating and gap rendering

## Exit Criteria (Phase 2)

- [ ] User can create grid and gap marker blocks.
- [ ] User can configure rows/columns for grid seating blocks.
- [ ] Seats stay fixed; dragging changes assignment only.
- [ ] Assignment tokens cannot be dragged outside block bounds.
- [ ] Reset layout requires explicit confirmation.
- [ ] Existing Phase 1 camera/snap/z-order interactions remain functional.

## Post-MVP deferral

- Staggered seating block support (fixed stagger offset, center alignment, variable row lengths).
