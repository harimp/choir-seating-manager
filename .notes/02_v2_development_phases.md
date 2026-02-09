# Proposed Development Phases for v2

This document proposes practical implementation phases based on `01_v2_thoughts.md`.

## Chosen implementation approach

- **Canvas/interaction engine:** `konva` + `react-konva`
- **Seating/business logic:** custom TypeScript models and components
- **Reasoning:** Konva reduces low-level rendering/event work, while custom logic preserves your choir-specific seating rules.

### Responsibility split (important)

**Konva should handle:**
- Stage/layers, pan/zoom, drag interactions, pointer/touch handling
- Z-order rendering behavior
- Hit-testing and core object interactivity
- Raster export primitives (PNG/JPEG)

**Custom app logic should handle:**
- Block semantics (grid/gap)
- Seat/member assignment rules and roster workflows
- Snapping rules specific to your layout model
- Active profile/snapshot/autosave data model and API persistence
- SVG/PDF export strategy and formatting

## Phase 0 — Foundations and shared models

**Goal:** create stable primitives used by all later features.

- Define core data models:
  - Active profile
  - Snapshot
  - Block (seating / decoration)
  - Seat and assigned member
  - Choir-wide config (title, sections/colors, roster)
- Define persistence contracts for API Gateway + snapshot storage.
- Add constants/config for camera zoom guardrails (easy-to-edit limits).
- Set up base state management and serialization/deserialization.
- Add `konva` + `react-konva` and create basic canvas adapter interfaces.

**Exit criteria:** app can load/save an empty active profile and snapshot payload structure.

---

## Phase 1 — Canvas MVP shell

**Goal:** ship the core workspace interactions.

- Infinite canvas with pan + zoom.
- Practical hard-coded min/max zoom guardrails.
- Basic object placement and movement on canvas.
- Z-layer support for overlapping objects (above/below ordering behavior).
- Always-on edge snapping between blocks.
- Stage/layer structure implemented with `react-konva` primitives.

**Exit criteria:** user can place blocks, move them, overlap them, and continue editing reliably.

---

## Phase 2 — Seating blocks MVP

**Goal:** deliver the core choir seating workflow.

- Implement seating block types:
  - Grid block
  - Gap block (text/color marker)
- Block-level metadata/defaults (per-instance only).
- Row/column configuration for seating blocks.
- Seat assignment interactions:
  - Seat is fixed position; drag changes assignment, not coordinates
  - No dragging outside block bounds
  - Reset layout with clear warning/confirmation
- Implement seating blocks as custom components rendered on Konva groups/nodes.

**Exit criteria:** users can build realistic seating layouts with assignable seats using grid seating blocks and gap markers.

---

## Phase 3 — Member and roster workflow MVP

**Goal:** make assignment and choir data fast to manage.

- Choir-wide roster management (view/add/remove names).
- Seat assignment input with suggestion dropdown from known roster names.
- New typed names can be added into roster.
- Empty seat rendering as low-opacity gray seats.
- Section system from choir-wide configuration:
  - Define section names
  - Define section colors
  - Apply section to seats consistently across blocks
- Title + optional member-count toggle (count all assigned seats in current snapshot).

**Exit criteria:** users can quickly assign singers and sections while maintaining choir-level consistency.

---

## Phase 4 — Snapshots and autosave MVP

**Goal:** make editing safe and restorable.

- Autosave current active profile.
- Snapshot create/recall/rename flows.
- Snapshot limit (soft cap ~100).
- Confirmation dialogs on:
  - Recalling snapshot (overwrites active canvas)
  - Replacing existing snapshot
- Snapshot contents include objects/blocks + configuration (title, sections, etc.).
- Include Konva-rendered object state mapped to your app’s serializable domain model.

**Exit criteria:** users can safely iterate on layouts without losing work.

---

## Phase 5 — Export MVP

**Goal:** generate usable outputs for rehearsal/performance.

- Export full content bounds (not viewport).
- Exclude editing overlays/handles/guides.
- Support export formats:
  - PNG
  - JPEG
  - SVG
  - PDF
- Use Konva-native raster export for PNG/JPEG first.
- Add SVG/PDF via lightweight external tooling/plugin path (avoid heavy in-house engine).

**Exit criteria:** user can download clean final layouts in all required formats.

---

## Phase 6 — Post-MVP enhancements

Items already identified as deferred:

1. Fit-to-content / “fit all blocks” camera action
2. Reusable seating block templates
3. Empty seat visibility toggle
4. Duplicate roster-name strategy + stronger identity model
5. Accessibility guardrails for section colors (contrast checks)
6. Snapping mode toggle (instead of always-on)
7. Advanced export quality controls (DPI/scale/print tuning)
8. Staggered seating block support (fixed stagger, center alignment, variable row lengths)

---

## Suggested delivery order (short version)

1. **Foundation + Canvas** (Phases 0–1)
2. **Seating + Assignment** (Phases 2–3)
3. **Save/Restore + Export** (Phases 4–5)
4. **Refinement track** (Phase 6)

This sequence gets the core seating workflow in users’ hands early, then adds safety (snapshots/autosave) and output (export) before polish work.

## Notes on package strategy

- We are **not** using niche/legacy “seating chart” npm components as the core editor.
- We are using **Konva as infrastructure** and building choir-specific seating logic ourselves for long-term control.
