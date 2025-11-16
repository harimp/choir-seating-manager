import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { Home } from './components/Home';
import { ControlPanel } from './components/ControlPanel';
import { ChoirStageView } from './components/ChoirStageView';
import { OrphanedMembersDialog } from './components/OrphanedMembersDialog';
import { MigrationNotification } from './components/MigrationNotification';
import {
  StageSettings,
  VoicePartsConfiguration,
  ChoirRoster,
  RosterMember,
  SeatedMember,
  DisplayMember,
} from './types';
import {
  loadChoirData,
  MigrationResult,
} from './utils/storage';
import {
  loadVoicePartsConfig,
  saveVoicePartsConfig,
  findOrphanedMembers,
} from './utils/voiceParts';
import {
  loadChoirRoster,
  saveChoirRoster,
  updateRosterMember,
} from './utils/roster';
import {
  joinRosterAndSeating,
  removeFromSeating,
  cleanOrphanedSeatingReferences,
} from './utils/seating';

import { getSession, updateSession, ApiError } from './api/client';
import './styles/App.scss';

interface ChoirManagerProps {
  sessionCode?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function ChoirManager({ sessionCode }: ChoirManagerProps) {
  // New state management for voice parts, roster, and seating
  const [voicePartsConfig, setVoicePartsConfig] = useState<VoicePartsConfiguration | null>(null);
  const [roster, setRoster] = useState<ChoirRoster | null>(null);
  const [seating, setSeating] = useState<SeatedMember[]>([]);
  const [displayMembers, setDisplayMembers] = useState<DisplayMember[]>([]);
  
  const [settings, setSettings] = useState<StageSettings>({
    numberOfRows: 3,
    alignmentMode: 'balanced',
    pianoPosition: 'right',
  });
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  
  // Orphaned members dialog state
  const [showOrphanedDialog, setShowOrphanedDialog] = useState(false);
  const [orphanedMembers, setOrphanedMembers] = useState<RosterMember[]>([]);
  
  // Migration notification state
  const [showMigrationNotification, setShowMigrationNotification] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult>({ wasMigrated: false });
  
  const stageWidthRef = useRef(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load voice parts configuration and roster on mount
  useEffect(() => {
    async function loadData() {
      try {
        // Load voice parts configuration (profile-level)
        const config = loadVoicePartsConfig();
        setVoicePartsConfig(config);
        
        // Load choir roster (profile-level)
        const loadedRoster = loadChoirRoster();
        setRoster(loadedRoster);
        
        // Check for orphaned members (members with invalid voice part IDs)
        const orphaned = findOrphanedMembers(loadedRoster, config);
        if (orphaned.length > 0) {
          console.warn(`Found ${orphaned.length} orphaned members with invalid voice parts`);
          setOrphanedMembers(orphaned);
          setShowOrphanedDialog(true);
        }
        
        if (!sessionCode) {
          // No session code - start with empty data (localStorage disabled)
          const { data, migration } = loadChoirData();
          
          // Check if migration occurred
          if (migration.wasMigrated) {
            setMigrationResult(migration);
            setShowMigrationNotification(true);
            
            // Reload roster after migration (it was updated during migration)
            const updatedRoster = loadChoirRoster();
            setRoster(updatedRoster);
          }
          
          // Handle seating data
          if (data.seating) {
            // New format: clean orphaned seating references
            const cleanedSeating = cleanOrphanedSeatingReferences(data.seating, loadedRoster);
            setSeating(cleanedSeating);
          } else {
            // Empty or migrated data
            setSeating([]);
          }
          
          setSettings(data.settings);
          setIsLoading(false);
          isInitialLoadRef.current = false;
          return;
        }

        // Fetch from API
        setIsLoading(true);
        setError(null);
        const session = await getSession(sessionCode);
        
        // Load session data
        const sessionRoster: ChoirRoster = {
          members: session.roster,
          version: 1,
        };
        setRoster(sessionRoster);
        setVoicePartsConfig(session.voiceParts);
        
        // Check for orphaned seating references (members that don't exist in session roster)
        const rosterIds = new Set(session.roster.map(m => m.id));
        const orphanedSeating = session.seating.filter(s => !rosterIds.has(s.rosterId));
        
        if (orphanedSeating.length > 0) {
          console.warn(`Found ${orphanedSeating.length} orphaned seating reference(s) in session`);
          // Show toaster error as requested
          setTimeout(() => {
            alert(`Warning: ${orphanedSeating.length} member(s) in the seating arrangement no longer exist in the roster and were ignored.`);
          }, 500);
          
          // Filter out orphaned references
          const cleanedSeating = session.seating.filter(s => rosterIds.has(s.rosterId));
          setSeating(cleanedSeating);
        } else {
          setSeating(session.seating);
        }
        
        setSettings(session.settings);
        setIsLoading(false);
        isInitialLoadRef.current = false;
      } catch (err) {
        setIsLoading(false);
        isInitialLoadRef.current = false;
        
        if (err instanceof ApiError) {
          if (err.statusCode === 404) {
            setError(`Session "${sessionCode}" not found. Please check your session code.`);
          } else if (err.statusCode === 0) {
            setError('Network error. Please check your connection and try again.');
          } else {
            setError(`Error loading session: ${err.message}`);
          }
        } else {
          setError('An unexpected error occurred while loading the session.');
        }
        console.error('Error loading session:', err);
      }
    }

    loadData();
  }, [sessionCode]);

  // Join roster and seating data whenever they change
  useEffect(() => {
    if (roster && voicePartsConfig) {
      const joined = joinRosterAndSeating(roster, seating);
      setDisplayMembers(joined);
    }
  }, [roster, seating, voicePartsConfig]);

  // Auto-save with debounce (2 seconds after last change)
  const scheduleAutoSave = useCallback(() => {
    // Don't save during initial load
    if (isInitialLoadRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }

    // If no session code, skip saving (localStorage disabled)
    if (!sessionCode) {
      console.log('No session code - data not persisted (localStorage disabled)');
      return;
    }

    // Set saving status
    setSaveStatus('saving');

    // Schedule save to API
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        // Save session with roster, voice parts, seating, and settings
        if (!roster || !voicePartsConfig || !settings) {
          console.error('Cannot save: roster, voice parts config, or settings is missing', {
            hasRoster: !!roster,
            hasVoiceParts: !!voicePartsConfig,
            hasSettings: !!settings,
          });
          setSaveStatus('error');
          return;
        }
        
        await updateSession(
          sessionCode,
          roster.members,
          voicePartsConfig,
          seating,
          settings
        );
        setSaveStatus('saved');
        
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('error');
        console.error('Error saving session:', err);
        
        // Reset to idle after 5 seconds
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
    }, 2000);
  }, [sessionCode, seating, settings, roster, voicePartsConfig]);

