import {
  type ActiveProfile,
  type Snapshot,
  createEmptyActiveProfile,
  createEmptySnapshot,
} from '@choir-seating-manager/shared-v2'

export interface ProfileStoreState {
  activeProfile: ActiveProfile
  snapshots: Snapshot[]
}

export function createInitialProfileStoreState(): ProfileStoreState {
  const activeProfile = createEmptyActiveProfile()
  const initialSnapshot = createEmptySnapshot({
    activeProfile,
    snapshotName: 'Initial Empty Snapshot',
  })

  return {
    activeProfile,
    snapshots: [initialSnapshot],
  }
}
