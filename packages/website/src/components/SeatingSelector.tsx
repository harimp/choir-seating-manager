import { useState, useMemo } from 'react';
import {
  ChoirRoster,
  RosterMember,
  SeatedMember,
  VoicePartsConfiguration,
} from '../types';
import { isMemberSeated } from '../utils/roster';
import './SeatingSelector.scss';

interface SeatingSelectorProps {
  roster: ChoirRoster;
  voiceParts: VoicePartsConfiguration;
  currentSeating: SeatedMember[];
  onSeatingChange: (seating: SeatedMember[]) => void;
  onClose?: () => void;
}

export const SeatingSelector = ({
  roster,
  voiceParts,
  currentSeating,
  onSeatingChange,
  onClose,
}: SeatingSelectorProps) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    // Initialize with currently seated members
    return new Set(currentSeating.map(s => s.rosterId));
  });
  const [filterVoicePartId, setFilterVoicePartId] = useState<string>('all');

  // Filter members by voice part
  const filteredMembers = useMemo(() => {
    if (filterVoicePartId === 'all') {
      return roster.members;
    }
    return roster.members.filter(m => m.voicePartId === filterVoicePartId);
  }, [roster.members, filterVoicePartId]);

  // Group members by voice part
  const groupedMembers = useMemo(() => {
    const groups: Record<string, RosterMember[]> = {};

    // Initialize groups for all voice parts
    voiceParts.parts.forEach((part) => {
      groups[part.id] = [];
    });

    // Group filtered members
    filteredMembers.forEach((member) => {
      if (groups[member.voicePartId]) {
        groups[member.voicePartId].push(member);
      }
    });

    return groups;
  }, [filteredMembers, voiceParts.parts]);

  // Count currently seated members
  const seatedCount = currentSeating.length;
  const selectedCount = selectedIds.size;

  const handleToggleMember = (memberId: string) => {
    const newSelectedIds = new Set(selectedIds);
    if (newSelectedIds.has(memberId)) {
      newSelectedIds.delete(memberId);
    } else {
      newSelectedIds.add(memberId);
    }
    setSelectedIds(newSelectedIds);
  };

  const handleSelectAll = () => {
    const allIds = new Set(filteredMembers.map(m => m.id));
    setSelectedIds(allIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    // Build new seating array based on selections
    const newSeating: SeatedMember[] = [];
    
    // Keep existing seated members that are still selected
    currentSeating.forEach(seated => {
      if (selectedIds.has(seated.rosterId)) {
        newSeating.push(seated);
      }
    });

    // Add newly selected members (not previously seated)
    const existingSeatedIds = new Set(currentSeating.map(s => s.rosterId));
    selectedIds.forEach(rosterId => {
      if (!existingSeatedIds.has(rosterId)) {
        // Calculate next position in row 0 (default row)
        const membersInRow0 = newSeating.filter(s => s.rowNumber === 0);
        const maxPosition = membersInRow0.length > 0
          ? Math.max(...membersInRow0.map(s => s.position))
          : -1;
        
        newSeating.push({
          rosterId,
          position: maxPosition + 1,
          rowNumber: 0,
        });
      }
    });

    onSeatingChange(newSeating);
    
    if (onClose) {
      onClose();
    }
  };

  const handleCancel = () => {
    if (onClose) {
      onClose();
    }
  };

  const sortedVoiceParts = [...voiceParts.parts].sort((a, b) => a.order - b.order);

  return (
    <div className="seating-selector">
      <div className="selector-header">
        <h3>Select Members for Seating</h3>
        <div className="seating-count">
          <span className="count-label">Currently Seated:</span>
          <span className="count-value">{seatedCount}</span>
          <span className="count-separator">|</span>
          <span className="count-label">Selected:</span>
          <span className="count-value">{selectedCount}</span>
        </div>
      </div>

      <div className="selector-controls">
        <div className="filter-controls">
          <label htmlFor="voice-part-filter">Filter by Voice Part:</label>
          <select
            id="voice-part-filter"
            className="filter-select"
            value={filterVoicePartId}
            onChange={(e) => setFilterVoicePartId(e.target.value)}
          >
            <option value="all">All Voice Parts</option>
            {sortedVoiceParts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bulk-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSelectAll}
            disabled={filteredMembers.length === 0}
          >
            Select All
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleDeselectAll}
            disabled={selectedIds.size === 0}
          >
            Deselect All
          </button>
        </div>
      </div>

      <div className="members-checklist">
        {sortedVoiceParts.map((voicePart) => {
          const members = groupedMembers[voicePart.id] || [];
          
          if (members.length === 0) return null;

          return (
            <div key={voicePart.id} className="voice-part-section">
              <div
                className="voice-part-header"
                style={{ borderLeftColor: voicePart.color }}
              >
                <span className="voice-part-name">{voicePart.name}</span>
                <span className="member-count">({members.length})</span>
              </div>
              <div className="members-list">
                {members.map((member) => {
                  const isSelected = selectedIds.has(member.id);
                  const wasSeated = isMemberSeated(member.id, currentSeating);

                  return (
                    <label
                      key={member.id}
                      className={`member-checkbox-item ${isSelected ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleMember(member.id)}
                      />
                      <span className="member-name">{member.name}</span>
                      {wasSeated && (
                        <span className="was-seated-badge" title="Currently seated">
                          ✓
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="empty-state">
            {filterVoicePartId === 'all'
              ? 'No members in roster. Add members first.'
              : 'No members in this voice part.'}
          </div>
        )}
      </div>

      <div className="selector-actions">
        <button className="btn btn-primary" onClick={handleApply}>
          Apply Changes
        </button>
        <button className="btn btn-secondary" onClick={handleCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
};
