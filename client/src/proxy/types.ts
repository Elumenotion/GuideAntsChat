/**
 * Options for configuring the GuideAnts proxy.
 */
export interface GuideantsProxyOptions {
  /**
   * The API key to inject into requests.
   * Retrieved from your secure configuration (env vars, secrets manager, etc.)
   */
  apiKey: string;

  /**
   * Target GuideAnts API URL. Defaults to https://api.guideants.ai
   */
  targetBaseUrl?: string;

  /**
   * Optional: Cache for guide configuration.
   * If provided, GET /guides/{pubId} responses are cached.
   */
  cache?: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  };

  /**
   * Optional: Logging hooks
   */
  logger?: {
    info?: (message: string, meta?: Record<string, unknown>) => void;
    warn?: (message: string, meta?: Record<string, unknown>) => void;
    error?: (message: string, meta?: Record<string, unknown>) => void;
  };

  /**
   * Optional: Metrics hooks
   */
  metrics?: {
    onRequest?: (info: ProxyRequestInfo) => void;
    onResponse?: (info: ProxyResponseInfo) => void;
    onStreamChunk?: (info: { pubId?: string; bytes: number }) => void;
  };

  /**
   * Optional: Transform request before forwarding.
   * Use to inject clientContext from your session, modify headers, etc.
   */
  transformRequest?: (req: unknown, targetHeaders: Headers) => Promise<void> | void;
}

/**
 * Information about an incoming proxy request.
 */
export interface ProxyRequestInfo {
  method: string;
  path: string;
  pubId?: string;
}

/**
 * Information about a proxy response.
 */
export interface ProxyResponseInfo {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

/**
 * Simplified request interface for the low-level proxy handler.
 */
export interface ProxyRequest {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}

/**
 * Simplified response interface for the low-level proxy handler.
 */
export interface ProxyResponse {
  writeHead: (status: number, headers: Record<string, string>) => void;
  write: (chunk: Uint8Array | string) => void;
  end: () => void;
}

/**
 * Handler function type for processing proxy requests.
 */
export type ProxyHandler = (req: ProxyRequest, res: ProxyResponse) => Promise<void>;

