import { MigrationResult } from '../utils/storage';
import './MigrationNotification.scss';

interface MigrationNotificationProps {
  migration: MigrationResult;
  onClose: () => void;
}

export function MigrationNotification({ migration, onClose }: MigrationNotificationProps) {
  if (!migration.wasMigrated) {
    return null;
  }

  return (
    <div className="migration-notification-overlay">
      <div className="migration-notification">
        <div className="migration-notification-header">
          <h2>✓ Data Migration Complete</h2>
        </div>
        
        <div className="migration-notification-content">
          <p>
            Your choir data has been successfully upgraded to the new format with 
            custom voice parts and roster management.
          </p>
          
          <div className="migration-stats">
            <div className="migration-stat">
              <span className="stat-label">Roster Members:</span>
              <span className="stat-value">{migration.rosterMemberCount}</span>
            </div>
            
            <div className="migration-stat">
              <span className="stat-label">Currently Seated:</span>
              <span className="stat-value">{migration.seatedMemberCount}</span>
            </div>
            
            {migration.duplicatesFound! > 0 && (
              <div className="migration-stat">
                <span className="stat-label">Duplicates Merged:</span>
                <span className="stat-value">{migration.duplicatesFound}</span>
              </div>
            )}
          </div>
          
          <div className="migration-info">
            <p>
              <strong>What's new:</strong>
            </p>
            <ul>
              <li>Your choir members are now stored in a master roster</li>
              <li>You can customize voice parts beyond SATB</li>
              <li>Create different seating arrangements for various performances</li>
              <li>All your existing data has been preserved</li>
            </ul>
          </div>
        </div>
        
        <div className="migration-notification-footer">
          <button className="btn-primary" onClick={onClose}>
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}
