/**
 * Type definitions for guideants
 * A framework-agnostic web component for published guides chat UI
 */

// API types (from guideants-api.ts)
export type ConversationRole = 'User' | 'Assistant' | 'System' | 'Tool';

export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  created: string;
  isEdited?: boolean;
}

export interface ConversationIdResponse {
  id?: string;
  conversationId?: string;
}

export interface PublishedGuideConfig {
  id: string;
  projectId: string;
  notebookId: string;
  guideId: string;
  guideName: string;
  maxUserMessageLength?: number;
  maxTurns?: number;
  requiresAuth: boolean;
  conversationStarters?: string[];
  avatarUrl?: string;
}

export interface AuthError {
  error: 'authentication_required' | 'invalid_token' | 'auth_service_unavailable' | 'auth_service_error';
  message: string;
  requiresAuth: boolean;
}

export class AuthenticationError extends Error {
  constructor(
    public readonly errorCode: AuthError['error'],
    public readonly errorMessage: string,
    public readonly requiresAuth: boolean
  ) {
    super(errorMessage);
    this.name = 'AuthenticationError';
  }
}

// Display mode type
export type DisplayMode = 'full' | 'last-turn';

// Attachment types
export interface PublishedAttachment {
  notebookFileId: string;
  uploadType: 'ImageFile' | 'AudioFile' | 'TextFile' | 'SandboxFile';
}

// Provider types
export type ContextProvider = () => Promise<string | null> | string | null;
export type AttachmentProvider = () => PublishedAttachment[] | Promise<PublishedAttachment[]>;

// Component attribute types
export interface GuideantsChatAttributes {
  /**
   * Base URL of the API server (no trailing slash).
   * Defaults to https://api.guideants.ai if not provided.
   */
  'api-base-url'?: string;

  /**
   * URL of your proxy server (no trailing slash).
   * When set, all API calls are routed through this proxy instead of directly to GuideAnts.
   * Use for secure API key management on the server side.
   */
  'proxy-url'?: string;

  /**
   * Bearer token to include in Authorization header for authenticated requests.
   * For published guides with webhook auth, this is forwarded via X-Published-Auth header.
   */
  'auth-token'?: string;

  /**
   * Published Guide identifier (GUID).
   * Required for published/unauthenticated flows.
   */
  'pub-id'?: string;

  /**
   * Display mode for conversation messages.
   * - 'full': Show all conversation turns (default)
   * - 'last-turn': Show only the last turn (or specific turn via navigation)
   */
  'display-mode'?: 'full' | 'last-turn';

  /**
   * Enable turn navigation controls (prev/next/first/last buttons).
   * Only effective when display-mode is 'last-turn'.
   */
  'enable-turn-navigation'?: boolean | string;

  /**
   * Enable collapsible conversation UI.
   * When enabled, the conversation can be collapsed/expanded via a toggle button.
   */
  'collapsible'?: boolean | string;

  /**
   * Enable command mode (stateless).
   * Each message starts a new conversation thread; undo/reset controls are hidden.
   */
  'command-mode'?: boolean | string;

  /**
   * Enable conversation starters display.
   * When enabled, shows guide-authored suggestions when no messages exist.
   */
  'conversation-starters-enabled'?: boolean | string;

  /**
   * Enable attachments and clipboard paste detection.
   * When enabled, pasting files into the input area triggers upload flow.
   */
  'attachments-enabled'?: boolean | string;

  /**
   * Enable speech-to-text via microphone recording.
   * Audio is sent to the server for transcription using Azure Speech Service.
   * Works in all browsers that support MediaRecorder API.
   */
  'speech-to-text-enabled'?: boolean | string;

  /**
   * Enable camera capture for still images.
   * Requires attachments-enabled to be true.
   * Captured images are uploaded and added as attachments.
   */
  'camera-enabled'?: boolean | string;

  /**
   * Custom label text for the input field.
   * Defaults to "Message".
   */
  'input-label'?: string;

  /**
   * Custom placeholder text for the input field.
   * Defaults to "Type your message...".
   */
  'input-placeholder'?: string;
}

// Event detail types
export interface StreamStartEventDetail {
  // No additional data
}

export interface TokenEventDetail {
  contentDelta: string;
}

export interface AssistantMessageEventDetail {
  content: string;
}

export interface MessageEventDetail {
  role: 'assistant';
  content: string;
  timestamp: string;
}

export interface CompleteEventDetail {
  // No additional data
}

