import { useState, useEffect, useRef } from 'react';
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
import './styles/App.scss';

interface ChoirManagerProps {
  sessionCode?: string;
}

function ChoirManager({ sessionCode }: ChoirManagerProps) {
  const [members, setMembers] = useState<ChoirMember[]>([]);
  const [settings, setSettings] = useState<StageSettings>({
    numberOfRows: 3,
    alignmentMode: 'balanced',
    pianoPosition: 'right',
  });
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const stageWidthRef = useRef(0);

  // Load data on mount
  useEffect(() => {
    // TODO: If sessionCode is provided, fetch from API
    // For now, just use localStorage
    const data = loadChoirData();
    setMembers(data.members);
    setSettings(data.settings);
  }, [sessionCode]);

  // Save data when members or settings change
  useEffect(() => {
    saveChoirData({
      members,
      settings,
      lastUpdated: new Date().toISOString(),
    });
  }, [members, settings]);

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

  return (
    <div className="app">
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
