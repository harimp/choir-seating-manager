# Choir Seating Manager API

REST API for managing choir seating sessions with DynamoDB backend.

## Architecture

- **API Gateway**: REST API with CORS enabled
- **Single Lambda Function**: Node.js 20 router handling all CRUD operations
- **DynamoDB**: Session storage with on-demand billing

### Benefits of Single Lambda Design
- ✅ Reduced cold starts (one function vs four)
- ✅ Shared connection pools and initialization
- ✅ Lower cost and simpler deployment
- ✅ Easier to maintain and debug

## Endpoints

### Create Session
```
POST /sessions
Content-Type: application/json

Body:
{
  "sessionName": "my-choir-session",
  "choirData": {
    "members": [...],
    "settings": {...},
    "lastUpdated": "ISO-8601 timestamp"
  }
}

Response: 201 Created
{
  "sessionId": "uuid-v4",
  "sessionName": "my-choir-session",
  "choirData": {...},
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp"
}

Response: 400 Bad Request (if session name already exists)
{
  "error": "Session with this name already exists"
}
```

### Get Session
```
GET /sessions/{sessionName}

Response: 200 OK
{
  "sessionId": "uuid-v4",
  "sessionName": "my-choir-session",
  "choirData": {...},
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp"
}

Response: 404 Not Found
{
  "error": "Session not found"
}
```

### Update Session
```
PUT /sessions/{sessionName}
Content-Type: application/json

Body:
{
  "sessionName": "my-choir-session",
  "choirData": {
    "members": [...],
    "settings": {...},
    "lastUpdated": "ISO-8601 timestamp"
  }
}

Response: 200 OK
{
  "sessionId": "uuid-v4",
  "sessionName": "my-choir-session",
  "choirData": {...},
  "createdAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp"
}

Response: 404 Not Found
{
  "error": "Session not found"
}
```

### Delete Session
```
DELETE /sessions/{sessionName}

Response: 200 OK
{
  "message": "Session deleted successfully",
  "sessionName": "my-choir-session",
  "sessionId": "uuid-v4"
}

Response: 404 Not Found
{
  "error": "Session not found"
}
```

## Development

### Project Structure
```
packages/api/
├── src/
│   ├── index.ts              # Main Lambda handler (router)
│   ├── handlers/
│   │   └── sessions.ts       # Business logic for CRUD operations
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── utils/
│       └── response.ts       # Response helpers with CORS
├── package.json
└── tsconfig.json
```

### Build
```bash
npm run build
```

### Deploy
The API is deployed as part of the DataPlaneStack:
```bash
cd ../infrastructure
npm run cdk deploy DataPlaneStack
```

After deployment, the API URL will be output as `ApiUrl`.

### How It Works
The single Lambda function acts as a router:
1. Receives API Gateway event
2. Routes based on HTTP method and path
3. Calls appropriate handler function
4. Returns standardized response with CORS headers

All routes share the same Lambda instance, which means:
- Faster subsequent requests (warm starts)
- Shared DynamoDB connection pool
- More efficient resource utilization

## Schema

### Session Item
```typescript
interface SessionItem {
  sessionId: string;        // Auto-generated UUID (Primary Key)
  sessionName: string;      // User-provided name (Unique via GSI)
  choirData: ChoirData;
  createdAt: string;
  updatedAt: string;
}
```

### Choir Data
The API uses the same `ChoirData` schema as the website:

```typescript
interface ChoirData {
  members: ChoirMember[];
  settings: StageSettings;
  lastUpdated: string;
}

interface ChoirMember {
  id: string;
  name: string;
  voiceSection: 'Soprano' | 'Alto' | 'Tenor' | 'Bass';
  position: number;
  rowNumber: number;
}

interface StageSettings {
  numberOfRows: number;
  alignmentMode: 'balanced' | 'grid';
  pianoPosition: 'left' | 'right';
  title?: string;
}
```

### DynamoDB Structure
- **Primary Key**: `sessionId` (UUID) - for direct access
- **Global Secondary Index**: `SessionNameIndex` on `sessionName` - for human-readable lookups
- This dual-key approach provides both:
  - Guaranteed uniqueness via UUID
  - User-friendly access via session name

## Error Handling

All endpoints return standard HTTP status codes:
- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST
- `400 Bad Request`: Invalid request body or parameters
- `404 Not Found`: Session not found
- `500 Internal Server Error`: Server error

Error responses include a JSON body with an `error` field:
```json
{
  "error": "Error message"
}
```

## CORS

CORS is enabled for all origins, methods, and the following headers:
- Content-Type
- Authorization

This allows the website to call the API from any domain.