export interface UsageEventDetail {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface CancelledEventDetail {
  // No additional data
}

export interface ErrorEventDetail {
  message?: string;
  error?: any;
}

export interface UndoCompleteEventDetail {
  // No additional data
}

export interface UndoErrorEventDetail {
  message?: string;
  error?: any;
}

export interface RestartEventDetail {
  // No additional data
}

export interface AuthErrorEventDetail {
  code: 'authentication_required' | 'invalid_token' | 'auth_service_unavailable' | 'auth_service_error';
  message: string;
  requiresAuth: boolean;
}

export interface TurnNavigationEventDetail {
  turnIndex: number;
  totalTurns: number;
}

export interface CollapsedEventDetail {
  // No additional data
}

export interface ExpandedEventDetail {
  // No additional data
}

export interface TurnsHiddenEventDetail {
  totalTurns: number;
  displayedTurnIndex: number;
  hiddenTurns: number;
}

export interface ConversationStarterSelectedEventDetail {
  prompt: string;
  index: number;
}

export interface AttachmentPasteEventDetail {
  files: File[];
}

// Custom event types
export interface GuideantsChatEventMap {
  'wf-stream-start': CustomEvent<StreamStartEventDetail>;
  'wf-token': CustomEvent<TokenEventDetail>;
  'wf-assistant_message': CustomEvent<AssistantMessageEventDetail>;
  'wf-message': CustomEvent<MessageEventDetail>;
  'wf-complete': CustomEvent<CompleteEventDetail>;
  'wf-usage': CustomEvent<UsageEventDetail>;
  'wf-cancelled': CustomEvent<CancelledEventDetail>;
  'wf-error': CustomEvent<ErrorEventDetail>;
  'wf-undo-complete': CustomEvent<UndoCompleteEventDetail>;
  'wf-undo-error': CustomEvent<UndoErrorEventDetail>;
  'wf-restart': CustomEvent<RestartEventDetail>;
  'wf-auth-error': CustomEvent<AuthErrorEventDetail>;
  'wf-turn-navigation': CustomEvent<TurnNavigationEventDetail>;
  'wf-collapsed': CustomEvent<CollapsedEventDetail>;
  'wf-expanded': CustomEvent<ExpandedEventDetail>;
  'wf-turns-hidden': CustomEvent<TurnsHiddenEventDetail>;
  'wf-conversation-starter-selected': CustomEvent<ConversationStarterSelectedEventDetail>;
  'wf-attachment-paste': CustomEvent<AttachmentPasteEventDetail>;
}

// Tool registration types
export interface ToolCall {
  id: string;
  function: {
    name: string;
    arguments: string | object;
  };
}

export interface ToolResult {
  toolCallId: string;
  name: string;
  content: string;
}

export type ToolHandler = (call: ToolCall) => Promise<ToolResult | null>;

export type StreamEventCallback = (event: { type: string; data: unknown }) => void;

// Custom element interface
export interface GuideantsChatElement extends HTMLElement {
  // ========================================================================
  // Public API Methods
  // ========================================================================

  // --- Authentication & Configuration ---

  /**
   * Set the authentication token programmatically.
   * @param token - The bearer token (without "Bearer " prefix), or null to clear
   */
  setAuthToken(token: string | null): void;

  /**
   * Get the current authentication token.
   * @returns The current token or null if not set
   */
  getAuthToken(): string | null;

  /**
   * Set the published guide ID programmatically.
   * @param pubId - The published guide GUID
   */
  setPubId(pubId: string): void;

  /**
   * Get the current published guide ID.
   * @returns The current pubId or null if not set
   */
  getPubId(): string | null;

  /**
   * Set the API base URL programmatically.
   * @param url - The API base URL (no trailing slash)
   */
  setApiBaseUrl(url: string): void;

  /**
   * Get the current API base URL.
   * @returns The current API base URL or null if not set
   */
  getApiBaseUrl(): string | null;

  /**
   * Set the proxy URL programmatically.
   * When set, all API calls are routed through this proxy.
   * @param url - The proxy URL (no trailing slash), or null to clear
   */
  setProxyUrl(url: string | null): void;

  /**
   * Get the current proxy URL.
   * @returns The current proxy URL or null if not set
   */
  getProxyUrl(): string | null;

  /**
   * Get the published guide configuration (after authentication).
   * @returns The guide config or null if not yet loaded
   */
  getPublishedGuideConfig(): PublishedGuideConfig | null;

  /**
   * Get the resolved IDs from the published guide.
   * @returns Object containing projectId, notebookId, and guideId
   */
  getResolvedIds(): { projectId: string | null; notebookId: string | null; guideId: string | null };

