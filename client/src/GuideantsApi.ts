export type ConversationRole = 'User' | 'Assistant' | 'System' | 'Tool';

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  created: string;
  isEdited?: boolean;
  attachments?: PublishedAttachment[];
}

export interface ConversationIdResponse {
  id?: string;
  conversationId?: string;
}

export interface PublishedGuideConfig {
  id: string;
  projectId: string;
  notebookId: string;
  guideId: string;
  guideName: string;
  avatarUrl?: string;
  guideDescription?: string;
  maxUserMessageLength?: number;
  maxTurns?: number;
  requiresAuth: boolean;
  conversationStarters?: string[];
  displayMode?: 'full' | 'last-turn';
  commandMode?: boolean;
  showTurnNavigation?: boolean;
  collapsible?: boolean;
  showConversationStarters?: boolean;
  showAttachments?: boolean;
}

export type PublishedAttachment = {
  notebookFileId: string;
  uploadType: 'ImageFile' | 'ImageUrl' | 'AudioFile' | 'TextFile' | 'SandboxFile';
  fileName?: string;
};

export interface AuthError {
  error: 'authentication_required' | 'invalid_token' | 'auth_service_unavailable' | 'auth_service_error';
  message: string;
  requiresAuth: boolean;
}

export class AuthenticationError extends Error {
  constructor(
    public readonly errorCode: AuthError['error'],
    public readonly errorMessage: string,
    public readonly requiresAuth: boolean
  ) {
    super(errorMessage);
    this.name = 'AuthenticationError';
  }
}

function isAuthError(data: any): data is AuthError {
  return data &&
    typeof data.error === 'string' &&
    typeof data.message === 'string' &&
    typeof data.requiresAuth === 'boolean' &&
    (data.error === 'authentication_required' ||
     data.error === 'invalid_token' ||
     data.error === 'auth_service_unavailable' ||
     data.error === 'auth_service_error');
}

async function handleAuthError(res: Response): Promise<void> {
  if (res.status === 401 || res.status === 503) {
    try {
      const json = await res.json();
      if (isAuthError(json)) {
        throw new AuthenticationError(json.error, json.message, json.requiresAuth);
      }
    } catch (err) {
      if (err instanceof AuthenticationError) {
        throw err;
      }
      // Not a structured auth error, fall through to generic error
    }
  }
}

type AuthHeaders = {
  'X-Published-Auth'?: string;
};

// For published guides we deliberately avoid using the standard Authorization
// header so that the normal JWT middleware does not attempt to validate the
// token. The server-side published endpoints read this custom header and
// forward it to the webhook.
function buildAuthHeaders(authToken?: string): AuthHeaders {
  return authToken ? { 'X-Published-Auth': `Bearer ${authToken}` } : {};
}

export async function createConversation(params: {
  baseUrl: string;
  authToken?: string;
  projectId: string;
  notebookId: string;
  title: string;
  pubId?: string;
  useProxyPaths?: boolean;
}): Promise<string> {
  const { baseUrl, authToken, projectId, notebookId, title, pubId, useProxyPaths } = params;
  // Published guides always use the /api/published endpoints.
  // If an authToken is provided, it is forwarded via custom header
  // for webhook validation, but the route root remains /api/published.
  // When using proxy, we use simplified paths without /api/published prefix.
  const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}` : '';
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations${pubQuery}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(authToken),
    },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    await handleAuthError(res);
    throw new Error(`Failed to start conversation: HTTP ${res.status}`);
  }
  const json = (await res.json()) as ConversationIdResponse;
  const conversationId = json.id || json.conversationId;
  if (!conversationId) {
    throw new Error('conversation id missing from start response');
  }
  return conversationId;
}

export async function getConversation(params: {
  baseUrl: string;
  authToken?: string;
  projectId: string;
  notebookId: string;
  conversationId: string;
  pubId?: string;
  useProxyPaths?: boolean;
}): Promise<ConversationMessage[]> {
  const { baseUrl, authToken, projectId, notebookId, conversationId, pubId, useProxyPaths } = params;
  const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}` : '';
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations/${conversationId}${pubQuery}`;
  const res = await fetch(url, {
    headers: {
      ...buildAuthHeaders(authToken),
    },
  });
  if (!res.ok) {
    if (res.status === 404) {
      return [];
    }
    await handleAuthError(res);
    throw new Error(`Failed to load conversation: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { messages?: ConversationMessage[] };
  return (json.messages ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    created: m.created,
    isEdited: m.isEdited ?? false,
    attachments: Array.isArray(m.attachments)
      ? (m.attachments as any[]).map((a) => ({
          notebookFileId: a.notebookFileId,
          fileName: a.fileName,
          uploadType:
            a.uploadType ||
            (a.fileType === 'image'
              ? 'ImageFile'
              : a.fileType === 'audio'
              ? 'AudioFile'
              : 'TextFile'),
        }))
      : undefined,
  }));
}

