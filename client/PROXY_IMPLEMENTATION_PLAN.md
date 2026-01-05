# GuideAnts Proxy Implementation Plan

## Overview

This document outlines the plan to extend the `guideants` npm package and create a companion .NET NuGet package to support server-side API proxies for secure API key usage.

## Problem Statement

API keys in client-side code are inherently insecure:
- Visible in page source / dev tools
- Exposed in network traffic
- Can be extracted and abused

Implementors who want to use API key authentication need a server-side proxy that holds the API key securely and forwards requests to GuideAnts.

## Solution Architecture

```
┌────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Browser           │     │  Implementor Server  │     │  GuideAnts API      │
│                    │     │                      │     │                     │
│  <guideants-chat   │────▶│  Proxy Middleware    │────▶│  api.guideants.ai   │
│    proxy-url="..." │ HTTP│  - Injects API key   │ HTTP│                     │
│    pub-id="...">   │ SSE │  - Forwards requests │ SSE │                     │
└────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

## Design Principles

1. **pubId always from client** - The proxy is pubId-agnostic; it forwards whatever the client sends
2. **Embeddable component** - Implementors integrate into their API with their own auth/guards
3. **Non-opinionated** - No built-in rate limiting, auth, etc. - just forwarding with API key injection
4. **Observable** - Hooks for logging, metrics, caching
5. **Forward errors as-is** - Don't wrap or modify GuideAnts error responses

---

## Project Structure

```
src/
├── minimal/
│   ├── client/                              # npm package "guideants"
│   │   ├── src/
│   │   │   ├── GuideantsChat.ts            # Browser component (existing)
│   │   │   ├── GuideantsApi.ts             # Browser API calls (existing)
│   │   │   ├── chat/                       # Existing
│   │   │   └── proxy/                      # NEW: Node.js proxy (server-side)
│   │   │       ├── index.ts                # Main exports
│   │   │       ├── express.ts              # Express middleware
│   │   │       ├── core.ts                 # Low-level proxy logic
│   │   │       └── types.ts                # TypeScript types
│   │   ├── dist/
│   │   │   ├── guideants-chat.es.js        # Existing browser builds
│   │   │   ├── guideants-chat.iife.js
│   │   │   └── proxy/                      # NEW: Compiled proxy code
│   │   │       ├── index.js
│   │   │       ├── index.d.ts
│   │   │       └── express.js
│   │   ├── package.json                    # Updated with proxy exports
│   │   ├── vite.config.ts                  # Updated for proxy build
│   │   └── README.md                       # Updated with proxy docs
│   │
│   ├── server/                              # NEW: .NET packages
│   │   └── Guideants.Proxy/                # NEW: NuGet package
│   │       ├── Guideants.Proxy.csproj
│   │       ├── GuideantsProxyExtensions.cs # MapGuideantsProxy extension
│   │       ├── GuideantsProxyOptions.cs    # Options class
│   │       ├── GuideantsProxyMiddleware.cs # Core proxy logic
│   │       └── README.md                   # NuGet package README
│   │
│   └── harnesses/
│       ├── vanilla/                         # Existing
│       ├── react/                           # Existing
│       ├── angular/                         # Existing
│       ├── esm/                             # Existing
│       ├── node-proxy/                      # NEW: Node.js harness
│       │   ├── package.json
│       │   ├── server.ts
│       │   ├── tsconfig.json
│       │   ├── .env.example
│       │   └── public/
│       │       └── index.html
│       └── dotnet-proxy/                    # NEW: .NET Core harness
│           ├── GuideantsProxyHarness.csproj
│           ├── Program.cs
│           ├── appsettings.json
│           ├── appsettings.Development.json.example
│           └── wwwroot/
│               └── index.html
```

---

## Component Summary

| Component | Location | Package |
|-----------|----------|---------|
| Node.js proxy middleware | `minimal/client/src/proxy/` | npm: `guideants` (same package, new export) |
| .NET Core proxy middleware | `minimal/server/Guideants.Proxy/` | NuGet: `Guideants.Proxy` |
| Node.js test harness | `minimal/harnesses/node-proxy/` | (not published) |
| .NET Core test harness | `minimal/harnesses/dotnet-proxy/` | (not published) |

---

## Client Component Changes

### New Attribute: `proxy-url`

```typescript
// GuideantsChat.ts
static get observedAttributes() {
  return [
    'api-base-url',
    'proxy-url',        // NEW: When set, routes all calls through proxy
    'auth-token',
    'pub-id',
    // ... existing
  ];
}
```

### Behavior

- If `proxy-url` is set → all API calls go to `proxy-url`
- If only `api-base-url` is set → direct calls (current behavior)
- Default: `https://api.guideants.ai` (current behavior)

### URL Mapping