  // Trigger auto-save when seating or settings change
  useEffect(() => {
    scheduleAutoSave();
  }, [seating, settings, scheduleAutoSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Update stage width reference
  useEffect(() => {
    const updateWidth = () => {
      stageWidthRef.current = window.innerWidth;
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Voice parts configuration handlers
  const handleVoicePartsConfigChange = (newConfig: VoicePartsConfiguration) => {
    setVoicePartsConfig(newConfig);
    
    try {
      saveVoicePartsConfig();
    } catch (error) {
      console.error('Failed to save voice parts configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to save voice parts configuration');
      // Revert to previous config on error
      return;
    }
    
    // Check for newly orphaned members after config change
    if (roster) {
      const orphaned = findOrphanedMembers(roster, newConfig);
      if (orphaned.length > 0) {
        setOrphanedMembers(orphaned);
        setShowOrphanedDialog(true);
      }
    }
  };

  // Roster handlers
  const handleRosterChange = (updatedRoster: ChoirRoster) => {
    setRoster(updatedRoster);
    
    try {
      saveChoirRoster();
    } catch (error) {
      console.error('Failed to save roster:', error);
      setError(error instanceof Error ? error.message : 'Failed to save roster');
      // Revert to previous roster on error
      return;
    }
  };

  // Seating handlers
  const handleSeatingChange = (updatedSeating: SeatedMember[]) => {
    setSeating(updatedSeating);
  };

  const handleRemoveFromSeating = (rosterId: string) => {
    const updatedSeating = removeFromSeating(seating, rosterId);
    setSeating(updatedSeating);
  };

  const handleSettingsChange = (newSettings: Partial<StageSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    
    // If number of rows changed, redistribute members
    // Note: This now works with DisplayMembers, but we update seating positions
    if (newSettings.numberOfRows !== undefined && newSettings.numberOfRows !== settings.numberOfRows) {
      // TODO: Implement redistribution for new seating model
      // For now, just update settings
      console.log('Row redistribution not yet implemented for new seating model');
    }
    
    setSettings(updatedSettings);
  };

  const handleSeatingUpdate = (updatedMembers: DisplayMember[]) => {
    // Update seating positions based on display members
    const updatedSeating = updatedMembers.map(member => ({
      rosterId: member.id,
      position: member.position,
      rowNumber: member.rowNumber,
    }));
    
    setSeating(updatedSeating);
  };

  const handleRestoreSnapshot = async (seating: SeatedMember[], settings: StageSettings) => {
    // Check for orphaned seating references (members that don't exist in session roster)
    if (roster) {
      const rosterIds = new Set(roster.members.map(m => m.id));
      const orphanedSeating = seating.filter(s => !rosterIds.has(s.rosterId));
      
      if (orphanedSeating.length > 0) {
        console.warn(`Found ${orphanedSeating.length} orphaned seating reference(s) during snapshot restore`);
        alert(`Warning: ${orphanedSeating.length} member(s) from this snapshot no longer exist in the roster and were ignored.`);
        
        // Filter out orphaned references
        const cleanedSeating = seating.filter(s => rosterIds.has(s.rosterId));
        setSeating(cleanedSeating);
      } else {
        setSeating(seating);
      }
    } else {
      setSeating(seating);
    }
    
    // Restore settings from snapshot
    setSettings(settings);
  };

  // Orphaned members dialog handlers
  const handleBulkReassign = (assignments: Record<string, string>) => {
    if (!roster) return;
    
    let updatedRoster = { ...roster };
    
    // Apply all reassignments
    for (const [memberId, newVoicePartId] of Object.entries(assignments)) {
      const member = updatedRoster.members.find(m => m.id === memberId);
      if (member) {
        updatedRoster = updateRosterMember(updatedRoster, memberId, member.name, newVoicePartId);
      }
    }
    
    setRoster(updatedRoster);
    
    try {
      saveChoirRoster();
    } catch (error) {
      console.error('Failed to save roster after reassignment:', error);
      setError(error instanceof Error ? error.message : 'Failed to save roster');
      return;
    }
    
    // Clear orphaned members and close dialog
    setOrphanedMembers([]);
    setShowOrphanedDialog(false);
  };

  const handleAddMissingVoiceParts = (partIds: string[]) => {
    // This is called when user wants to add missing voice parts
    console.log('Add missing voice parts:', partIds);
  };

  const handleAddMissingPartsAndReassign = (newConfig: VoicePartsConfiguration) => {
    // Save the new configuration with added parts
    setVoicePartsConfig(newConfig);
    
    try {
      saveVoicePartsConfig();
    } catch (error) {
      console.error('Failed to save voice parts configuration:', error);
      setError(error instanceof Error ? error.message : 'Failed to save voice parts configuration');
      return;
    }
    
    // Clear orphaned members and close dialog
    setOrphanedMembers([]);
    setShowOrphanedDialog(false);
  };

  const handleCloseOrphanedDialog = () => {
    setShowOrphanedDialog(false);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading session...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <h2>Error Loading Session</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'}>
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Don't render until voice parts config and roster are loaded
  if (!voicePartsConfig || !roster) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Save status indicator */}
      {sessionCode && saveStatus !== 'idle' && (
        <div className={`save-status save-status-${saveStatus}`}>
          {saveStatus === 'saving' && '💾 Saving...'}
          {saveStatus === 'saved' && '✓ Saved'}
          {saveStatus === 'error' && '⚠ Error saving'}
        </div>
      )}

      {settings.title && (
        <div className="app-title">
          <h1>{settings.title}</h1>
        </div>
      )}
      
      {/* Migration notification */}
      {showMigrationNotification && (
        <MigrationNotification
          migration={migrationResult}
          onClose={() => setShowMigrationNotification(false)}
        />
      )}
      
      {/* Orphaned members dialog */}
      {showOrphanedDialog && orphanedMembers.length > 0 && (
        <OrphanedMembersDialog
          orphanedMembers={orphanedMembers}
          availableParts={voicePartsConfig.parts}
          voicePartsConfig={voicePartsConfig}
          onReassign={(memberId: string, newPartId: string) => {
            // Single reassignment - update the assignments map
            handleBulkReassign({ [memberId]: newPartId });
          }}
          onBulkReassign={handleBulkReassign}
          onAddMissingParts={handleAddMissingVoiceParts}
          onAddMissingPartsAndReassign={handleAddMissingPartsAndReassign}
          onClose={handleCloseOrphanedDialog}
        />
      )}
      
      <ControlPanel
        isOpen={isControlPanelOpen}
        onToggle={() => setIsControlPanelOpen(!isControlPanelOpen)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        voicePartsConfig={voicePartsConfig}
        onVoicePartsChange={handleVoicePartsConfigChange}
        roster={roster}
        onRosterChange={handleRosterChange}
        seating={seating}
        onSeatingChange={handleSeatingChange}
        displayMembers={displayMembers}
        onRemoveMemberFromSeating={handleRemoveFromSeating}
        sessionCode={sessionCode}
        onRestoreSnapshot={handleRestoreSnapshot}
      />
      
      <ChoirStageView
        members={displayMembers}
        settings={settings}
        voicePartsConfig={voicePartsConfig}
        onSeatingUpdate={handleSeatingUpdate}
        onMemberRemove={handleRemoveFromSeating}
      />
    </div>
  );
}

function SessionView() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  
  // Load data from DynamoDB using the sessionCode
  return <ChoirManager sessionCode={sessionCode} />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:sessionCode" element={<SessionView />} />
    </Routes>
  );
}

export default App;
