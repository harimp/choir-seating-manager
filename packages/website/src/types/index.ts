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
}

export interface ChoirData {
  members: ChoirMember[];
  settings: StageSettings;
  lastUpdated: string;
}
