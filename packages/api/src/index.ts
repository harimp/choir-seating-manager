import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse } from './utils/response';
import { createSession, getSession, updateSession, deleteSession } from './handlers/sessions';
import { createSnapshot, listSnapshots, getSnapshot, updateSnapshotName, deleteSnapshot } from './handlers/snapshots';
import { CreateSessionRequest, CreateSnapshotRequest, UpdateSnapshotRequest } from './types';

export const handler: APIGatewayProxyHandler = async (event) => {
  const method = event.httpMethod;
  const path = event.path;
  const pathParams = event.pathParameters;

  console.log(`${method} ${path}`, { pathParams });

  try {
    // POST /sessions - Create session
    if (method === 'POST' && path === '/sessions') {
      if (!event.body) {
        return errorResponse(400, 'Request body is required');
      }

      const request: CreateSessionRequest = JSON.parse(event.body);
      
      if (!request.sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      if (!request.sessionName) {
        return errorResponse(400, 'Session name is required');
      }

      const result = await createSession(request.sessionCode, request.sessionName, request.choirData);
      return successResponse(201, result);
    }

    // GET /sessions/{sessionCode} - Get session
    if (method === 'GET' && path.match(/^\/sessions\/[^/]+$/) && !path.includes('/snapshots')) {
      const sessionCode = pathParams?.sessionCode;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      const result = await getSession(sessionCode);
      
      if (!result) {
        return errorResponse(404, 'Session not found');
      }

      return successResponse(200, result);
    }

    // PUT /sessions/{sessionCode} - Update session
    if (method === 'PUT' && path.match(/^\/sessions\/[^/]+$/) && !path.includes('/snapshots')) {
      const sessionCode = pathParams?.sessionCode;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      if (!event.body) {
        return errorResponse(400, 'Request body is required');
      }

      const request: CreateSessionRequest = JSON.parse(event.body);
      const result = await updateSession(sessionCode, request.choirData);
      return successResponse(200, result);
    }

    // DELETE /sessions/{sessionCode} - Delete session
    if (method === 'DELETE' && path.startsWith('/sessions/') && !path.includes('/snapshots')) {
      const sessionCode = pathParams?.sessionCode;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      const result = await deleteSession(sessionCode);
      return successResponse(200, result);
    }

    // POST /sessions/{sessionCode}/snapshots - Create snapshot
    if (method === 'POST' && path.match(/^\/sessions\/[^/]+\/snapshots$/)) {
      const sessionCode = pathParams?.sessionCode;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      if (!event.body) {
        return errorResponse(400, 'Request body is required');
      }

      const request: CreateSnapshotRequest = JSON.parse(event.body);
      
      if (!request.choirData) {
        return errorResponse(400, 'Choir data is required');
      }

      const result = await createSnapshot(sessionCode, request.snapshotName, request.choirData);
      return successResponse(201, result);
    }

    // GET /sessions/{sessionCode}/snapshots - List snapshots
    if (method === 'GET' && path.match(/^\/sessions\/[^/]+\/snapshots$/)) {
      const sessionCode = pathParams?.sessionCode;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      const snapshots = await listSnapshots(sessionCode);
      return successResponse(200, { snapshots });
    }

    // GET /sessions/{sessionCode}/snapshots/{snapshotId} - Get snapshot
    if (method === 'GET' && path.match(/^\/sessions\/[^/]+\/snapshots\/[^/]+$/)) {
      const sessionCode = pathParams?.sessionCode;
      const snapshotId = pathParams?.snapshotId;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      if (!snapshotId) {
        return errorResponse(400, 'Snapshot ID is required');
      }

      const result = await getSnapshot(sessionCode, snapshotId);
      
      if (!result) {
        return errorResponse(404, 'Snapshot not found');
      }

      return successResponse(200, result);
    }

    // PATCH /sessions/{sessionCode}/snapshots/{snapshotId} - Rename snapshot
    if (method === 'PATCH' && path.match(/^\/sessions\/[^/]+\/snapshots\/[^/]+$/)) {
      const sessionCode = pathParams?.sessionCode;
      const snapshotId = pathParams?.snapshotId;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      if (!snapshotId) {
        return errorResponse(400, 'Snapshot ID is required');
      }

      if (!event.body) {
        return errorResponse(400, 'Request body is required');
      }

      const request: UpdateSnapshotRequest = JSON.parse(event.body);
      
      if (!request.snapshotName) {
        return errorResponse(400, 'Snapshot name is required');
      }

      const result = await updateSnapshotName(sessionCode, snapshotId, request.snapshotName);
      return successResponse(200, result);
    }

    // DELETE /sessions/{sessionCode}/snapshots/{snapshotId} - Delete snapshot
    if (method === 'DELETE' && path.match(/^\/sessions\/[^/]+\/snapshots\/[^/]+$/)) {
      const sessionCode = pathParams?.sessionCode;
      const snapshotId = pathParams?.snapshotId;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      if (!snapshotId) {
        return errorResponse(400, 'Snapshot ID is required');
      }

      const result = await deleteSnapshot(sessionCode, snapshotId);
      return successResponse(200, result);
    }

    // Route not found
    return errorResponse(404, 'Route not found');

  } catch (error) {
    console.error('Error processing request:', error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message === 'Session not found' || error.message === 'Snapshot not found') {
        return errorResponse(404, error.message);
      }
      if (error.message.includes('Invalid choir data') || 
          error.message.includes('Session code is required') ||
          error.message.includes('Session name is required') ||
          error.message.includes('already exists') ||
          error.message.includes('must be 50 characters or less') ||
          error.message.includes('Snapshot name') ||
          error.message.includes('Choir data is required') ||
          error.message.includes('members array is required') ||
          error.message.includes('settings are required')) {
        return errorResponse(400, error.message);
      }
    }

    return errorResponse(500, 'Internal server error');
  }
};
