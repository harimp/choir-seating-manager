import { useState } from 'react';
import { RosterMember, VoicePart, VoicePartsConfiguration } from '../types';
import { addVoicePart } from '../utils/voiceParts';
import './OrphanedMembersDialog.scss';

interface OrphanedMembersDialogProps {
  orphanedMembers: RosterMember[];
  availableParts: VoicePart[];
  voicePartsConfig: VoicePartsConfiguration;
  onReassign: (memberId: string, newPartId: string) => void;
  onBulkReassign: (assignments: Record<string, string>) => void;
  onAddMissingParts: (partIds: string[]) => void;
  onAddMissingPartsAndReassign: (config: VoicePartsConfiguration) => void;
  onClose: () => void;
}

export const OrphanedMembersDialog = ({
  orphanedMembers,
  availableParts,
  voicePartsConfig,
  onBulkReassign,
  onAddMissingPartsAndReassign,
  onClose,
}: OrphanedMembersDialogProps) => {
  // Track individual reassignments
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    // Initialize with first available part for each member
    const initial: Record<string, string> = {};
    orphanedMembers.forEach((member) => {
      initial[member.id] = availableParts[0]?.id || '';
    });
    return initial;
  });

  // Track which missing voice parts to add
  const [partsToAdd, setPartsToAdd] = useState<Set<string>>(() => {
    // Get unique missing voice part IDs
    const missingIds = new Set(orphanedMembers.map((m) => m.voicePartId));
    return missingIds;
  });

  const handleAssignmentChange = (memberId: string, newPartId: string) => {
    setAssignments((prev) => ({
      ...prev,
      [memberId]: newPartId,
    }));
  };

  const handleTogglePartToAdd = (partId: string) => {
    setPartsToAdd((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(partId)) {
        newSet.delete(partId);
      } else {
        newSet.add(partId);
      }
      return newSet;
    });
  };

  const handleBulkReassign = () => {
    onBulkReassign(assignments);
    onClose();
  };

  const handleAddMissingParts = () => {
    if (partsToAdd.size === 0) {
      return;
    }

    // Create new voice parts configuration with missing parts added
    let updatedConfig = { ...voicePartsConfig };
    
    partsToAdd.forEach((partId) => {
      // Create a display name from the ID (e.g., "soprano-1" -> "Soprano 1")
      const displayName = partId
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      updatedConfig = addVoicePart(updatedConfig, displayName);
    });

    onAddMissingPartsAndReassign(updatedConfig);
    onClose();
  };

  const handleReassignAll = (targetPartId: string) => {
    const newAssignments: Record<string, string> = {};
    orphanedMembers.forEach((member) => {
      newAssignments[member.id] = targetPartId;
    });
    setAssignments(newAssignments);
  };

  // Get unique missing voice part IDs
  const missingPartIds = Array.from(new Set(orphanedMembers.map((m) => m.voicePartId)));

  return (
    <div className="orphaned-members-dialog-overlay" onClick={onClose}>
      <div className="orphaned-members-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Orphaned Members Found</h2>
          <button className="btn-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="dialog-content">
          <p className="dialog-description">
            {orphanedMembers.length} member{orphanedMembers.length !== 1 ? 's' : ''} {orphanedMembers.length !== 1 ? 'have' : 'has'} voice parts that don't exist in your current configuration.
            You can reassign them to existing voice parts or add the missing voice parts.
          </p>

          <div className="missing-parts-section">
            <h3>Missing Voice Parts</h3>
            <div className="missing-parts-list">
              {missingPartIds.map((partId) => {
                const memberCount = orphanedMembers.filter((m) => m.voicePartId === partId).length;
                return (
                  <div key={partId} className="missing-part-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={partsToAdd.has(partId)}
                        onChange={() => handleTogglePartToAdd(partId)}
                      />
                      <span className="missing-part-name">
                        {partId} ({memberCount} member{memberCount !== 1 ? 's' : ''})
                      </span>
                    </label>
                  </div>
                );
              })}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleAddMissingParts}
              disabled={partsToAdd.size === 0}
            >
              Add Selected Voice Parts ({partsToAdd.size})
            </button>
          </div>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="reassignment-section">
            <h3>Reassign Members</h3>
            
            {availableParts.length > 0 && (
              <div className="bulk-reassign">
                <label>Reassign all to:</label>
                <select
                  onChange={(e) => handleReassignAll(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a voice part
                  </option>
                  {availableParts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="members-list">
              {orphanedMembers.map((member) => (
                <div key={member.id} className="orphaned-member-item">
                  <div className="member-info">
                    <span className="member-name">{member.name}</span>
                    <span className="member-old-part">({member.voicePartId})</span>
                  </div>
                  <div className="member-reassign">
                    <span className="arrow">→</span>
                    {availableParts.length > 0 ? (
                      <select
                        value={assignments[member.id] || ''}
                        onChange={(e) => handleAssignmentChange(member.id, e.target.value)}
                        className="reassign-select"
                      >
                        {availableParts.map((part) => (
                          <option key={part.id} value={part.id}>
                            {part.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="no-parts-available">No voice parts available</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleBulkReassign}
              disabled={availableParts.length === 0}
            >
              Reassign All Members
            </button>
          </div>
        </div>

        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