export async function deleteLastTurn(params: {
  baseUrl: string;
  authToken?: string;
  projectId: string;
  notebookId: string;
  conversationId: string;
  pubId?: string;
  useProxyPaths?: boolean;
}): Promise<'deleted' | 'none' | 'conflict'> {
  const { baseUrl, authToken, projectId, notebookId, conversationId, pubId, useProxyPaths } = params;
  const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}` : '';
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations/${conversationId}/messages/last${pubQuery}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      ...buildAuthHeaders(authToken),
    },
  });
  if (res.status === 404) {
    return 'none';
  }
  if (res.status === 409) {
    return 'conflict';
  }
  if (!res.ok) {
    await handleAuthError(res);
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return 'deleted';
}

export async function streamAssistantMessage(params: {
  baseUrl: string;
  authToken?: string;
  projectId: string;
  notebookId: string;
  conversationId: string;
  instructions: string;
  attachments?: PublishedAttachment[];
  clientContext?: string;
  pubId?: string;
  useProxyPaths?: boolean;
  onEvent: (evt: { type: string; data: unknown }) => void;
}): Promise<void> {
  const { baseUrl, authToken, projectId, notebookId, conversationId, instructions, attachments, clientContext, pubId, useProxyPaths, onEvent } = params;
  const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}` : '';
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations/${conversationId}/messages${pubQuery}`;
  const payload: Record<string, unknown> = { instructions };
  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map(att => ({
      notebookFileId: att.notebookFileId,
      uploadType: att.uploadType
    }));
  }
  if (clientContext) {
    payload.clientContext = clientContext;
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...buildAuthHeaders(authToken),
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    await handleAuthError(response);
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEventType = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEventType = line.slice(7);
        } else if (line.startsWith('data: ')) {
          const eventData = line.slice(6);
          try {
            const parsed = JSON.parse(eventData) as unknown;
            onEvent({ type: currentEventType || 'data', data: parsed });
          } catch {
            // ignore parse error
          }
        } else if (line === '') {
          currentEventType = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function getPublishedGuideConfig(params: {
  baseUrl: string;
  pubId: string;
  useProxyPaths?: boolean;
}): Promise<PublishedGuideConfig> {
  const { baseUrl, pubId, useProxyPaths } = params;
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/guides/${pubId}`;
  const res = await fetch(url);
  
  if (!res.ok) {
    await handleAuthError(res);
    throw new Error(`Failed to load published guide: HTTP ${res.status}`);
  }
  
  return await res.json();
}

export async function uploadFileToPublishedGuide(params: {
  baseUrl: string;
  authToken?: string;
  projectId: string;
  notebookId: string;
  file: File;
  pubId?: string;
  useProxyPaths?: boolean;
}): Promise<PublishedAttachment> {
  const { baseUrl, authToken, projectId, notebookId, file, pubId, useProxyPaths } = params;
  const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}` : '';
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations/files${pubQuery}`;
  
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(authToken),
    },
    body: formData,
  });

  if (!res.ok) {
    await handleAuthError(res);
    throw new Error(`Failed to upload file: HTTP ${res.status}`);
  }

  const json = await res.json() as PublishedAttachment[];
  if (!json || json.length === 0) {
    throw new Error('No file metadata returned from upload');
  }
  return json[0];
}

export interface TranscriptionResult {
  text: string;
  durationSeconds: number;
}

export async function transcribeAudio(params: {
  baseUrl: string;
  audioBlob: Blob;
  language?: string;
  pubId?: string;
  authToken?: string;
  useProxyPaths?: boolean;
}): Promise<TranscriptionResult> {
  const { baseUrl, audioBlob, language, pubId, authToken, useProxyPaths } = params;
  
  if (!pubId) {
    throw new Error('pubId is required for published guide transcription');
  }

  const formData = new FormData();
  
  // Determine file extension from blob type
  const mimeType = audioBlob.type || 'audio/webm';
  const mimeToExt: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
    'audio/ogg': 'ogg',
    'audio/ogg;codecs=opus': 'ogg',
    'audio/wav': 'wav',
    'audio/mp3': 'mp3',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/opus': 'opus',
  };
  const extension = mimeToExt[mimeType] || 'webm';
  const fileName = `recording.${extension}`;
  
  formData.append('audio', audioBlob, fileName);
  
  if (language) {
    formData.append('language', language);
  }

  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/speech/transcribe?pubId=${encodeURIComponent(pubId)}`;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...buildAuthHeaders(authToken),
    },
    body: formData,
  });

  if (!res.ok) {
    await handleAuthError(res);
    
    let errorMessage = 'Transcription failed';
    try {
      const errorData = await res.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Use default message
    }
    throw new Error(errorMessage);
  }

  return res.json();
}

export async function submitExternalToolResults(params: {
  baseUrl: string;
  authToken?: string;
  projectId: string;
  notebookId: string;
  conversationId: string;
  results: Array<{ toolCallId: string; name: string; content: string }>;
  pubId?: string;
  resume?: boolean;
  useProxyPaths?: boolean;
  onEvent?: (evt: { type: string; data: unknown }) => void;
}): Promise<void> {
  const { baseUrl, authToken, projectId, notebookId, conversationId, results, pubId, resume, useProxyPaths, onEvent } = params;
  const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}${resume ? '&resume=true' : ''}` : (resume ? '?resume=true' : '');
  const pathPrefix = useProxyPaths ? '' : '/api/published';
  const url = `${baseUrl}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations/${conversationId}/tool-calls/results${pubQuery}`;

  if (resume) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...buildAuthHeaders(authToken),
      },
      body: JSON.stringify(results),
    });
    if (!response.ok) {
      await handleAuthError(response);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error('No response body');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentEventType = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const eventData = line.slice(6);
            try {
              const parsed = JSON.parse(eventData) as unknown;
              onEvent?.({ type: currentEventType || 'data', data: parsed });
            } catch {
              // ignore parse error
            }
          } else if (line === '') {
            currentEventType = '';
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  } else {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(authToken),
      },
      body: JSON.stringify(results),
    });
    if (!res.ok) {
      await handleAuthError(res);
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
  }
}


