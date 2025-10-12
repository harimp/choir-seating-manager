import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import { Home } from './components/Home';
import { ControlPanel } from './components/ControlPanel';
import { ChoirStageView } from './components/ChoirStageView';
import { ChoirMember, VoiceSection, StageSettings } from './types';
import {
  loadChoirData,
  saveChoirData,
  exportChoirData,
  importChoirData,
  generateId,
} from './utils/storage';
import {
  distributeMembers,
  initializeMemberPosition,
} from './utils/alignmentCalculations';
import { getSession, updateSession, ApiError } from './api/client';
import './styles/App.scss';

interface ChoirManagerProps {
  sessionCode?: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function ChoirManager({ sessionCode }: ChoirManagerProps) {
  const [members, setMembers] = useState<ChoirMember[]>([]);
  const [settings, setSettings] = useState<StageSettings>({
    numberOfRows: 3,
    alignmentMode: 'balanced',
    pianoPosition: 'right',
  });
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const stageWidthRef = useRef(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      if (!sessionCode) {
        // No session code, use localStorage
        const data = loadChoirData();
        setMembers(data.members);
        setSettings(data.settings);
        setIsLoading(false);
        isInitialLoadRef.current = false;
        return;
      }

      // Fetch from API
      try {
        setIsLoading(true);
        setError(null);
        const session = await getSession(sessionCode);
        setMembers(session.choirData.members);
        setSettings(session.choirData.settings);
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
      saveChoirData({
        members,
        settings,
        lastUpdated: new Date().toISOString(),
      });
      return;
    }

    // Set saving status
    setSaveStatus('saving');

    // Schedule save to API
    saveTimeoutRef.current = window.setTimeout(async () => {
      try {
        await updateSession(sessionCode, {
          members,
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
  }, [sessionCode, members, settings]);

  // Trigger auto-save when data changes
  useEffect(() => {
    scheduleAutoSave();
  }, [members, settings, scheduleAutoSave]);

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

  const handleAddMember = (name: string, voiceSection: VoiceSection) => {
    const sectionMembers = members.filter(m => m.voiceSection === voiceSection);
    const newPosition = sectionMembers.length > 0
      ? Math.max(...sectionMembers.map(m => m.position)) + 1
      : 0;

    const newMember: ChoirMember = {
      id: generateId(),
      name,
      voiceSection,
      position: newPosition,
      rowNumber: 0,
    };

    // Initialize row assignment based on current layout
    const initializedMember = initializeMemberPosition(
      newMember,
      members,
      settings.numberOfRows
    );

    setMembers([...members, initializedMember]);
  };

  const handleRemoveMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  const handleSettingsChange = (newSettings: Partial<StageSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    
    // If number of rows changed, redistribute members
    if (newSettings.numberOfRows !== undefined && newSettings.numberOfRows !== settings.numberOfRows) {
      const redistributed = distributeMembers(members, newSettings.numberOfRows);
      setMembers(redistributed);
    }
    
    setSettings(updatedSettings);
  };

  const handleMemberUpdate = (updatedMembers: ChoirMember[]) => {
    setMembers(updatedMembers);
  };

  const handleExport = () => {
    exportChoirData({
      members,
      settings,
      lastUpdated: new Date().toISOString(),
    });
  };

  const handleImport = async (file: File) => {
    try {
      const data = await importChoirData(file);
      setMembers(data.members);
      setSettings(data.settings);
      alert('Data imported successfully!');
    } catch (error) {
      alert('Error importing data. Please check the file format.');
      console.error(error);
    }
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
      
      <ControlPanel
        isOpen={isControlPanelOpen}
        onToggle={() => setIsControlPanelOpen(!isControlPanelOpen)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        members={members}
        onAddMember={handleAddMember}
        onRemoveMember={handleRemoveMember}
        onExport={handleExport}
        onImport={handleImport}
      />
      
      <ChoirStageView
        members={members}
        settings={settings}
        onMemberUpdate={handleMemberUpdate}
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
