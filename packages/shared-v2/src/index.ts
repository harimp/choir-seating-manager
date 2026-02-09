export const V2_SCHEMA_VERSION = 1 as const

export type BlockType = 'seating' | 'decoration'
export type SeatingLayout = 'grid'
export type DecorationType = 'gap' | 'text' | 'shape'

export interface ChoirSection {
  id: string
  name: string
  color: string
  order: number
}

export interface RosterMember {
  id: string
  name: string
  sectionId: string
  createdAt: string
  updatedAt: string
}

export interface ChoirConfig {
  title: string
  showMemberCount: boolean
  sections: ChoirSection[]
  roster: RosterMember[]
}

export interface SeatAssignment {
  rosterMemberId: string
}

export interface Seat {
  id: string
  label?: string
  assignment?: SeatAssignment
}

interface BaseBlock {
  id: string
  type: BlockType
  name?: string
  x: number
  y: number
  zIndex: number
  rotation: number
}

export interface SeatingBlock extends BaseBlock {
  type: 'seating'
  layout: SeatingLayout
  rows: number
  columns: number
  seats: Seat[]
}

export interface DecorationBlock extends BaseBlock {
  type: 'decoration'
  decorationType: DecorationType
  text?: string
  color?: string
  width?: number
  height?: number
}

export type Block = SeatingBlock | DecorationBlock

export interface CameraState {
  x: number
  y: number
  zoom: number
}

export interface ActiveProfile {
  schemaVersion: number
  profileId: string
  choirConfig: ChoirConfig
  blocks: Block[]
  camera: CameraState
  createdAt: string
  updatedAt: string
}

export interface Snapshot {
  schemaVersion: number
  snapshotId: string
  snapshotName: string
  choirConfig: ChoirConfig
  blocks: Block[]
  camera: CameraState
  createdAt: string
  updatedAt: string
}

export interface SaveActiveProfileRequest {
  activeProfile: ActiveProfile
}

export interface SaveActiveProfileResponse {
  activeProfile: ActiveProfile
}

export interface GetActiveProfileResponse {
  activeProfile: ActiveProfile
}

export interface CreateSnapshotRequest {
  snapshotName?: string
  snapshot: Snapshot
}

export interface CreateSnapshotResponse {
  snapshot: Snapshot
}

export interface SnapshotListItem {
  snapshotId: string
  snapshotName: string
  memberCount: number
  createdAt: string
  updatedAt: string
}

export interface ListSnapshotsResponse {
  snapshots: SnapshotListItem[]
}

export interface GetSnapshotResponse {
  snapshot: Snapshot
}

export interface RenameSnapshotRequest {
  snapshotName: string
}

export interface DeleteSnapshotResponse {
  snapshotId: string
  message: string
}

function isoNow(): string {
  return new Date().toISOString()
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export function createEmptyChoirConfig(title = 'Choir Seating Manager v2'): ChoirConfig {
  return {
    title,
    showMemberCount: false,
    sections: [],
    roster: [],
  }
}

export function createDefaultCameraState(): CameraState {
  return {
    x: 0,
    y: 0,
    zoom: 1,
  }
}

export function createEmptyActiveProfile(): ActiveProfile {
  const now = isoNow()
  return {
    schemaVersion: V2_SCHEMA_VERSION,
    profileId: createId('profile'),
    choirConfig: createEmptyChoirConfig(),
    blocks: [],
    camera: createDefaultCameraState(),
    createdAt: now,
    updatedAt: now,
  }
}

export function createEmptySnapshot(input: {
  snapshotName?: string
  activeProfile: ActiveProfile
}): Snapshot {
  const now = isoNow()
  return {
    schemaVersion: V2_SCHEMA_VERSION,
    snapshotId: createId('snapshot'),
    snapshotName: input.snapshotName ?? 'Snapshot',
    choirConfig: input.activeProfile.choirConfig,
    blocks: input.activeProfile.blocks,
    camera: input.activeProfile.camera,
    createdAt: now,
    updatedAt: now,
  }
}
