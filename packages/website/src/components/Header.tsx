import './Header.scss';

interface HeaderProps {
  onExport: () => void;
  onImport: (file: File) => void;
}

export const Header = ({ onExport, onImport }: HeaderProps) => {
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

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <h1>Choir Seating Manager</h1>
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleImportClick}>
              Import Data
            </button>
            <button className="btn btn-primary" onClick={onExport}>
              Export Data
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
