import { ChoirMember, VoiceSection } from '../types';
import './MemberIcon.scss';

interface MemberIconProps {
  member: ChoirMember;
  onDragStart: (member: ChoirMember) => void;
  onDrag: (member: ChoirMember, x: number, y: number) => void;
  onDragEnd: (member: ChoirMember) => void;
  onClick: (member: ChoirMember) => void;
  isSelected?: boolean;
  style?: React.CSSProperties;
  iconWidth: number;
  iconHeight: number;
  textSize: number;
}

const VOICE_COLORS: Record<VoiceSection, string> = {
  Soprano: '#FFD700', // Gold
  Alto: '#FF69B4',    // Hot Pink
  Tenor: '#90EE90',   // Light Green
  Bass: '#4169E1',    // Royal Blue
};

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
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
  isSelected = false,
  style,
  iconWidth,
  iconHeight,
  textSize,
}: MemberIconProps) => {
  const borderColor = VOICE_COLORS[member.voiceSection];
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

  const handleClick = (e: React.MouseEvent) => {
    if (e.detail === 1) {
      // Single click - select
      onClick(member);
    }
  };

  return (
    <div
      className={`member-icon ${isSelected ? 'selected' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
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
    </div>
  );
};
