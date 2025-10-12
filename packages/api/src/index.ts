import { APIGatewayProxyHandler } from 'aws-lambda';
import { successResponse, errorResponse } from './utils/response';
import { createSession, getSession, updateSession, deleteSession } from './handlers/sessions';
import { CreateSessionRequest } from './types';

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
    if (method === 'GET' && path.startsWith('/sessions/')) {
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
    if (method === 'PUT' && path.startsWith('/sessions/')) {
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
    if (method === 'DELETE' && path.startsWith('/sessions/')) {
      const sessionCode = pathParams?.sessionCode;
      
      if (!sessionCode) {
        return errorResponse(400, 'Session code is required');
      }

      const result = await deleteSession(sessionCode);
      return successResponse(200, result);
    }

    // Route not found
    return errorResponse(404, 'Route not found');

  } catch (error) {
    console.error('Error processing request:', error);

    // Handle known errors
    if (error instanceof Error) {
      if (error.message === 'Session not found') {
        return errorResponse(404, error.message);
      }
      if (error.message.includes('Invalid choir data') || 
          error.message.includes('Session code is required') ||
          error.message.includes('Session name is required') ||
          error.message.includes('already exists') ||
          error.message.includes('must be 50 characters or less')) {
        return errorResponse(400, error.message);
      }
    }

    return errorResponse(500, 'Internal server error');
  }
};
