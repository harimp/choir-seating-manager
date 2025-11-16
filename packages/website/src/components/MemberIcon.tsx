import { DisplayMember, VoicePartsConfiguration } from '../types';
import { getVoicePartColor } from '../utils/voiceParts';
import './MemberIcon.scss';

interface MemberIconProps {
  member: DisplayMember;
  voicePartsConfig: VoicePartsConfiguration;
  onDragStart: (member: DisplayMember) => void;
  onDrag: (member: DisplayMember, x: number, y: number) => void;
  onDragEnd: (member: DisplayMember) => void;
  onClick: (member: DisplayMember) => void;
  onRemove: (member: DisplayMember) => void;
  isSelected?: boolean;
  style?: React.CSSProperties;
  iconWidth: number;
  iconHeight: number;
  textSize: number;
}

// Function to lighten a hex color
const lightenColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) + Math.round(((255 - (num >> 16)) * percent) / 100);
  const g = ((num >> 8) & 0x00FF) + Math.round(((255 - ((num >> 8) & 0x00FF)) * percent) / 100);
  const b = (num & 0x0000FF) + Math.round(((255 - (num & 0x0000FF)) * percent) / 100);
  
  return `#${(0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const MemberIcon = ({
  member,
  voicePartsConfig,
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
  onRemove,
  isSelected = false,
  style,
  iconWidth,
  iconHeight,
  textSize,
}: MemberIconProps) => {
  // Get color from voice parts configuration with fallback
  const borderColor = getVoicePartColor(member.voicePartId, voicePartsConfig);
  const fillColor = lightenColor(borderColor, 50); // Lighter fill

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart(member);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      onDrag(member, moveEvent.clientX, moveEvent.clientY);
    };

    const handleMouseUp = () => {
      onDragEnd(member);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.touches.length !== 1) return;
    
    onDragStart(member);

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const touch = moveEvent.touches[0];
      onDrag(member, touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      onDragEnd(member);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.detail === 1) {
      // Single click - select
      onClick(member);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove(member);
  };

  return (
    <div
      className={`member-icon ${isSelected ? 'selected' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      title={member.name}
    >
      <svg
        width={iconWidth}
        height={iconHeight}
        viewBox="0 0 60 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head - Circle */}
        <circle
          cx="30"
          cy="18"
          r="12"
          fill={fillColor}
          stroke={borderColor}
          strokeWidth="3"
        />
        
        {/* Body - Rounded top, flat bottom */}
        <path
          d="M 15 47 Q 15 32, 30 32 Q 45 32, 45 47 L 45 70 L 15 70 Z"
          fill={fillColor}
          stroke={borderColor}
          strokeWidth="3"
        />
      </svg>
      
      <div className="member-name" style={{ fontSize: `${textSize}px`, fontWeight: 'bold' }}>{member.name}</div>
      
      <button
        className="remove-button"
        onClick={handleRemoveClick}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={`Remove ${member.name}`}
        title={`Remove ${member.name}`}
      >
        ×
      </button>
    </div>
  );
};
