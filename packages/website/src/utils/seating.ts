import {
  ChoirRoster,
  RosterMember,
  SeatedMember,
  DisplayMember,
  ChoirMember,
} from '../types';
import { migrateLegacyVoiceSection } from './voiceParts';
import { findDuplicateMember } from './roster';

/**
 * Join roster and seating data to create DisplayMember array for UI
 * Only includes members that are in the seating arrangement
 * Filters out seated members whose roster entry no longer exists
 */
export function joinRosterAndSeating(
  roster: ChoirRoster,
  seating: SeatedMember[]
): DisplayMember[] {
  const displayMembers: DisplayMember[] = [];
  
  // Create a map for faster roster lookups
  const rosterMap = new Map<string, RosterMember>();
  roster.members.forEach(member => {
    rosterMap.set(member.id, member);
  });
  
  // Join seating with roster data
  for (const seated of seating) {
    const rosterMember = rosterMap.get(seated.rosterId);
    
    // Skip if roster member no longer exists (orphaned seating reference)
    if (!rosterMember) {
      console.warn(`Seated member ${seated.rosterId} not found in roster`);
      continue;
    }
    
    displayMembers.push({
      id: rosterMember.id,
      name: rosterMember.name,
      voicePartId: rosterMember.voicePartId,
      position: seated.position,
      rowNumber: seated.rowNumber,
    });
  }
  
  return displayMembers;
}

/**
 * Add a member to the seating arrangement at a default position
 * Calculates the next available position in the specified row
 * If no row is specified, uses row 0
 */
export function addToSeating(
  seating: SeatedMember[],
  rosterId: string,
  defaultRow: number = 0
): SeatedMember[] {
  // Check if member is already seated
  if (seating.some(s => s.rosterId === rosterId)) {
    console.warn(`Member ${rosterId} is already in seating`);
    return seating;
  }
  
  // Calculate next position in the row
  const position = getNextPosition(seating, defaultRow);
  
  const newSeatedMember: SeatedMember = {
    rosterId,
    position,
    rowNumber: defaultRow,
  };
  
  return [...seating, newSeatedMember];
}

/**
 * Remove a member from the seating arrangement
 * Returns updated seating array without the specified member
 */
export function removeFromSeating(
  seating: SeatedMember[],
  rosterId: string
): SeatedMember[] {
  return seating.filter(s => s.rosterId !== rosterId);
}

/**
 * Update a seated member's position and row
 * Returns updated seating array with modified position
 */
export function updateSeatingPosition(
  seating: SeatedMember[],
  rosterId: string,
  position: number,
  rowNumber: number
): SeatedMember[] {
  return seating.map(s => {
    if (s.rosterId === rosterId) {
      return {
        ...s,
        position,
        rowNumber,
      };
    }
    return s;
  });
}

/**
 * Get the next available position in a specific row
 * Finds the maximum position in the row and adds 1
 * Returns 0 if the row is empty
 */
export function getNextPosition(
  seating: SeatedMember[],
  rowNumber: number
): number {
  const membersInRow = seating.filter(s => s.rowNumber === rowNumber);
  
  if (membersInRow.length === 0) {
    return 0;
  }
  
  const maxPosition = Math.max(...membersInRow.map(s => s.position));
  return maxPosition + 1;
}

/**
 * Migrate legacy ChoirMember[] format to roster + seating format
 * Handles duplicate detection and voice section migration
 * Returns both the updated roster and seating arrangement
 */
export function migrateLegacyMembers(
  legacyMembers: ChoirMember[],
  existingRoster?: ChoirRoster
): { roster: ChoirRoster; seating: SeatedMember[] } {
  const roster: ChoirRoster = existingRoster || {
    members: [],
    version: 1,
  };
  
  const seating: SeatedMember[] = [];
  const now = new Date().toISOString();
  
  // Process each legacy member
  for (const legacyMember of legacyMembers) {
    // Migrate voice section to voice part ID
    const voicePartId = migrateLegacyVoiceSection(legacyMember.voiceSection);
    
    // Check for duplicate in roster (same name + voice part)
    let rosterMember = findDuplicateMember(
      roster,
      legacyMember.name,
      voicePartId
    );
    
    // If no duplicate found, create new roster member
    if (!rosterMember) {
      rosterMember = {
        id: legacyMember.id, // Preserve original ID
        name: legacyMember.name,
        voicePartId,
        createdAt: now,
        updatedAt: now,
      };
      
      roster.members.push(rosterMember);
    }
    
    // Add to seating arrangement (referencing roster member)
    seating.push({
      rosterId: rosterMember.id,
      position: legacyMember.position,
      rowNumber: legacyMember.rowNumber,
    });
  }
  
  return { roster, seating };
}

/**
 * Add multiple members to seating at once
 * Distributes them across rows if specified, otherwise adds all to default row
 */
export function addMultipleToSeating(
  seating: SeatedMember[],
  rosterIds: string[],
  defaultRow: number = 0
): SeatedMember[] {
  let updatedSeating = [...seating];
  
  for (const rosterId of rosterIds) {
    updatedSeating = addToSeating(updatedSeating, rosterId, defaultRow);
  }
  
  return updatedSeating;
}

/**
 * Remove multiple members from seating at once
 */
export function removeMultipleFromSeating(
  seating: SeatedMember[],
  rosterIds: string[]
): SeatedMember[] {
  const idsToRemove = new Set(rosterIds);
  return seating.filter(s => !idsToRemove.has(s.rosterId));
}

/**
 * Get all roster IDs that are currently seated
 * Useful for UI to show which members are selected
 */
export function getSeatedRosterIds(seating: SeatedMember[]): string[] {
  return seating.map(s => s.rosterId);
}

/**
 * Check if seating arrangement has any orphaned references
 * Returns array of roster IDs that don't exist in the roster
 */
export function findOrphanedSeatingReferences(
  seating: SeatedMember[],
  roster: ChoirRoster
): string[] {
  const rosterIds = new Set(roster.members.map(m => m.id));
  const orphanedIds: string[] = [];
  
  for (const seated of seating) {
    if (!rosterIds.has(seated.rosterId)) {
      orphanedIds.push(seated.rosterId);
    }
  }
  
  return orphanedIds;
}

/**
 * Clean up orphaned seating references
 * Removes seated members that don't have corresponding roster entries
 */
export function cleanOrphanedSeatingReferences(
  seating: SeatedMember[],
  roster: ChoirRoster
): SeatedMember[] {
  const rosterIds = new Set(roster.members.map(m => m.id));
  return seating.filter(s => rosterIds.has(s.rosterId));
}
