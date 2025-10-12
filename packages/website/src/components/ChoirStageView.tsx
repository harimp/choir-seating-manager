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
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

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

  // Handle zoom with mouse wheel
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        const zoomSpeed = 0.001;
        const delta = -e.deltaY * zoomSpeed;
        const newZoom = Math.min(Math.max(0.5, zoom + delta), 3);
        
        // Zoom towards mouse cursor position
        if (stageRef.current) {
          const rect = stageRef.current.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // Calculate the point in stage coordinates before zoom
          const stageX = (mouseX - panOffset.x) / zoom;
          const stageY = (mouseY - panOffset.y) / zoom;
          
          // Calculate new pan offset to keep the same point under cursor
          const newPanX = mouseX - stageX * newZoom;
          const newPanY = mouseY - stageY * newZoom;
          
          setPanOffset({ x: newPanX, y: newPanY });
        }
        
        setZoom(newZoom);
      }
    };

    const stage = stageRef.current;
    if (stage) {
      stage.addEventListener('wheel', handleWheel, { passive: false });
      return () => stage.removeEventListener('wheel', handleWheel);
    }
  }, [zoom, panOffset]);

  // Handle pan with mouse drag
  const handleStageMouseDown = (e: React.MouseEvent) => {
    // Only pan if NOT clicking on a member icon
    const target = e.target as HTMLElement;
    const isMemberClick = target.closest('.member-icon');
    
    if (!isMemberClick) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setPanOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isPanning, panStart]);

  // Reset zoom and pan
  const handleResetView = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Calculate dynamic icon size based on member count and available space
  const calculateIconSize = (): { width: number; height: number; textSize: number } => {
    if (stageWidth === 0 || stageHeight === 0) {
      return { width: 120, height: 160, textSize: 11 };
    }

    // Find maximum members in any single row
    const membersByRow = members.reduce((acc, member) => {
      acc[member.rowNumber] = (acc[member.rowNumber] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const maxMembersInRow = Math.max(...Object.values(membersByRow), 1);

    // Calculate available space - maximize viewport usage
    const usableWidth = stageWidth * 0.95; // Use 95% width (2.5% margins)
    const availableWidthPerMember = usableWidth / maxMembersInRow;
    const rowAreaHeight = stageHeight * 0.70; // Rows occupy 70% of height (up from 55%)
    const availableHeightPerRow = rowAreaHeight / settings.numberOfRows;

    // Calculate icon width - pack more efficiently
    let iconWidth = Math.min(
      availableWidthPerMember * 0.95,  // 95% to make icons larger (no spacing needed)
      availableHeightPerRow * 0.80,    // 80% of row height for better vertical usage
      150                               // maximum cap
    );
    iconWidth = Math.max(iconWidth, 35); // minimum 35px

    // Maintain 3:4 aspect ratio (width:height)
    const iconHeight = iconWidth * (4 / 3);

    // Calculate text size: scales with icon but constrained for readability
    const textSize = Math.max(16, Math.min(iconWidth * 0.14, 16));

    return { 
      width: Math.round(iconWidth), 
      height: Math.round(iconHeight), 
      textSize: Math.round(textSize) 
    };
  };

  const iconSize = calculateIconSize();


  const handleDragStart = (member: ChoirMember) => {
    if (!stageRef.current) return;
    
    const rect = stageRef.current.getBoundingClientRect();
    
    // Calculate member's current position in pixels
    const memberXPercent = calculateMemberDisplayPosition(
      member,
      members,
      settings.alignmentMode,
      stageWidth,
      iconSize.width
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
    // Convert screen coordinates to stage coordinates accounting for zoom and pan
    const x = (clientX - rect.left - panOffset.x) / zoom;
    const y = (clientY - rect.top - panOffset.y) / zoom;

    // Calculate which row the cursor is currently hovering over
    const rowAreaTop = rect.height * 0.20;  // Match getRowY: 20% from top
    const rowAreaHeight = rect.height * 0.70;  // Match getRowY: 70% height
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
          stageWidth,
          iconSize.width
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
      stageWidth,
      iconSize.width
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

  const handleDragEnd = () => {
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

  const handleMemberRemove = (member: ChoirMember) => {
    const updatedMembers = members.filter(m => m.id !== member.id);
    onMemberUpdate(updatedMembers);
    // Clear selection if the removed member was selected
    if (selectedMember === member.id) {
      setSelectedMember(null);
    }
  };

  // Calculate row positions
  const getRowY = (rowNumber: number): number => {
    const rowAreaTop = 20; // Start at 20% from top (closer to conductor)
    const rowAreaHeight = 70; // Occupy 70% of height (maximize viewport)
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
      stageWidth,
      iconSize.width
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
      {/* Zoom controls */}
      <div className="zoom-controls">
        <button onClick={() => setZoom(Math.min(3, zoom * 1.2))} title="Zoom In">+</button>
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.max(0.5, zoom / 1.2))} title="Zoom Out">−</button>
        <button onClick={handleResetView} title="Reset View">Reset</button>
      </div>

      {/* Stage content with transform */}
      <div 
        className="stage-content"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleStageMouseDown}
      >
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
            onRemove={handleMemberRemove}
            isSelected={selectedMember === member.id}
            style={getMemberStyle(member)}
            iconWidth={iconSize.width}
            iconHeight={iconSize.height}
            textSize={iconSize.textSize}
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
            onRemove={() => {}}
            isSelected={false}
            style={getShadowStyle()}
            iconWidth={iconSize.width}
            iconHeight={iconSize.height}
            textSize={iconSize.textSize}
          />
        )}
      </div>

        {/* Centre label */}
        <div className="centre-label">CENTRE</div>
      </div>
    </div>
  );
};
