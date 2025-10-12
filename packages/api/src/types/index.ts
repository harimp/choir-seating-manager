export type VoiceSection = 'Soprano' | 'Alto' | 'Tenor' | 'Bass';

export type AlignmentMode = 'balanced' | 'grid';
export type PianoPosition = 'left' | 'right';

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
