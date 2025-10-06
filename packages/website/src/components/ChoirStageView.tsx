import { useState, useRef, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { ChoirMember, StageSettings } from '../types';
import { MemberIcon } from './MemberIcon';
import { ConductorIcon } from './ConductorIcon';
import { PianoIcon } from './PianoIcon';
import { getRowFromY } from '../utils/collisionDetection';
import { calculateMemberDisplayPosition } from '../utils/alignmentCalculations';
import './ChoirStageView.scss';

interface ChoirStageViewProps {
  members: ChoirMember[];
  settings: StageSettings;
  onMemberUpdate: (members: ChoirMember[]) => void;
}

interface DragState {
  member: ChoirMember | null;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  shadowRowNumber: number;
  shadowPosition: number;
  shadowXPercent: number;
  shadowYPercent: number;
}

export const ChoirStageView = ({
  members,
  settings,
  onMemberUpdate,
}: ChoirStageViewProps) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  
  // Use ref for drag state to avoid closure issues
  const dragStateRef = useRef<DragState>({
    member: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    shadowRowNumber: 0,
    shadowPosition: 0,
    shadowXPercent: 0,
    shadowYPercent: 0,
  });
  
  // Also keep state for triggering re-renders
  const [dragState, setDragState] = useState<DragState>({
    member: null,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    shadowRowNumber: 0,
    shadowPosition: 0,
    shadowXPercent: 0,
    shadowYPercent: 0,
  });
  
  const [stageWidth, setStageWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);

  // Update stage dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (stageRef.current) {
        setStageWidth(stageRef.current.offsetWidth);
        setStageHeight(stageRef.current.offsetHeight);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);


  const handleDragStart = (member: ChoirMember) => {
    if (!stageRef.current) return;
    
    const rect = stageRef.current.getBoundingClientRect();
    
    // Calculate member's current position in pixels
    const memberXPercent = calculateMemberDisplayPosition(
      member,
      members,
      settings.alignmentMode,
      stageWidth
    );
    const memberYPercent = getRowY(member.rowNumber);
    const memberXPixels = (memberXPercent / 100) * rect.width;
    const memberYPixels = (memberYPercent / 100) * rect.height;
    
    const newDragState = {
      member,
      startX: memberXPixels,
      startY: memberYPixels,
      currentX: memberXPixels,
      currentY: memberYPixels,
      shadowRowNumber: member.rowNumber,
      shadowPosition: member.position,
      shadowXPercent: memberXPercent,
      shadowYPercent: memberYPercent,
    };
    
    // Update both ref and state
    dragStateRef.current = newDragState;
    setDragState(newDragState);
  };

  const handleDrag = (member: ChoirMember, clientX: number, clientY: number) => {
    if (!stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Calculate which row the cursor is currently hovering over
    const rowAreaTop = rect.height * 0.35;
    const rowAreaHeight = rect.height * 0.55;
    const shadowRow = getRowFromY(
      y,
      rect.height,
      settings.numberOfRows,
      rowAreaTop,
      rowAreaHeight
    );

    // Get members in the shadow row (excluding the dragged member)
    const shadowRowMembers = members
      .filter(m => m.rowNumber === shadowRow && m.id !== member.id)
      .sort((a, b) => a.position - b.position);

    // Calculate insertion index based on x position
    let insertionIndex = shadowRowMembers.length;
    const dropXPercent = (x / rect.width) * 100;
    
    if (shadowRowMembers.length > 0) {
      for (let i = 0; i < shadowRowMembers.length; i++) {
        const otherMemberX = calculateMemberDisplayPosition(
          shadowRowMembers[i],
          members,
          settings.alignmentMode,
          stageWidth
        );
        
        if (dropXPercent < otherMemberX) {
          insertionIndex = i;
          break;
        }
      }
    }

    // Calculate shadow position value
    let shadowPos: number;
    if (shadowRowMembers.length === 0) {
      shadowPos = member.position;
    } else if (insertionIndex === 0) {
      shadowPos = shadowRowMembers[0].position - 1;
    } else if (insertionIndex === shadowRowMembers.length) {
      shadowPos = shadowRowMembers[shadowRowMembers.length - 1].position + 1;
    } else {
      const beforePos = shadowRowMembers[insertionIndex - 1].position;
      const afterPos = shadowRowMembers[insertionIndex].position;
      shadowPos = (beforePos + afterPos) / 2;
    }

    // Calculate shadow display position
    const shadowMember: ChoirMember = {
      ...member,
      rowNumber: shadowRow,
      position: shadowPos,
    };
    
    const shadowXPercent = calculateMemberDisplayPosition(
      shadowMember,
      members.filter(m => m.id !== member.id).concat(shadowMember),
      settings.alignmentMode,
      stageWidth
    );
    const shadowYPercent = getRowY(shadowRow);

    const newDragState = {
      ...dragStateRef.current,
      member,
      currentX: x,
      currentY: y,
      shadowRowNumber: shadowRow,
      shadowPosition: shadowPos,
      shadowXPercent,
      shadowYPercent,
    };
    
    // Update both ref and state
    dragStateRef.current = newDragState;
    setDragState(newDragState);
  };

  const handleDragEnd = (member: ChoirMember) => {
    // Use ref to get immediate value, not stale state
    const currentDragState = dragStateRef.current;
    
    if (!currentDragState.member) {
      const emptyState = {
        member: null,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        shadowRowNumber: 0,
        shadowPosition: 0,
        shadowXPercent: 0,
        shadowYPercent: 0,
      };
      dragStateRef.current = emptyState;
      setDragState(emptyState);
      return;
    }

    // Create the shadow member (dragged member with updated position)
    const shadowMember: ChoirMember = {
      ...currentDragState.member,
      rowNumber: currentDragState.shadowRowNumber,
      position: currentDragState.shadowPosition,
    };

    // Build the exact array that was being rendered during drag
    // This ensures final state matches the drag preview exactly
    const updatedMembers = members
      .filter(m => m.id !== currentDragState.member!.id)
      .concat(shadowMember);

    // Clear drag state
    const emptyState = {
      member: null,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      shadowRowNumber: 0,
      shadowPosition: 0,
      shadowXPercent: 0,
      shadowYPercent: 0,
    };
    
    dragStateRef.current = emptyState;
    flushSync(() => {
      setDragState(emptyState);
    });

    // Update members with the array that matches the drag preview
    onMemberUpdate(updatedMembers);
  };

  const handleMemberClick = (member: ChoirMember) => {
    setSelectedMember(member.id === selectedMember ? null : member.id);
  };

  // Calculate row positions
  const getRowY = (rowNumber: number): number => {
    const rowAreaTop = 35; // Start at 35% from top
    const rowAreaHeight = 55; // Occupy 55% of height
    const rowHeight = rowAreaHeight / settings.numberOfRows;
    return rowAreaTop + rowNumber * rowHeight + rowHeight / 2;
  };

  const getMemberStyle = (member: ChoirMember): React.CSSProperties => {
    // If this member is being dragged, allow free movement
    if (dragState.member?.id === member.id) {
      return {
        left: `${dragState.currentX}px`,
        top: `${dragState.currentY}px`,
        transition: 'none',
      };
    }

    // During drag, calculate positions with the shadow member included
    let membersForCalculation = members;
    if (dragState.member) {
      // Create a temporary array with shadow member and without dragged member
      const shadowMember: ChoirMember = {
        ...dragState.member,
        rowNumber: dragState.shadowRowNumber,
        position: dragState.shadowPosition,
      };
      
      membersForCalculation = members
        .filter(m => m.id !== dragState.member!.id)
        .concat(shadowMember);
    }

    // Calculate position dynamically based on row and alignment mode
    const xPercent = calculateMemberDisplayPosition(
      member,
      membersForCalculation,
      settings.alignmentMode,
      stageWidth
    );

    return {
      left: `${xPercent}%`,
      top: `${getRowY(member.rowNumber)}%`,
      transition: 'all 0.3s ease',
    };
  };

  const getShadowStyle = (): React.CSSProperties => {
    return {
      left: `${dragState.shadowXPercent}%`,
      top: `${dragState.shadowYPercent}%`,
      transition: 'none',
      opacity: 0.5,
    };
  };

  return (
    <div className="choir-stage-view" ref={stageRef}>
      {/* Center line */}
      <div className="center-line" />

      {/* Conductor */}
      <div className="conductor-position">
        <ConductorIcon />
      </div>

      {/* Piano */}
      <div className={`piano-position piano-${settings.pianoPosition}`}>
        <PianoIcon />
      </div>

      {/* Members */}
      <div className="members-layer">
        {members.map(member => (
          <MemberIcon
            key={member.id}
            member={member}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClick={handleMemberClick}
            isSelected={selectedMember === member.id}
            style={getMemberStyle(member)}
          />
        ))}
        
        {/* Shadow member showing where the dragged member will land */}
        {dragState.member && (
          <MemberIcon
            key="shadow"
            member={dragState.member}
            onDragStart={() => {}}
            onDrag={() => {}}
            onDragEnd={() => {}}
            onClick={() => {}}
            isSelected={false}
            style={getShadowStyle()}
          />
        )}
      </div>

      {/* Centre label */}
      <div className="centre-label">CENTRE</div>
    </div>
  );
};
