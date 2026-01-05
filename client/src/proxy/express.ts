import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { GuideantsProxyOptions } from './types';
import { handleProxyRequest, createCachedProxyHandler } from './core';

/**
 * Collects the request body from an Express request.
 * Handles both pre-parsed bodies (via body-parser) and raw streams.
 */
async function collectBody(req: Request): Promise<unknown> {
  // If body is already parsed (e.g., via express.json() or body-parser)
  if (req.body !== undefined && Object.keys(req.body).length > 0) {
    return req.body;
  }

  // Read raw body from stream
  return new Promise<string>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', (chunk: Uint8Array) => chunks.push(chunk));
    req.on('end', () => {
      const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      resolve(new TextDecoder().decode(combined));
    });
    req.on('error', reject);
  });
}

/**
 * Creates an Express-compatible middleware for proxying GuideAnts API calls.
 * 
 * @example
 * ```typescript
 * import express from 'express';
 * import { createExpressProxy } from 'guideants/proxy/express';
 * 
 * const app = express();
 * 
 * // Your own auth middleware first
 * app.use('/api/chat', myAuthMiddleware);
 * 
 * // Then the GuideAnts proxy
 * app.use('/api/chat', createExpressProxy({
 *   apiKey: process.env.GUIDEANTS_API_KEY!,
 *   logger: {
 *     info: (msg, meta) => console.log(`[GuideAnts] ${msg}`, meta),
 *     error: (msg, meta) => console.error(`[GuideAnts] ${msg}`, meta),
 *   }
 * }));
 * ```
 */
export function createExpressProxy(options: GuideantsProxyOptions): RequestHandler {
  if (!options.apiKey) {
    throw new Error('GuideAnts proxy requires an apiKey');
  }

  const handler = options.cache
    ? createCachedProxyHandler(options)
    : (req: Parameters<typeof handleProxyRequest>[1], res: Parameters<typeof handleProxyRequest>[2]) =>
        handleProxyRequest(options, req, res);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Collect body
      const body = await collectBody(req);

      // Build the request URL (Express stores the path after the mount point in req.path)
      // We need to preserve the full path relative to where the middleware is mounted
      const url = req.originalUrl.replace(/^[^?]*/, req.path);

      // Create proxy request object
      const proxyReq = {
        method: req.method,
        url: req.path + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''),
        headers: req.headers as Record<string, string | string[] | undefined>,
        body
      };

      // Create proxy response object
      const proxyRes = {
        writeHead: (status: number, headers: Record<string, string>) => {
          res.status(status);
          for (const [key, value] of Object.entries(headers)) {
            res.setHeader(key, value);
          }
        },
        write: (chunk: Uint8Array | string) => {
          res.write(chunk);
        },
        end: () => {
          res.end();
        }
      };

      await handler(proxyReq, proxyRes);
    } catch (error) {
      options.logger?.error?.('Express proxy error', { error: (error as Error).message });
      next(error);
    }
  };
}

// Re-export types and core functions for convenience
export * from './types';
export { handleProxyRequest, createCachedProxyHandler } from './core';

