import {
  createConversation,
  getConversation,
  deleteLastTurn,
  streamAssistantMessage,
  getPublishedGuideConfig,
  uploadFileToPublishedGuide,
  AuthenticationError,
  type ConversationMessage,
  type PublishedGuideConfig,
  type PublishedAttachment
} from '../GuideantsApi';
import { GuideantsChatState } from './GuideantsChatState';

export class GuideantsChatService {
  constructor(private state: GuideantsChatState) {}

  /**
   * Returns the effective base URL for API calls.
   * If proxyUrl is set, returns the proxy URL.
   * Otherwise returns the direct API base URL.
   */
  public getEffectiveBaseUrl(): string {
    // If proxy is configured, all calls go through the proxy
    if (this.state.proxyUrl) {
      return this.state.proxyUrl.replace(/\/$/, '');
    }
    return this.getApiBaseUrlOrThrow();
  }

  /**
   * Returns true if requests should be routed through a proxy.
   */
  public isUsingProxy(): boolean {
    return !!this.state.proxyUrl;
  }

  public getApiBaseUrlOrThrow(): string {
    const attrBase = this.state.apiBaseUrl?.trim();
    const envBase = (import.meta as any).env?.VITE_DEFAULT_API_BASE_URL as string | undefined;
    const base = attrBase || envBase || 'https://api.guideants.ai';
    return base.replace(/\/$/, '');
  }

  /**
   * Constructs the appropriate URL path based on whether we're using proxy or direct access.
   * When using proxy: simpler paths without /api/published prefix
   * When direct: full paths with /api/published prefix
   */
  private buildPath(path: string): string {
    const base = this.getEffectiveBaseUrl();
    if (this.isUsingProxy()) {
      // Proxy uses simplified paths - remove /api/published prefix
      return `${base}${path}`;
    }
    // Direct access uses full /api/published prefix
    return `${base}/api/published${path}`;
  }

  public async fetchConfig(): Promise<PublishedGuideConfig> {
    if (!this.state.pubId) throw new Error('Missing pub-id');
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    const cfg = await getPublishedGuideConfig({
      baseUrl: base,
      pubId: this.state.pubId,
      useProxyPaths
    });
    if (cfg?.avatarUrl && cfg.avatarUrl.startsWith('/')) {
      // When using proxy, relative URLs should be resolved against the API base, not the proxy
      const avatarBase = useProxyPaths ? this.getApiBaseUrlOrThrow() : base;
      cfg.avatarUrl = `${avatarBase}${cfg.avatarUrl}`;
    }
    return cfg;
  }

  public async fetchAvatarUrl(): Promise<string | null> {
    try {
      if (!this.state.pubId) return null;
      const base = this.getEffectiveBaseUrl();
      const useProxyPaths = this.isUsingProxy();
      const pathPrefix = useProxyPaths ? '' : '/api/published';
      const url = `${base}${pathPrefix}/guides/${this.state.pubId}/avatar`;
      const res = await fetch(url, { 
        method: 'GET',
        headers: { 'Accept': 'image/*' },
        cache: 'no-store'
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.startsWith('image/')) {
        return url;
      }
      return null;
    } catch {
      return null;
    }
  }

  public async startConversation(title: string): Promise<string> {
    this.ensureResolvedIds();
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    return await createConversation({
      baseUrl: base,
      authToken: this.state.authToken || undefined,
      projectId: this.state.projectId!,
      notebookId: this.state.notebookId!,
      title,
      pubId: this.state.pubId || undefined,
      useProxyPaths
    });
  }

  public async fetchHistory(): Promise<ConversationMessage[]> {
    if (!this.state.conversationId) return [];
    this.ensureResolvedIds();
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    return await getConversation({
      baseUrl: base,
      authToken: this.state.authToken || undefined,
      projectId: this.state.projectId!,
      notebookId: this.state.notebookId!,
      conversationId: this.state.conversationId,
      pubId: this.state.pubId || undefined,
      useProxyPaths
    });
  }

  public async deleteLastTurn(): Promise<'deleted' | 'none' | 'conflict'> {
    if (!this.state.conversationId) return 'none';
    this.ensureResolvedIds();
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    return await deleteLastTurn({
      baseUrl: base,
      authToken: this.state.authToken || undefined,
      projectId: this.state.projectId!,
      notebookId: this.state.notebookId!,
      conversationId: this.state.conversationId,
      pubId: this.state.pubId || undefined,
      useProxyPaths
    });
  }

  public async streamResponse(
    content: string, 
    attachments: PublishedAttachment[] | undefined,
    onEvent: (evt: { type: string; data: any }) => void
  ): Promise<void> {
    this.ensureResolvedIds();
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    const clientContext = this.state.conversationContext || undefined;

    await streamAssistantMessage({
      baseUrl: base,
      authToken: this.state.authToken || undefined,
      projectId: this.state.projectId!,
      notebookId: this.state.notebookId!,
      conversationId: this.state.conversationId!,
      instructions: content,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      clientContext: clientContext,
      pubId: this.state.pubId || undefined,
      useProxyPaths,
      onEvent
    });
  }

  public async uploadFile(file: File): Promise<PublishedAttachment> {
    this.ensureResolvedIds();
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    return await uploadFileToPublishedGuide({
      baseUrl: base,
      authToken: this.state.authToken || undefined,
      projectId: this.state.projectId!,
      notebookId: this.state.notebookId!,
      file,
      pubId: this.state.pubId || undefined,
      useProxyPaths
    });
  }

  public async submitToolResults(
    results: Array<{ toolCallId: string; name: string; content: string }>,
    onEvent?: (evt: { type: string; data: any }) => void
  ): Promise<void> {
    this.ensureResolvedIds();
    const base = this.getEffectiveBaseUrl();
    const useProxyPaths = this.isUsingProxy();
    
    // Manual fetch here because 'submitExternalToolResults' in guideants-api.ts has logic for resume=true
    // but we want to use the same SSE handler pattern.
    // Actually guideants-api has submitExternalToolResults. Let's reuse it but we need to ensure
    // it supports the stream handling if resume=true is passed.
    // Looking at guideants-api.ts, submitExternalToolResults handles resume=true with SSE reading.
    
    // We need to construct the URL manually if we want to control the loop, OR just call the API helper.
    // The API helper `submitExternalToolResults` does the fetch and looping.
    
    const projectId = this.state.projectId!;
    const notebookId = this.state.notebookId!;
    const conversationId = this.state.conversationId!;
    const pubId = this.state.pubId || undefined;
    const authToken = this.state.authToken || undefined;

    const pubQuery = pubId ? `?pubId=${encodeURIComponent(pubId)}&resume=true` : `?resume=true`;
    const pathPrefix = useProxyPaths ? '' : '/api/published';
    const url = `${base}${pathPrefix}/projects/${projectId}/notebooks/${notebookId}/conversations/${conversationId}/tool-calls/results${pubQuery}`;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' };
    if (authToken) headers['X-Published-Auth'] = `Bearer ${authToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(results)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    if (!response.body) throw new Error('No response body');
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
      try { reader.releaseLock(); } catch {}
    }
  }

  private ensureResolvedIds() {
    if (!this.state.projectId || !this.state.notebookId) {
       throw new Error('Missing guide configuration');
    }
  }
}

