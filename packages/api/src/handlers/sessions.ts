import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { SessionItem, RosterMember, VoicePartsConfiguration, SeatedMember, StageSettings } from '../types';
import { normalizeSeatingPositions } from '../utils/seating';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'choir-sessions';

/**
 * Validate roster members
 */
function validateRoster(roster: RosterMember[]): void {
  if (!Array.isArray(roster)) {
    throw new Error('Roster must be an array');
  }

  for (const member of roster) {
    if (!member.id || typeof member.id !== 'string') {
      throw new Error('Invalid roster member: id is required');
    }
    if (!member.name || typeof member.name !== 'string' || member.name.trim().length === 0) {
      throw new Error('Invalid roster member: name is required and cannot be empty');
    }
    if (!member.voicePartId || typeof member.voicePartId !== 'string') {
      throw new Error('Invalid roster member: voicePartId is required');
    }
  }
}

/**
 * Validate voice parts configuration
 */
function validateVoiceParts(voiceParts: VoicePartsConfiguration): void {
  if (!voiceParts || !Array.isArray(voiceParts.parts)) {
    throw new Error('Voice parts configuration must have a parts array');
  }

  for (const part of voiceParts.parts) {
    if (!part.id || typeof part.id !== 'string') {
      throw new Error('Invalid voice part: id is required');
    }
    if (!part.name || typeof part.name !== 'string') {
      throw new Error('Invalid voice part: name is required');
    }
    if (!part.color || typeof part.color !== 'string') {
      throw new Error('Invalid voice part: color is required');
    }
    if (typeof part.order !== 'number') {
      throw new Error('Invalid voice part: order must be a number');
    }
  }
}

/**
 * Validate seating arrangement
 */
function validateSeating(seating: SeatedMember[], roster: RosterMember[]): void {
  if (!Array.isArray(seating)) {
    throw new Error('Seating must be an array');
  }

  const rosterIds = new Set(roster.map(m => m.id));

  for (const seated of seating) {
    if (!seated.rosterId || typeof seated.rosterId !== 'string') {
      throw new Error('Invalid seating data: rosterId is required for each seated member');
    }
    if (!rosterIds.has(seated.rosterId)) {
      throw new Error(`Invalid seating data: rosterId ${seated.rosterId} not found in roster`);
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

export async function createSession(
  sessionCode: string,
  sessionName: string,
  roster: RosterMember[],
  voiceParts: VoicePartsConfiguration,
  seating: SeatedMember[],
  settings: StageSettings
): Promise<SessionItem> {
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

  // Validate all session data
  validateRoster(roster);
  validateVoiceParts(voiceParts);
  validateSettings(settings);
  validateSeating(seating, roster);

  // Normalize seating positions to ensure they are non-negative integers
  const normalizedSeating = normalizeSeatingPositions(seating);

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
    roster,
    voiceParts,
    seating: normalizedSeating,
    settings,
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
  // Returns session with roster, voice parts, seating, and settings
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

export async function updateSession(
  sessionCode: string,
  roster: RosterMember[],
  voiceParts: VoicePartsConfiguration,
  seating: SeatedMember[],
  settings: StageSettings
): Promise<SessionItem> {
  // Validate all session data
  validateRoster(roster);
  validateVoiceParts(voiceParts);
  validateSettings(settings);
  validateSeating(seating, roster);

  // Normalize seating positions to ensure they are non-negative integers
  const normalizedSeating = normalizeSeatingPositions(seating);

  // Get existing session by code using GSI
  const existingSession = await getSession(sessionCode);

  if (!existingSession) {
    throw new Error('Session not found');
  }

  // Update session item (preserving sessionName and sessionCode)
  const sessionItem: SessionItem = {
    sessionId: existingSession.sessionId,
    sessionCode: existingSession.sessionCode,
    sessionName: existingSession.sessionName,
    roster,
    voiceParts,
    seating: normalizedSeating,
    settings,
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
