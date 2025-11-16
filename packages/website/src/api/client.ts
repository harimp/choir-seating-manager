import { 
  SessionItem, 
  CreateSessionRequest,
  SnapshotItem,
  CreateSnapshotRequest,
  UpdateSnapshotRequest,
  SnapshotListItem,
  RosterMember,
  VoicePartsConfiguration,
  SeatedMember,
  StageSettings
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.choir.harimp.com';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let errorBody;
      
      try {
        errorBody = await response.json();
        errorMessage = errorBody.message || errorMessage;
      } catch {
        // Response body is not JSON, use status text
      }
      
      throw new ApiError(errorMessage, response.status, errorBody);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network error or other fetch errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

export async function getSession(sessionCode: string): Promise<SessionItem> {
  return fetchApi<SessionItem>(`/sessions/${encodeURIComponent(sessionCode)}`);
}

export async function createSession(
  sessionCode: string,
  sessionName: string,
  roster: RosterMember[],
  voiceParts: VoicePartsConfiguration,
  seating: SeatedMember[],
  settings: StageSettings
): Promise<SessionItem> {
  const request: CreateSessionRequest = {
    sessionCode,
    sessionName,
    roster,
    voiceParts,
    seating,
    settings,
  };

  return fetchApi<SessionItem>('/sessions', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function updateSession(
  sessionCode: string,
  roster: RosterMember[],
  voiceParts: VoicePartsConfiguration,
  seating: SeatedMember[],
  settings: StageSettings
): Promise<SessionItem> {
  const request: CreateSessionRequest = {
    sessionCode,
    sessionName: '', // Not used in update
    roster,
    voiceParts,
    seating,
    settings,
  };

  return fetchApi<SessionItem>(`/sessions/${encodeURIComponent(sessionCode)}`, {
    method: 'PUT',
    body: JSON.stringify(request),
  });
}

export async function deleteSession(sessionCode: string): Promise<{ message: string; sessionCode: string; sessionId: string }> {
  return fetchApi<{ message: string; sessionCode: string; sessionId: string }>(
    `/sessions/${encodeURIComponent(sessionCode)}`,
    {
      method: 'DELETE',
    }
  );
}

// Snapshot API functions

export async function createSnapshot(
  sessionCode: string,
  snapshotName: string | undefined,
  seating: SeatedMember[],
  settings: StageSettings
): Promise<SnapshotItem> {
  const request: CreateSnapshotRequest = {
    snapshotName,
    seating,
    settings,
  };

  return fetchApi<SnapshotItem>(
    `/sessions/${encodeURIComponent(sessionCode)}/snapshots`,
    {
      method: 'POST',
      body: JSON.stringify(request),
    }
  );
}

export async function listSnapshots(
  sessionCode: string
): Promise<{ snapshots: SnapshotListItem[] }> {
  return fetchApi<{ snapshots: SnapshotListItem[] }>(
    `/sessions/${encodeURIComponent(sessionCode)}/snapshots`
  );
}

export async function getSnapshot(
  sessionCode: string,
  snapshotId: string
): Promise<SnapshotItem> {
  return fetchApi<SnapshotItem>(
    `/sessions/${encodeURIComponent(sessionCode)}/snapshots/${encodeURIComponent(snapshotId)}`
  );
}

export async function updateSnapshotName(
  sessionCode: string,
  snapshotId: string,
  snapshotName: string
): Promise<SnapshotItem> {
  const request: UpdateSnapshotRequest = {
    snapshotName,
  };

  return fetchApi<SnapshotItem>(
    `/sessions/${encodeURIComponent(sessionCode)}/snapshots/${encodeURIComponent(snapshotId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(request),
    }
  );
}

export async function deleteSnapshot(
  sessionCode: string,
  snapshotId: string
): Promise<{ message: string; snapshotId: string }> {
  return fetchApi<{ message: string; snapshotId: string }>(
    `/sessions/${encodeURIComponent(sessionCode)}/snapshots/${encodeURIComponent(snapshotId)}`,
    {
      method: 'DELETE',
    }
  );
}
