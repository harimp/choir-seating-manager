/**
 * Validation utilities for choir management
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate voice part name
 * Requirements:
 * - 1-30 characters
 * - No special characters except spaces, hyphens, and numbers
 * - Cannot be empty or only whitespace
 */
export function validateVoicePartName(name: string): ValidationResult {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      isValid: false,
      error: 'Voice part name cannot be empty',
    };
  }

  if (trimmedName.length > 30) {
    return {
      isValid: false,
      error: 'Voice part name must be 30 characters or less',
    };
  }

  // Allow letters, numbers, spaces, and hyphens only
  const validNamePattern = /^[a-zA-Z0-9\s-]+$/;
  if (!validNamePattern.test(trimmedName)) {
    return {
      isValid: false,
      error: 'Voice part name can only contain letters, numbers, spaces, and hyphens',
    };
  }

  return { isValid: true };
}

/**
 * Check if voice part name is unique in configuration
 * Note: Caller should filter out the current item from existingNames if editing
 */
export function isVoicePartNameUnique(
  name: string,
  existingNames: string[]
): ValidationResult {
  const trimmedName = name.trim().toLowerCase();
  
  const isDuplicate = existingNames.some(
    (existingName) => existingName.toLowerCase() === trimmedName
  );

  if (isDuplicate) {
    return {
      isValid: false,
      error: 'A voice part with this name already exists',
    };
  }

  return { isValid: true };
}

/**
 * Validate hex color code
 * Must be in format #RRGGBB
 */
export function validateColorCode(color: string): ValidationResult {
  const hexColorPattern = /^#[0-9A-Fa-f]{6}$/;

  if (!hexColorPattern.test(color)) {
    return {
      isValid: false,
      error: 'Invalid color code. Must be in format #RRGGBB',
    };
  }

  return { isValid: true };
}

/**
 * Validate member name
 * Requirements:
 * - Cannot be empty or only whitespace
 * - Reasonable length (1-100 characters)
 */
export function validateMemberName(name: string): ValidationResult {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return {
      isValid: false,
      error: 'Member name cannot be empty',
    };
  }

  if (trimmedName.length > 100) {
    return {
      isValid: false,
      error: 'Member name must be 100 characters or less',
    };
  }

  return { isValid: true };
}

/**
 * Validate voice part selection
 */
export function validateVoicePartSelection(voicePartId: string): ValidationResult {
  if (!voicePartId || voicePartId.trim() === '') {
    return {
      isValid: false,
      error: 'Please select a voice part',
    };
  }

  return { isValid: true };
}

/**
 * Create a user-friendly error message for deletion prevention
 */
export function createDeletionPreventionMessage(
  itemType: 'voice part' | 'member',
  itemName: string,
  memberCount?: number,
  isSeated?: boolean
): string {
  if (itemType === 'voice part' && memberCount !== undefined) {
    return `Cannot delete "${itemName}" because ${memberCount} member${
      memberCount !== 1 ? 's are' : ' is'
    } assigned to this voice part. Please reassign or remove ${
      memberCount !== 1 ? 'them' : 'the member'
    } first.`;
  }

  if (itemType === 'member' && isSeated) {
    return `"${itemName}" is currently in the seating arrangement. Removing this member will also remove them from the seating. Are you sure you want to continue?`;
  }

  return `Are you sure you want to delete "${itemName}"?`;
}

/**
 * Create a confirmation message for destructive actions
 */
export function createConfirmationMessage(
  action: 'delete' | 'clear' | 'reassign',
  itemType: string,
  itemName?: string,
  count?: number
): string {
  switch (action) {
    case 'delete':
      return itemName
        ? `Are you sure you want to delete "${itemName}"?`
        : `Are you sure you want to delete this ${itemType}?`;
    
    case 'clear':
      return count !== undefined
        ? `Are you sure you want to clear all ${count} ${itemType}${count !== 1 ? 's' : ''}?`
        : `Are you sure you want to clear all ${itemType}s?`;
    
    case 'reassign':
      return count !== undefined
        ? `This will reassign ${count} member${count !== 1 ? 's' : ''}. Continue?`
        : `Are you sure you want to reassign this ${itemType}?`;
    
    default:
      return 'Are you sure you want to continue?';
  }
}
