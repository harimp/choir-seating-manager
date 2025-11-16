import { useState } from 'react';
import { VoicePartsConfiguration, VoicePart } from '../types';
import {
  addVoicePart,
  updateVoicePart,
  removeVoicePart,
  reorderVoiceParts,
  canDeleteVoicePart,
  getMemberCountsByVoicePart,
} from '../utils/voiceParts';
import {
  validateVoicePartName,
  isVoicePartNameUnique,
  createDeletionPreventionMessage,
  createConfirmationMessage,
} from '../utils/validation';
import { ChoirRoster } from '../types';
import './VoicePartsManager.scss';

interface VoicePartsManagerProps {
  configuration: VoicePartsConfiguration;
  onChange: (config: VoicePartsConfiguration) => void;
  roster: ChoirRoster;
}

export const VoicePartsManager = ({
  configuration,
  onChange,
  roster,
}: VoicePartsManagerProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberCounts = getMemberCountsByVoicePart(roster);

  const handleStartEdit = (part: VoicePart) => {
    setEditingId(part.id);
    setEditingName(part.name);
    setError(null);
  };

  const handleSaveEdit = (id: string) => {
    const trimmedName = editingName.trim();
    
    // Validate name format
    const nameValidation = validateVoicePartName(trimmedName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid voice part name');
      return;
    }
    
    // Check for duplicate names (excluding current part)
    const existingNames = configuration.parts
      .filter((part) => part.id !== id)
      .map((part) => part.name);
    
    const uniqueValidation = isVoicePartNameUnique(trimmedName, existingNames);
    if (!uniqueValidation.isValid) {
      setError(uniqueValidation.error || 'Duplicate voice part name');
      return;
    }
    
    const updatedConfig = updateVoicePart(configuration, id, { name: trimmedName });
    onChange(updatedConfig);
    setEditingId(null);
    setEditingName('');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setError(null);
  };

  const handleColorChange = (id: string, color: string) => {
    const updatedConfig = updateVoicePart(configuration, id, { color });
    onChange(updatedConfig);
  };

  const handleDelete = (id: string) => {
    const voicePart = configuration.parts.find((part) => part.id === id);
    if (!voicePart) return;
    
    const memberCount = memberCounts[id] || 0;
    
    // Prevent deletion if members are assigned
    if (!canDeleteVoicePart(id, roster)) {
      const message = createDeletionPreventionMessage(
        'voice part',
        voicePart.name,
        memberCount
      );
      alert(message);
      return;
    }
    
    // Confirm deletion
    const message = createConfirmationMessage('delete', 'voice part', voicePart.name);
    const confirmed = window.confirm(message);
    
    if (confirmed) {
      const updatedConfig = removeVoicePart(configuration, id);
      onChange(updatedConfig);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newOrder = [...configuration.parts];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    
    const orderedIds = newOrder.map((part) => part.id);
    const updatedConfig = reorderVoiceParts(configuration, orderedIds);
    onChange(updatedConfig);
  };

  const handleMoveDown = (index: number) => {
    if (index === configuration.parts.length - 1) return;
    
    const newOrder = [...configuration.parts];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    
    const orderedIds = newOrder.map((part) => part.id);
    const updatedConfig = reorderVoiceParts(configuration, orderedIds);
    onChange(updatedConfig);
  };

  const handleAddNew = () => {
    const trimmedName = newPartName.trim();
    
    // Validate name format
    const nameValidation = validateVoicePartName(trimmedName);
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid voice part name');
      return;
    }
    
    // Check for duplicate names
    const existingNames = configuration.parts.map((part) => part.name);
    const uniqueValidation = isVoicePartNameUnique(trimmedName, existingNames);
    if (!uniqueValidation.isValid) {
      setError(uniqueValidation.error || 'Duplicate voice part name');
      return;
    }
    
    const updatedConfig = addVoicePart(configuration, trimmedName);
    onChange(updatedConfig);
    setNewPartName('');
    setShowAddForm(false);
    setError(null);
  };

  const handleCancelAdd = () => {
    setNewPartName('');
    setShowAddForm(false);
    setError(null);
  };

  const sortedParts = [...configuration.parts].sort((a, b) => a.order - b.order);

  return (
    <div className="voice-parts-manager">
      <div className="voice-parts-list">
        {sortedParts.map((part, index) => (
          <div key={part.id} className="voice-part-item">
            {editingId === part.id ? (
              <div className="voice-part-edit">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveEdit(part.id);
                    } else if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  onBlur={() => handleSaveEdit(part.id)}
                  autoFocus
                  className="edit-input"
                />
              </div>
            ) : (
              <>
                <div className="voice-part-info">
                  <div className="voice-part-drag-handle" title="Drag to reorder">
                    <span>≡</span>
                  </div>
                  <div
                    className="voice-part-color-preview"
                    style={{ backgroundColor: part.color }}
                  />
                  <span
                    className="voice-part-name"
                    onClick={() => handleStartEdit(part)}
                    title="Click to edit"
                  >
                    {part.name}
                  </span>
                  {memberCounts[part.id] > 0 && (
                    <span className="member-count">
                      ({memberCounts[part.id]})
                    </span>
                  )}
                </div>
                <div className="voice-part-actions">
                  <input
                    type="color"
                    value={part.color}
                    onChange={(e) => handleColorChange(part.id, e.target.value)}
                    className="color-picker"
                    title="Change color"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedParts.length - 1}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(part.id)}
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {error && <div className="error-message">{error}</div>}

      {showAddForm ? (
        <div className="add-voice-part-form">
          <input
            type="text"
            value={newPartName}
            onChange={(e) => setNewPartName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddNew();
              } else if (e.key === 'Escape') {
                handleCancelAdd();
              }
            }}
            placeholder="Enter voice part name"
            autoFocus
            className="add-input"
          />
          <div className="add-form-actions">
            <button className="btn btn-primary btn-sm" onClick={handleAddNew}>
              Add
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleCancelAdd}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn btn-secondary btn-add-voice-part"
          onClick={() => setShowAddForm(true)}
        >
          + Add Voice Part
        </button>
      )}
    </div>
  );
};