  /**
   * Get the current conversation ID.
   * @returns The conversation ID or null if no conversation exists
   */
  getConversationId(): string | null;

  /**
   * Get the current authentication error (if any).
   * @returns The auth error object or null if no error
   */
  getAuthError(): { code: string; message: string } | null;

  /**
   * Test authentication and load the published guide configuration.
   * @returns Promise resolving to the guide config
   * @throws AuthenticationError if authentication fails
   */
  testAuthentication(): Promise<PublishedGuideConfig>;

  /**
   * Clear the current conversation and reset state.
   */
  clearConversation(): void;

  // --- Display Mode & Turn Navigation ---

  /**
   * Set the display mode for conversation messages.
   * @param mode - 'full' shows all turns, 'last-turn' shows only current turn
   */
  setDisplayMode(mode: DisplayMode): void;

  /**
   * Get the current display mode.
   * @returns The current display mode
   */
  getDisplayMode(): DisplayMode;

  /**
   * Enable or disable turn navigation controls.
   * Only effective when display-mode is 'last-turn'.
   * @param enabled - Whether to show navigation controls
   */
  setTurnNavigationEnabled(enabled: boolean): void;

  /**
   * Get whether turn navigation is enabled.
   * @returns True if turn navigation is enabled
   */
  getTurnNavigationEnabled(): boolean;

  /**
   * Get the total number of conversation turns.
   * @returns The number of user messages (turns)
   */
  getTurnCount(): number;

  /**
   * Get the current turn index (1-based) in last-turn mode.
   * @returns The current turn index or null if not in last-turn mode
   */
  getCurrentTurnIndex(): number | null;

  /**
   * Navigate to a specific turn (1-based index).
   * @param turnIndex - The turn number to navigate to
   */
  goToTurn(turnIndex: number): void;

  /**
   * Navigate to the next turn.
   */
  goToNextTurn(): void;

  /**
   * Navigate to the previous turn.
   */
  goToPreviousTurn(): void;

  // --- Collapsible UI ---

  /**
   * Enable or disable collapsible conversation UI.
   * @param enabled - Whether the conversation can be collapsed
   */
  setCollapsible(enabled: boolean): void;

  /**
   * Get whether collapsible mode is enabled.
   * @returns True if collapsible mode is enabled
   */
  getCollapsible(): boolean;

  /**
   * Collapse the conversation UI.
   */
  collapse(): void;

  /**
   * Expand the conversation UI.
   */
  expand(): void;

  /**
   * Toggle the collapsed/expanded state.
   */
  toggleCollapse(): void;

  /**
   * Get whether the conversation is currently collapsed.
   * @returns True if collapsed
   */
  getIsCollapsed(): boolean;

  // --- Command Mode ---

  /**
   * Enable or disable command mode (stateless).
   * In command mode, each message starts a new conversation thread.
   * @param enabled - Whether to enable command mode
   */
  setCommandMode(enabled: boolean): void;

  /**
   * Get whether command mode is enabled.
   * @returns True if command mode is enabled
   */
  getCommandMode(): boolean;

  // --- Conversation Starters ---

  /**
   * Set custom conversation starters (overrides guide defaults).
   * @param starters - Array of starter prompt strings
   */
  setConversationStarters(starters: string[]): void;

  /**
   * Get the current conversation starters.
   * @returns Array of starter prompt strings
   */
  getConversationStarters(): string[];

  /**
   * Enable or disable conversation starters display.
   * @param enabled - Whether to show starters in empty state
   */
  setConversationStartersEnabled(enabled: boolean): void;

  /**
   * Get whether conversation starters are enabled.
   * @returns True if starters are enabled
   */
  getConversationStartersEnabled(): boolean;

  // --- Attachments ---

  /**
   * Enable or disable attachments and clipboard paste detection.
   * @param enabled - Whether to enable attachment support
   */
  setAttachmentsEnabled(enabled: boolean): void;

  /**
   * Get whether attachments are enabled.
   * @returns True if attachments are enabled
   */
  getAttachmentsEnabled(): boolean;

  /**
   * Set an attachment provider for custom attachment handling.
   * @param provider - Function that returns attachments, or undefined to clear
   */
  setAttachmentProvider(provider: AttachmentProvider | undefined): void;

  /**
   * Send a message with attachments.
   * @param content - The message text
   * @param attachments - Array of attachment objects
   */
  sendMessageWithAttachments(content: string, attachments: PublishedAttachment[]): Promise<void>;

