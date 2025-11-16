import { useState } from 'react';
import {
  StageSettings,
  AlignmentMode,
  PianoPosition,
  ChoirData,
  VoicePartsConfiguration,
  ChoirRoster,
  SeatedMember,
  DisplayMember,
} from '../types';
import { SnapshotManager } from './SnapshotManager';
import { VoicePartsManager } from './VoicePartsManager';
import { ChoirRosterManager } from './ChoirRosterManager';
import { SeatingSelector } from './SeatingSelector';
import './ControlPanel.scss';

interface ControlPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: StageSettings;
  onSettingsChange: (settings: Partial<StageSettings>) => void;
  voicePartsConfig: VoicePartsConfiguration;
  onVoicePartsChange: (config: VoicePartsConfiguration) => void;
  roster: ChoirRoster;
  onRosterChange: (roster: ChoirRoster) => void;
  seating: SeatedMember[];
  onSeatingChange: (seating: SeatedMember[]) => void;
  displayMembers: DisplayMember[];
  onRemoveMemberFromSeating: (rosterId: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  sessionCode?: string;
  onRestoreSnapshot?: (choirData: ChoirData) => void;
}

export const ControlPanel = ({
  isOpen,
  onToggle,
  settings,
  onSettingsChange,
  voicePartsConfig,
  onVoicePartsChange,
  roster,
  onRosterChange,
  seating,
  onSeatingChange,
  displayMembers,
  onRemoveMemberFromSeating,
  onExport,
  onImport,
  sessionCode,
  onRestoreSnapshot,
}: ControlPanelProps) => {
  const [showSeatingSelector, setShowSeatingSelector] = useState(false);

  const handleImportClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onImport(file);
      }
    };
    input.click();
  };

  // Group seated members by voice part
  const getSeatedMembersByVoicePart = (voicePartId: string) => {
    return displayMembers.filter(m => m.voicePartId === voicePartId);
  };

  const sortedVoiceParts = [...voicePartsConfig.parts].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="control-panel-backdrop" onClick={onToggle} />
      )}

      {/* Toggle Button */}
      <button
        className={`control-panel-toggle ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        aria-label={isOpen ? 'Close control panel' : 'Open control panel'}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Panel */}
      <div className={`control-panel ${isOpen ? 'open' : ''}`}>
        <div className="control-panel-content">
          <h2>Choir Manager</h2>

          {/* Voice Parts Configuration */}
          <section className="panel-section">
            <h3>Voice Parts</h3>
            <VoicePartsManager
              configuration={voicePartsConfig}
              onChange={onVoicePartsChange}
              roster={roster}
            />
          </section>

          {/* Choir Roster */}
          <section className="panel-section">
            <ChoirRosterManager
              roster={roster}
              voiceParts={voicePartsConfig}
              onRosterChange={onRosterChange}
              currentSeating={seating}
            />
          </section>

          {/* Current Seating */}
          <section className="panel-section">
            <h3>Current Seating ({displayMembers.length} members)</h3>
            
            <button
              className="btn btn-primary btn-add-seating"
              onClick={() => setShowSeatingSelector(true)}
            >
              + Add from Roster
            </button>

            <div className="seated-members-list">
              {sortedVoiceParts.map(voicePart => {
                const voiceMembers = getSeatedMembersByVoicePart(voicePart.id);
                if (voiceMembers.length === 0) return null;
                
                return (
                  <div key={voicePart.id} className="voice-group">
                    <h4
                      className="voice-header"
                      style={{ backgroundColor: voicePart.color }}
                    >
                      {voicePart.name} ({voiceMembers.length})
                    </h4>
                    <ul>
                      {voiceMembers.map(member => (
                        <li key={member.id} className="member-item">
                          <span className="member-name">{member.name}</span>
                          <button
                            className="btn-remove"
                            onClick={() => onRemoveMemberFromSeating(member.id)}
                            title="Remove from seating"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {displayMembers.length === 0 && (
                <p className="empty-message">No members in seating. Click "Add from Roster" to add members.</p>
              )}
            </div>

            {displayMembers.length > 0 && (
              <button
                className="btn btn-secondary btn-clear-seating"
                onClick={() => {
                  if (window.confirm('Are you sure you want to remove all members from seating?')) {
                    onSeatingChange([]);
                  }
                }}
              >
                Clear All Seating
              </button>
            )}
          </section>

          {/* Layout Settings */}
          <section className="panel-section">
            <h3>Layout Settings</h3>
            
            <div className="setting-group">
              <label htmlFor="title">Title:</label>
              <input
                id="title"
                type="text"
                value={settings.title || ''}
                onChange={(e) => onSettingsChange({ title: e.target.value })}
                placeholder="Enter choir title"
              />
            </div>

            <div className="setting-group">
              <label htmlFor="num-rows">Number of Rows:</label>
              <input
                id="num-rows"
                type="number"
                min="1"
                max="10"
                value={settings.numberOfRows}
                onChange={(e) => onSettingsChange({ numberOfRows: parseInt(e.target.value) || 1 })}
              />
            </div>

            <div className="setting-group">
              <label>Alignment:</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="alignment"
                    value="balanced"
                    checked={settings.alignmentMode === 'balanced'}
                    onChange={(e) => onSettingsChange({ alignmentMode: e.target.value as AlignmentMode })}
                  />
                  <span>Balanced Center</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="alignment"
                    value="grid"
                    checked={settings.alignmentMode === 'grid'}
                    onChange={(e) => onSettingsChange({ alignmentMode: e.target.value as AlignmentMode })}
                  />
                  <span>Grid Pattern</span>
                </label>
              </div>
            </div>

            <div className="setting-group">
              <label>Piano Position:</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="piano"
                    value="left"
                    checked={settings.pianoPosition === 'left'}
                    onChange={(e) => onSettingsChange({ pianoPosition: e.target.value as PianoPosition })}
                  />
                  <span>Left</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="piano"
                    value="right"
                    checked={settings.pianoPosition === 'right'}
                    onChange={(e) => onSettingsChange({ pianoPosition: e.target.value as PianoPosition })}
                  />
                  <span>Right</span>
                </label>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section className="panel-section">
            <h3>Data Management</h3>
            <div className="button-group">
              <button className="btn btn-secondary" onClick={onExport}>
                Export Data
              </button>
              <button className="btn btn-secondary" onClick={handleImportClick}>
                Import Data
              </button>
            </div>
          </section>

          {/* Snapshots */}
          {sessionCode && onRestoreSnapshot && (
            <section className="panel-section">
              <SnapshotManager
                sessionCode={sessionCode}
                currentChoirData={{
                  seating,
                  settings,
                  lastUpdated: new Date().toISOString(),
                }}
                onRestore={onRestoreSnapshot}
              />
            </section>
          )}
        </div>
      </div>

      {/* Seating Selector Modal */}
      {showSeatingSelector && (
        <div className="modal-overlay" onClick={() => setShowSeatingSelector(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <SeatingSelector
              roster={roster}
              voiceParts={voicePartsConfig}
              currentSeating={seating}
              onSeatingChange={(newSeating) => {
                onSeatingChange(newSeating);
                setShowSeatingSelector(false);
              }}
              onClose={() => setShowSeatingSelector(false)}
            />
          </div>
        </div>
      )}
    </>
  );
};