When using proxy:
```
proxy-url = "https://my-server.com/api/chat-proxy"

Client calls:
  POST {proxy-url}/projects/{projectId}/notebooks/{notebookId}/conversations?pubId=...
  POST {proxy-url}/projects/{projectId}/notebooks/{notebookId}/conversations/{id}/messages?pubId=...
  GET  {proxy-url}/guides/{pubId}
  etc.
```

The proxy receives these and forwards to:
```
  POST https://api.guideants.ai/api/published/projects/{projectId}/...
  (with x-guideants-apikey header injected)
```

---

## Node.js Proxy Component

### TypeScript API

```typescript
// guideants/proxy/types.ts

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
    onRequest?: (info: { method: string; path: string; pubId?: string }) => void;
    onResponse?: (info: { method: string; path: string; status: number; durationMs: number }) => void;
    onStreamChunk?: (info: { pubId?: string; bytes: number }) => void;
  };
  
  /**
   * Optional: Transform request before forwarding.
   * Use to inject clientContext from your session, modify headers, etc.
   */
  transformRequest?: (req: IncomingMessage, targetHeaders: Headers) => Promise<void> | void;
}

/**
 * Creates an Express-compatible middleware for proxying GuideAnts API calls.
 */
export function createExpressProxy(options: GuideantsProxyOptions): RequestHandler;

/**
 * Low-level proxy function for custom server implementations.
 * Handles a single request/response pair.
 */
export async function handleProxyRequest(
  options: GuideantsProxyOptions,
  req: { method: string; url: string; headers: Record<string, string>; body?: any },
  res: { 
    writeHead: (status: number, headers: Record<string, string>) => void;
    write: (chunk: Buffer | string) => void;
    end: () => void;
  }
): Promise<void>;
```

### Express Middleware Usage

```typescript
import express from 'express';
import { createExpressProxy } from 'guideants/proxy/express';

const app = express();

// Your own auth middleware first
app.use('/api/chat', myAuthMiddleware);

// Then the GuideAnts proxy
app.use('/api/chat', createExpressProxy({
  apiKey: process.env.GUIDEANTS_API_KEY!,
  
  logger: {
    info: (msg, meta) => console.log(`[GuideAnts] ${msg}`, meta),
    error: (msg, meta) => console.error(`[GuideAnts] ${msg}`, meta),
  },
  
  metrics: {
    onRequest: ({ method, path, pubId }) => {
      myMetrics.increment('guideants.request', { method, pubId });
    },
    onResponse: ({ status, durationMs }) => {
      myMetrics.histogram('guideants.response_time', durationMs);
    }
  },
  
  // Inject user context from your session
  transformRequest: async (req, headers) => {
    const user = req.session?.user;
    if (user) {
      req.clientContextInjection = `Authenticated user: ${user.email}`;
    }
  }
}));
```

### npm package.json Exports

```json
{
  "name": "guideants",
  "exports": {
    ".": {
      "import": "./dist/guideants-chat.es.js",
      "require": "./dist/guideants-chat.iife.js"
    },
    "./proxy": {
      "import": "./dist/proxy/index.js",
      "require": "./dist/proxy/index.js",
      "types": "./dist/proxy/index.d.ts"
    },
    "./proxy/express": {
      "import": "./dist/proxy/express.js",
      "require": "./dist/proxy/express.js",
      "types": "./dist/proxy/express.d.ts"
    }
  }
}
```

---

## .NET Core Proxy Component

### C# API

```csharp
// GuideantsProxyExtensions.cs

public static class GuideantsProxyExtensions
{
    /// <summary>
    /// Maps GuideAnts proxy endpoints at the specified path pattern.
    /// </summary>
    public static IEndpointRouteBuilder MapGuideantsProxy(
        this IEndpointRouteBuilder endpoints,
        string pattern,
        Action<GuideantsProxyOptions> configure);
}

// GuideantsProxyOptions.cs

public class GuideantsProxyOptions
{
    /// <summary>
    /// The API key to inject into requests.
    /// </summary>
    public string ApiKey { get; set; } = null!;
    
    /// <summary>
    /// Target GuideAnts API URL. Defaults to https://api.guideants.ai
    /// </summary>
    public string TargetBaseUrl { get; set; } = "https://api.guideants.ai";
    
    /// <summary>
    /// Optional distributed cache for guide configuration.
    /// </summary>
    public IDistributedCache? Cache { get; set; }
    
    /// <summary>
    /// Cache TTL for guide configuration. Defaults to 5 minutes.
    /// </summary>
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(5);
    
    /// <summary>
    /// Optional logger.
    /// </summary>
    public ILogger? Logger { get; set; }
    
    /// <summary>
    /// Optional: Transform request before forwarding.
    /// </summary>
    public Func<HttpContext, HttpRequestMessage, Task>? TransformRequest { get; set; }
    
    /// <summary>
    /// Optional: Called on each request for metrics.
    /// </summary>
    public Action<ProxyRequestInfo>? OnRequest { get; set; }
    
    /// <summary>
    /// Optional: Called on each response for metrics.
    /// </summary>
    public Action<ProxyResponseInfo>? OnResponse { get; set; }
}

public record ProxyRequestInfo(string Method, string Path, string? PubId);
public record ProxyResponseInfo(string Method, string Path, int StatusCode, TimeSpan Duration);
```