  // --- Speech-to-Text ---

  /**
   * Enable or disable speech-to-text via microphone recording.
   * @param enabled - Whether to enable speech-to-text
   */
  setSpeechToTextEnabled(enabled: boolean): void;

  /**
   * Get whether speech-to-text is enabled.
   * @returns True if speech-to-text is enabled
   */
  getSpeechToTextEnabled(): boolean;

  /**
   * Check if currently recording audio.
   * @returns True if recording is in progress
   */
  isRecording(): boolean;

  /**
   * Start audio recording for speech-to-text.
   * Requires speech-to-text to be enabled.
   * @throws Error if speech-to-text is not enabled
   */
  startRecording(): Promise<void>;

  /**
   * Stop audio recording and transcribe.
   * The transcribed text will be appended to the input.
   */
  stopRecording(): Promise<void>;

  /**
   * Cancel recording without transcribing.
   */
  cancelRecording(): void;

  // --- Camera Capture ---

  /**
   * Enable or disable camera capture.
   * Requires attachments-enabled to be true.
   * @param enabled - Whether to enable camera capture
   */
  setCameraEnabled(enabled: boolean): void;

  /**
   * Get whether camera capture is enabled.
   * @returns True if camera capture is enabled
   */
  getCameraEnabled(): boolean;

  /**
   * Check if camera modal is currently open.
   * @returns True if camera is open
   */
  isCameraOpen(): boolean;

  /**
   * Open the camera capture modal.
   * Requires camera and attachments to be enabled.
   * @throws Error if camera or attachments are not enabled
   */
  openCamera(): Promise<void>;

  /**
   * Close the camera capture modal.
   */
  closeCamera(): void;

  // --- Input Customization ---

  /**
   * Set the input field label text.
   * @param label - The label text (defaults to "Message" if empty)
   */
  setInputLabel(label: string): void;

  /**
   * Get the current input field label text.
   * @returns The current label text
   */
  getInputLabel(): string;

  /**
   * Set the input field placeholder text.
   * @param placeholder - The placeholder text (defaults to "Type your message..." if empty)
   */
  setInputPlaceholder(placeholder: string): void;

  /**
   * Get the current input field placeholder text.
   * @returns The current placeholder text
   */
  getInputPlaceholder(): string;

  // --- Context Provider ---

  /**
   * Set a context provider to inject dynamic context with each message.
   * Context is captured once when a conversation starts.
   * @param provider - Function that returns context string, or null to clear
   */
  setContextProvider(provider: ContextProvider | null | undefined): void;

  // --- Tool Calling & Streaming ---

  /**
   * Register a tool handler for client-side tool execution.
   * When the server requests a tool call with the given name, the handler will be invoked.
   * @param toolName - The name of the tool (must match server tool name)
   * @param handler - Async function that executes the tool and returns a result
   */
  registerTool(toolName: string, handler: ToolHandler): void;

  /**
   * Set an optional callback to receive raw stream events (for advanced monitoring/debugging).
   * This does not affect tool processing - registered tools are still handled automatically.
   * @param callback - Callback function to receive stream events, or undefined to remove
   */
  setStreamEventCallback(callback?: StreamEventCallback): void;

  /**
   * Prepare the component to render a continuation stream (resume after client tools).
   * Creates a streaming assistant placeholder if not already present and enters streaming mode.
   */
  beginResumeStream(): void;

  /**
   * Ingest a server-sent event (type, data) coming from an external stream reader (e.g., harness)
   * and render it into the component UI.
   * @param eventType - The SSE event type
   * @param data - The event data
   */
  ingestStreamEvent(eventType: string, data: any): void;

  /**
   * Submit external tool results (client-handled) and stream continuation into the component.
   * Always resumes the assistant run and renders streamed tokens/messages live.
   * @param results - Array of tool execution results
   */
  submitExternalToolResults(
    results: Array<{ toolCallId: string; name: string; content: string }>
  ): Promise<void>;

  // ========================================================================
  // Event Listeners
  // ========================================================================

  addEventListener<K extends keyof GuideantsChatEventMap>(
    type: K,
    listener: (this: GuideantsChatElement, ev: GuideantsChatEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;

  removeEventListener<K extends keyof GuideantsChatEventMap>(
    type: K,
    listener: (this: GuideantsChatElement, ev: GuideantsChatEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions
  ): void;
}

// Global element tag name map
declare global {
  interface HTMLElementTagNameMap {
    'guideants-chat': GuideantsChatElement;
  }
}

export {};

