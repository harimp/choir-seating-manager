export type VoiceSection = 'Soprano' | 'Alto' | 'Tenor' | 'Bass';

export type AlignmentMode = 'balanced' | 'grid' | 'custom';
export type PianoPosition = 'left' | 'right';

// Voice Parts Configuration
export interface VoicePart {
  id: string;              // Unique identifier (e.g., "soprano-1", "alto")
  name: string;            // Display name (e.g., "Soprano 1", "Alto")
  color: string;           // Hex color code (e.g., "#FF69B4")
  order: number;           // Display order (0-based)
}

export interface VoicePartsConfiguration {
  parts: VoicePart[];
  version: number;         // Schema version for future migrations
}

// Default SATB voice parts configuration
export const DEFAULT_VOICE_PARTS: VoicePartsConfiguration = {
  parts: [
    { id: 'soprano', name: 'Soprano', color: '#FF69B4', order: 0 },
    { id: 'alto', name: 'Alto', color: '#9370DB', order: 1 },
    { id: 'tenor', name: 'Tenor', color: '#4169E1', order: 2 },
    { id: 'bass', name: 'Bass', color: '#90EE90', order: 3 },
  ],
  version: 1,
};

// Choir Roster (Profile-level)
export interface RosterMember {
  id: string;
  name: string;
  voicePartId: string;     // References voice part ID
  createdAt: string;
  updatedAt: string;
}

export interface ChoirRoster {
  members: RosterMember[];
  version: number;
}

// Seating Arrangement (Session/Snapshot-level)
export interface SeatedMember {
  rosterId: string;        // References RosterMember.id
  position: number;
  rowNumber: number;
}

// Display Member (for UI - joins roster and seating data)
export interface DisplayMember {
  id: string;              // rosterId
  name: string;            // from roster
  voicePartId: string;     // from roster
  position: number;        // from seating
  rowNumber: number;       // from seating
  isSpacing?: boolean;     // Flag to identify spacing objects in UI
}

// Legacy ChoirMember interface (for backward compatibility)
export interface ChoirMember {
  id: string;
  name: string;
  voiceSection: VoiceSection;
  position: number;
  rowNumber: number;
}

export interface StageSettings {
  numberOfRows: number;
  alignmentMode: AlignmentMode;
  pianoPosition: PianoPosition;
  title?: string;
}

// Updated ChoirData interface to support both legacy and new formats
export interface ChoirData {
  // Legacy format (for backward compatibility)
  members?: ChoirMember[];
  
  // New format (roster + seating)
  seating?: SeatedMember[];
  
  settings: StageSettings;
  lastUpdated: string;
}

// Session-level data (includes roster and active seating)
export interface SessionItem {
  sessionId: string;
  sessionCode: string;
  sessionName: string;
  roster: RosterMember[];           // Session-level roster
  voiceParts: VoicePartsConfiguration; // Session-level voice parts config
  seating: SeatedMember[];          // Active seating arrangement
  settings: StageSettings;          // Stage settings
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  sessionCode: string;
  sessionName: string;
  roster: RosterMember[];
  voiceParts: VoicePartsConfiguration;
  seating: SeatedMember[];
  settings: StageSettings;
}

// Snapshot-level data (only seating references and settings)
export interface SnapshotItem {
  snapshotId: string;
  sessionId: string;
  sessionCode: string;
  snapshotName: string;
  seating: SeatedMember[];          // Snapshot seating arrangement
  settings: StageSettings;          // Snapshot settings
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnapshotRequest {
  snapshotName?: string;
  seating: SeatedMember[];
  settings: StageSettings;
}

export interface UpdateSnapshotRequest {
  snapshotName: string;
}

export interface SnapshotListItem {
  snapshotId: string;
  snapshotName: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

// Spacing Object Utilities
/**
 * Check if a rosterId represents a spacing object
 */
export function isSpacingObject(rosterId: string): boolean {
  return rosterId.startsWith('spacing-');
}

/**
 * Create a new spacing object with a unique ID
 */
export function createSpacingObject(position: number, rowNumber: number): SeatedMember {
  const { randomUUID } = require('crypto');
  return {
    rosterId: `spacing-${randomUUID()}`,
    position,
    rowNumber,
  };
}
