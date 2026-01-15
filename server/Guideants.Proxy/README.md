# Guideants.Proxy

ASP.NET Core middleware for proxying GuideAnts API calls with secure API key injection.

## Installation

```bash
dotnet add package Guideants.Proxy
```

## Quick Start

```csharp
using Guideants.Proxy;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Add the proxy
app.MapGuideantsProxy("/api/chat", options =>
{
    options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
});

app.Run();
```

## Configuration Options

```csharp
app.MapGuideantsProxy("/api/chat", options =>
{
    // Required: Your GuideAnts API key
    options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
    
    // Optional: Target API URL (defaults to https://api.guideants.ai)
    options.TargetBaseUrl = "https://api.guideants.ai";
    
    // Optional: Distributed cache for guide configuration
    options.Cache = app.Services.GetService<IDistributedCache>();
    options.CacheTtl = TimeSpan.FromMinutes(5);
    
    // Optional: Logger
    options.Logger = app.Services.GetRequiredService<ILogger<Program>>();
    
    // Optional: Request transformation
    options.TransformRequest = async (context, request) =>
    {
        // Add custom headers, modify the request, etc.
        var user = context.User.Identity?.Name;
        if (user != null)
        {
            request.Headers.Add("X-User", user);
        }
    };
    
    // Optional: Metrics callbacks
    options.OnRequest = info => 
    {
        Console.WriteLine($"Request: {info.Method} {info.Path}");
    };
    
    options.OnResponse = info => 
    {
        Console.WriteLine($"Response: {info.StatusCode} in {info.Duration.TotalMilliseconds}ms");
    };
});
```

## With Authentication

```csharp
app.MapGuideantsProxy("/api/chat", options =>
{
    options.ApiKey = builder.Configuration["Guideants:ApiKey"]!;
})
.RequireAuthorization("MyPolicy");
```

## Client Usage

Once the proxy is set up, configure the GuideAnts chat component to use it:

```html
<guideants-chat
  proxy-url="https://your-server.com/api/chat"
  pub-id="your-published-guide-id">
</guideants-chat>
```

Or programmatically:

```javascript
const chat = document.querySelector('guideants-chat');
chat.setProxyUrl('https://your-server.com/api/chat');
chat.setPubId('your-published-guide-id');
```

## How It Works

1. Client requests go to your server at `/api/chat/*`
2. Proxy injects the API key header
3. Requests are forwarded to `https://api.guideants.ai/api/published/*`
4. Responses (including SSE streams) are forwarded back to the client

## Security Notes

- **Never expose your API key in client-side code**
- The proxy strips the `Authorization` header from incoming requests
- Add your own authentication middleware before the proxy
- Use HTTPS in production

## License

Apache 2.0


