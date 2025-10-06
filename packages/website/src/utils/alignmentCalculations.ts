import { ChoirMember, AlignmentMode } from '../types';

export const MEMBER_WIDTH = 60; // Width in pixels
export const MEMBER_SPACING = 20; // Spacing between members in pixels

/**
 * Distributes members evenly across the specified number of rows
 */
export function distributeMembers(
  members: ChoirMember[],
  numberOfRows: number
): ChoirMember[] {
  const membersPerRow = Math.ceil(members.length / numberOfRows);
  const sortedMembers = [...members].sort((a, b) => a.position - b.position);

  return sortedMembers.map((member, index) => {
    const rowNumber = Math.floor(index / membersPerRow);
    return {
      ...member,
      rowNumber: Math.min(rowNumber, numberOfRows - 1),
    };
  });
}

/**
 * Calculates display position (x percentage) for a member based on alignment mode
 */
export function calculateMemberDisplayPosition(
  member: ChoirMember,
  members: ChoirMember[],
  alignmentMode: AlignmentMode,
  stageWidth: number
): number {
  const membersByRow = groupMembersByRow(members);
  const rowMembers = (membersByRow[member.rowNumber] || [])
    .sort((a, b) => a.position - b.position);
  const memberIndex = rowMembers.findIndex(m => m.id === member.id);
  
  if (memberIndex === -1) return 50; // Default to center if not found

  if (alignmentMode === 'balanced') {
    // Each row is independently centered
    const membersInRow = rowMembers.length;
    const totalWidth = membersInRow * MEMBER_WIDTH + (membersInRow - 1) * MEMBER_SPACING;
    const startX = (stageWidth - totalWidth) / 2;
    const x = startX + memberIndex * (MEMBER_WIDTH + MEMBER_SPACING) + MEMBER_WIDTH / 2;
    return (x / stageWidth) * 100;
  } else {
    // Grid: align columns across all rows
    const maxMembersInRow = Math.max(...Object.values(membersByRow).map(row => row.length));
    const totalWidth = maxMembersInRow * MEMBER_WIDTH + (maxMembersInRow - 1) * MEMBER_SPACING;
    const startX = (stageWidth - totalWidth) / 2;
    
    // Calculate column positions
    const columnPositions: number[] = [];
    for (let i = 0; i < maxMembersInRow; i++) {
      const x = startX + i * (MEMBER_WIDTH + MEMBER_SPACING) + MEMBER_WIDTH / 2;
      columnPositions.push((x / stageWidth) * 100);
    }
    
    // Position this member in the appropriate column
    const membersInRow = rowMembers.length;
    const startColumn = Math.floor((maxMembersInRow - membersInRow) / 2);
    const columnIndex = startColumn + memberIndex;
    
    return columnPositions[columnIndex] || 50;
  }
}

/**
 * Groups members by row number
 */
function groupMembersByRow(members: ChoirMember[]): Record<number, ChoirMember[]> {
  return members.reduce((acc, member) => {
    const row = member.rowNumber;
    if (!acc[row]) {
      acc[row] = [];
    }
    acc[row].push(member);
    return acc;
  }, {} as Record<number, ChoirMember[]>);
}

/**
 * Initializes new member with default row assignment
 */
export function initializeMemberPosition(
  member: ChoirMember,
  existingMembers: ChoirMember[],
  numberOfRows: number
): ChoirMember {
  // Find the row with fewest members
  const membersByRow = groupMembersByRow(existingMembers);
  let targetRow = 0;
  let minCount = Infinity;
  
  for (let i = 0; i < numberOfRows; i++) {
    const count = membersByRow[i]?.length || 0;
    if (count < minCount) {
      minCount = count;
      targetRow = i;
    }
  }

  return {
    ...member,
    rowNumber: targetRow,
  };
}
