import type {
  GuideantsProxyOptions,
  ProxyRequest,
  ProxyResponse,
  ProxyRequestInfo,
  ProxyResponseInfo
} from './types';

const DEFAULT_TARGET_BASE_URL = 'https://api.guideants.ai';

/**
 * Extracts pubId from query string if present.
 */
function extractPubId(url: string): string | undefined {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return urlObj.searchParams.get('pubId') || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Builds the target URL by prepending /api/published to the path.
 */
function buildTargetUrl(baseUrl: string, path: string, query: string): string {
  // Remove leading slash if present for clean concatenation
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const queryString = query ? `?${query}` : '';
  return `${baseUrl}/api/published${cleanPath}${queryString}`;
}

/**
 * Parses the incoming URL to extract path and query.
 */
function parseUrl(url: string): { path: string; query: string } {
  try {
    const urlObj = new URL(url, 'http://localhost');
    return {
      path: urlObj.pathname,
      query: urlObj.search.slice(1) // Remove leading '?'
    };
  } catch {
    return { path: url, query: '' };
  }
}

/**
 * Normalizes headers from various formats to a plain object.
 */
function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalized[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return normalized;
}

/**
 * Low-level proxy function for custom server implementations.
 * Handles a single request/response pair.
 */
export async function handleProxyRequest(
  options: GuideantsProxyOptions,
  req: ProxyRequest,
  res: ProxyResponse
): Promise<void> {
  const startTime = Date.now();
  const targetBaseUrl = (options.targetBaseUrl || DEFAULT_TARGET_BASE_URL).replace(/\/$/, '');
  const logger = options.logger || {};
  const metrics = options.metrics || {};

  const { path, query } = parseUrl(req.url);
  const pubId = extractPubId(req.url);
  const method = req.method.toUpperCase();

  // Log and track request
  const requestInfo: ProxyRequestInfo = { method, path, pubId };
  logger.info?.('Proxying request', requestInfo as unknown as Record<string, unknown>);
  metrics.onRequest?.(requestInfo);

  // Build target URL
  const targetUrl = buildTargetUrl(targetBaseUrl, path, query);
  logger.info?.('Forwarding to', { targetUrl });

  // Build headers for the target request
  const incomingHeaders = normalizeHeaders(req.headers);
  const targetHeaders: Record<string, string> = {
    'host': new URL(targetBaseUrl).host,
    'x-guideants-apikey': options.apiKey,
  };

  // Copy safe headers from the original request
  const safeHeaders = [
    'content-type',
    'accept',
    'accept-encoding',
    'accept-language',
    'user-agent',
    'x-published-auth',
    'cache-control',
    'if-none-match',
    'if-modified-since'
  ];

  for (const header of safeHeaders) {
    if (incomingHeaders[header]) {
      targetHeaders[header] = incomingHeaders[header];
    }
  }

  // Explicitly DO NOT forward Authorization header - the proxy injects its own API key
  // This is a security measure to prevent token leakage

  // Allow custom transformations
  if (options.transformRequest) {
    const headersObj = new Headers();
    for (const [key, value] of Object.entries(targetHeaders)) {
      headersObj.set(key, value);
    }
    await options.transformRequest(req as any, headersObj);
    // Copy back any modifications
    headersObj.forEach((value, key) => {
      targetHeaders[key] = value;
    });
  }

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: targetHeaders,
  };

  // Add body for non-GET/HEAD requests
  if (method !== 'GET' && method !== 'HEAD' && req.body !== undefined) {
    if (typeof req.body === 'string') {
      fetchOptions.body = req.body;
    } else if (req.body instanceof ArrayBuffer) {
      fetchOptions.body = req.body;
    } else if (ArrayBuffer.isView(req.body)) {
      // Convert ArrayBufferView (like Uint8Array) to ArrayBuffer
      const view = req.body as { buffer: ArrayBuffer; byteOffset: number; byteLength: number };
      fetchOptions.body = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    } else {
      fetchOptions.body = JSON.stringify(req.body);
      if (!targetHeaders['content-type']) {
        targetHeaders['content-type'] = 'application/json';
      }
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    const durationMs = Date.now() - startTime;

    // Log and track response
    const responseInfo: ProxyResponseInfo = {
      method,
      path,
      status: response.status,
      durationMs
    };
    logger.info?.('Response received', responseInfo as unknown as Record<string, unknown>);
    metrics.onResponse?.(responseInfo);

    // Build response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      // Skip hop-by-hop headers
      const hopByHop = ['connection', 'keep-alive', 'transfer-encoding', 'te', 'trailer', 'upgrade'];
      if (!hopByHop.includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    });

    // Check if this is a streaming response (SSE)
    const contentType = response.headers.get('content-type') || '';
    const isStreaming = contentType.includes('text/event-stream');

    if (isStreaming && response.body) {
      // Handle SSE streaming - stream chunks as they arrive
      res.writeHead(response.status, responseHeaders);

      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          res.write(value);
          metrics.onStreamChunk?.({ pubId, bytes: value.length });
        }
      } finally {
        reader.releaseLock();
      }
      res.end();
    } else {
      // Non-streaming response - read full body and forward
      const body = await response.arrayBuffer();
      res.writeHead(response.status, responseHeaders);
      if (body.byteLength > 0) {
        res.write(new Uint8Array(body));
      }
      res.end();
    }
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error?.('Proxy error', { error: (error as Error).message, path, durationMs });

    // Forward error to client
    res.writeHead(502, { 'content-type': 'application/json' });
    res.write(JSON.stringify({
      error: 'proxy_error',
      message: 'Failed to connect to GuideAnts API',
      details: (error as Error).message
    }));
    res.end();
  }
}

/**
 * Creates a caching wrapper around guide config requests.
 * Only caches GET /guides/{pubId} requests.
 */
export function createCachedProxyHandler(
  options: GuideantsProxyOptions
): (req: ProxyRequest, res: ProxyResponse) => Promise<void> {
  const cache = options.cache;
  const cacheTtl = 300; // 5 minutes default

  return async (req: ProxyRequest, res: ProxyResponse) => {
    // Only cache GET /guides/{pubId} requests
    if (cache && req.method === 'GET') {
      const { path } = parseUrl(req.url);
      const guideMatch = path.match(/^\/guides\/([^/]+)$/);
      
      if (guideMatch) {
        const pubId = guideMatch[1];
        const cacheKey = `guideants:guide:${pubId}`;
        
        // Try to get from cache
        const cached = await cache.get(cacheKey);
        if (cached) {
          options.logger?.info?.('Cache hit', { pubId });
          res.writeHead(200, { 'content-type': 'application/json' });
          res.write(cached);
          res.end();
          return;
        }

        // Make request and cache the result
        let capturedBody = '';
        const decoder = new TextDecoder();
        const captureRes: ProxyResponse = {
          writeHead: (status, headers) => res.writeHead(status, headers),
          write: (chunk) => {
            if (typeof chunk === 'string') {
              capturedBody += chunk;
            } else {
              capturedBody += decoder.decode(chunk, { stream: true });
            }
            res.write(chunk);
          },
          end: () => {
            if (capturedBody) {
              cache.set(cacheKey, capturedBody, cacheTtl).catch((err) => {
                options.logger?.warn?.('Cache set failed', { error: (err as Error).message });
              });
            }
            res.end();
          }
        };

        return handleProxyRequest(options, req, captureRes);
      }
    }

    // Default: no caching
    return handleProxyRequest(options, req, res);
  };
}

