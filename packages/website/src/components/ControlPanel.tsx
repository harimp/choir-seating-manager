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
  sessionCode,
  onRestoreSnapshot,
}: ControlPanelProps) => {
  const [showSeatingSelector, setShowSeatingSelector] = useState(false);

  // Group seated members by voice part
  const getSeatedMembersByVoicePart = (voicePartId: string) => {
    return displayMembers.filter(m => m.voicePartId === voicePartId);
  };

  const sortedVoiceParts = [...voicePartsConfig.parts].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Toggle Button */}
      <button
        className="control-panel-toggle"
        onClick={onToggle}
        aria-label={isOpen ? 'Close control panel' : 'Open control panel'}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="control-panel-modal-overlay" onClick={onToggle}>
          <div className="control-panel-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="control-panel-close"
              onClick={onToggle}
              aria-label="Close control panel"
            >
              ×
            </button>
            <div className="control-panel-content">
              <h2>Choir Manager</h2>

              {/* Layout Settings - Full Width */}
              <section className="panel-section full-width-section">
                <h3>Layout Settings</h3>
                
                <div className="settings-two-column">
                  <div className="settings-left">
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
                  </div>

                  <div className="settings-right">
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
                  </div>
                </div>
              </section>

              <div className="two-column-layout">
                {/* Left Column */}
                <div className="left-column">
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
                </div>

                {/* Right Column */}
                <div className="right-column">
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
            </div>
          </div>
        </div>
      )}

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
