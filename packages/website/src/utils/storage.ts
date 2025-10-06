import { ChoirData, ChoirMember, VoiceSection, StageSettings } from '../types';

const STORAGE_KEY = 'choir-seating-data';

const DEFAULT_SETTINGS: StageSettings = {
  numberOfRows: 3,
  alignmentMode: 'balanced',
  pianoPosition: 'right',
};

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function loadChoirData(): ChoirData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as ChoirData;
      
      // Ensure settings exist
      if (!data.settings) {
        data.settings = DEFAULT_SETTINGS;
      }
      
      // Ensure members have rowNumber field
      data.members = data.members.map(member => ({
        ...member,
        rowNumber: member.rowNumber ?? 0,
      }));
      
      return data;
    }
  } catch (error) {
    console.error('Error loading choir data:', error);
  }

  return {
    members: [],
    settings: DEFAULT_SETTINGS,
    lastUpdated: new Date().toISOString(),
  };
}

export function saveChoirData(data: ChoirData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving choir data:', error);
  }
}

export function exportChoirData(data: ChoirData): void {
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `choir-seating-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function importChoirData(file: File): Promise<ChoirData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ChoirData;
        
        // Validate and ensure settings exist
        if (!data.settings) {
          data.settings = DEFAULT_SETTINGS;
        }
        
        // Ensure members have required fields
        data.members = data.members.map(member => ({
          ...member,
          rowNumber: member.rowNumber ?? 0,
        }));
        
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

export function getMembersBySection(
  members: ChoirMember[],
  section: VoiceSection
): ChoirMember[] {
  return members.filter(m => m.voiceSection === section);
}

export function sortMembersByPosition(members: ChoirMember[]): ChoirMember[] {
  return [...members].sort((a, b) => a.position - b.position);
}
