import { ChoirMember, VoiceSection } from '../types';
import { getMembersBySection, sortMembersByPosition } from '../utils/storage';
import './StandingOrder.scss';

interface StandingOrderProps {
  members: ChoirMember[];
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

const VOICE_SECTIONS: VoiceSection[] = ['Soprano', 'Alto', 'Tenor', 'Bass'];

const getSectionClass = (section: VoiceSection): string => {
  return section.toLowerCase();
};

export const StandingOrder = ({
  members,
  onRemove,
  onMoveUp,
  onMoveDown,
}: StandingOrderProps) => {
  const renderSection = (section: VoiceSection) => {
    const sectionMembers = sortMembersByPosition(
      getMembersBySection(members, section)
    );

    return (
      <div key={section} className={`section section-${getSectionClass(section)}`}>
        <h3>{section}</h3>
        {sectionMembers.length === 0 ? (
          <p className="empty-message">No members in this section</p>
        ) : (
          <div className="members-list">
            {sectionMembers.map((member, index) => (
              <div key={member.id} className="member-card">
                <div className="member-info">
                  <span className="position-number">{index + 1}</span>
                  <span className="member-name">{member.name}</span>
                </div>
                <div className="member-actions">
                  <button
                    className="btn-icon"
                    onClick={() => onMoveUp(member.id)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => onMoveDown(member.id)}
                    disabled={index === sectionMembers.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="btn-icon btn-danger"
                    onClick={() => onRemove(member.id)}
                    title="Remove member"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="standing-order">
      <h2>Standing Order</h2>
      {members.length === 0 ? (
        <div className="empty-state">
          <p>No choir members added yet. Add your first member above!</p>
        </div>
      ) : (
        <div className="sections-grid">
          {VOICE_SECTIONS.map(renderSection)}
        </div>
      )}
    </div>
  );
};
