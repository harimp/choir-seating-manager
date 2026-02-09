# Phase 0 Design Doc — Foundations and Shared Models (v2)

## Context

Phase 0 establishes stable primitives for the v2 editor before feature-heavy canvas workflows begin. The current repository has working session/snapshot API patterns and a minimal `website-v2` shell, but no shared v2 domain model contract yet.

This design creates a single source of truth for v2 data shapes, serialization rules, and canvas integration boundaries.

## Goals

1. Define canonical v2 domain models and payload contracts.
2. Enable reliable serialization/deserialization for active profile and snapshots.
3. Add configurable zoom guardrails for future camera behavior.
4. Introduce Konva dependency and adapter boundary without coupling business logic to rendering internals.
5. Add API-side v2 contract scaffolding aligned to shared model semantics.

## Non-goals

- Full canvas interaction UX (pan/zoom gestures, object editing, snapping implementation).
- Complete API route migration to v2 payloads.
- Seating block editor UI and assignment workflows.
- Export pipeline (PNG/JPEG/SVG/PDF).

## Architecture Overview

### 1) Shared v2 model module

Create `packages/shared-v2` with:

- Domain entities:
  - `ActiveProfile`
  - `Snapshot`
  - `ChoirConfig`
  - `ChoirSection`
  - `RosterMember`
  - `Block` union (`SeatingBlock`, `DecorationBlock`)
  - `Seat` + `SeatAssignment`
  - `CameraState`
- Contract/DTO types for active profile and snapshots.
- Schema version constants and basic constructors:
  - `V2_SCHEMA_VERSION`
  - `createEmptyActiveProfile(...)`
  - `createEmptySnapshot(...)`

Rationale: future features need consistency across frontend and backend while avoiding model drift.

### 2) website-v2 foundational state and serialization

Add v2 state modules:

- `state/profileStore.ts`
  - create initial empty active profile and derived empty snapshot.
- `state/serialization.ts`
  - JSON serialization/deserialization for active profile and snapshot.
  - version checks (`schemaVersion`) and explicit validation errors.

The app can round-trip empty payloads as a Phase 0 exit condition.

### 3) Camera guardrails configuration

Add `config/camera.ts`:

- `MIN_ZOOM`, `MAX_ZOOM`, `DEFAULT_ZOOM`, `ZOOM_STEP`

Rationale: avoid scattered magic numbers and make future tuning safe.

### 4) Konva integration boundary

Add:

- `canvas/adapter.ts` (`CanvasAdapter` interface)
- `canvas/konvaAdapter.ts` (`KonvaCanvasAdapter` scaffold)

`App.tsx` renders a minimal `react-konva` stage to validate dependency and baseline wiring.

Boundary rule:

- Konva handles rendering mechanics and camera primitives.
- Domain logic and seating semantics remain in app/domain layers.

### 5) API v2 scaffolding

Add `packages/api/src/types/v2.ts` to define v2-oriented request/response contracts aligned to shared semantics:

- load/save active profile
- snapshot CRUD DTOs
- contract-level result wrappers

This is scaffolding for phased adoption and does not replace legacy routes yet.

## Data Validation and Versioning

- Every persisted v2 payload includes `schemaVersion`.
- Deserialization rejects unsupported schema versions with clear error messages.
- Unknown/forward-compatible fields are tolerated at type boundary where possible (by JSON parse + typed casting after core shape checks).

## Testing Strategy (Phase 0 level)

Validation targets:

1. Empty active profile JSON round-trip is lossless.
2. Empty snapshot JSON round-trip is lossless.
3. Invalid schema version is rejected.
4. v2 app builds with Konva wired.

## Risks and Mitigations

- **Risk:** model churn in early phases.
  - **Mitigation:** isolate model definitions in shared module with explicit versioning.
- **Risk:** over-coupling rendering to domain.
  - **Mitigation:** enforce adapter interface and keep business models renderer-agnostic.
- **Risk:** API migration ambiguity.
  - **Mitigation:** add explicit v2 DTO scaffolding before route migration.

## Exit Criteria (Phase 0)

- [x] Shared v2 models and contract primitives exist.
- [x] website-v2 can initialize empty active profile and snapshot.
- [x] website-v2 can serialize/deserialize these payloads with schema checks.
- [x] Zoom guardrails are centralized constants.
- [x] `konva` + `react-konva` integrated with adapter scaffold.
- [x] API v2 contract scaffolding added for next-phase route integration.
