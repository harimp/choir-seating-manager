import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { ChoirData, SnapshotItem, SnapshotListItem } from '../types';
import { getSession } from './sessions';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const SNAPSHOTS_TABLE_NAME = process.env.SNAPSHOTS_TABLE_NAME || 'choir-snapshots';

/**
 * Generate default snapshot name with format "Snapshot - YYYY-MM-DD HH:MM:SS"
 */
function generateDefaultSnapshotName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `Snapshot - ${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Validate snapshot name length
 */
function validateSnapshotName(name: string): void {
  if (!name || name.trim().length === 0) {
    throw new Error('Snapshot name cannot be empty');
  }
  
  if (name.length > 100) {
    throw new Error('Snapshot name must be 100 characters or less');
  }
}

/**
 * Validate choir data structure - supports both legacy and new formats
 */
function validateChoirData(choirData: ChoirData): void {
  if (!choirData.settings) {
    throw new Error('Invalid choir data: settings are required');
  }

  // Validate settings structure
  if (typeof choirData.settings.numberOfRows !== 'number' || choirData.settings.numberOfRows < 1) {
    throw new Error('Invalid settings: numberOfRows must be a positive number');
  }

  if (!['balanced', 'grid'].includes(choirData.settings.alignmentMode)) {
    throw new Error('Invalid settings: alignmentMode must be "balanced" or "grid"');
  }

  if (!['left', 'right'].includes(choirData.settings.pianoPosition)) {
    throw new Error('Invalid settings: pianoPosition must be "left" or "right"');
  }

  // Check if data has either legacy format (members) or new format (seating)
  const hasLegacyFormat = choirData.members && Array.isArray(choirData.members);
  const hasNewFormat = choirData.seating && Array.isArray(choirData.seating);

  if (!hasLegacyFormat && !hasNewFormat) {
    throw new Error('Invalid choir data: either members (legacy) or seating (new format) is required');
  }

  // Validate seating references if present (new format)
  if (hasNewFormat && choirData.seating) {
    for (const seated of choirData.seating) {
      if (!seated.rosterId || typeof seated.rosterId !== 'string') {
        throw new Error('Invalid seating data: rosterId is required for each seated member');
      }
      if (typeof seated.position !== 'number' || seated.position < 0) {
        throw new Error('Invalid seating data: position must be a non-negative number');
      }
      if (typeof seated.rowNumber !== 'number' || seated.rowNumber < 0) {
        throw new Error('Invalid seating data: rowNumber must be a non-negative number');
      }
    }
  }

  // Validate legacy members if present
  if (hasLegacyFormat && choirData.members) {
    for (const member of choirData.members) {
      if (!member.id || typeof member.id !== 'string') {
        throw new Error('Invalid member data: id is required');
      }
      if (!member.name || typeof member.name !== 'string' || member.name.trim().length === 0) {
        throw new Error('Invalid member data: name is required and cannot be empty');
      }
      if (!member.voiceSection || !['Soprano', 'Alto', 'Tenor', 'Bass'].includes(member.voiceSection)) {
        throw new Error('Invalid member data: voiceSection must be Soprano, Alto, Tenor, or Bass');
      }
      if (typeof member.position !== 'number' || member.position < 0) {
        throw new Error('Invalid member data: position must be a non-negative number');
      }
      if (typeof member.rowNumber !== 'number' || member.rowNumber < 0) {
        throw new Error('Invalid member data: rowNumber must be a non-negative number');
      }
    }
  }
}

/**
 * Get member count from choir data (supports both legacy and new formats)
 */
function getMemberCount(choirData: ChoirData): number {
  // New format: count seating array
  if (choirData.seating && Array.isArray(choirData.seating)) {
    return choirData.seating.length;
  }
  
  // Legacy format: count members array
  if (choirData.members && Array.isArray(choirData.members)) {
    return choirData.members.length;
  }
  
  return 0;
}

/**
 * Create a new snapshot for a session
 * 
 * Snapshots store seating arrangements (references to roster members) along with settings.
 * Voice parts configuration is NOT stored in snapshots - it comes from profile-level storage.
 * 
 * New format: choirData.seating contains SeatedMember[] with roster references
 * Legacy format: choirData.members contains full ChoirMember[] data (for backward compatibility)
 */
export async function createSnapshot(
  sessionCode: string,
  snapshotName: string | undefined,
  choirData: ChoirData
): Promise<SnapshotItem> {
  // Validate session exists
  const session = await getSession(sessionCode);
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Validate choir data
  validateChoirData(choirData);
  
  // Generate or validate snapshot name
  const finalSnapshotName = snapshotName || generateDefaultSnapshotName();
  validateSnapshotName(finalSnapshotName);
  
  // Create snapshot item
  const now = new Date().toISOString();
  const snapshotId = randomUUID();
  
  const snapshotItem: SnapshotItem = {
    snapshotId,
    sessionId: session.sessionId,
    sessionCode: session.sessionCode,
    snapshotName: finalSnapshotName,
    choirData,
    createdAt: now,
    updatedAt: now,
  };
  
  // Save to DynamoDB
  await docClient.send(
    new PutCommand({
      TableName: SNAPSHOTS_TABLE_NAME,
      Item: snapshotItem,
    })
  );
  
  return snapshotItem;
}

/**
 * List all snapshots for a session, sorted by updatedAt descending
 */
export async function listSnapshots(sessionCode: string): Promise<SnapshotListItem[]> {
  // Query snapshots table using SessionCodeIndex GSI
  const result = await docClient.send(
    new QueryCommand({
      TableName: SNAPSHOTS_TABLE_NAME,
      IndexName: 'SessionCodeIndex',
      KeyConditionExpression: 'sessionCode = :sessionCode',
      ExpressionAttributeValues: {
        ':sessionCode': sessionCode,
      },
      ScanIndexForward: false, // Sort by updatedAt descending
    })
  );
  
  if (!result.Items || result.Items.length === 0) {
    return [];
  }
  
  // Transform to SnapshotListItem format with member count
  return result.Items.map((item) => {
    const snapshot = item as SnapshotItem;
    return {
      snapshotId: snapshot.snapshotId,
      snapshotName: snapshot.snapshotName,
      memberCount: getMemberCount(snapshot.choirData),
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  });
}

/**
 * Get a specific snapshot by ID
 * 
 * Returns the snapshot with seating references. The client is responsible for:
 * 1. Joining seating references with the current profile-level roster
 * 2. Cleaning up orphaned references (members that no longer exist in roster)
 * 3. Applying the current profile-level voice parts configuration
 */
export async function getSnapshot(
  sessionCode: string,
  snapshotId: string
): Promise<SnapshotItem | null> {
  // Query snapshot by snapshotId
  const result = await docClient.send(
    new GetCommand({
      TableName: SNAPSHOTS_TABLE_NAME,
      Key: { snapshotId },
    })
  );
  
  if (!result.Item) {
    return null;
  }
  
  const snapshot = result.Item as SnapshotItem;
  
  // Verify snapshot belongs to specified session
  if (snapshot.sessionCode !== sessionCode) {
    return null;
  }
  
  return snapshot;
}

/**
 * Update snapshot name (rename operation)
 */
export async function updateSnapshotName(
  sessionCode: string,
  snapshotId: string,
  snapshotName: string
): Promise<SnapshotItem> {
  // Validate new name
  validateSnapshotName(snapshotName);
  
  // Validate snapshot exists and belongs to session
  const existingSnapshot = await getSnapshot(sessionCode, snapshotId);
  if (!existingSnapshot) {
    throw new Error('Snapshot not found');
  }
  
  // Update snapshot name and updatedAt timestamp
  const now = new Date().toISOString();
  
  const result = await docClient.send(
    new UpdateCommand({
      TableName: SNAPSHOTS_TABLE_NAME,
      Key: { snapshotId },
      UpdateExpression: 'SET snapshotName = :name, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':name': snapshotName,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );
  
  return result.Attributes as SnapshotItem;
}

/**
 * Delete a snapshot
 */
export async function deleteSnapshot(
  sessionCode: string,
  snapshotId: string
): Promise<{ message: string; snapshotId: string }> {
  // Validate snapshot exists and belongs to session
  const existingSnapshot = await getSnapshot(sessionCode, snapshotId);
  if (!existingSnapshot) {
    throw new Error('Snapshot not found');
  }
  
  // Delete from DynamoDB
  await docClient.send(
    new DeleteCommand({
      TableName: SNAPSHOTS_TABLE_NAME,
      Key: { snapshotId },
    })
  );
  
  return {
    message: 'Snapshot deleted successfully',
    snapshotId,
  };
}
