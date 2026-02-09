import {
  V2_SCHEMA_VERSION,
  type ActiveProfile,
  type Snapshot,
} from '@choir-seating-manager/shared-v2'

function assertSchemaVersion(schemaVersion: number): void {
  if (schemaVersion !== V2_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion: ${schemaVersion}. Expected ${V2_SCHEMA_VERSION}.`,
    )
  }
}

export function serializeActiveProfile(activeProfile: ActiveProfile): string {
  return JSON.stringify(activeProfile)
}

export function deserializeActiveProfile(raw: string): ActiveProfile {
  const parsed = JSON.parse(raw) as ActiveProfile

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid active profile payload.')
  }

  assertSchemaVersion(parsed.schemaVersion)
  return parsed
}

export function serializeSnapshot(snapshot: Snapshot): string {
  return JSON.stringify(snapshot)
}

export function deserializeSnapshot(raw: string): Snapshot {
  const parsed = JSON.parse(raw) as Snapshot

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid snapshot payload.')
  }

  assertSchemaVersion(parsed.schemaVersion)
  return parsed
}
