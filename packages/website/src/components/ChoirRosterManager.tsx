import { useState, useMemo } from 'react';
import {
  ChoirRoster,
  RosterMember,
  VoicePartsConfiguration,
  SeatedMember,
} from '../types';
import {
  addRosterMember,
  updateRosterMember,
  removeRosterMember,
  isMemberSeated,
} from '../utils/roster';
import {
  validateMemberName,
  validateVoicePartSelection,
  createDeletionPreventionMessage,
  createConfirmationMessage,
} from '../utils/validation';
import './ChoirRosterManager.scss';

interface ChoirRosterManagerProps {
  roster: ChoirRoster;
  voiceParts: VoicePartsConfiguration;
  onRosterChange: (roster: ChoirRoster) => void;
  currentSeating?: SeatedMember[];
}

type FilterMode = 'all' | 'seated';

export const ChoirRosterManager = ({
  roster,
  voiceParts,
  onRosterChange,
  currentSeating = [],
}: ChoirRosterManagerProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberVoicePart, setNewMemberVoicePart] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingVoicePart, setEditingVoicePart] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Set default voice part when voice parts change
  useMemo(() => {
    if (!newMemberVoicePart && voiceParts.parts.length > 0) {
      setNewMemberVoicePart(voiceParts.parts[0].id);
    }
  }, [voiceParts.parts, newMemberVoicePart]);

  // Filter and search members
  const filteredMembers = useMemo(() => {
    let members = roster.members;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      members = members.filter((member) =>
        member.name.toLowerCase().includes(query)
      );
    }

    // Apply seated filter
    if (filterMode === 'seated') {
      members = members.filter((member) =>
        isMemberSeated(member.id, currentSeating)
      );
    }

    return members;
  }, [roster.members, searchQuery, filterMode, currentSeating]);

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
      } else {
        // Handle orphaned members (voice part doesn't exist)
        if (!groups['_orphaned']) {
          groups['_orphaned'] = [];
        }
        groups['_orphaned'].push(member);
      }
    });

    return groups;
  }, [filteredMembers, voiceParts.parts]);

  const handleAddMember = () => {
    const trimmedName = newMemberName.trim();

    if (trimmedName.length === 0) {
      return; // Just ignore empty submissions
    }

    // Validate member name
    const nameValidation = validateMemberName(trimmedName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid member name');
      return;
    }

    // Validate voice part selection
    const voicePartValidation = validateVoicePartSelection(newMemberVoicePart);
    if (!voicePartValidation.isValid) {
      setError(voicePartValidation.error || 'Invalid voice part selection');
      return;
    }

    const updatedRoster = addRosterMember(
      roster,
      trimmedName,
      newMemberVoicePart
    );
    onRosterChange(updatedRoster);

    // Clear the input but keep the form open and focused
    setNewMemberName('');
    setError(null);
  };

  const handleCancelAdd = () => {
    setNewMemberName('');
    setNewMemberVoicePart(voiceParts.parts[0]?.id || '');
    setShowAddForm(false);
    setError(null);
  };

  const handleStartEdit = (member: RosterMember) => {
    setEditingId(member.id);
    setEditingName(member.name);
    setEditingVoicePart(member.voicePartId);
    setError(null);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;

    const trimmedName = editingName.trim();

    // Validate member name
    const nameValidation = validateMemberName(trimmedName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid member name');
      return;
    }

    // Validate voice part selection
    const voicePartValidation = validateVoicePartSelection(editingVoicePart);
    if (!voicePartValidation.isValid) {
      setError(voicePartValidation.error || 'Invalid voice part selection');
      return;
    }

    const updatedRoster = updateRosterMember(
      roster,
      editingId,
      trimmedName,
      editingVoicePart
    );
    onRosterChange(updatedRoster);

    setEditingId(null);
    setEditingName('');
    setEditingVoicePart('');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setEditingVoicePart('');
    setError(null);
  };

  const handleDeleteMember = (member: RosterMember) => {
    const isSeated = isMemberSeated(member.id, currentSeating);
    
    // Create appropriate confirmation message
    const message = isSeated
      ? createDeletionPreventionMessage('member', member.name, undefined, true)
      : createConfirmationMessage('delete', 'member', member.name);

    const confirmed = window.confirm(message);

    if (confirmed) {
      const updatedRoster = removeRosterMember(roster, member.id);
      onRosterChange(updatedRoster);
    }
  };

  const sortedVoiceParts = [...voiceParts.parts].sort((a, b) => a.order - b.order);

  return (
    <div className="choir-roster-manager">
      <div className="roster-header">
        <h3>Choir Roster ({roster.members.length} members)</h3>
      </div>

      <div className="roster-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {!showAddForm && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowAddForm(true)}
          >
            + Add Member
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="add-member-form">
          <select
            className="form-select"
            value={newMemberVoicePart}
            onChange={(e) => setNewMemberVoicePart(e.target.value)}
          >
            {sortedVoiceParts.map((part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="form-input"
            placeholder="Enter member name and press Enter"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddMember();
              } else if (e.key === 'Escape') {
                handleCancelAdd();
              }
            }}
            autoFocus
          />
          <div className="form-actions">
            <button className="btn btn-secondary btn-sm" onClick={handleCancelAdd}>
              Done
            </button>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="filter-toggle">
        <button
          className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
          onClick={() => setFilterMode('all')}
        >
          Show All
        </button>
        <button
          className={`filter-btn ${filterMode === 'seated' ? 'active' : ''}`}
          onClick={() => setFilterMode('seated')}
        >
          Show Seated Only
        </button>
      </div>

      <div className="roster-list">
        {sortedVoiceParts.map((voicePart) => {
          const members = groupedMembers[voicePart.id] || [];
          
          if (members.length === 0) return null;

          return (
            <div key={voicePart.id} className="voice-part-group">
              <div
                className="voice-part-header"
                style={{ borderLeftColor: voicePart.color }}
              >
                <span className="voice-part-name">{voicePart.name}</span>
                <span className="member-count">({members.length})</span>
              </div>
              <div className="members-list">
                {members.map((member) => {
                  const isSeated = isMemberSeated(member.id, currentSeating);
                  const isEditing = editingId === member.id;

                  return (
                    <div key={member.id} className="member-item">
                      {isEditing ? (
                        <div className="member-edit-form">
                          <input
                            type="text"
                            className="edit-input"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit();
                              } else if (e.key === 'Escape') {
                                handleCancelEdit();
                              }
                            }}
                            autoFocus
                          />
                          <select
                            className="edit-select"
                            value={editingVoicePart}
                            onChange={(e) => setEditingVoicePart(e.target.value)}
                          >
                            {sortedVoiceParts.map((part) => (
                              <option key={part.id} value={part.id}>
                                {part.name}
                              </option>
                            ))}
                          </select>
                          <div className="edit-actions">
                            <button
                              className="btn-icon btn-save"
                              onClick={handleSaveEdit}
                              title="Save"
                            >
                              ✓
                            </button>
                            <button
                              className="btn-icon btn-cancel"
                              onClick={handleCancelEdit}
                              title="Cancel"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="member-info">
                            {isSeated && (
                              <span className="seated-indicator" title="Currently seated">
                                ✓
                              </span>
                            )}
                            <span className="member-name">{member.name}</span>
                          </div>
                          <div className="member-actions">
                            <button
                              className="btn-icon"
                              onClick={() => handleStartEdit(member)}
                              title="Edit"
                            >
                              ✎
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteMember(member)}
                              title="Delete"
                            >
                              ×
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Show orphaned members if any */}
        {groupedMembers['_orphaned'] && groupedMembers['_orphaned'].length > 0 && (
          <div className="voice-part-group orphaned">
            <div className="voice-part-header" style={{ borderLeftColor: '#999' }}>
              <span className="voice-part-name">Unknown Voice Part</span>
              <span className="member-count">
                ({groupedMembers['_orphaned'].length})
              </span>
            </div>
            <div className="members-list">
              {groupedMembers['_orphaned'].map((member) => {
                const isSeated = isMemberSeated(member.id, currentSeating);

                return (
                  <div key={member.id} className="member-item">
                    <div className="member-info">
                      {isSeated && (
                        <span className="seated-indicator" title="Currently seated">
                          ✓
                        </span>
                      )}
                      <span className="member-name">{member.name}</span>
                      <span className="orphaned-label">(needs reassignment)</span>
                    </div>
                    <div className="member-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleStartEdit(member)}
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDeleteMember(member)}
                        title="Delete"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredMembers.length === 0 && (
          <div className="empty-state">
            {searchQuery
              ? 'No members found matching your search.'
              : filterMode === 'seated'
              ? 'No members are currently seated.'
              : 'No members in roster. Click "Add Member" to get started.'}
          </div>
        )}
      </div>
    </div>
  );
};
