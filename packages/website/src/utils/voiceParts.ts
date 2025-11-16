import {
  VoicePart,
  VoicePartsConfiguration,
  DEFAULT_VOICE_PARTS,
  ChoirRoster,
  RosterMember,
  VoiceSection,
} from '../types';

// Available colors for new voice parts
const AVAILABLE_COLORS = [
  '#FF69B4', // Pink (Soprano default)
  '#9370DB', // Purple (Alto default)
  '#4169E1', // Blue (Tenor default)
  '#90EE90', // Green (Bass default)
  '#FF6B6B', // Red
  '#FFA500', // Orange
  '#FFD700', // Gold
  '#20B2AA', // Teal
  '#DDA0DD', // Plum
  '#87CEEB', // Sky Blue
  '#F08080', // Light Coral
  '#98FB98', // Pale Green
];

/**
 * Load voice parts configuration (localStorage removed)
 * Returns default SATB configuration
 */
export function loadVoicePartsConfig(): VoicePartsConfiguration {
  // Always return default SATB configuration (localStorage disabled)
  return DEFAULT_VOICE_PARTS;
}

/**
 * Save voice parts configuration (localStorage removed)
 * No-op function to prevent data merging across sessions
 */
export function saveVoicePartsConfig(): void {
  // No-op: localStorage removed to prevent data merging across sessions
  console.log('saveVoicePartsConfig called (localStorage disabled)');
}

/**
 * Generate a unique voice part ID from a name (kebab-case)
 * Examples: "Soprano 1" -> "soprano-1", "Alto" -> "alto"
 */
export function generateVoicePartId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get voice part by ID
 */
export function getVoicePartById(
  id: string,
  config: VoicePartsConfiguration
): VoicePart | undefined {
  return config.parts.find((part) => part.id === id);
}

/**
 * Get voice part color with fallback
 * Returns a default color if the voice part is not found
 */
export function getVoicePartColor(
  id: string,
  config: VoicePartsConfiguration
): string {
  const part = getVoicePartById(id, config);
  return part?.color || '#CCCCCC'; // Gray fallback
}

/**
 * Validate if a voice part ID exists in the configuration
 */
export function isValidVoicePartId(
  id: string,
  config: VoicePartsConfiguration
): boolean {
  return config.parts.some((part) => part.id === id);
}

/**
 * Validate hex color code
 * Returns true if valid, false otherwise
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Sanitize color code with fallback
 * Returns the color if valid, otherwise returns a fallback color
 */
export function sanitizeColorCode(color: string, fallback?: string): string {
  if (isValidHexColor(color)) {
    return color;
  }
  
  console.warn(`Invalid color code "${color}", using fallback`);
  return fallback || '#CCCCCC';
}

/**
 * Get the next available color for a new voice part
 * Avoids colors already in use
 */
export function getNextAvailableColor(
  config: VoicePartsConfiguration
): string {
  const usedColors = new Set(config.parts.map((part) => part.color.toUpperCase()));
  
  // Find first available color from the palette
  for (const color of AVAILABLE_COLORS) {
    if (!usedColors.has(color.toUpperCase())) {
      return color;
    }
  }
  
  // If all colors are used, generate a random color
  return generateRandomColor();
}

/**
 * Generate a random hex color
 */
function generateRandomColor(): string {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

/**
 * Migrate legacy voice section (SATB string) to voice part ID
 * Maps: 'Soprano' -> 'soprano', 'Alto' -> 'alto', etc.
 */
export function migrateLegacyVoiceSection(voiceSection: VoiceSection): string {
  const mapping: Record<VoiceSection, string> = {
    Soprano: 'soprano',
    Alto: 'alto',
    Tenor: 'tenor',
    Bass: 'bass',
  };
  
  return mapping[voiceSection] || voiceSection.toLowerCase();
}

/**
 * Find roster members with voice parts that don't exist in the current configuration
 * These are "orphaned" members that need to be reassigned
 */
export function findOrphanedMembers(
  roster: ChoirRoster,
  config: VoicePartsConfiguration
): RosterMember[] {
  return roster.members.filter(
    (member) => !isValidVoicePartId(member.voicePartId, config)
  );
}

/**
 * Get count of roster members per voice part
 * Returns a map of voice part ID to member count
 */
export function getMemberCountsByVoicePart(
  roster: ChoirRoster
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const member of roster.members) {
    counts[member.voicePartId] = (counts[member.voicePartId] || 0) + 1;
  }
  
  return counts;
}

/**
 * Check if a voice part can be safely deleted
 * Returns true if no roster members are assigned to this voice part
 */
export function canDeleteVoicePart(
  voicePartId: string,
  roster: ChoirRoster
): boolean {
  return !roster.members.some((member) => member.voicePartId === voicePartId);
}

/**
 * Add a new voice part to the configuration
 */
export function addVoicePart(
  config: VoicePartsConfiguration,
  name: string,
  color?: string
): VoicePartsConfiguration {
  const id = generateVoicePartId(name);
  
  // Use provided color if valid, otherwise get next available color
  const defaultColor = getNextAvailableColor(config);
  const finalColor = color 
    ? sanitizeColorCode(color, defaultColor)
    : defaultColor;
  
  const newPart: VoicePart = {
    id,
    name,
    color: finalColor,
    order: config.parts.length,
  };
  
  return {
    ...config,
    parts: [...config.parts, newPart],
  };
}

/**
 * Update an existing voice part
 */
export function updateVoicePart(
  config: VoicePartsConfiguration,
  id: string,
  updates: Partial<Pick<VoicePart, 'name' | 'color'>>
): VoicePartsConfiguration {
  return {
    ...config,
    parts: config.parts.map((part) => {
      if (part.id !== id) return part;
      
      const updatedPart = { ...part };
      
      if (updates.name !== undefined) {
        updatedPart.name = updates.name;
      }
      
      if (updates.color !== undefined) {
        // Sanitize color with current color as fallback
        updatedPart.color = sanitizeColorCode(updates.color, part.color);
      }
      
      return updatedPart;
    }),
  };
}

/**
 * Remove a voice part from the configuration
 * Should only be called after ensuring no members are assigned to this part
 */
export function removeVoicePart(
  config: VoicePartsConfiguration,
  id: string
): VoicePartsConfiguration {
  const filteredParts = config.parts.filter((part) => part.id !== id);
  
  // Reorder remaining parts
  const reorderedParts = filteredParts.map((part, index) => ({
    ...part,
    order: index,
  }));
  
  return {
    ...config,
    parts: reorderedParts,
  };
}

/**
 * Reorder voice parts
 * Takes an array of voice part IDs in the desired order
 */
export function reorderVoiceParts(
  config: VoicePartsConfiguration,
  orderedIds: string[]
): VoicePartsConfiguration {
  const partsMap = new Map(config.parts.map((part) => [part.id, part]));
  
  const reorderedParts = orderedIds
    .map((id) => partsMap.get(id))
    .filter((part): part is VoicePart => part !== undefined)
    .map((part, index) => ({
      ...part,
      order: index,
    }));
  
  return {
    ...config,
    parts: reorderedParts,
  };
}
