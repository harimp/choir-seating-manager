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
 * Validate choir data structure
 */
function validateChoirData(choirData: ChoirData): void {
  if (!choirData.members || !Array.isArray(choirData.members)) {
    throw new Error('Invalid choir data: members array is required');
  }
  
  if (!choirData.settings) {
    throw new Error('Invalid choir data: settings are required');
  }
}

/**
 * Create a new snapshot for a session
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
      memberCount: snapshot.choirData.members.length,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  });
}

/**
 * Get a specific snapshot by ID
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
