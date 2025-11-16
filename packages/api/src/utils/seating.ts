import { SeatedMember } from '../types';

/**
 * Normalize seating positions to ensure they are non-negative integers
 * Sorts members by row and position, then reassigns sequential positions starting from 0
 * This prevents decimal and negative position values from persisting in the database
 */
export function normalizeSeatingPositions(seating: SeatedMember[]): SeatedMember[] {
  // Group by row
  const byRow = new Map<number, SeatedMember[]>();
  
  for (const seated of seating) {
    const rowNumber = Math.max(0, Math.floor(seated.rowNumber)); // Ensure row is non-negative integer
    if (!byRow.has(rowNumber)) {
      byRow.set(rowNumber, []);
    }
    byRow.get(rowNumber)!.push({ ...seated, rowNumber });
  }
  
  // Normalize positions within each row
  const normalized: SeatedMember[] = [];
  
  for (const [rowNumber, members] of byRow.entries()) {
    // Sort by position (handles both decimals and negatives correctly)
    const sorted = members.sort((a, b) => a.position - b.position);
    
    // Reassign sequential integer positions starting from 0
    sorted.forEach((member, index) => {
      normalized.push({
        ...member,
        position: index,
        rowNumber,
      });
    });
  }
  
  return normalized;
}
