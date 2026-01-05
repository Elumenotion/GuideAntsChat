using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace Guideants.Proxy;

/// <summary>
/// Middleware that proxies requests to the GuideAnts API with API key injection.
/// </summary>
public class GuideantsProxyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly GuideantsProxyOptions _options;
    private readonly HttpClient _httpClient;
    private readonly string _basePath;

    private static readonly HashSet<string> SafeRequestHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Content-Type",
        "Accept",
        "Accept-Encoding",
        "Accept-Language",
        "User-Agent",
        "X-Published-Auth",
        "Cache-Control",
        "If-None-Match",
        "If-Modified-Since"
    };

    private static readonly HashSet<string> HopByHopHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Connection",
        "Keep-Alive",
        "Transfer-Encoding",
        "TE",
        "Trailer",
        "Upgrade"
    };

    public GuideantsProxyMiddleware(
        RequestDelegate next,
        GuideantsProxyOptions options,
        string basePath)
    {
        _next = next;
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _basePath = basePath.TrimEnd('/');

        if (string.IsNullOrEmpty(_options.ApiKey))
        {
            throw new ArgumentException("ApiKey is required", nameof(options));
        }

        _httpClient = new HttpClient
        {
            BaseAddress = new Uri(_options.TargetBaseUrl.TrimEnd('/') + "/"),
            Timeout = _options.HttpClientTimeout
        };
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value ?? "";
        
        // Only handle requests that start with our base path
        if (!path.StartsWith(_basePath, StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Extract the path relative to the mount point
        var relativePath = path.Substring(_basePath.Length);
        if (!relativePath.StartsWith("/"))
        {
            relativePath = "/" + relativePath;
        }

        var stopwatch = Stopwatch.StartNew();
        var pubId = ExtractPubId(context.Request.QueryString.Value);

        // Log and track request
        var requestInfo = new ProxyRequestInfo(context.Request.Method, relativePath, pubId);
        _options.Logger?.LogInformation("Proxying request: {Method} {Path}", requestInfo.Method, requestInfo.Path);
        _options.OnRequest?.Invoke(requestInfo);

        // Check cache for guide config requests
        if (_options.Cache != null && context.Request.Method == "GET")
        {
            var guideMatch = System.Text.RegularExpressions.Regex.Match(relativePath, @"^/guides/([^/]+)$");
            if (guideMatch.Success)
            {
                var guidePubId = guideMatch.Groups[1].Value;
                var cacheKey = $"guideants:guide:{guidePubId}";
                var cached = await _options.Cache.GetStringAsync(cacheKey);
                if (cached != null)
                {
                    _options.Logger?.LogInformation("Cache hit for guide: {PubId}", guidePubId);
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(cached);
                    return;
                }
            }
        }

        // Build target URL
        var targetPath = $"api/published{relativePath}";
        var queryString = context.Request.QueryString.Value ?? "";
        var targetUrl = $"{targetPath}{queryString}";

        _options.Logger?.LogInformation("Forwarding to: {TargetUrl}", targetUrl);

        try
        {
            // Create the proxy request
            var requestMessage = new HttpRequestMessage(
                new HttpMethod(context.Request.Method),
                targetUrl);

            // Add API key header
            requestMessage.Headers.Add("x-guideants-apikey", _options.ApiKey);

            // Copy safe headers from the original request
            foreach (var header in context.Request.Headers)
            {
                if (SafeRequestHeaders.Contains(header.Key))
                {
                    if (!requestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray()))
                    {
                        requestMessage.Content?.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                    }
                }
            }

            // Copy request body for non-GET/HEAD requests
            if (context.Request.Method != "GET" && context.Request.Method != "HEAD")
            {
                context.Request.EnableBuffering();
                var bodyStream = new MemoryStream();
                await context.Request.Body.CopyToAsync(bodyStream);
                bodyStream.Position = 0;
                context.Request.Body.Position = 0;

                requestMessage.Content = new StreamContent(bodyStream);
                if (context.Request.ContentType != null)
                {
                    requestMessage.Content.Headers.ContentType = MediaTypeHeaderValue.Parse(context.Request.ContentType);
                }
            }

            // Allow custom transformations
            if (_options.TransformRequest != null)
            {
                await _options.TransformRequest(context, requestMessage);
            }

            // Send the request
            var response = await _httpClient.SendAsync(
                requestMessage,
                HttpCompletionOption.ResponseHeadersRead,
                context.RequestAborted);

            stopwatch.Stop();

            // Log and track response
            var responseInfo = new ProxyResponseInfo(
                context.Request.Method,
                relativePath,
                (int)response.StatusCode,
                stopwatch.Elapsed);
            _options.Logger?.LogInformation("Response: {StatusCode} in {Duration}ms", 
                responseInfo.StatusCode, responseInfo.Duration.TotalMilliseconds);
            _options.OnResponse?.Invoke(responseInfo);

            // Set response status code
            context.Response.StatusCode = (int)response.StatusCode;

            // Copy response headers (excluding hop-by-hop)
            foreach (var header in response.Headers.Concat(response.Content.Headers))
            {
                if (!HopByHopHeaders.Contains(header.Key))
                {
                    context.Response.Headers[header.Key] = header.Value.ToArray();
                }
            }

            // Check if this is an SSE stream
            var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
            var isStreaming = contentType.Contains("text/event-stream");

            if (isStreaming)
            {
                // Handle SSE streaming - forward chunks immediately
                context.Response.ContentType = "text/event-stream";
                context.Response.Headers["Cache-Control"] = "no-cache";
                context.Response.Headers["Connection"] = "keep-alive";

                await using var responseStream = await response.Content.ReadAsStreamAsync(context.RequestAborted);
                var buffer = new byte[8192];
                int bytesRead;

                while ((bytesRead = await responseStream.ReadAsync(buffer, context.RequestAborted)) > 0)
                {
                    await context.Response.Body.WriteAsync(buffer.AsMemory(0, bytesRead), context.RequestAborted);
                    await context.Response.Body.FlushAsync(context.RequestAborted);
                    _options.OnStreamChunk?.Invoke(new ProxyStreamChunkInfo(pubId, bytesRead));
                }
            }
            else
            {
                // Non-streaming response - copy full body
                var responseBody = await response.Content.ReadAsByteArrayAsync(context.RequestAborted);
                
                // Cache guide config responses
                if (_options.Cache != null && 
                    context.Request.Method == "GET" && 
                    response.IsSuccessStatusCode)
                {
                    var guideMatch = System.Text.RegularExpressions.Regex.Match(relativePath, @"^/guides/([^/]+)$");
                    if (guideMatch.Success)
                    {
                        var guidePubId = guideMatch.Groups[1].Value;
                        var cacheKey = $"guideants:guide:{guidePubId}";
                        await _options.Cache.SetStringAsync(
                            cacheKey,
                            Encoding.UTF8.GetString(responseBody),
                            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _options.CacheTtl });
                    }
                }

                if (responseBody.Length > 0)
                {
                    await context.Response.Body.WriteAsync(responseBody, context.RequestAborted);
                }
            }
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // Client disconnected - this is expected behavior
            _options.Logger?.LogDebug("Client disconnected");
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _options.Logger?.LogError(ex, "Proxy error for {Path} after {Duration}ms", relativePath, stopwatch.ElapsedMilliseconds);

            context.Response.StatusCode = 502;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync($$"""
                {
                    "error": "proxy_error",
                    "message": "Failed to connect to GuideAnts API",
                    "details": "{{ex.Message.Replace("\"", "\\\"")}}"
                }
                """);
        }
    }

    private static string? ExtractPubId(string? queryString)
    {
        if (string.IsNullOrEmpty(queryString))
            return null;

        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(queryString);
        return query.TryGetValue("pubId", out var values) ? values.FirstOrDefault() : null;
    }
}


