using Guideants.Proxy;

var builder = WebApplication.CreateBuilder(args);

// Add logging
builder.Logging.AddConsole();

// Add CORS services
builder.Services.AddCors();

var app = builder.Build();

// Serve static files from wwwroot
app.UseStaticFiles();

// Request logging middleware
app.Use(async (context, next) =>
{
    var start = DateTime.UtcNow;
    await next();
    var duration = DateTime.UtcNow - start;
    Console.WriteLine($"{context.Request.Method} {context.Request.Path} - {context.Response.StatusCode} ({duration.TotalMilliseconds:F0}ms)");
});

// CORS for local development
app.UseCors(policy => policy
    .AllowAnyOrigin()
    .AllowAnyMethod()
    .AllowAnyHeader());

// Get API key from configuration
var apiKey = builder.Configuration["Guideants:ApiKey"];
if (string.IsNullOrEmpty(apiKey))
{
    Console.WriteLine("Error: Guideants:ApiKey configuration is required");
    Console.WriteLine("Set it via:");
    Console.WriteLine("  - appsettings.Development.json: { \"Guideants\": { \"ApiKey\": \"your-key\" } }");
    Console.WriteLine("  - Environment variable: Guideants__ApiKey=your-key");
    Console.WriteLine("  - User secrets: dotnet user-secrets set \"Guideants:ApiKey\" \"your-key\"");
    Environment.Exit(1);
}

// Map the GuideAnts proxy
app.MapGuideantsProxy("/api/guideants", options =>
{
    options.ApiKey = apiKey;
    options.TargetBaseUrl = builder.Configuration["Guideants:TargetUrl"] ?? "https://api.guideants.ai";
    options.Logger = app.Services.GetRequiredService<ILogger<Program>>();
    
    options.OnRequest = info =>
    {
        Console.WriteLine($"[Proxy] Request: {info.Method} {info.Path}{(info.PubId != null ? $" (pubId: {info.PubId})" : "")}");
    };
    
    options.OnResponse = info =>
    {
        Console.WriteLine($"[Proxy] Response: {info.StatusCode} in {info.Duration.TotalMilliseconds:F0}ms");
    };
});

// Health check endpoint
app.MapGet("/health", () => new { status = "ok", timestamp = DateTime.UtcNow });

// Config endpoint for the frontend
app.MapGet("/api/config", () => new { 
    pubId = builder.Configuration["Guideants:PubId"],
    proxyUrl = "/api/guideants"
});

// Fallback to serve index.html for SPA routing
app.MapFallbackToFile("index.html");

var urls = app.Urls.Count > 0 ? string.Join(", ", app.Urls) : "http://localhost:5000";
Console.WriteLine($"""

    🚀 GuideAnts .NET Core Proxy Harness running at {urls}

       Static files: {urls}/
       Proxy endpoint: {urls}/api/guideants
       Health check: {urls}/health

       Target API: {builder.Configuration["Guideants:TargetUrl"] ?? "https://api.guideants.ai"}

    """);

app.Run();

