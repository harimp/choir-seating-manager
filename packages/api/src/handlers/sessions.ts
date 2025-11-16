import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { ChoirData, SessionItem } from '../types';
import { normalizeSeatingPositions } from '../utils/seating';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'choir-sessions';

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
  const hasNewFormat = choirData.seating !== undefined && Array.isArray(choirData.seating);

  if (!hasLegacyFormat && !hasNewFormat) {
    throw new Error('Invalid choir data: either members (legacy) or seating (new format) is required');
  }
  
  // Validate seating references if present (new format)
  if (hasNewFormat && choirData.seating) {
    for (const seated of choirData.seating) {
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

export async function createSession(sessionCode: string, sessionName: string, choirData: ChoirData): Promise<SessionItem> {
  // Validate session code
  if (!sessionCode || sessionCode.trim().length === 0) {
    throw new Error('Session code is required and cannot be empty');
  }

  if (sessionCode.length > 50) {
    throw new Error('Session code must be 50 characters or less');
  }

  // Validate session code format (alphanumeric, hyphens, underscores only)
  if (!/^[a-zA-Z0-9_-]+$/.test(sessionCode)) {
    throw new Error('Session code can only contain letters, numbers, hyphens, and underscores');
  }

  // Validate session name
  if (!sessionName || sessionName.trim().length === 0) {
    throw new Error('Session name is required and cannot be empty');
  }

  if (sessionName.length > 100) {
    throw new Error('Session name must be 100 characters or less');
  }

  // Validate choir data (supports both legacy and new formats)
  // New format: choirData.seating contains references to roster members (rosterId, position, rowNumber)
  // Legacy format: choirData.members contains full member data (for backward compatibility)
  // Note: Voice parts configuration and roster are stored at profile-level, NOT in sessions
  validateChoirData(choirData);

  // Normalize seating positions to ensure they are non-negative integers
  if (choirData.seating) {
    choirData.seating = normalizeSeatingPositions(choirData.seating);
  }

  // Check if session with this code already exists using GSI
  const existingResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'SessionCodeIndex',
      KeyConditionExpression: 'sessionCode = :sessionCode',
      ExpressionAttributeValues: {
        ':sessionCode': sessionCode,
      },
    })
  );

  if (existingResult.Items && existingResult.Items.length > 0) {
    throw new Error('Session with this code already exists');
  }

  // Create session item
  const now = new Date().toISOString();
  const sessionId = randomUUID();

  const sessionItem: SessionItem = {
    sessionId,
    sessionCode,
    sessionName,
    choirData,
    createdAt: now,
    updatedAt: now,
  };

  // Save to DynamoDB
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: sessionItem,
    })
  );

  return sessionItem;
}

export async function getSession(sessionCode: string): Promise<SessionItem | null> {
  // Query by session code using GSI
  // Returns session with seating references (new format) or full member data (legacy format)
  // Client is responsible for joining seating references with profile-level roster
  // Client is responsible for applying profile-level voice parts configuration
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'SessionCodeIndex',
      KeyConditionExpression: 'sessionCode = :sessionCode',
      ExpressionAttributeValues: {
        ':sessionCode': sessionCode,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  return result.Items[0] as SessionItem;
}

export async function updateSession(sessionCode: string, choirData: ChoirData): Promise<SessionItem> {
  // Validate choir data (supports both legacy and new formats)
  // New format: choirData.seating contains only references to roster members
  // This keeps session data lightweight and ensures roster is the single source of truth
  validateChoirData(choirData);

  // Normalize seating positions to ensure they are non-negative integers
  if (choirData.seating) {
    choirData.seating = normalizeSeatingPositions(choirData.seating);
  }

  // Get existing session by code using GSI
  const existingSession = await getSession(sessionCode);

  if (!existingSession) {
    throw new Error('Session not found');
  }

  // Update session item (preserving sessionName and sessionCode)
  // Note: Voice parts configuration is NOT stored in session (it's profile-level)
  // Note: Roster is NOT stored in session (it's profile-level)
  const sessionItem: SessionItem = {
    sessionId: existingSession.sessionId,
    sessionCode: existingSession.sessionCode,
    sessionName: existingSession.sessionName,
    choirData,
    createdAt: existingSession.createdAt,
    updatedAt: new Date().toISOString(),
  };

  // Save to DynamoDB
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: sessionItem,
    })
  );

  return sessionItem;
}

export async function deleteSession(sessionCode: string): Promise<{ message: string; sessionCode: string; sessionId: string }> {
  // Get existing session by code using GSI
  const existingSession = await getSession(sessionCode);

  if (!existingSession) {
    throw new Error('Session not found');
  }

  // Delete from DynamoDB using primary key
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { sessionId: existingSession.sessionId },
    })
  );

  return { 
    message: 'Session deleted successfully', 
    sessionCode,
    sessionId: existingSession.sessionId
  };
}
