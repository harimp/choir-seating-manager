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
  SeatedMember,
  DisplayMember,
} from './types';
import {
  loadChoirData,
  saveChoirData,
  exportChoirData,
  importChoirData,
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
  migrateLegacyMembers,
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
  const [orphanedMembers, setOrphanedMembers] = useState<any[]>([]);
  
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
          // No session code, use localStorage
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
        
        // Handle seating data from session
        if (session.choirData.seating) {
          // New format: session contains seating references
          // Clean orphaned seating references (members that don't exist in current roster)
          const cleanedSeating = cleanOrphanedSeatingReferences(session.choirData.seating, loadedRoster);
          
          // Check if any references were orphaned and notify user
          const orphanedCount = session.choirData.seating.length - cleanedSeating.length;
          if (orphanedCount > 0) {
            console.warn(`Removed ${orphanedCount} orphaned seating reference(s) from session`);
            // Show a subtle notification to user
            setTimeout(() => {
              alert(`Note: ${orphanedCount} member(s) from this session no longer exist in your roster and were not loaded.`);
            }, 500);
          }
          
          setSeating(cleanedSeating);
        } else if (session.choirData.members) {
          // Legacy format - migrate to roster + seating
          console.log('Session has legacy format, migrating to roster + seating...');
          
          const existingMemberCount = loadedRoster.members.length;
          
          // Migrate legacy members to roster + seating
          const { roster: updatedRoster, seating: migratedSeating } = migrateLegacyMembers(
            session.choirData.members,
            loadedRoster
          );
          
          // Calculate migration stats
          const newMemberCount = updatedRoster.members.length - existingMemberCount;
          const duplicatesFound = session.choirData.members.length - newMemberCount;
          
          // Save updated roster
          saveChoirRoster(updatedRoster);
          setRoster(updatedRoster);
          
          // Set migrated seating
          setSeating(migratedSeating);
          
          // Show migration notification
          setMigrationResult({
            wasMigrated: true,
            rosterMemberCount: updatedRoster.members.length,
            seatedMemberCount: migratedSeating.length,
            duplicatesFound,
          });
          setShowMigrationNotification(true);
          
          console.log(`Session migration complete: ${updatedRoster.members.length} roster members, ${migratedSeating.length} seated`);
        } else {
          setSeating([]);
        }
        
        setSettings(session.choirData.settings);
        
        // Voice parts configuration is always loaded from profile-level storage
        // NOT from session data - this ensures consistency across all sessions
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

    // If no session code, just save to localStorage
    if (!sessionCode) {
      try {
        saveChoirData({
          seating,
          settings,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to save choir data:', error);
        setError(error instanceof Error ? error.message : 'Failed to save choir data');
      }
      return;
    }

    // Set saving status
    setSaveStatus('saving');

    // Schedule save to API
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        // Save session with seating references only (not full member data)
        // Voice parts configuration is NOT saved to session (it's profile-level)
        // Roster is NOT saved to session (it's profile-level)
        await updateSession(sessionCode, {
          seating, // Only seating references (rosterId, position, rowNumber)
          settings,
          lastUpdated: new Date().toISOString(),
        });
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
  }, [sessionCode, seating, settings]);

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
      saveVoicePartsConfig(newConfig);
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
      saveChoirRoster(updatedRoster);
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

  const handleExport = () => {
    exportChoirData({
      seating,
      settings,
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleImport = async (file: File) => {
    try {
      const { data, migration, hasOrphanedMembers } = await importChoirData(file);
      
      // Show migration notification if data was migrated
      if (migration.wasMigrated) {
        setMigrationResult(migration);
        setShowMigrationNotification(true);
      }
      
      // Reload voice parts config (import may have updated it)
      const updatedConfig = loadVoicePartsConfig();
      setVoicePartsConfig(updatedConfig);
      
      // Reload roster (import may have updated it)
      const updatedRoster = loadChoirRoster();
      setRoster(updatedRoster);
      
      // Handle seating data
      if (data.seating) {
        const cleanedSeating = cleanOrphanedSeatingReferences(data.seating, updatedRoster);
        setSeating(cleanedSeating);
      } else {
        setSeating([]);
      }
      
      setSettings(data.settings);
      
      // Check for orphaned members after import
      const orphaned = findOrphanedMembers(updatedRoster, updatedConfig);
      if (orphaned.length > 0 || hasOrphanedMembers) {
        setOrphanedMembers(orphaned);
        setShowOrphanedDialog(true);
      }
      
      if (!migration.wasMigrated && !hasOrphanedMembers) {
        alert('Data imported successfully!');
      } else if (!migration.wasMigrated && hasOrphanedMembers) {
        alert('Data imported successfully! Please reassign members with invalid voice parts.');
      }
    } catch (error) {
      alert('Error importing data. Please check the file format.');
      console.error(error);
    }
  };

  const handleRestoreSnapshot = async (choirData: any) => {
    // Handle both legacy and new format snapshots
    if (choirData.seating) {
      // New format: snapshot contains seating references
      if (roster) {
        // Clean orphaned seating references (members that no longer exist in roster)
        const cleanedSeating = cleanOrphanedSeatingReferences(choirData.seating, roster);
        
        // Check if any references were orphaned
        const orphanedCount = choirData.seating.length - cleanedSeating.length;
        if (orphanedCount > 0) {
          console.warn(`Removed ${orphanedCount} orphaned seating reference(s) during snapshot restore`);
          alert(`Note: ${orphanedCount} member(s) from this snapshot no longer exist in your roster and were not restored.`);
        }
        
        setSeating(cleanedSeating);
      }
    } else if (choirData.members) {
      // Legacy format: snapshot contains full member data
      console.warn('Restoring legacy format snapshot - migrating to new format');
      
      // Create a temporary file blob for import
      const legacyData = {
        members: choirData.members,
        settings: choirData.settings,
        lastUpdated: choirData.lastUpdated || new Date().toISOString(),
      };
      
      const blob = new Blob([JSON.stringify(legacyData)], { type: 'application/json' });
      const file = new File([blob], 'snapshot.json', { type: 'application/json' });
      
      // Use the existing import handler which handles migration
      await handleImport(file);
      
      // Settings are already set by handleImport, so we're done
      return;
    } else {
      // Empty snapshot or invalid format
      console.warn('Snapshot has no seating or members data');
      setSeating([]);
    }
    
    // Always restore settings from snapshot
    setSettings(choirData.settings);
    
    // Voice parts configuration is NOT restored from snapshot
    // It always comes from profile-level storage
    // This ensures consistency across all sessions and snapshots
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
      saveChoirRoster(updatedRoster);
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
      saveVoicePartsConfig(newConfig);
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
        onExport={handleExport}
        onImport={handleImport}
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
  
  // For now, just show the choir manager with localStorage
  // Later, this will load data from DynamoDB using the sessionCode
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
