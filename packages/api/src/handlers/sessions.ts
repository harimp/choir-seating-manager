import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { ChoirData, SessionItem } from '../types';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'choir-sessions';

export async function createSession(sessionCode: string, sessionName: string, choirData: ChoirData): Promise<SessionItem> {
  // Basic validation
  if (!sessionCode || sessionCode.trim().length === 0) {
    throw new Error('Session code is required');
  }

  if (sessionCode.length > 50) {
    throw new Error('Session code must be 50 characters or less');
  }

  if (!sessionName || sessionName.trim().length === 0) {
    throw new Error('Session name is required');
  }

  if (!choirData.members || !Array.isArray(choirData.members)) {
    throw new Error('Invalid choir data: members array is required');
  }

  if (!choirData.settings) {
    throw new Error('Invalid choir data: settings are required');
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
  // Basic validation
  if (!choirData.members || !Array.isArray(choirData.members)) {
    throw new Error('Invalid choir data: members array is required');
  }

  if (!choirData.settings) {
    throw new Error('Invalid choir data: settings are required');
  }

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
