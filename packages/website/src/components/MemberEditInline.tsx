import React, { useState, useEffect, useRef } from 'react';
import { RosterMember, VoicePart } from '../types';
import './MemberEditInline.scss';

interface MemberEditInlineProps {
  member: RosterMember;
  voiceParts: VoicePart[];
  onSave: (id: string, name: string, voicePartId: string) => void;
  onCancel: () => void;
}

export const MemberEditInline: React.FC<MemberEditInlineProps> = ({
  member,
  voiceParts,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(member.name);
  const [voicePartId, setVoicePartId] = useState(member.voicePartId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Auto-focus on name field when component mounts
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  }, []);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onSave(member.id, trimmedName, voicePartId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // Save on blur
    handleSave();
  };

  return (
    <div className="member-edit-inline">
      <div className="member-edit-inline__field">
        <label htmlFor="member-name" className="member-edit-inline__label">
          Name
        </label>
        <input
          id="member-name"
          ref={nameInputRef}
          type="text"
          className="member-edit-inline__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Member name"
        />
      </div>
      <div className="member-edit-inline__field">
        <label htmlFor="member-voice-part" className="member-edit-inline__label">
          Part
        </label>
        <select
          id="member-voice-part"
          className="member-edit-inline__select"
          value={voicePartId}
          onChange={(e) => setVoicePartId(e.target.value)}
          onKeyDown={handleKeyDown}
        >
          {voiceParts.map((part) => (
            <option key={part.id} value={part.id}>
              {part.name}
            </option>
          ))}
        </select>
      </div>
      <div className="member-edit-inline__actions">
        <button
          type="button"
          className="member-edit-inline__button member-edit-inline__button--save"
          onClick={handleSave}
        >
          Save
        </button>
        <button
          type="button"
          className="member-edit-inline__button member-edit-inline__button--cancel"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
