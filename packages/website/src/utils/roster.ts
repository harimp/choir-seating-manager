import { ChoirRoster, RosterMember, SeatedMember } from '../types';

const ROSTER_STORAGE_KEY = 'choir-member-roster';

/**
 * Generate a unique ID for roster members
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Load choir roster (localStorage removed)
 * Returns empty roster
 */
export function loadChoirRoster(): ChoirRoster {
  // Return empty roster with version 1 (localStorage disabled)
  return {
    members: [],
    version: 1,
  };
}

/**
 * Save choir roster (localStorage removed)
 * No-op function to prevent data merging across sessions
 */
export function saveChoirRoster(roster: ChoirRoster): void {
  // No-op: localStorage removed to prevent data merging across sessions
  console.log('saveChoirRoster called (localStorage disabled)');
}

/**
 * Add a new member to the roster
 * Returns updated roster with new member
 */
export function addRosterMember(
  roster: ChoirRoster,
  name: string,
  voicePartId: string
): ChoirRoster {
  const now = new Date().toISOString();
  
  const newMember: RosterMember = {
    id: generateId(),
    name: name.trim(),
    voicePartId,
    createdAt: now,
    updatedAt: now,
  };

  return {
    ...roster,
    members: [...roster.members, newMember],
  };
}

/**
 * Update an existing roster member's name and/or voice part
 * Returns updated roster, or original roster if member not found
 */
export function updateRosterMember(
  roster: ChoirRoster,
  id: string,
  name: string,
  voicePartId: string
): ChoirRoster {
  const memberIndex = roster.members.findIndex(m => m.id === id);
  
  if (memberIndex === -1) {
    console.warn(`Roster member with id ${id} not found`);
    return roster;
  }

  const updatedMembers = [...roster.members];
  updatedMembers[memberIndex] = {
    ...updatedMembers[memberIndex],
    name: name.trim(),
    voicePartId,
    updatedAt: new Date().toISOString(),
  };

  return {
    ...roster,
    members: updatedMembers,
  };
}

/**
 * Remove a member from the roster
 * Returns updated roster without the specified member
 */
export function removeRosterMember(roster: ChoirRoster, id: string): ChoirRoster {
  return {
    ...roster,
    members: roster.members.filter(m => m.id !== id),
  };
}

/**
 * Get a roster member by ID
 * Returns the member if found, undefined otherwise
 */
export function getRosterMemberById(
  roster: ChoirRoster,
  id: string
): RosterMember | undefined {
  return roster.members.find(m => m.id === id);
}

/**
 * Check if a roster member is currently in the seating arrangement
 */
export function isMemberSeated(rosterId: string, seating: SeatedMember[]): boolean {
  return seating.some(seated => seated.rosterId === rosterId);
}

/**
 * Find a duplicate member with the same name and voice part
 * Returns the duplicate member if found, undefined otherwise
 * This is useful for preventing duplicate entries during migration or import
 */
export function findDuplicateMember(
  roster: ChoirRoster,
  name: string,
  voicePartId: string
): RosterMember | undefined {
  const normalizedName = name.trim().toLowerCase();
  
  return roster.members.find(
    m => m.name.toLowerCase() === normalizedName && m.voicePartId === voicePartId
  );
}