### Usage

```csharp
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Your own auth middleware
app.UseAuthentication();
app.UseAuthorization();

// Map the proxy (requires auth via your policy)
app.MapGuideantsProxy("/api/chat", options =>
{
    options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
    options.Cache = app.Services.GetService<IDistributedCache>();
    options.Logger = app.Services.GetRequiredService<ILogger<Program>>();
    
    options.TransformRequest = async (context, request) =>
    {
        var user = context.User.Identity?.Name;
        if (user != null)
        {
            // Inject user context into request
        }
    };
    
    options.OnRequest = info => 
    {
        MyMetrics.IncrementCounter("guideants_requests", info.Method);
    };
})
.RequireAuthorization("MyPolicy");
```

---

## Test Harnesses

### Node.js Harness (`minimal/harnesses/node-proxy/`)

**server.ts:**
```typescript
import express from 'express';
import { createExpressProxy } from 'guideants/proxy/express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static test page
app.use(express.static('public'));

// Simple logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// GuideAnts proxy
app.use('/api/guideants', createExpressProxy({
  apiKey: process.env.GUIDEANTS_API_KEY!,
  logger: {
    info: (msg, meta) => console.log(`[Proxy] ${msg}`, meta),
    error: (msg, meta) => console.error(`[Proxy] ${msg}`, meta),
  }
}));

app.listen(PORT, () => {
  console.log(`Node proxy harness running at http://localhost:${PORT}`);
});
```

**public/index.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>GuideAnts Proxy Test (Node.js)</title>
  <script src="/node_modules/guideants/dist/guideants-chat.iife.js"></script>
</head>
<body>
  <h1>Node.js Proxy Harness</h1>
  
  <guideants-chat
    proxy-url="http://localhost:3001/api/guideants"
    pub-id="YOUR_PUB_ID_HERE">
  </guideants-chat>
</body>
</html>
```

### .NET Core Harness (`minimal/harnesses/dotnet-proxy/`)

**Program.cs:**
```csharp
using Guideants.Proxy;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.UseStaticFiles();

// Log all requests
app.Use(async (context, next) =>
{
    Console.WriteLine($"{context.Request.Method} {context.Request.Path}");
    await next();
});

// GuideAnts proxy
app.MapGuideantsProxy("/api/guideants", options =>
{
    options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
    options.Logger = app.Services.GetRequiredService<ILogger<Program>>();
});

// Serve test page
app.MapFallbackToFile("index.html");

app.Run();
```

**wwwroot/index.html:**
```html
<!DOCTYPE html>
<html>
<head>
  <title>GuideAnts Proxy Test (.NET Core)</title>
  <script src="https://unpkg.com/guideants/dist/guideants-chat.iife.js"></script>
</head>
<body>
  <h1>.NET Core Proxy Harness</h1>
  
  <guideants-chat
    proxy-url="/api/guideants"
    pub-id="YOUR_PUB_ID_HERE">
  </guideants-chat>
</body>
</html>
```

---

## SSE Streaming Considerations

Both proxies must handle Server-Sent Events properly:
- **No buffering** - stream chunks immediately
- **Proper headers** - `Content-Type: text/event-stream`, `Cache-Control: no-cache`
- **Connection keep-alive** - don't timeout mid-stream
- **Clean shutdown** - handle client disconnect gracefully

---

## Implementation Order

| Phase | Task |
|-------|------|
| 1 | Update client: add `proxy-url` attribute and routing logic in `GuideantsApi.ts` |
| 2 | Create Node.js proxy middleware (`minimal/client/src/proxy/`) |
| 3 | Update build config to compile proxy separately |
| 4 | Create Node.js harness to test (`minimal/harnesses/node-proxy/`) |
| 5 | Create .NET Core proxy NuGet package (`minimal/server/Guideants.Proxy/`) |
| 6 | Create .NET Core harness to test (`minimal/harnesses/dotnet-proxy/`) |
| 7 | Update README documentation |

---

## Security Notes

1. **Strip Authorization header** - Don't forward `Authorization` headers from client to GuideAnts (the proxy injects its own API key)
2. **API key storage** - Implementors should use environment variables or secrets managers, never hardcode
3. **HTTPS only** - Proxies should be deployed behind HTTPS in production

---

## Future Considerations

- Support for other Node.js frameworks (Fastify, Koa, Hono)
- WebSocket support if GuideAnts adds it
- Request/response transformation hooks for advanced use cases




