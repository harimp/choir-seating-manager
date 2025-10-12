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
  
  // Fixed 16:9 canvas dimensions
  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 900;
  
  // Zoom and pan state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Touch state for pinch-to-zoom
  const [touchState, setTouchState] = useState<{
    initialDistance: number | null;
    initialZoom: number;
    initialCenter: { x: number; y: number } | null;
  }>({
    initialDistance: null,
    initialZoom: 1,
    initialCenter: null,
  });

  // Update viewport dimensions and calculate initial zoom on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (stageRef.current) {
        const vw = stageRef.current.offsetWidth;
        const vh = stageRef.current.offsetHeight;
        
        // Calculate initial zoom to fit canvas in viewport with some padding
        const scaleX = (vw * 0.95) / CANVAS_WIDTH;
        const scaleY = (vh * 0.95) / CANVAS_HEIGHT;
        const initialZoom = Math.min(scaleX, scaleY);
        
        setZoom(initialZoom);
        
        // Center the canvas in the viewport
        const offsetX = (vw - CANVAS_WIDTH * initialZoom) / 2;
        const offsetY = (vh - CANVAS_HEIGHT * initialZoom) / 2;
        setPanOffset({ x: offsetX, y: offsetY });
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

  // Touch event handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const isMemberTouch = target.closest('.member-icon');
    
    if (isMemberTouch) return;
    
    if (e.touches.length === 1) {
      // Single finger - pan
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for pinch zoom
      e.preventDefault();
      setIsPanning(false);
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      
      setTouchState({
        initialDistance: distance,
        initialZoom: zoom,
        initialCenter: { x: centerX, y: centerY },
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning) {
      // Single finger panning
      const touch = e.touches[0];
      setPanOffset({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
    } else if (e.touches.length === 2 && touchState.initialDistance) {
      // Two finger pinch zoom
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = currentDistance / touchState.initialDistance;
      const newZoom = Math.min(Math.max(0.5, touchState.initialZoom * scale), 3);
      
      if (stageRef.current && touchState.initialCenter) {
        const rect = stageRef.current.getBoundingClientRect();
        const centerX = touchState.initialCenter.x - rect.left;
        const centerY = touchState.initialCenter.y - rect.top;
        
        // Calculate the point in stage coordinates before zoom
        const stageX = (centerX - panOffset.x) / zoom;
        const stageY = (centerY - panOffset.y) / zoom;
        
        // Calculate new pan offset to keep the same point under touch center
        const newPanX = centerX - stageX * newZoom;
        const newPanY = centerY - stageY * newZoom;
        
        setPanOffset({ x: newPanX, y: newPanY });
      }
      
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      setTouchState({
        initialDistance: null,
        initialZoom: zoom,
        initialCenter: null,
      });
    } else if (e.touches.length === 1) {
      // Switched from 2 fingers to 1 - restart pan
      setTouchState({
        initialDistance: null,
        initialZoom: zoom,
        initialCenter: null,
      });
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
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

  // Reset zoom to 100% and center the canvas
  const handleResetView = () => {
    if (stageRef.current) {
      const vw = stageRef.current.offsetWidth;
      const vh = stageRef.current.offsetHeight;
      
      setZoom(1.0); // Always reset to 100%
      
      // Center the canvas at 100% zoom
      const offsetX = (vw - CANVAS_WIDTH) / 2;
      const offsetY = (vh - CANVAS_HEIGHT) / 2;
      setPanOffset({ x: offsetX, y: offsetY });
    }
  };

  // Calculate icon size based on fixed canvas and member count
  const calculateIconSize = (): { width: number; height: number; textSize: number } => {
    // Find maximum members in any single row
    const membersByRow = members.reduce((acc, member) => {
      acc[member.rowNumber] = (acc[member.rowNumber] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const maxMembersInRow = Math.max(...Object.values(membersByRow), 1);

    // Calculate available space on fixed 16:9 canvas
    const usableWidth = CANVAS_WIDTH * 0.90; // Use 90% width
    const availableWidthPerMember = usableWidth / maxMembersInRow;
    const rowAreaHeight = CANVAS_HEIGHT * 0.65; // Rows occupy 65% of height
    const availableHeightPerRow = rowAreaHeight / settings.numberOfRows;

    // Calculate icon width based on fixed canvas
    let iconWidth = Math.min(
      availableWidthPerMember * 0.85,  // 85% spacing between members
      availableHeightPerRow * 0.75,    // 75% of row height
      120                               // maximum cap for good visibility
    );
    iconWidth = Math.max(iconWidth, 60); // minimum 60px for readability

    // Maintain 3:4 aspect ratio (width:height)
    const iconHeight = iconWidth * (4 / 3);

    // Calculate text size: scales with icon (larger for display viewing)
    const textSize = Math.max(15, Math.min(iconWidth * 0.18, 20));

    return { 
      width: Math.round(iconWidth), 
      height: Math.round(iconHeight), 
      textSize: Math.round(textSize) 
    };
  };

  const iconSize = calculateIconSize();


  const handleDragStart = (member: ChoirMember) => {
    if (!stageRef.current) return;
    
    // Calculate member's current position in pixels on fixed canvas
    const memberXPercent = calculateMemberDisplayPosition(
      member,
      members,
      settings.alignmentMode,
      CANVAS_WIDTH,
      iconSize.width
    );
    const memberYPercent = getRowY(member.rowNumber);
    const memberXPixels = (memberXPercent / 100) * CANVAS_WIDTH;
    const memberYPixels = (memberYPercent / 100) * CANVAS_HEIGHT;
    
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

    // Calculate which row the cursor is currently hovering over (on fixed canvas)
    const rowAreaTop = CANVAS_HEIGHT * 0.25;  // Match getRowY: 25% from top
    const rowAreaHeight = CANVAS_HEIGHT * 0.65;  // Match getRowY: 65% height
    const shadowRow = getRowFromY(
      y,
      CANVAS_HEIGHT,
      settings.numberOfRows,
      rowAreaTop,
      rowAreaHeight
    );

    // Get members in the shadow row (excluding the dragged member)
    const shadowRowMembers = members
      .filter(m => m.rowNumber === shadowRow && m.id !== member.id)
      .sort((a, b) => a.position - b.position);

    // Calculate insertion index based on x position (on fixed canvas)
    let insertionIndex = shadowRowMembers.length;
    const dropXPercent = (x / CANVAS_WIDTH) * 100;
    
    if (shadowRowMembers.length > 0) {
      for (let i = 0; i < shadowRowMembers.length; i++) {
        const otherMemberX = calculateMemberDisplayPosition(
          shadowRowMembers[i],
          members,
          settings.alignmentMode,
          CANVAS_WIDTH,
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
      CANVAS_WIDTH,
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

  // Calculate row positions (percentages on fixed canvas)
  const getRowY = (rowNumber: number): number => {
    const rowAreaTop = 25; // Start at 25% from top
    const rowAreaHeight = 65; // Occupy 65% of height
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

    // Calculate position dynamically based on row and alignment mode (on fixed canvas)
    const xPercent = calculateMemberDisplayPosition(
      member,
      membersForCalculation,
      settings.alignmentMode,
      CANVAS_WIDTH,
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

      {/* Stage content with transform - Fixed 16:9 canvas */}
      <div 
        className="stage-content"
        style={{
          width: `${CANVAS_WIDTH}px`,
          height: `${CANVAS_HEIGHT}px`,
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          cursor: isPanning ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleStageMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
