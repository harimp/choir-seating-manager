import { useState } from 'react';
import { ChoirMember, VoiceSection, StageSettings } from '../types';
import './ControlPanel.scss';

interface ControlPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  settings: StageSettings;
  onSettingsChange: (settings: Partial<StageSettings>) => void;
  members: ChoirMember[];
  onAddMember: (name: string, voiceSection: VoiceSection) => void;
  onRemoveMember: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export const ControlPanel = ({
  isOpen,
  onToggle,
  settings,
  onSettingsChange,
  members,
  onAddMember,
  onRemoveMember,
  onExport,
  onImport,
}: ControlPanelProps) => {
  const [memberName, setMemberName] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<VoiceSection>('Soprano');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (memberName.trim()) {
      onAddMember(memberName.trim(), selectedVoice);
      setMemberName('');
    }
  };

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

  const getMembersByVoice = (voice: VoiceSection) => {
    return members.filter(m => m.voiceSection === voice);
  };

  const voiceSections: VoiceSection[] = ['Soprano', 'Alto', 'Tenor', 'Bass'];

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
                    onChange={(e) => onSettingsChange({ alignmentMode: e.target.value as any })}
                  />
                  <span>Balanced Center</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="alignment"
                    value="grid"
                    checked={settings.alignmentMode === 'grid'}
                    onChange={(e) => onSettingsChange({ alignmentMode: e.target.value as any })}
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
                    onChange={(e) => onSettingsChange({ pianoPosition: e.target.value as any })}
                  />
                  <span>Left</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="piano"
                    value="right"
                    checked={settings.pianoPosition === 'right'}
                    onChange={(e) => onSettingsChange({ pianoPosition: e.target.value as any })}
                  />
                  <span>Right</span>
                </label>
              </div>
            </div>
          </section>

          {/* Add Member */}
          <section className="panel-section">
            <h3>Add Member</h3>
            <form onSubmit={handleAddMember}>
              <div className="form-group">
                <label htmlFor="member-name">Name:</label>
                <input
                  id="member-name"
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Enter name"
                  autoComplete="off"
                />
              </div>
              <div className="form-group">
                <label htmlFor="voice-section">Voice Section:</label>
                <select
                  id="voice-section"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as VoiceSection)}
                >
                  {voiceSections.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </select>
              </div>
              <button type="submit" className="btn btn-primary" disabled={!memberName.trim()}>
                Add Member
              </button>
            </form>
          </section>

          {/* Member List */}
          <section className="panel-section member-list-section">
            <h3>Members ({members.length})</h3>
            <div className="member-list">
              {voiceSections.map(voice => {
                const voiceMembers = getMembersByVoice(voice);
                if (voiceMembers.length === 0) return null;
                
                return (
                  <div key={voice} className="voice-group">
                    <h4 className={`voice-header voice-${voice.toLowerCase()}`}>
                      {voice} ({voiceMembers.length})
                    </h4>
                    <ul>
                      {voiceMembers.map(member => (
                        <li key={member.id} className="member-item">
                          <span className="member-name">{member.name}</span>
                          <button
                            className="btn-remove"
                            onClick={() => onRemoveMember(member.id)}
                            title="Remove member"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {members.length === 0 && (
                <p className="empty-message">No members added yet</p>
              )}
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
        </div>
      </div>
    </>
  );
};
