# Thoughts and intents for v2

## Current status

V1 was made with intention of fixed setup for row by row standing. This works well as it is a simple concept and quick to make, but we currently face following issues.

1. The fixed layout is not flexible to the reality of different venues requiring different shape of seatings. The web app only supports venues where the seatings are in rows in rectangular shape, which is not applicable to all practice or performance venues.
2. The scenarios with large number of choir members make the icons and text very small, making it impossible to look and find out the specific seating.
3. Existing code is too fixed to the grid layout, and other components like camera, center line, conductor, etc. are all fixed to the single grid layout.

## Proposal and Goal

Instead of trying to work with existing v1 website, we will make v2 from scratch that focus on the following.

### Overall Framework

- Instead of focusing on a single object and having camera around it, we will have a canvas with free roaming camera
- Canvas will allow placement and moving of different objects (listed below)
- Camera will be free to roam and zoom independent to the objects in the canvas

### NEW: Seating Blocks

- Seating blocks will containerize members and seating configurations into a single unit.
- A seating blocks will allow easy configuration of seating format.
  - A grid seating block should exist, allowing user to place a orthogonal grid format of member seating to be placed in the seating
    - Grid seating block must have configuration for rows and columns of people as well as edit mode to configure each person.
    - Members in the grid seating during edit mode should be able to be dragged around to easily put in place
  - A staggered seating block should exist, allowing user to place a format of seating where each person sits between the two seatings in front of them
    - Staggered seating block must have configuration for rows and columns of people as well as edit mode to configure each member.
    - Members in the staggered seating during edit mode should be able to be dragged around to easily put in place
  - A gap seating block should exist, allowing user to place a seating block with no members for intentional marking of gaps, walkway, etc.
    - A custom text or colour configuration should be available for gap seating block
- A seating block will have configuration of metadata and defaults. (block name, defaults, etc.)
- A seating block will be moveable via drag with no impact to the relative look within it.
- Seating blocks can be snapped next to each other or overlapped if desired by the user


### Member inside Seating Blocks

- Each seating block will comprise of members within the block.
- Each member should be either an empty seat or a section assigned
- If a member is an empty seat, no name or section assignment shall be allowed.
- If a member is an empty seat, it should be barely visible unless while configuring the seating block
- If a member is not an empty seat, a name and section assignment should be allowed.
- A member's name should be easily selected from list of existing known names in the choir roster
- If a new name is added, the name should be added to choir roster
- The colour of the member icon should be correlated to the configured section colour

### Choir-wide configurations

- The choir configuration setting should contain a title
- A choir-wide roster containing all known names in the choir should be kept
  - A name in the choir roster should be viewable in a settings page or modal
  - A name in the choir roster should be easily removable
- A total number of members placed (excluding empty seats) should be optionally shown next to the title

### Snapshot management

- A snapshot system should exist where a snapshot of the entire canvas can be saved and restored.
- User should be able to save and recall the snapshots.
- User should be warned before recalling the snapshots as it overwrites the current canvas.
- User should be able to rename the snapshots.

### Auxiliary functionalities

- User should be able to export and download a high quality image of the whole canvas.

## Open Questions / Decisions to Clarify

Use this checklist to lock down ambiguous requirements before implementation.

### 1) Scope and non-goals

- [ ] What is explicitly out of scope for v2? (e.g. mobile optimization, collaboration, auth)
  - In the rebuild, we don't want real time collaboration, authentication or anything.
  - Simple plaintext session entry same as v1
  - It should be accessible from computer browser as well as iPad.
- [ ] Is migration/import from v1 data required in v2?
  - Let's assume v2 will have its own data and no migration will be necessary
    - There is only one active user right now, so we can manually migrate it later

### 2) Canvas and camera behavior

- [ ] Is the canvas infinite, or bounded?
  - Infinite canvas
- [ ] What are min/max zoom levels and default zoom?
  - No min or max. Think similar to how Figma works.
- [ ] Should there be a "fit all blocks" action?
  - No, let's not do that for the MVP
- [ ] Should object coordinates persist exactly across devices/screen sizes?
  - Yes. Users can zoom in and out as they need to check through

### 3) Canvas object model

- [ ] Besides seating blocks, what objects exist on canvas in v2? (conductor, piano, center line, labels, etc.)
  - conductor, piano or center line is simple static images placed.
    - This can be handled through a "decoration" block with configurable pre-loaded icons or text/emoji to start.
- [ ] Do objects support layering/z-index controls?
  - Let's not worry about that in the MVP.

### 4) Seating block configuration rules

- [ ] Is seat spacing fixed, globally configurable, or per-block configurable?
  - It should ideally be fixed to allow uniformity across different blocks. We may adjust this later.
- [ ] Is block padding/margin configurable?
  - We should make the padding such that when two blocks snap to each other, the padding should seem uniform.
- [ ] Can blocks rotate? If yes, fixed angles or free rotate?
  - No. For MVP, assume no rotation.
- [ ] If rows/columns change, how are existing assignments handled?
  - Default assignments should be to empty seat. Let users fill the details in.
- [ ] Are block "defaults" only per instance, or reusable templates?
  - Let's do per instance and revisit later.

### 5) Staggered layout geometry

- [ ] Is stagger offset fixed (e.g. 50%) or configurable?
  - Fixed. It's simple format of two seats in front, one seat between it on the row behind it.
- [ ] Must all rows have equal seat counts, or can alternating rows differ?
  - It can differ. For example, If 3 rows with 7, it could be 7, 6, 7 in each rows from front to back.
- [ ] How should edges align (left/center/right)?
  - center.

### 6) Edit mode drag behavior

