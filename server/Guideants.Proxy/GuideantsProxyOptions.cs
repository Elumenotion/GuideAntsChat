using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Guideants.Proxy;

/// <summary>
/// Options for configuring the GuideAnts proxy middleware.
/// </summary>
public class GuideantsProxyOptions
{
    /// <summary>
    /// The API key to inject into requests.
    /// Required.
    /// </summary>
    public string ApiKey { get; set; } = null!;

    /// <summary>
    /// Target GuideAnts API URL. Defaults to https://api.guideants.ai
    /// </summary>
    public string TargetBaseUrl { get; set; } = "https://api.guideants.ai";

    /// <summary>
    /// Optional distributed cache for guide configuration.
    /// If provided, GET /guides/{pubId} responses are cached.
    /// </summary>
    public IDistributedCache? Cache { get; set; }

    /// <summary>
    /// Cache TTL for guide configuration. Defaults to 5 minutes.
    /// </summary>
    public TimeSpan CacheTtl { get; set; } = TimeSpan.FromMinutes(5);

    /// <summary>
    /// Optional logger for proxy operations.
    /// </summary>
    public ILogger? Logger { get; set; }

    /// <summary>
    /// Optional: Transform request before forwarding.
    /// Use to inject additional headers, modify the request, etc.
    /// </summary>
    public Func<HttpContext, HttpRequestMessage, Task>? TransformRequest { get; set; }

    /// <summary>
    /// Optional: Called on each incoming request for metrics/logging.
    /// </summary>
    public Action<ProxyRequestInfo>? OnRequest { get; set; }

    /// <summary>
    /// Optional: Called on each response for metrics/logging.
    /// </summary>
    public Action<ProxyResponseInfo>? OnResponse { get; set; }

    /// <summary>
    /// Optional: Called on each SSE chunk for metrics.
    /// </summary>
    public Action<ProxyStreamChunkInfo>? OnStreamChunk { get; set; }

    /// <summary>
    /// HTTP client timeout. Defaults to 5 minutes to handle long-running SSE streams.
    /// </summary>
    public TimeSpan HttpClientTimeout { get; set; } = TimeSpan.FromMinutes(5);
}

/// <summary>
/// Information about an incoming proxy request.
/// </summary>
public record ProxyRequestInfo(string Method, string Path, string? PubId);

/// <summary>
/// Information about a proxy response.
/// </summary>
public record ProxyResponseInfo(string Method, string Path, int StatusCode, TimeSpan Duration);

/// <summary>
/// Information about an SSE stream chunk.
/// </summary>
public record ProxyStreamChunkInfo(string? PubId, int Bytes);

