# GuideAnts Chat Component

A framework-agnostic web component for embedding AI-powered conversations from published GuideAnts Notebooks into any website or application.

## About GuideAnts

[GuideAnts](https://www.guideants.ai) is an AI-powered notebook platform that enables teams to create and share intelligent assistants. This component allows you to embed conversations from published guides directly into your website.

- **Application**: [go.guideants.ai](https://go.guideants.ai) - Create and manage your guides
- **Website**: [www.guideants.ai](https://www.guideants.ai) - Learn more about GuideAnts

## Installation

```bash
npm install guideants
```

## Quick Start

### Basic Usage (IIFE)

```html
<!DOCTYPE html>
<html>
<head>
  <title>GuideAnts Chat</title>
</head>
<body>
  <!-- Include the component -->
  <script src="node_modules/guideants/dist/guideants-chat.iife.js"></script>
  
  <!-- Use the component (api-base-url is optional, defaults to production) -->
  <guideants-chat
    pub-id="your-published-guide-id">
  </guideants-chat>
  
  <!-- Or specify a custom API URL -->
  <guideants-chat
    api-base-url="https://api.guideants.ai"
    pub-id="your-published-guide-id">
  </guideants-chat>
</body>
</html>
```

### ES Module Usage

```html
<script type="module">
  import 'guideants/dist/guideants-chat.es.js';
  
  // Component is now available (api-base-url defaults to production)
  document.body.innerHTML = `
    <guideants-chat
      pub-id="your-published-guide-id">
    </guideants-chat>
  `;
</script>
```

### React Usage

```jsx
import { useEffect } from 'react';
import 'guideants/dist/guideants-chat.es.js';

function App() {
  useEffect(() => {
    // Component is registered globally
  }, []);

  return (
    <guideants-chat
      pub-id="your-published-guide-id"
    />
  );
}
```

### TypeScript Support

The package includes full TypeScript definitions:

```typescript
import type { GuideantsChatElement } from 'guideants';

const chatElement = document.querySelector('guideants-chat') as GuideantsChatElement;
chatElement.setAuthToken('your-token');
chatElement.addEventListener('wf-complete', (e) => {
  console.log('Conversation complete', e.detail);
});
```

## Prerequisites

Before using this component, you need:

1. **A GuideAnts account** - Sign up at [go.guideants.ai](https://go.guideants.ai)
2. **A published guide** - Create a guide in GuideAnts Notebooks and publish it to get a `pub-id`

The component connects directly to GuideAnts' API to power conversations.

### Creating Guides

GuideAnts Notebooks includes **"The Guide Guide"** - an AI assistant that helps you create guides. Simply start a conversation with The Guide Guide and it will walk you through the process of creating, configuring, and publishing your guide.

For more information about creating guides, visit [go.guideants.ai](https://go.guideants.ai).

## Attributes

### Required Attributes

- **`pub-id`** (string) - The published guide identifier (GUID) from GuideAnts Notebooks
  - Obtained when you publish a guide in the GuideAnts application
  - Example: `"d4a1d138-e283-4cfc-9418-f389375143b9"`

### Optional Attributes

- **`api-base-url`** (string, optional) - Base URL of the GuideAnts API server (no trailing slash)
  - Defaults to `"https://api.guideants.ai"` (production) if not provided
  - Can also be set via `VITE_DEFAULT_API_BASE_URL` environment variable at build time

- **`proxy-url`** (string, optional) - URL of your proxy server (no trailing slash)
  - When set, all API calls are routed through this proxy instead of directly to GuideAnts
  - Use for secure API key management (see [Server-Side Proxy](#server-side-proxy) section)
  - Example: `"https://your-server.com/api/chat"`

- **`auth-token`** (string) - Bearer token for authenticated requests
  - Used for published guides that require authentication via webhook
  - Can be set programmatically via `setAuthToken()` method
  - See the [Authentication](#authentication) section below for details

- **`display-mode`** (`"full"` | `"last-turn"`) - Controls conversation display
  - `"full"` (default) - Shows all conversation turns
  - `"last-turn"` - Shows only the most recent turn

- **`enable-turn-navigation`** (boolean) - Enable turn navigation controls
  - Only effective when `display-mode="last-turn"`
  - Shows previous/next/first/last buttons

- **`collapsible`** (boolean) - Enable collapsible conversation UI
  - When enabled, users can collapse/expand the conversation area
  
- **`command-mode`** (boolean) – Command Mode (stateless)
  - Each message starts a new conversation thread
  - Undo and Reset controls are disabled/hidden
  - Useful for command palette or one‑shot interactions

- **`conversation-starters-enabled`** (boolean) – Show guide-authored suggestions when no messages exist
  - Defaults to off; when enabled, the component will render any starters returned by the published guide
  - You can override the list via `setConversationStarters()` if you prefer custom prompts

- **`attachments-enabled`** (boolean) – Enable clipboard paste events and attachment APIs
  - When enabled, pasting a file into the textarea fires `wf-attachment-paste`
  - Hosts are responsible for uploading files and providing Notebook file IDs before sending

- **`speech-to-text-enabled`** (boolean) – Enable microphone recording for voice input
  - When enabled, a microphone button appears in the input area
  - Audio is recorded and sent to the server for transcription using Azure Speech Service
  - Transcribed text is automatically inserted into the input field
  - Auto-stops after 2 seconds of silence (configurable)
  - Works in browsers that support MediaRecorder API

- **`camera-enabled`** (boolean) – Enable camera capture for still images
  - Requires `attachments-enabled="true"` to be set
  - When enabled, a camera button appears in the input area
  - Opens a modal with live camera preview for capturing photos
  - Supports switching between front/back cameras on mobile devices
  - Captured images are automatically uploaded and added as attachments

- **`input-label`** (string, optional) – Custom label text for the input field
  - Defaults to `"Message"`
  - Set to empty string `""` to hide the label entirely (zero height)
  - Example: `input-label="Your question"`

- **`input-placeholder`** (string, optional) – Custom placeholder text for the input field
  - Defaults to `"Type your message..."`
  - Example: `input-placeholder="Ask me anything..."`

## Programmatic API

The component exposes methods for programmatic control:

```javascript
const chat = document.querySelector('guideants-chat');

// Configure the component programmatically
// api-base-url defaults to https://api.guideants.ai, so you only need to set pub-id
chat.setPubId('your-published-guide-id');

// Optionally override the API URL if needed
// chat.setApiBaseUrl('https://api.guideants.ai');

// Set authentication token (if required by your published guide)
chat.setAuthToken('your-token-here');

// Get current token
const token = chat.getAuthToken();

// Get current pub ID
const pubId = chat.getPubId();

// Register a tool handler for client-side tool execution
chat.registerTool('my-tool', async (call) => {
  // Execute tool logic
  return {
    toolCallId: call.id,
    name: call.function.name,
    content: JSON.stringify({ result: 'success' })
  };
});

// Set stream event callback for advanced monitoring
chat.setStreamEventCallback((event) => {
  console.log('Stream event:', event.type, event.data);
});

// Register a context provider to inject additional context with each message
chat.setContextProvider(() => {
  const now = new Date();
  return `Current time: ${now.toLocaleString()}\nPage URL: ${window.location.href}`;
});
```

### Complete API reference

- Initialization and configuration
  - `setPubId(pubId: string)` / `getPubId(): string | null`
  - `setApiBaseUrl(url: string)` / `getApiBaseUrl(): string | null` (defaults to `https://api.guideants.ai`)
  - `setProxyUrl(url: string | null)` / `getProxyUrl(): string | null` (for server-side proxy)
  - `setAuthToken(token: string | null)` / `getAuthToken(): string | null`
  - `setCommandMode(enabled: boolean)` / `getCommandMode(): boolean`
  - `testAuthentication(): Promise<PublishedGuideConfig>` (validates token and loads config)
  - `getPublishedGuideConfig(): PublishedGuideConfig | null`
  - `getResolvedIds(): { projectId: string | null; notebookId: string | null; guideId: string | null }`
  - `getConversationId(): string | null`
  - `getAuthError(): { code: string; message: string } | null`
  - `clearConversation(): void`

- Streaming and tool calling
  - `registerTool(toolName: string, handler: ToolHandler): void`
  - `submitExternalToolResults(results: Array<{ toolCallId: string; name: string; content: string }>): Promise<void>`
  - `beginResumeStream(): void` (prepare UI to resume after tool calls)
  - `ingestStreamEvent(eventType: string, data: any): void` (feed external SSE events)
  - `setStreamEventCallback(fn?: (event: { type: string; data: unknown }) => void): void`
  - `setContextProvider(provider?: (() => Promise<string | null> | string | null) | null): void` (provide additional context for each message)

- Display and navigation
  - `setDisplayMode(mode: 'full' | 'last-turn')` / `getDisplayMode(): 'full' | 'last-turn'`
  - `setTurnNavigationEnabled(enabled: boolean)` / `getTurnNavigationEnabled(): boolean`
  - `getTurnCount(): number`
  - `getCurrentTurnIndex(): number | null` (last-turn mode)
  - `goToTurn(index: number)`, `goToPreviousTurn()`, `goToNextTurn()`

- Collapsible conversation
  - `setCollapsible(enabled: boolean)` / `getCollapsible(): boolean`
  - `collapse()`, `expand()`, `toggleCollapse()`, `getIsCollapsed(): boolean`

- Conversation starters
  - `setConversationStarters(starters: string[]): void` / `getConversationStarters(): string[]`
  - `setConversationStartersEnabled(enabled: boolean): void` / `getConversationStartersEnabled(): boolean`

- Attachments & clipboard
  - `setAttachmentsEnabled(enabled: boolean): void` / `getAttachmentsEnabled(): boolean`
  - `setConversationStartersEnabled(enabled: boolean): void` / `getConversationStartersEnabled(): boolean`

- Speech-to-text
  - `setSpeechToTextEnabled(enabled: boolean): void` / `getSpeechToTextEnabled(): boolean`
  - `isRecording(): boolean` - Check if currently recording
  - `startRecording(): Promise<void>` - Programmatically start recording
  - `stopRecording(): Promise<string | null>` - Stop and transcribe (returns text or null)
  - `cancelRecording(): void` - Cancel without transcribing

- Camera capture
  - `setCameraEnabled(enabled: boolean): void` / `getCameraEnabled(): boolean`
  - `isCameraOpen(): boolean` - Check if camera modal is open
  - `openCamera(): Promise<void>` - Programmatically open camera
  - `captureImage(): void` - Capture current frame
  - `closeCamera(): void` - Close camera modal

- Input customization
  - `setInputLabel(label: string): void` / `getInputLabel(): string`
  - `setInputPlaceholder(placeholder: string): void` / `getInputPlaceholder(): string`

Events (prefixed with `wf-`): `stream-start`, `token`, `assistant_message`, `message`, `complete`, `usage`, `cancelled`, `error`, `undo-complete`, `undo-error`, `restart`, `auth-error`, `turn-navigation`, `collapsed`, `expanded`, `turns-hidden`, `conversation-starter-selected`.

## Events

The component fires custom events prefixed with `wf-`:

### `wf-stream-start`

Fired when a message is submitted and streaming begins.

```javascript
chat.addEventListener('wf-stream-start', () => {
  console.log('Streaming started');
});
```

### `wf-token`

Fired for each token received during streaming.

```javascript
chat.addEventListener('wf-token', (e) => {
  console.log('Token:', e.detail.contentDelta);
});
```

### `wf-complete`

Fired when streaming completes successfully.

```javascript
chat.addEventListener('wf-complete', (e) => {
  console.log('Conversation complete');
});
```

### `wf-error`

Fired when an error occurs.

```javascript
chat.addEventListener('wf-error', (e) => {
  console.error('Error:', e.detail.message, e.detail.error);
});
```

### `wf-auth-error`

Fired when authentication fails.

```javascript
chat.addEventListener('wf-auth-error', (e) => {
  console.error('Auth error:', e.detail.code, e.detail.message);
});
```

### Other Events

- `wf-assistant_message` - Assistant message update
- `wf-message` - Final persisted message
- `wf-usage` - Token usage metrics
- `wf-cancelled` - Stream cancelled
- `wf-undo-complete` - Undo operation completed
- `wf-undo-error` - Undo operation failed
- `wf-restart` - Conversation restarted
- `wf-turn-navigation` - Turn navigation changed
- `wf-collapsed` - Conversation collapsed
- `wf-expanded` - Conversation expanded
- `wf-turns-hidden` - Turns hidden in last-turn mode

### `wf-attachment-paste`

*(Deprecated)* Previously emitted when files were pasted. The component now handles uploads internally when `attachments-enabled` is true.

### `wf-conversation-starter-selected`

Fired when the user clicks one of the starter buttons shown in the empty state.  
Useful for analytics or to prefill other UI.

```javascript
chat.addEventListener('wf-conversation-starter-selected', (e) => {
  console.log('Starter selected:', e.detail.prompt);
});
```

## Client-Side Tool Calling

The component supports client-side tool execution, allowing your published guides to call functions that run in the browser. This enables interactive features like DOM manipulation, local storage, browser APIs, and integration with your application's functionality.

### How It Works

1. **Server requests a tool call** - When the assistant needs to execute a client-side tool, it sends an `external_tool_call` event
2. **Component pauses streaming** - The component automatically pauses and waits for tool execution
3. **Your handler executes** - Your registered tool handler runs in the browser
4. **Results are submitted** - The component automatically submits results back to the server
5. **Streaming resumes** - The conversation continues automatically after tool execution

### Registering Tool Handlers

Register tool handlers using the `registerTool()` method. The handler receives the tool call and must return a result:

```javascript
const chat = document.querySelector('guideants-chat');

// Register a tool handler
chat.registerTool('SetColor', async (call) => {
  // Parse tool arguments
  const args = typeof call.function.arguments === 'string'
    ? JSON.parse(call.function.arguments || '{}')
    : (call.function.arguments || {});
  
  // Execute the tool (e.g., change page background color)
  const color = args.color || 'white';
  document.body.style.backgroundColor = color;
  
  // Return result
  return {
    toolCallId: call.id,
    name: 'SetColor',
    content: JSON.stringify({ 
      status: 'ok', 
      appliedColor: color 
    })
  };
});
```

### Tool Handler Signature

```typescript
type ToolHandler = (call: {
  id: string;                    // Unique tool call ID
  function: {
    name: string;                // Tool name (matches registration)
    arguments: string | object;  // Tool arguments (may be JSON string or object)
  }
}) => Promise<{
  toolCallId: string;  // Must match call.id
  name: string;        // Tool name
  content: string;     // Result content (JSON string recommended)
} | null>;             // Return null to skip this tool call
```

### Complete Example

```javascript
const chat = document.querySelector('guideants-chat');
chat.setPubId('your-published-guide-id');

// Register multiple tools
chat.registerTool('SetColor', async (call) => {
  const args = typeof call.function.arguments === 'string'
    ? JSON.parse(call.function.arguments || '{}')
    : (call.function.arguments || {});
  
  const color = args.color || 'white';
  document.body.style.backgroundColor = color;
  
  return {
    toolCallId: call.id,
    name: 'SetColor',
    content: JSON.stringify({ status: 'ok', color })
  };
});

chat.registerTool('GetLocalStorage', async (call) => {
  const args = typeof call.function.arguments === 'string'
    ? JSON.parse(call.function.arguments || '{}')
    : (call.function.arguments || {});
  
  const key = args.key;
  const value = localStorage.getItem(key);
  
  return {
    toolCallId: call.id,
    name: 'GetLocalStorage',
    content: JSON.stringify({ key, value })
  };
});

chat.registerTool('ShowNotification', async (call) => {
  const args = typeof call.function.arguments === 'string'
    ? JSON.parse(call.function.arguments || '{}')
    : (call.function.arguments || {});
  
  // Use browser notification API
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(args.title || 'Notification', {
      body: args.message || '',
      icon: args.icon
    });
  }
  
  return {
    toolCallId: call.id,
    name: 'ShowNotification',
    content: JSON.stringify({ status: 'shown' })
  };
});
```

### Error Handling

If a tool handler throws an error or returns an error result, the component will:

1. Log the error to the console
2. Submit an error result to the server
3. Continue the conversation (the assistant can handle the error)

```javascript
chat.registerTool('RiskyOperation', async (call) => {
  try {
    // Perform operation
    const result = await performOperation();
    return {
      toolCallId: call.id,
      name: 'RiskyOperation',
      content: JSON.stringify({ status: 'success', result })
    };
  } catch (error) {
    // Return error result - assistant can handle it
    return {
      toolCallId: call.id,
      name: 'RiskyOperation',
      content: JSON.stringify({ 
        status: 'error', 
        error: error.message 
      })
    };
  }
});
```

### Monitoring Tool Calls

#### Built-in Console Logging

The component automatically logs tool call activity to the browser console for debugging:

```text
[guideants-chat] Tool calls received: [{id: "...", name: "SetColor", arguments: {...}}]
[guideants-chat] Executing tool: SetColor {color: "red"}
[guideants-chat] Tool result for SetColor: {"status":"ok","appliedColor":"red"}
[guideants-chat] Submitting tool results: 1 result(s)
```

This logging is always active and helps diagnose tool call issues during development.

#### Stream Event Callback

For programmatic monitoring, you can use the stream event callback:

```javascript
chat.setStreamEventCallback((event) => {
  if (event.type === 'external_tool_call') {
    const toolCalls = event.data?.toolCalls || [];
    console.log('Tool calls requested:', toolCalls);
    
    // You can inspect tool calls before they're executed
    toolCalls.forEach(call => {
      console.log(`Tool: ${call.function?.name}`, call.function?.arguments);
    });
  }
});
```

### Tool Call Flow

```text
User sends message
    ↓
Assistant processes (streaming tokens)
    ↓
Assistant requests tool call → external_tool_call event
    ↓
Component pauses streaming
    ↓
Your handler executes (async)
    ↓
Component submits results automatically
    ↓
Streaming resumes (assistant continues)
    ↓
Conversation completes
```

### Best Practices

1. **Validate arguments** - Always validate and sanitize tool arguments
2. **Handle errors gracefully** - Return error results instead of throwing
3. **Use JSON for content** - Return structured JSON strings for better parsing
4. **Register tools early** - Register all tools before the first message
5. **Match tool names exactly** - Tool names must match what the server expects
6. **Keep handlers fast** - Long-running operations should show progress to users

### Server-Side Tool Configuration

For client-side tools to work, your published guide must be configured with tools that have `clientHandled: true` in the server configuration. The server will send `external_tool_call` events for these tools instead of executing them server-side.

## Context Providers

The component supports injecting additional context information into each conversation message. This allows you to provide dynamic, page-specific context that the assistant can use when responding. Context providers work alongside server-side context options defined in your guide.

### How It Works

1. **You register a context provider** - A function that returns context information
2. **Component invokes provider** - Before each message is sent, the provider is called
3. **Context is included** - The context is added as a system message to the conversation
4. **Assistant receives context** - The assistant can use this information in its responses

### Registering a Context Provider

Register a context provider using the `setContextProvider()` method. The provider can be synchronous or asynchronous:

```javascript
const chat = document.querySelector('guideants-chat');

// Synchronous provider
chat.setContextProvider(() => {
  const now = new Date();
  return `Current time: ${now.toLocaleString()}\nPage URL: ${window.location.href}`;
});

// Asynchronous provider
chat.setContextProvider(async () => {
  const user = await getCurrentUser();
  const session = await getSessionInfo();
  return `User: ${user.name}\nSession ID: ${session.id}\nRole: ${user.role}`;
});

// Clear the provider (no context will be sent)
chat.setContextProvider(null);
```

### Context Provider Signature

```typescript
type ContextProvider = () => Promise<string | null> | string | null;
```

The provider should return:
- A **string** - Will be included as context (empty strings are ignored)
- **null** or **undefined** - No context will be included for this message
- **Promise<string | null>** - Async providers are supported

### When Context is Invoked

The context provider is invoked **once when a conversation starts**, not on every turn. This design:

- **Preserves token caching** - System messages remain stable across turns, allowing the LLM to cache tokens efficiently
- **Maintains consistency** - Context doesn't change mid-conversation, preventing confusion
- **Improves performance** - Context is computed once per conversation, not on every message

**Context is captured when:**
- **New conversation created** - When `ensureConversation()` creates a new conversation (first message or after `clearConversation()`)
- **Command mode** - Each message in command mode starts a new conversation, so context is captured fresh for each message
- **After conversation cleared** - When `clearConversation()` is called, the next message will capture new context

**Context is NOT captured when:**
- **Subsequent turns** - Once a conversation has context, it's reused for all turns in that conversation
- **Resuming after tools** - When submitting tool results, the existing conversation context is reused

### Context in Multi-Turn Conversations

**Important:** Context is captured **once at conversation start** and reused for all turns in that conversation:

- **Stable context** - The same context is used for all turns in a conversation thread
- **Context is prepended** - On the server, your context is added as a system message at the beginning of the message list
- **Token efficiency** - Stable system messages allow the LLM to cache tokens, reducing costs and improving performance

**Example flow in a 3-turn conversation:**

```
Conversation starts (context captured: "Time: 10:00, Page: /dashboard")

Turn 1:
  [Server context] [Client context: "Time: 10:00, Page: /dashboard"] [Instructions]
  [User: "Hello"]
  [Assistant: "Hi there!"]

Turn 2:
  [Server context] [Client context: "Time: 10:00, Page: /dashboard"] [Instructions] ← Same context
  [User: "Hello"]           ← Previous turn
  [Assistant: "Hi there!"]   ← Previous turn
  [User: "What's the time?"]
  [Assistant: "It's 10:00"]

Turn 3:
  [Server context] [Client context: "Time: 10:00, Page: /dashboard"] [Instructions] ← Same context
  [User: "Hello"]                    ← Turn 1
  [Assistant: "Hi there!"]           ← Turn 1
  [User: "What's the time?"]         ← Turn 2
  [Assistant: "It's 10:00"]          ← Turn 2
  [User: "Thanks"]
  [Assistant: "You're welcome"]
```

**Updating context mid-conversation:** If you need to update facts or state during a conversation, use registered tools with appropriate agent definitions. The context provider is intended for initial conversation setup, not dynamic updates.

### Message Ordering

When context is provided, system messages are added in this order:

1. **Server-side context options** (from guide definition, with resolved placeholders)
2. **Client-provided context** (from your provider callback)
3. **Assistant instructions** (the guide's system prompt)
4. **Conversation history** (previous messages)

This ensures your dynamic context is available alongside the guide's static context.

### Example Use Cases

**Inject local time and timezone:**
```javascript
chat.setContextProvider(() => {
  const now = new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `Local Time: ${now.toLocaleString()}\nTimezone: ${timezone}\nUTC: ${now.toISOString()}`;
});
```

**Inject user session information:**
```javascript
chat.setContextProvider(async () => {
  const session = await getSession();
  return `Session ID: ${session.id}\nUser Role: ${session.role}\nEnvironment: ${session.env}`;
});
```

**Inject page-specific context:**
```javascript
chat.setContextProvider(() => {
  const url = new URL(window.location.href);
  return `Page: ${url.pathname}\nQuery: ${url.search}\nReferrer: ${document.referrer}`;
});
```

**Inject application state:**
```javascript
chat.setContextProvider(() => {
  const state = getAppState();
  return `Current View: ${state.currentView}\nSelected Item: ${state.selectedId}\nMode: ${state.mode}`;
});
```

### Error Handling

If a context provider throws an error or returns an invalid value:
- The error is logged to the console
- The message is sent without client context (server context and instructions still apply)
- The conversation continues normally

```javascript
chat.setContextProvider(async () => {
  try {
    const data = await fetchUserData();
    return `User Data: ${JSON.stringify(data)}`;
  } catch (error) {
    console.error('Failed to load context:', error);
    // Return null to skip context for this message
    return null;
  }
});
```

### Best Practices

1. **Keep context concise** - Long context strings consume tokens. Since context is stable across turns, it's included in the cached token window (depending on the model's support for cached tokens)
2. **Use structured format** - Use key-value pairs or simple formatting for clarity
3. **Handle errors gracefully** - Return `null` on errors rather than throwing
4. **Capture stable information** - Context is captured once per conversation, so include information that should remain constant throughout the conversation (e.g., user role, page context, initial state)
5. **Consider performance** - Async providers should complete quickly, but they only run once per conversation
6. **Command mode considerations** - In command mode, each message starts a new conversation, so context is captured fresh for each message. This is ideal for command-palette style interactions
7. **For dynamic updates** - If you need to update facts or state during a conversation, use registered tools with appropriate agent definitions. Don't rely on context provider for mid-conversation updates
8. **Include timestamps** - If including time-sensitive information, consider including a timestamp so the assistant knows when the context was captured

### Server-Side Context Options

In addition to client-provided context, your published guide can define server-side context options in the guide configuration. These are resolved server-side and can include placeholders like `[@currentDate]` that are automatically replaced. Client-provided context is added after server context, allowing you to supplement or override guide-defined context with dynamic, page-specific information.

## Conversation Starters

- Published guides can define starter prompts. They are now returned by `/api/published/guides/{pubId}` and exposed to the component.
- Opt in with `conversation-starters-enabled="true"` or `setConversationStartersEnabled(true)`.
- Override at runtime with `setConversationStarters([...])` if you want a custom list.
- When enabled, the component shows a friendly empty-state with buttons. Selecting one fills the textarea and emits `wf-conversation-starter-selected`.

```html
<guideants-chat
  pub-id="..."
  conversation-starters-enabled="true">
</guideants-chat>
```

```javascript
chat.setConversationStarters([
  'Summarize this guide for a beginner.',
  'Outline the first three actions I should take.',
]);

chat.addEventListener('wf-conversation-starter-selected', (e) => {
  analytics.track('starter_selected', e.detail);
});
```

## Attachments & Clipboard

- Attachments are fully supported and handled internally by the component.
- Turn on paste detection with `attachments-enabled="true"` or `setAttachmentsEnabled(true)`.
- When enabled, users can paste images, audio, or text files directly into the input area.
- The component automatically uploads files to the GuideAnts API and attaches them to the message.
- Visual feedback (upload progress, preview chips) is built-in.

```html
<guideants-chat
  pub-id="..."
  attachments-enabled="true">
</guideants-chat>
```

## Speech-to-Text

Enable voice input with server-side transcription powered by Azure Speech Service.

### Basic Usage

```html
<guideants-chat
  pub-id="..."
  speech-to-text-enabled="true">
</guideants-chat>
```

### How It Works

1. **Click the microphone button** - Listening starts, button shows stop icon and duration
2. **Speak your message** - Audio is captured via MediaRecorder API
3. **Stop listening** - Click stop or wait for auto-stop after 2 seconds of silence
4. **Automatic transcription** - Audio is sent to server, transcribed text is inserted into input

### Programmatic Control

```javascript
const chat = document.querySelector('guideants-chat');

// Enable/disable
chat.setSpeechToTextEnabled(true);

// Check state
if (chat.isRecording()) {
  console.log('Currently recording...');
}

// Programmatic recording
await chat.startRecording();
// ... user speaks ...
const text = await chat.stopRecording();
console.log('Transcribed:', text);

// Cancel without transcribing
chat.cancelRecording();
```

### Features

- **Auto-stop on silence** - Recording automatically stops after 2 seconds of silence (after speech is detected)
- **Visual feedback** - Pulsing red indicator during recording, spinner during transcription
- **Error handling** - Graceful handling of permission denied, no microphone, transcription failures
- **Browser support** - Works in Chrome, Edge, Firefox, Safari (any browser with MediaRecorder API)

### Requirements

- HTTPS (required for microphone access in most browsers)
- User must grant microphone permission when prompted

## Camera Capture

Enable still image capture from device cameras. Captured images are uploaded and added as message attachments.

### Basic Usage

```html
<guideants-chat
  pub-id="..."
  attachments-enabled="true"
  camera-enabled="true">
</guideants-chat>
```

> **Note:** `camera-enabled` requires `attachments-enabled="true"` to function.

### How It Works

1. **Click the camera button** - Camera modal opens with live preview
2. **Position your shot** - Use camera switch button on mobile to toggle front/back camera
3. **Capture** - Click the capture button to take a photo
4. **Review** - Preview the captured image, retake if needed
5. **Confirm** - Image is uploaded and added as an attachment to your message

### Programmatic Control

```javascript
const chat = document.querySelector('guideants-chat');

// Enable/disable
chat.setCameraEnabled(true);
chat.setAttachmentsEnabled(true); // Required

// Check state
if (chat.isCameraOpen()) {
  console.log('Camera modal is open');
}

// Programmatic control
await chat.openCamera();
chat.captureImage();
chat.closeCamera();
```

### Features

- **Camera switching** - Toggle between front and back cameras on devices with multiple cameras
- **Live preview** - Real-time video feed before capturing
- **Review mode** - Preview captured image with retake option before uploading
- **Automatic upload** - Captured images are automatically uploaded to GuideAnts
- **Mobile-friendly** - Optimized for both desktop and mobile devices

### Requirements

- HTTPS (required for camera access in all browsers)
- User must grant camera permission when prompted
- `attachments-enabled="true"` must be set

## Full-Featured Configuration

Enable all input modalities for maximum user flexibility:

```html
<guideants-chat
  pub-id="your-published-guide-id"
  attachments-enabled="true"
  speech-to-text-enabled="true"
  camera-enabled="true"
  conversation-starters-enabled="true">
</guideants-chat>
```

This configuration enables:
- Text input (always available)
- File attachments via paste/drag-drop
- Voice input via microphone
- Photo capture via camera
- Conversation starter suggestions

## Styling & Theming

The component uses Shadow DOM for style encapsulation. You can style the host element and customize the appearance using CSS custom properties.

### Basic Styling

```css
guideants-chat {
  display: block;
  width: 100%;
  max-width: 800px;
  height: 600px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
```

### Theming with CSS Custom Properties

The component supports extensive theming via CSS custom properties. Below are example themes you can implement in your app (the component does not include built‑in themes):

#### Default Theme (Blue)

```css
guideants-chat {
  --wf-primary-color: #3b82f6;
  --wf-primary-hover: #2563eb;
  --wf-danger-color: #dc2626;
  --wf-danger-hover: #b91c1c;
  --wf-border-color: #e5e7eb;
  --wf-bg-user: #dbeafe;
  --wf-bg-assistant: #f3f4f6;
  --wf-bg-control-bar: #f3f4f6;
  --wf-bg-container: #ffffff;
  --wf-text-primary: #111827;
  --wf-text-secondary: #6b7280;
  --wf-border-radius: 0.375rem;
  --wf-border-radius-lg: 0.5rem;
}
```

#### Dark Mode Theme

```css
guideants-chat.theme-dark {
  --wf-primary-color: #60a5fa;
  --wf-primary-hover: #3b82f6;
  --wf-danger-color: #f87171;
  --wf-danger-hover: #ef4444;
  --wf-border-color: #374151;
  --wf-bg-user: #1e3a5f;
  --wf-bg-assistant: #374151;
  --wf-bg-control-bar: #1f2937;
  --wf-bg-container: #111827;
  --wf-text-primary: #f3f4f6;
  --wf-text-secondary: #9ca3af;
  --wf-text-error: #f87171;
  --wf-border-radius: 0.375rem;
  --wf-border-radius-lg: 0.5rem;
}
```

#### Playful Theme (Pink/Purple)

```css
guideants-chat.theme-playful {
  --wf-primary-color: #ec4899;
  --wf-primary-hover: #db2777;
  --wf-danger-color: #f97316;
  --wf-danger-hover: #ea580c;
  --wf-border-color: #fce7f3;
  --wf-bg-user: #fce7f3;
  --wf-bg-assistant: #faf5ff;
  --wf-bg-control-bar: #fdf4ff;
  --wf-bg-container: #ffffff;
  --wf-text-primary: #831843;
  --wf-text-secondary: #9333ea;
  --wf-border-radius: 16px;
  --wf-border-radius-lg: 20px;
  --wf-font-family: 'Comic Sans MS', 'Chalkboard SE', 'Comic Neue', cursive;
}
```

#### Available CSS Custom Properties

- **Colors**: `--wf-primary-color`, `--wf-primary-hover`, `--wf-danger-color`, `--wf-danger-hover`
- **Borders**: `--wf-border-color`, `--wf-border-radius`, `--wf-border-radius-lg`
- **Backgrounds**: `--wf-bg-user`, `--wf-bg-assistant`, `--wf-bg-control-bar`, `--wf-bg-container`
- **Text**: `--wf-text-primary`, `--wf-text-secondary`, `--wf-text-error`
- **Typography**: `--wf-font-family`

#### Applying Themes

Apply themes using your own CSS classes (the component does not register these classes itself):

```html
<!-- Default theme -->
<guideants-chat class="theme-default" pub-id="..."></guideants-chat>

<!-- Dark mode -->
<guideants-chat class="theme-dark" pub-id="..."></guideants-chat>

<!-- Playful theme -->
<guideants-chat class="theme-playful" pub-id="..."></guideants-chat>
```

Or switch themes dynamically:

```javascript
const chat = document.querySelector('guideants-chat');
chat.classList.remove('theme-default');
chat.classList.add('theme-dark');
```

For advanced styling with CSS parts, see the [Styling Guide](./STYLING.md) for details.

### Responsive Control Bar

The control bar (containing Restart, Undo, Send, and turn navigation buttons) uses **CSS container queries** to adapt to its container width rather than the viewport width. This ensures proper responsive behavior when the component is embedded in containers of any size.

| Container Width | Button Size | Description |
|-----------------|-------------|-------------|
| < 300px | 22px height | Tiny - minimal padding, 10px font |
| ≥ 300px | 26px height | Small - compact layout, 11px font |
| ≥ 400px | 30px height | Medium - comfortable spacing, 12px font |
| ≥ 540px | 38px height | Full - standard size, 14px font |

This container-responsive approach means the component works correctly whether embedded in a narrow sidebar (300px) or a full-width layout (1200px+), regardless of the browser viewport size.

## Features

- ✅ **Framework-agnostic** - Works with React, Angular, Vue, or vanilla JavaScript
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Streaming responses** - Real-time token streaming via Server-Sent Events
- ✅ **Markdown rendering** - Rich markdown support with syntax highlighting
- ✅ **Mermaid diagrams** - Automatic rendering of Mermaid diagrams
- ✅ **Media support** - Images, videos, and audio playback
- ✅ **Tool integration** - Support for client-side tool execution
- ✅ **Authentication** - Support for authenticated published guides
- ✅ **Container-responsive design** - Control bar adapts to container width using CSS container queries
- ✅ **Accessible** - Built with accessibility in mind
- ✅ **Conversation starters** - Optional empty-state suggestions driven by published guides
- ✅ **Clipboard attachments** - Opt-in paste detection so hosts can collect files before sending
- ✅ **Context providers** - Inject dynamic, page-specific context into conversations
- ✅ **Speech-to-text** - Voice input with server-side transcription and auto-stop on silence
- ✅ **Camera capture** - Still image capture from device camera with live preview

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Any browser that supports Custom Elements v1

## Programmatic Configuration Example

```javascript
const chat = document.querySelector('guideants-chat');

// Configure via API (api-base-url defaults to production)
chat.setPubId('your-published-guide-id');

// Optionally override API URL if needed
// chat.setApiBaseUrl('https://api.guideants.ai');

// Optional: Set auth token if your guide requires authentication
const token = await authService.getToken();
chat.setAuthToken(token);

// Optional: Enable Command Mode (each message is a new thread)
chat.setCommandMode(true);

// Optional: Register a context provider to inject dynamic context
chat.setContextProvider(() => {
  const now = new Date();
  return `Current time: ${now.toLocaleString()}\nPage: ${window.location.pathname}`;
});

// Test authentication and get guide config
try {
  const config = await chat.testAuthentication();
  console.log('Guide config:', config);
} catch (err) {
  console.error('Auth failed:', err);
}
```

## Authentication

Published guides support two authentication modes:

### Anonymous Access (Default)

By default, published guides allow anonymous access. No authentication token is required:

```html
<guideants-chat pub-id="your-published-guide-id"></guideants-chat>
```

### Webhook Authentication

For secure published guides, you can configure webhook-based authentication. When a published guide has an `AuthValidationWebhookUrl` configured, the component will:

1. Require an `auth-token` attribute or call to `setAuthToken()`
2. Send the token to your webhook for validation on each request
3. Handle authentication errors and token refresh

#### Setting Up Webhook Authentication

**1. Configure your published guide** with a webhook URL in GuideAnts Notebooks.

**2. Implement your webhook endpoint** that validates tokens:

```javascript
// Example webhook endpoint (Express.js)
app.post('/api/validate-chat-token', async (req, res) => {
  const { token, publishedGuideId, projectId, notebookId } = req.body;
  
  // Validate token using your authentication system
  const user = await myAuthSystem.validateToken(token);
  
  if (!user) {
    return res.status(401).json({
      valid: false,
      error: 'Invalid token'
    });
  }
  
  // Return success with user identity
  res.json({
    valid: true,
    userIdentity: user.email // or user.id, user.username, etc.
  });
});
```

**3. Pass the token to the component:**

```html
<guideants-chat
  pub-id="your-published-guide-id"
  auth-token="user-token-here">
</guideants-chat>
```

Or programmatically:

```javascript
const chat = document.querySelector('guideants-chat');
chat.setAuthToken('user-token-here');
```

**4. Handle authentication errors:**

```javascript
chat.addEventListener('wf-auth-error', async (e) => {
  const { code, message, requiresAuth } = e.detail;
  
  if (code === 'invalid_token') {
    // Token expired or invalid - refresh it
    const newToken = await refreshToken();
    chat.setAuthToken(newToken);
  } else if (code === 'authentication_required') {
    // User needs to log in
    redirectToLogin();
  }
});
```

#### Webhook Contract

Your webhook endpoint should:

- Accept `POST` requests
- Receive JSON body: `{ token, publishedGuideId, projectId, notebookId }`
- Return `200 OK` with `{ valid: true, userIdentity: "..." }` for valid tokens
- Return `401` or `403` with `{ valid: false, error: "..." }` for invalid tokens
- Respond within the configured timeout (default: 5 seconds)

The component automatically handles token validation, error responses, and retries.

## Component Architecture

This component connects directly to GuideAnts' API (`https://api.guideants.ai`) to:

- Create and manage conversations
- Stream assistant responses in real-time (Server-Sent Events)
- Handle authentication for protected guides via webhook validation
- Support undo operations and conversation management
- Execute client-side tools when registered

All conversations are powered by your published guides in GuideAnts Notebooks. The component handles all API communication automatically - you just need to provide the `pub-id` of your published guide.

### Media handling

- Assistant messages can include media and links. The component:
  - Rewrites relative and authenticated file URLs to published, anonymous URLs when possible
  - Downloads authenticated media via blob URLs when needed and respects filename headers
  - Provides optional fullscreen images (enable via `enableImageFullscreen` in the markdown viewer)

## Server-Side Proxy

For secure API key management, you can route requests through your own server using the proxy middleware included in this package. This keeps your API key secure on the server side instead of exposing it in client-side code.

### Why Use a Proxy?

API keys in client-side code are inherently insecure:
- Visible in page source / dev tools
- Exposed in network traffic
- Can be extracted and abused

A server-side proxy holds the API key securely and forwards requests to GuideAnts.

### Architecture

```
┌────────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Browser           │     │  Your Server         │     │  GuideAnts API      │
│                    │     │                      │     │                     │
│  <guideants-chat   │────▶│  Proxy Middleware    │────▶│  api.guideants.ai   │
│    proxy-url="..." │ HTTP│  - Injects API key   │ HTTP│                     │
│    pub-id="...">   │ SSE │  - Forwards requests │ SSE │                     │
└────────────────────┘     └──────────────────────┘     └─────────────────────┘
```

### Client Configuration

Use the `proxy-url` attribute instead of (or in addition to) `api-base-url`:

```html
<guideants-chat
  proxy-url="https://your-server.com/api/chat"
  pub-id="your-published-guide-id">
</guideants-chat>
```

Or configure programmatically:

```javascript
const chat = document.querySelector('guideants-chat');
chat.setProxyUrl('https://your-server.com/api/chat');
chat.setPubId('your-published-guide-id');
```

### Node.js / Express Proxy

The package includes Express middleware for Node.js servers:

```typescript
import express from 'express';
import { createExpressProxy } from 'guideants/proxy/express';

const app = express();

// Your own auth middleware first
app.use('/api/chat', myAuthMiddleware);

// Then the GuideAnts proxy
app.use('/api/chat', createExpressProxy({
  apiKey: process.env.GUIDEANTS_API_KEY!,
  
  // Optional: Custom target URL (defaults to https://api.guideants.ai)
  targetBaseUrl: 'https://api.guideants.ai',
  
  // Optional: Logging
  logger: {
    info: (msg, meta) => console.log(`[GuideAnts] ${msg}`, meta),
    error: (msg, meta) => console.error(`[GuideAnts] ${msg}`, meta),
  },
  
  // Optional: Metrics
  metrics: {
    onRequest: ({ method, path, pubId }) => {
      myMetrics.increment('guideants.request', { method, pubId });
    },
    onResponse: ({ status, durationMs }) => {
      myMetrics.histogram('guideants.response_time', durationMs);
    }
  }
}));

app.listen(3000);
```

### .NET Core Proxy

For ASP.NET Core applications, use the `Guideants.Proxy` NuGet package:

```bash
dotnet add package Guideants.Proxy
```

```csharp
using Guideants.Proxy;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

// Map the proxy (can be combined with RequireAuthorization)
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
            // Inject user context
        }
    };
})
.RequireAuthorization("MyPolicy");

app.Run();
```

### Proxy Options

| Option | Type | Description |
|--------|------|-------------|
| `apiKey` | string | **Required.** Your GuideAnts API key |
| `targetBaseUrl` | string | Target API URL (default: `https://api.guideants.ai`) |
| `cache` | object | Optional cache for guide configuration |
| `logger` | object | Optional logging hooks |
| `metrics` | object | Optional metrics hooks |
| `transformRequest` | function | Optional request transformation |

### Security Notes

1. **Never expose API keys in client-side code** - Use the proxy to keep them secure
2. **The proxy strips Authorization headers** - It injects its own API key header
3. **Add your own authentication** - The proxy is non-opinionated about auth
4. **Use HTTPS in production** - Protect data in transit

## Changelog

### 0.6.7 (IN PROGRESS - NOT WORKING)
- **Added**: `input-label` attribute to customize the input field label (defaults to "Message"); set to empty string to hide label entirely
- **Added**: `input-placeholder` attribute to customize the input field placeholder (defaults to "Type your message...")
- **Added**: `setInputLabel()` / `getInputLabel()` programmatic API methods
- **Added**: `setInputPlaceholder()` / `getInputPlaceholder()` programmatic API methods

**KNOWN ISSUE**: The `input-label` attribute does not work. When set to empty string `input-label=""`, the label still shows "Message". The `input-placeholder` attribute works correctly.

**Files modified**:
- `src/chat/GuideantsChatState.ts:54-56` - Added `inputLabel` and `inputPlaceholder` state properties
- `src/chat/Template.ts:7` - Added `id="wf-input-label"` to the label element
- `src/chat/GuideantsChatView.ts:57,145-146,671-689` - Added `inputLabelEl` property, binding, and `updateInputUI()` method
- `src/chat/GuideantsChatController.ts:88-98,140-147,696-712` - Attribute handling, setters/getters, sync in connectedCallback
- `src/GuideantsChat.ts:42-43,299-314` - observedAttributes and public API
- `src/types/index.d.ts:143-153,604-628` - TypeScript definitions

**Debugging findings**:
1. `el.state.inputLabel = 'TEST'` works - direct state assignment OK
2. `el.setInputLabel('')` does NOT work - state ends up as "Message"
3. `el.shadowRoot.querySelector('#wf-input-label')` finds element - DOM is correct
4. `el.getAttribute('input-label')` returns `''` - attribute IS set correctly
5. `input-placeholder` works with identical code pattern

**Attempted fixes that did not resolve the issue**:
1. Changed `newValue || 'Message'` to `newValue !== null ? newValue : 'Message'`
2. Removed `setAttribute` call from setters to prevent attributeChangedCallback re-triggering
3. Added explicit `getAttribute()` sync in `connectedCallback`
4. Made `updateInputUI()` re-query DOM if references are null

**Suspected root cause**: Unknown. Either `attributeChangedCallback` receives `null` for empty strings, or some other code path resets the state to "Message".

### 0.6.6
- **Fixed**: Attribute synchronization timing - attributes set before `connectedCallback` (e.g., `speech-to-text-enabled`, `camera-enabled`, `command-mode`) now properly initialize their UI state when the DOM is ready

### 0.6.5
- Initial public release with full feature set

## License

MIT

## Support

- **Application**: [go.guideants.ai](https://go.guideants.ai) - Create and manage your guides
- **Website**: [www.guideants.ai](https://www.guideants.ai) - Learn more about GuideAnts

## Author

dougware
