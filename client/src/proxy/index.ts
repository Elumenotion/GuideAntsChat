/**
 * GuideAnts Proxy Module
 * 
 * Provides server-side proxy middleware for secure API key usage.
 * 
 * @example Express usage:
 * ```typescript
 * import express from 'express';
 * import { createExpressProxy } from 'guideants/proxy/express';
 * 
 * const app = express();
 * 
 * app.use('/api/chat', createExpressProxy({
 *   apiKey: process.env.GUIDEANTS_API_KEY!,
 * }));
 * ```
 * 
 * @example Low-level usage:
 * ```typescript
 * import { handleProxyRequest } from 'guideants/proxy';
 * 
 * // In your custom server handler
 * await handleProxyRequest(options, req, res);
 * ```
 */

// Re-export everything from core
export {
  handleProxyRequest,
  createCachedProxyHandler
} from './core';

// Re-export all types
export type {
  GuideantsProxyOptions,
  ProxyRequest,
  ProxyResponse,
  ProxyRequestInfo,
  ProxyResponseInfo,
  ProxyHandler
} from './types';

// Re-export Express middleware
export { createExpressProxy } from './express';



