using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;

namespace Guideants.Proxy;

/// <summary>
/// Extension methods for adding GuideAnts proxy endpoints.
/// </summary>
public static class GuideantsProxyExtensions
{
    /// <summary>
    /// Maps GuideAnts proxy endpoints at the specified path pattern.
    /// All requests to paths starting with the pattern will be forwarded to the GuideAnts API
    /// with the configured API key injected.
    /// </summary>
    /// <param name="endpoints">The endpoint route builder.</param>
    /// <param name="pattern">The URL pattern where the proxy will be mounted (e.g., "/api/chat").</param>
    /// <param name="configure">Action to configure proxy options.</param>
    /// <returns>A route group builder for further configuration.</returns>
    /// <example>
    /// <code>
    /// app.MapGuideantsProxy("/api/chat", options =>
    /// {
    ///     options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
    ///     options.Cache = app.Services.GetService&lt;IDistributedCache&gt;();
    ///     options.Logger = app.Services.GetRequiredService&lt;ILogger&lt;Program&gt;&gt;();
    /// });
    /// </code>
    /// </example>
    public static RouteGroupBuilder MapGuideantsProxy(
        this IEndpointRouteBuilder endpoints,
        string pattern,
        Action<GuideantsProxyOptions> configure)
    {
        var options = new GuideantsProxyOptions();
        configure(options);

        if (string.IsNullOrEmpty(options.ApiKey))
        {
            throw new InvalidOperationException("GuideAnts proxy requires an ApiKey to be configured");
        }

        // Normalize the pattern
        var normalizedPattern = pattern.TrimEnd('/');

        // Create a route group
        var group = endpoints.MapGroup(normalizedPattern);

        // Map a catch-all route that handles all methods
        group.Map("{**path}", async context =>
        {
            var middleware = new GuideantsProxyMiddleware(
                _ => Task.CompletedTask,
                options,
                normalizedPattern);
            
            // Reconstruct the path with the base pattern
            var originalPath = context.Request.Path.Value ?? "";
            await middleware.InvokeAsync(context);
        });

        return group;
    }

    /// <summary>
    /// Adds GuideAnts proxy middleware to the application pipeline.
    /// Use this for more control over when the proxy runs in the middleware pipeline.
    /// </summary>
    /// <param name="app">The application builder.</param>
    /// <param name="pathPrefix">The URL path prefix for the proxy (e.g., "/api/chat").</param>
    /// <param name="configure">Action to configure proxy options.</param>
    /// <returns>The application builder for chaining.</returns>
    /// <example>
    /// <code>
    /// app.UseGuideantsProxy("/api/chat", options =>
    /// {
    ///     options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
    /// });
    /// </code>
    /// </example>
    public static IApplicationBuilder UseGuideantsProxy(
        this IApplicationBuilder app,
        string pathPrefix,
        Action<GuideantsProxyOptions> configure)
    {
        var options = new GuideantsProxyOptions();
        configure(options);

        if (string.IsNullOrEmpty(options.ApiKey))
        {
            throw new InvalidOperationException("GuideAnts proxy requires an ApiKey to be configured");
        }

        var normalizedPrefix = pathPrefix.TrimEnd('/');

        return app.Use(async (context, next) =>
        {
            var path = context.Request.Path.Value ?? "";
            if (path.StartsWith(normalizedPrefix, StringComparison.OrdinalIgnoreCase))
            {
                var middleware = new GuideantsProxyMiddleware(
                    _ => Task.CompletedTask,
                    options,
                    normalizedPrefix);
                await middleware.InvokeAsync(context);
            }
            else
            {
                await next();
            }
        });
    }
}


