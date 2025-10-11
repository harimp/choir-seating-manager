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
      
      if (!request.sessionName) {
        return errorResponse(400, 'Session name is required');
      }

      const result = await createSession(request.sessionName, request.choirData);
      return successResponse(201, result);
    }

    // GET /sessions/{sessionName} - Get session
    if (method === 'GET' && path.startsWith('/sessions/')) {
      const sessionName = pathParams?.sessionName;
      
      if (!sessionName) {
        return errorResponse(400, 'Session name is required');
      }

      const result = await getSession(sessionName);
      
      if (!result) {
        return errorResponse(404, 'Session not found');
      }

      return successResponse(200, result);
    }

    // PUT /sessions/{sessionName} - Update session
    if (method === 'PUT' && path.startsWith('/sessions/')) {
      const sessionName = pathParams?.sessionName;
      
      if (!sessionName) {
        return errorResponse(400, 'Session name is required');
      }

      if (!event.body) {
        return errorResponse(400, 'Request body is required');
      }

      const request: CreateSessionRequest = JSON.parse(event.body);
      const result = await updateSession(sessionName, request.choirData);
      return successResponse(200, result);
    }

    // DELETE /sessions/{sessionName} - Delete session
    if (method === 'DELETE' && path.startsWith('/sessions/')) {
      const sessionName = pathParams?.sessionName;
      
      if (!sessionName) {
        return errorResponse(400, 'Session name is required');
      }

      const result = await deleteSession(sessionName);
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
          error.message.includes('Session name is required') ||
          error.message.includes('already exists')) {
        return errorResponse(400, error.message);
      }
    }

    return errorResponse(500, 'Internal server error');
  }
};
