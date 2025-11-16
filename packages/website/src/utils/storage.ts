import { ChoirData, ChoirMember, VoiceSection, StageSettings, SeatedMember, ChoirRoster, VoicePartsConfiguration } from '../types';
import { loadChoirRoster, saveChoirRoster } from './roster';
import { migrateLegacyMembers } from './seating';
import { loadVoicePartsConfig, saveVoicePartsConfig } from './voiceParts';

const STORAGE_KEY = 'choir-seating-data';

const DEFAULT_SETTINGS: StageSettings = {
  numberOfRows: 3,
  alignmentMode: 'balanced',
  pianoPosition: 'right',
  title: 'Choir Seating Manager',
};

export interface MigrationResult {
  wasMigrated: boolean;
  rosterMemberCount?: number;
  seatedMemberCount?: number;
  duplicatesFound?: number;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Detect if ChoirData is in legacy format (has members array)
 */
export function isLegacyFormat(data: ChoirData): boolean {
  return Array.isArray(data.members) && data.members.length > 0 && !data.seating;
}

/**
 * Detect if ChoirData is in new format (has seating array)
 */
function isNewFormat(data: ChoirData): boolean {
  return Array.isArray(data.seating);
}

export function loadChoirData(): { data: ChoirData; migration: MigrationResult } {
  const migration: MigrationResult = { wasMigrated: false };
  
  // Return empty data in new format (no localStorage)
  return {
    data: {
      seating: [],
      settings: DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
    },
    migration,
  };
  
  /* Removed localStorage usage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as ChoirData;
      
      // Ensure settings exist
      if (!data.settings) {
        data.settings = DEFAULT_SETTINGS;
      }
      
      // Detect format and handle migration if needed
      if (isLegacyFormat(data)) {
        console.log('Detected legacy data format, migrating to roster + seating...');
        
        // Load existing roster (if any)
        const existingRoster = loadChoirRoster();
        const existingMemberCount = existingRoster.members.length;
        
        // Migrate legacy members to roster + seating
        const { roster, seating } = migrateLegacyMembers(
          data.members!,
          existingRoster
        );
        
        // Calculate migration stats
        const newMemberCount = roster.members.length - existingMemberCount;
        const duplicatesFound = data.members!.length - newMemberCount;
        
        // Save updated roster
        saveChoirRoster(roster);
        
        // Convert to new format
        const migratedData: ChoirData = {
          seating,
          settings: data.settings,
          lastUpdated: new Date().toISOString(),
        };
        
        // Save migrated data
        saveChoirData(migratedData);
        
        console.log(`Migration complete: ${roster.members.length} roster members, ${seating.length} seated`);
        
        // Set migration result
        migration.wasMigrated = true;
        migration.rosterMemberCount = roster.members.length;
        migration.seatedMemberCount = seating.length;
        migration.duplicatesFound = duplicatesFound;
        
        return { data: migratedData, migration };
      }
      
      // Handle new format
      if (isNewFormat(data)) {
        return {
          data: {
            seating: data.seating,
            settings: data.settings,
            lastUpdated: data.lastUpdated,
          },
          migration,
        };
      }
      
      // Handle empty/initial state - ensure members array exists for backward compatibility
      if (!data.members && !data.seating) {
        return {
          data: {
            seating: [],
            settings: data.settings,
            lastUpdated: data.lastUpdated || new Date().toISOString(),
          },
          migration,
        };
      }
      
      return { data, migration };
    }
  } catch (error) {
    console.error('Error loading choir data:', error);
  }

  // Return empty data in new format
  return {
    data: {
      seating: [],
      settings: DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
    },
    migration,
  };
  */
}

export function saveChoirData(data: ChoirData): void {
  // No-op: localStorage removed to prevent data merging across sessions
  // Data is now only saved via API when a session code is provided
  console.log('saveChoirData called (localStorage disabled)');
}

/**
 * Export choir data with both new and legacy formats for compatibility
 * Includes roster data and voice parts configuration
 */
export function exportChoirData(data: ChoirData): void {
  try {
    // Load roster and voice parts config for complete export
    const roster = loadChoirRoster();
    const voicePartsConfig = loadVoicePartsConfig();
    
    // Create export package with both formats
    const exportData = {
      // New format
      seating: data.seating || [],
      roster: roster,
      voicePartsConfig: voicePartsConfig,
      
      // Legacy format for backward compatibility (if seating exists)
      members: data.seating ? convertSeatingToLegacyMembers(data.seating, roster) : [],
      
      // Common data
      settings: data.settings,
      lastUpdated: new Date().toISOString(),
      
      // Metadata
      exportVersion: 2, // Version 2 includes both formats + voice parts config
      exportDate: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `choir-seating-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting choir data:', error);
    throw new Error('Failed to export choir data');
  }
}

/**
 * Convert seating arrangement to legacy ChoirMember[] format
 * Used for backward compatibility in exports
 */
function convertSeatingToLegacyMembers(
  seating: SeatedMember[],
  roster: ChoirRoster
): ChoirMember[] {
  const rosterMap = new Map(roster.members.map(m => [m.id, m]));
  const legacyMembers: ChoirMember[] = [];
  
  for (const seated of seating) {
    const rosterMember = rosterMap.get(seated.rosterId);
    if (!rosterMember) continue;
    
    // Convert voice part ID back to legacy VoiceSection format
    const voiceSection = convertVoicePartIdToLegacySection(rosterMember.voicePartId);
    
    legacyMembers.push({
      id: rosterMember.id,
      name: rosterMember.name,
      voiceSection,
      position: seated.position,
      rowNumber: seated.rowNumber,
    });
  }
  
  return legacyMembers;
}

/**
 * Convert voice part ID to legacy VoiceSection
 * Maps: 'soprano' -> 'Soprano', 'alto' -> 'Alto', etc.
 * Defaults to 'Soprano' for unknown voice parts
 */
function convertVoicePartIdToLegacySection(voicePartId: string): VoiceSection {
  const mapping: Record<string, VoiceSection> = {
    soprano: 'Soprano',
    alto: 'Alto',
    tenor: 'Tenor',
    bass: 'Bass',
  };
  
  return mapping[voicePartId.toLowerCase()] || 'Soprano';
}

/**
 * Type for imported data that may contain additional fields
 */
interface ImportedData extends ChoirData {
  voicePartsConfig?: VoicePartsConfiguration;
  roster?: ChoirRoster;
  exportVersion?: number;
  exportDate?: string;
}

/**
 * Import choir data from file
 * Handles both legacy and new formats, triggers migration if needed
 * Also imports roster data and voice parts configuration if present in the file
 */
export async function importChoirData(file: File): Promise<{ data: ChoirData; migration: MigrationResult; hasOrphanedMembers: boolean }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string) as ImportedData;
        const migration: MigrationResult = { wasMigrated: false };
        let hasOrphanedMembers = false;
        
        // Validate and ensure settings exist
        if (!importedData.settings) {
          importedData.settings = DEFAULT_SETTINGS;
        }
        
        // Import voice parts configuration if present
        if (importedData.voicePartsConfig && importedData.voicePartsConfig.parts) {
          const existingConfig = loadVoicePartsConfig();
          const mergedConfig = mergeVoicePartsConfigs(existingConfig, importedData.voicePartsConfig);
          saveVoicePartsConfig(mergedConfig);
          console.log(`Imported voice parts configuration: ${importedData.voicePartsConfig.parts.length} voice parts`);
        }
        
        // If imported data includes roster, merge it with existing roster
        if (importedData.roster && Array.isArray(importedData.roster.members)) {
          const existingRoster = loadChoirRoster();
          const mergedRoster = mergeRosters(existingRoster, importedData.roster);
          saveChoirRoster(mergedRoster);
          console.log(`Imported roster: ${importedData.roster.members.length} members`);
          
          // Check for orphaned members after import
          const currentConfig = loadVoicePartsConfig();
          const orphanedCount = mergedRoster.members.filter(
            member => !currentConfig.parts.some(part => part.id === member.voicePartId)
          ).length;
          
          if (orphanedCount > 0) {
            console.warn(`Found ${orphanedCount} orphaned members after import`);
            hasOrphanedMembers = true;
          }
        }
        
        // Detect format and handle accordingly
        if (isLegacyFormat(importedData)) {
          console.log('Importing legacy format data...');
          
          // Ensure members have required fields
          const legacyMembers = (importedData.members || []).map((member) => ({
            ...member,
            rowNumber: member.rowNumber ?? 0,
          }));
          
          // Load existing roster
          const existingRoster = loadChoirRoster();
          const existingMemberCount = existingRoster.members.length;
          
          // Migrate to new format
          const { roster, seating } = migrateLegacyMembers(legacyMembers, existingRoster);
          
          // Calculate migration stats
          const newMemberCount = roster.members.length - existingMemberCount;
          const duplicatesFound = legacyMembers.length - newMemberCount;
          
          // Save updated roster
          saveChoirRoster(roster);
          
          const migratedData: ChoirData = {
            seating,
            settings: importedData.settings,
            lastUpdated: new Date().toISOString(),
          };
          
          console.log(`Import complete: ${roster.members.length} roster members, ${seating.length} seated`);
          
          // Set migration result
          migration.wasMigrated = true;
          migration.rosterMemberCount = roster.members.length;
          migration.seatedMemberCount = seating.length;
          migration.duplicatesFound = duplicatesFound;
          
          resolve({ data: migratedData, migration, hasOrphanedMembers });
        } else if (isNewFormat(importedData)) {
          console.log('Importing new format data...');
          
          const data: ChoirData = {
            seating: importedData.seating || [],
            settings: importedData.settings,
            lastUpdated: new Date().toISOString(),
          };
          
          resolve({ data, migration, hasOrphanedMembers });
        } else {
          // Empty or unknown format
          console.log('Importing empty or unknown format...');
          
          const data: ChoirData = {
            seating: [],
            settings: importedData.settings || DEFAULT_SETTINGS,
            lastUpdated: new Date().toISOString(),
          };
          
          resolve({ data, migration, hasOrphanedMembers });
        }
      } catch (error) {
        console.error('Error parsing import file:', error);
        reject(new Error('Invalid file format'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
}

/**
 * Merge imported roster with existing roster
 * Avoids duplicates based on name + voice part
 * Preserves existing member IDs when possible
 */
function mergeRosters(existing: ChoirRoster, imported: ChoirRoster): ChoirRoster {
  const mergedMembers = [...existing.members];
  const existingKeys = new Set(
    existing.members.map(m => `${m.name.toLowerCase()}:${m.voicePartId}`)
  );
  
  // Add imported members that don't already exist
  for (const importedMember of imported.members) {
    const key = `${importedMember.name.toLowerCase()}:${importedMember.voicePartId}`;
    
    if (!existingKeys.has(key)) {
      mergedMembers.push(importedMember);
      existingKeys.add(key);
    }
  }
  
  return {
    members: mergedMembers,
    version: Math.max(existing.version, imported.version),
  };
}

/**
 * Merge imported voice parts configuration with existing configuration
 * Avoids duplicates based on voice part ID
 * Preserves existing voice part properties when IDs match
 */
function mergeVoicePartsConfigs(
  existing: VoicePartsConfiguration,
  imported: VoicePartsConfiguration
): VoicePartsConfiguration {
  const mergedParts = [...existing.parts];
  const existingIds = new Set(existing.parts.map(p => p.id));
  
  // Add imported voice parts that don't already exist
  for (const importedPart of imported.parts) {
    if (!existingIds.has(importedPart.id)) {
      // Assign new order at the end
      mergedParts.push({
        ...importedPart,
        order: mergedParts.length,
      });
      existingIds.add(importedPart.id);
    }
  }
  
  return {
    parts: mergedParts,
    version: Math.max(existing.version, imported.version),
  };
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
