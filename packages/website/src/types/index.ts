export type VoiceSection = 'Soprano' | 'Alto' | 'Tenor' | 'Bass';

export type AlignmentMode = 'balanced' | 'grid';
export type PianoPosition = 'left' | 'right';

export interface ChoirMember {
  id: string;
  name: string;
  voiceSection: VoiceSection;
  position: number;
  rowNumber: number; // Which row the member is in (0-based)
}

export interface StageSettings {
  numberOfRows: number; // 1-10, default 3
  alignmentMode: AlignmentMode; // Toggle setting
  pianoPosition: PianoPosition; // Default 'right'
  title?: string; // Optional title for the choir
}

export interface ChoirData {
  members: ChoirMember[];
  settings: StageSettings;
  lastUpdated: string;
}

export interface SessionItem {
  sessionId: string;
  sessionCode: string;
  sessionName: string;
  choirData: ChoirData;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  sessionCode: string;
  sessionName: string;
  choirData: ChoirData;
}

export interface SnapshotItem {
  snapshotId: string;
  sessionId: string;
  sessionCode: string;
  snapshotName: string;
  choirData: ChoirData;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSnapshotRequest {
  snapshotName?: string; // Optional, will generate default if not provided
  choirData: ChoirData;
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
