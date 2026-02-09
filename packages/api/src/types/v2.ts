import type {
  ActiveProfile,
  CreateSnapshotRequest as SharedCreateSnapshotRequest,
  CreateSnapshotResponse as SharedCreateSnapshotResponse,
  DeleteSnapshotResponse as SharedDeleteSnapshotResponse,
  GetActiveProfileResponse as SharedGetActiveProfileResponse,
  GetSnapshotResponse as SharedGetSnapshotResponse,
  ListSnapshotsResponse as SharedListSnapshotsResponse,
  RenameSnapshotRequest as SharedRenameSnapshotRequest,
  SaveActiveProfileRequest as SharedSaveActiveProfileRequest,
  SaveActiveProfileResponse as SharedSaveActiveProfileResponse,
  Snapshot,
} from '@choir-seating-manager/shared-v2'

export interface V2Envelope<T> {
  data: T
  schemaVersion: number
}

export type V2SaveActiveProfileRequest = SharedSaveActiveProfileRequest
export type V2SaveActiveProfileResponse = SharedSaveActiveProfileResponse
export type V2GetActiveProfileResponse = SharedGetActiveProfileResponse

export type V2CreateSnapshotRequest = SharedCreateSnapshotRequest
export type V2CreateSnapshotResponse = SharedCreateSnapshotResponse
export type V2ListSnapshotsResponse = SharedListSnapshotsResponse
export type V2GetSnapshotResponse = SharedGetSnapshotResponse
export type V2RenameSnapshotRequest = SharedRenameSnapshotRequest
export type V2DeleteSnapshotResponse = SharedDeleteSnapshotResponse

export interface V2HydratedStateResponse {
  activeProfile: ActiveProfile
  snapshots: Snapshot[]
}