- [ ] Does dragging seats/members permanently redefine seat coordinates?
  - Dragging seat members should change the seat assignments, not the seat coordinates.
- [ ] Can dragged seats go outside block bounds?
  - No.
- [ ] Should there be a "reset layout" action?
  - Yes, but with clear warning and confirmations.

### 7) Seat vs member semantics

- [ ] Confirm data model terms: "seat slot" (position) vs "assigned singer" (person)
  - Position should be Seat, while a Member is assigned to the Seat.
- [ ] Can one singer be assigned to multiple seats in one snapshot?
  - Yes for simplicity, but we can revisit this.
- [ ] If duplicate assignment is disallowed, should it block save or show warning?
  - N/A
- [ ] Are section values from fixed global list, per-block list, or free text?
  - Section is value configured on choir-wide configuration. Users should define a section (Soprano 1, Soprano 2, Alto 1, Tenor 1, etc.) and assign seats to the section.

### 8) Empty seat rendering and behavior

- [ ] Should empty seats be hidden or shown with low opacity outside edit mode?
  - Let's do a low opacity gray seat to be visible, but to signify not assigned.
- [ ] Should empty seat visibility be user-toggleable?
  - Let's visit this later.
- [ ] Should empty seats appear in exported images?
  - Yes. Exported image should show exactly as canvas looks.

### 9) Roster identity and lifecycle

- [ ] Is display name the identity, or should each roster entry have a unique ID?
  - Treat names as freeform text, no need for specific ID
- [ ] How should duplicate display names be handled?
  - Don't. We will revisit this later.
- [ ] If a roster person is deleted, what happens to assigned seats?
  - Make it empty.
- [ ] Should autocomplete be fuzzy/case-insensitive and allow create-on-enter?
  - There should be no autocomplete, but a list of known names where users can select to quickfill without having to type the whole thing.

### 10) Sections and colors

- [ ] Where are section names/colors managed (global settings, per block, both)?
  - In choir-wide configuration.
- [ ] Are per-block overrides allowed?
  - No. A colour of specific colour should match across all blocks.
- [ ] Any accessibility constraints (minimum contrast) for section colors?
  - Ideally but Let's revisit this after MVP.

### 11) Snapping and overlap rules

- [ ] Is snapping always on, toggleable, or modifier-key based?
  - Let's keep it always on, but revisit toggleablility later.
- [ ] Snap targets: block edges only, seat positions, global grid?
  - Block edges.
- [ ] When blocks overlap, how is top object determined and changed?
  - Nothing. Imagine two items in Photoshop overlapping. It should just display as overlapped.

### 12) Title and member count

- [ ] Is member count display controlled by user setting?
  - Yes. The user should be able to toggle on or off the member count display
- [ ] Count scope: current snapshot total, visible viewport only, or selected blocks?
  - It should be the count of all assigned member seats.

### 13) Snapshot semantics

- [ ] What is included in snapshot: objects only, or also camera/zoom and UI toggles?
  - Objects and blocks, configuration (sections, title, etc.) should be included.
- [ ] Any limit on number of snapshots?
  - Let's say 100. Just a sufficiently large number (soft cap).
- [ ] Is auto-save/draft snapshot needed?
  - Auto-save should be to active profile (one being loaded to), but not to snapshots.
- [ ] Should overwrite confirmation happen on recall only, or also when replacing existing snapshot?
  - Both.
- [ ] Snapshot persistence: local browser only, cloud, and/or import-export file?
  - Save to a snapshot database via API Gateway call.

### 14) Export specification

- [ ] Supported export formats (PNG/JPG/SVG/PDF)?
  - Yes, if we can use a simple plugin. Do not try to make anything too complex in house.
- [ ] Quality options (scale multiplier, resolution, print DPI)?
  - Let's just worry about simple export for the MVP.
- [ ] Export target: full content bounds or current viewport?
  - Full content bounds.
- [ ] Include/exclude overlays (selection handles, guides, debug aids)?
  - Exclude them.

### 15) Terminology and wording cleanup

- [ ] Standardize terms: member vs seat vs person/singer
  - A member is assigned to a seat within a block. Treat Member/Person/Singer as just names and string value while seat should be the focus of a specific spot in a block.
- [ ] Remove duplicated gap block bullet
  - done.
- [ ] Fix typos (e.g. "where the", "should", "auxiliary")
  - You fix it.

## MVP Deferrals (Post-MVP Backlog)

These were explicitly marked as "later", "revisit", or "not for MVP":

1. Fit-to-content / "fit all blocks" camera action
2. Reusable seating block templates (instead of per-instance defaults only)
3. Empty seat visibility toggle
4. Duplicate roster name strategy and roster identity model beyond plain text
5. Accessibility constraints for section colors (e.g. minimum contrast)
6. Snapping mode toggle (always-on for MVP; toggleability later)
7. Advanced export quality controls (scale multiplier / DPI / print options)

## Follow-up Decisions Captured

The previous ambiguity items were clarified as follows:

1. **Export formats for MVP:** PNG, JPEG, SVG, and PDF.
2. **Zoom behavior:** use practical hard-coded min/max guardrails (easy-to-change constants) while keeping UX effectively unbounded.
3. **Overlap behavior:** include a z-layer system to control which block appears above/below.
4. **Autosave target:** autosave applies to the "active profile" (the current editable default canvas), while snapshots remain static saved states.
5. **Known-name quickfill interaction:** as the user types in seat assignment, matching roster names appear in a suggestion list under the input (Google-like suggestion dropdown).

With these decisions, there are no remaining blocking ambiguities for MVP in this document.
