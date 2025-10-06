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
}

const VOICE_COLORS: Record<VoiceSection, string> = {
  Soprano: '#FFD700', // Gold
  Alto: '#FF69B4',    // Hot Pink
  Tenor: '#90EE90',   // Light Green
  Bass: '#4169E1',    // Royal Blue
};

export const MemberIcon = ({
  member,
  onDragStart,
  onDrag,
  onDragEnd,
  onClick,
  isSelected = false,
  style,
}: MemberIconProps) => {
  const color = VOICE_COLORS[member.voiceSection];

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
        width="60"
        height="80"
        viewBox="0 0 60 80"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Head circle */}
        <circle
          cx="30"
          cy="18"
          r="12"
          fill={color}
          stroke="#333"
          strokeWidth="2"
        />
        
        {/* Body (bell shape) */}
        <path
          d="M 18 30 Q 18 35, 15 50 L 15 70 Q 15 75, 20 75 L 40 75 Q 45 75, 45 70 L 45 50 Q 42 35, 42 30 Z"
          fill={color}
          stroke="#333"
          strokeWidth="2"
        />
      </svg>
      
      <div className="member-name">{member.name}</div>
    </div>
  );
};
