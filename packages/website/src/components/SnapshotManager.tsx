import { useState, useEffect, useCallback } from 'react';
import { SeatedMember, StageSettings, SnapshotListItem } from '../types';
import { 
  createSnapshot, 
  listSnapshots, 
  getSnapshot, 
  updateSnapshotName, 
  deleteSnapshot,
  ApiError 
} from '../api/client';
import './SnapshotManager.scss';

interface SnapshotManagerProps {
  sessionCode: string;
  currentSeating: SeatedMember[];
  currentSettings: StageSettings;
  onRestore: (seating: SeatedMember[], settings: StageSettings) => void | Promise<void>;
}

export const SnapshotManager = ({
  sessionCode,
  currentSeating,
  currentSettings,
  onRestore,
}: SnapshotManagerProps) => {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [snapshotToRestore, setSnapshotToRestore] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [snapshotToRename, setSnapshotToRename] = useState<{ id: string; currentName: string } | null>(null);
  const [newSnapshotName, setNewSnapshotName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [snapshotToDelete, setSnapshotToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchSnapshots = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listSnapshots(sessionCode);
      setSnapshots(result.snapshots);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error loading snapshots: ${err.message}`);
      } else {
        setError('An unexpected error occurred while loading snapshots.');
      }
      console.error('Error fetching snapshots:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionCode]);

  // Fetch snapshots on component mount
  useEffect(() => {
    fetchSnapshots();
  }, [fetchSnapshots]);

  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    return date.toLocaleString('en-US', options).replace(',', ' at');
  };

  const handleSaveSnapshot = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await createSnapshot(
        sessionCode,
        snapshotName.trim() || undefined,
        currentSeating,
        currentSettings
      );
      setSuccessMessage('Snapshot saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowSaveDialog(false);
      setSnapshotName('');
      await fetchSnapshots();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error saving snapshot: ${err.message}`);
      } else {
        setError('An unexpected error occurred while saving snapshot.');
      }
      console.error('Error saving snapshot:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDialogOpen = () => {
    setShowSaveDialog(true);
    setSnapshotName('');
    setError(null);
  };

  const handleSaveDialogClose = () => {
    setShowSaveDialog(false);
    setSnapshotName('');
  };

  const handleRestoreClick = (snapshotId: string) => {
    setSnapshotToRestore(snapshotId);
    setShowRestoreDialog(true);
    setError(null);
  };

  const handleRestoreConfirm = async () => {
    if (!snapshotToRestore) return;

    setIsRestoring(true);
    setError(null);
    try {
      const snapshot = await getSnapshot(sessionCode, snapshotToRestore);
      await onRestore(snapshot.seating, snapshot.settings);
      setSuccessMessage('Snapshot restored successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowRestoreDialog(false);
      setSnapshotToRestore(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error restoring snapshot: ${err.message}`);
      } else {
        setError('An unexpected error occurred while restoring snapshot.');
      }
      console.error('Error restoring snapshot:', err);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreDialogClose = () => {
    setShowRestoreDialog(false);
    setSnapshotToRestore(null);
  };

  const handleRenameClick = (snapshotId: string, currentName: string) => {
    setSnapshotToRename({ id: snapshotId, currentName });
    setNewSnapshotName(currentName);
    setShowRenameDialog(true);
    setError(null);
  };

  const handleRenameConfirm = async () => {
    if (!snapshotToRename) return;

    const trimmedName = newSnapshotName.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      setError('Snapshot name must be between 1 and 100 characters');
      return;
    }

    setIsRenaming(true);
    setError(null);
    try {
      await updateSnapshotName(sessionCode, snapshotToRename.id, trimmedName);
      setSuccessMessage('Snapshot renamed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowRenameDialog(false);
      setSnapshotToRename(null);
      setNewSnapshotName('');
      await fetchSnapshots();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error renaming snapshot: ${err.message}`);
      } else {
        setError('An unexpected error occurred while renaming snapshot.');
      }
      console.error('Error renaming snapshot:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleRenameDialogClose = () => {
    setShowRenameDialog(false);
    setSnapshotToRename(null);
    setNewSnapshotName('');
  };

  const handleDeleteClick = (snapshotId: string, snapshotName: string) => {
    setSnapshotToDelete({ id: snapshotId, name: snapshotName });
    setShowDeleteDialog(true);
    setError(null);
  };

  const handleDeleteConfirm = async () => {
    if (!snapshotToDelete) return;

    setIsDeleting(true);
    setError(null);
    try {
      await deleteSnapshot(sessionCode, snapshotToDelete.id);
      setSuccessMessage('Snapshot deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowDeleteDialog(false);
      setSnapshotToDelete(null);
      await fetchSnapshots();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Error deleting snapshot: ${err.message}`);
      } else {
        setError('An unexpected error occurred while deleting snapshot.');
      }
      console.error('Error deleting snapshot:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteDialogClose = () => {
    setShowDeleteDialog(false);
    setSnapshotToDelete(null);
  };

  return (
    <div className="snapshot-manager">
      <div className="snapshot-header">
        <h3>Snapshots</h3>
        <button 
          className="btn btn-primary" 
          onClick={handleSaveDialogOpen}
          disabled={isSaving}
        >
          Save Snapshot
        </button>
      </div>

      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}
      {isLoading && <div className="loading-message">Loading...</div>}

      {/* Save Dialog */}
      {showSaveDialog && (
        <>
          <div className="modal-backdrop" onClick={handleSaveDialogClose} />
          <div className="modal">
            <div className="modal-content">
              <h4>Save Snapshot</h4>
              <div className="form-group">
                <label htmlFor="snapshot-name">Snapshot Name (optional):</label>
                <input
                  id="snapshot-name"
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="Leave empty for default name"
                  maxLength={100}
                  autoFocus
                />
                <small>If left empty, a default name will be generated</small>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={handleSaveDialogClose}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleSaveSnapshot}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Restore Dialog */}
      {showRestoreDialog && (
        <>
          <div className="modal-backdrop" onClick={handleRestoreDialogClose} />
          <div className="modal">
            <div className="modal-content">
              <h4>Restore Snapshot</h4>
              <p>Are you sure you want to restore this snapshot? Your current arrangement will be replaced.</p>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRestoreDialogClose}
                  disabled={isRestoring}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleRestoreConfirm}
                  disabled={isRestoring}
                >
                  {isRestoring ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Rename Dialog */}
      {showRenameDialog && (
        <>
          <div className="modal-backdrop" onClick={handleRenameDialogClose} />
          <div className="modal">
            <div className="modal-content">
              <h4>Rename Snapshot</h4>
              <div className="form-group">
                <label htmlFor="new-snapshot-name">New Name:</label>
                <input
                  id="new-snapshot-name"
                  type="text"
                  value={newSnapshotName}
                  onChange={(e) => setNewSnapshotName(e.target.value)}
                  placeholder="Enter new name"
                  maxLength={100}
                  autoFocus
                />
                <small>Name must be between 1 and 100 characters</small>
              </div>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRenameDialogClose}
                  disabled={isRenaming}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={handleRenameConfirm}
                  disabled={isRenaming || newSnapshotName.trim().length === 0}
                >
                  {isRenaming ? 'Renaming...' : 'Rename'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && (
        <>
          <div className="modal-backdrop" onClick={handleDeleteDialogClose} />
          <div className="modal">
            <div className="modal-content">
              <h4>Delete Snapshot</h4>
              <p>Are you sure you want to delete "{snapshotToDelete?.name}"? This action cannot be undone.</p>
              <div className="modal-actions">
                <button 
                  className="btn btn-secondary" 
                  onClick={handleDeleteDialogClose}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="snapshot-list">
        {snapshots.length === 0 && !isLoading && (
          <p className="empty-message">No snapshots saved yet</p>
        )}
        {snapshots.map((snapshot) => (
          <div key={snapshot.snapshotId} className="snapshot-item">
            <div className="snapshot-info">
              <div className="snapshot-name">{snapshot.snapshotName}</div>
              <div className="snapshot-meta">
                {formatTimestamp(snapshot.updatedAt)} • {snapshot.memberCount} members
              </div>
            </div>
            <div className="snapshot-actions">
              <button 
                className="btn btn-small btn-primary" 
                onClick={() => handleRestoreClick(snapshot.snapshotId)}
                disabled={isRestoring}
              >
                Restore
              </button>
              <button 
                className="btn btn-small btn-secondary" 
                onClick={() => handleRenameClick(snapshot.snapshotId, snapshot.snapshotName)}
                disabled={isRenaming}
              >
                Rename
              </button>
              <button 
                className="btn btn-small btn-danger" 
                onClick={() => handleDeleteClick(snapshot.snapshotId, snapshot.snapshotName)}
                disabled={isDeleting}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
