import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { SnapshotItem, SnapshotListItem, SeatedMember, StageSettings } from '../types';
import { getSession } from './sessions';
import { normalizeSeatingPositions } from '../utils/seating';

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
 * Validate seating arrangement
 */
function validateSeating(seating: SeatedMember[]): void {
  if (!Array.isArray(seating)) {
    throw new Error('Seating must be an array');
  }

  for (const seated of seating) {
    if (!seated.rosterId || typeof seated.rosterId !== 'string') {
      throw new Error('Invalid seating data: rosterId is required for each seated member');
    }
    if (typeof seated.position !== 'number') {
      throw new Error('Invalid seating data: position must be a number');
    }
    if (typeof seated.rowNumber !== 'number') {
      throw new Error('Invalid seating data: rowNumber must be a number');
    }
  }
}

/**
 * Validate stage settings
 */
function validateSettings(settings: StageSettings): void {
  if (!settings) {
    throw new Error('Settings are required');
  }

  if (typeof settings.numberOfRows !== 'number' || settings.numberOfRows < 1) {
    throw new Error('Invalid settings: numberOfRows must be a positive number');
  }

  if (!['balanced', 'grid'].includes(settings.alignmentMode)) {
    throw new Error('Invalid settings: alignmentMode must be "balanced" or "grid"');
  }

  if (!['left', 'right'].includes(settings.pianoPosition)) {
    throw new Error('Invalid settings: pianoPosition must be "left" or "right"');
  }
}

/**
 * Create a new snapshot for a session
 * 
 * Snapshots only store seating arrangements (references to roster members) and settings.
 * The roster and voice parts are stored at session-level.
 */
export async function createSnapshot(
  sessionCode: string,
  snapshotName: string | undefined,
  seating: SeatedMember[],
  settings: StageSettings
): Promise<SnapshotItem> {
  // Validate session exists
  const session = await getSession(sessionCode);
  if (!session) {
    throw new Error('Session not found');
  }
  
  // Validate seating and settings
  validateSeating(seating);
  validateSettings(settings);
  
  // Normalize seating positions to ensure they are non-negative integers
  const normalizedSeating = normalizeSeatingPositions(seating);
  
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
    seating: normalizedSeating,
    settings,
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
      memberCount: snapshot.seating.length,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  });
}

/**
 * Get a specific snapshot by ID
 * 
 * Returns the snapshot with seating references and settings.
 * The client is responsible for:
 * 1. Joining seating references with the session-level roster
 * 2. Showing a toaster error and ignoring members that don't exist in the roster
 * 3. Using the session-level voice parts configuration
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
