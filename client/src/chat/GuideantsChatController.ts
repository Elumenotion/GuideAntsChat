import {
  AuthenticationError,
  type PublishedGuideConfig,
  type PublishedAttachment,
  type ConversationMessage
} from '../GuideantsApi';
import { GuideantsChatState } from './GuideantsChatState';
import { GuideantsChatView } from './GuideantsChatView';
import { GuideantsChatService } from './GuideantsChatService';
import { Message, DisplayMode } from './Types';
import { AudioRecorder } from './AudioRecorder';
import { CameraCapture } from './CameraCapture';

export class GuideantsChatController {
  private toolRegistry: Map<string, (call: { id: string; function: { name: string; arguments: string | object } }) => Promise<{ toolCallId: string; name: string; content: string } | null>> = new Map();
  private streamEventCallback?: (event: { type: string; data: any }) => void;
  private attachmentProvider?: () => PublishedAttachment[] | Promise<PublishedAttachment[]>;
  private contextProvider?: () => Promise<string | null> | string | null;
  private audioRecorder?: AudioRecorder;
  private cameraCapture?: CameraCapture;

  constructor(
    private host: HTMLElement,
    private state: GuideantsChatState,
    private view: GuideantsChatView,
    private service: GuideantsChatService
  ) {
    this.bindViewEvents();
  }

  // ========================================================================
  // Lifecycle & Initialization
  // ========================================================================

  public async initialize() {
    // If already initialized, ensure config is applied (handles re-connection/remounting)
    if (this.state.projectId && this.state.notebookId && this.state.guideId && this.state.publishedGuideConfig) {
      this.applyConfigToComponentProps();
      this.renderFullState();
      return;
    }
    if (!this.state.pubId) return;

    try {
      const cfg = await this.service.fetchConfig();
      
      this.state.publishedGuideConfig = cfg;

      const avatarUrl = await this.service.fetchAvatarUrl();
      if (avatarUrl) {
        this.state.publishedGuideAvatarUrl = avatarUrl;
      } else {
        this.state.publishedGuideAvatarUrl = null;
      }

      this.state.projectId = cfg.projectId;
      this.state.notebookId = cfg.notebookId;
      this.state.guideId = cfg.guideId;

      this.initializeConversationStartersFromConfig();
      this.applyConfigToComponentProps();

      this.renderFullState();

    } catch (err) {
      console.warn('[guideants-chat] Initialization failed:', err);
    }
  }

  public connectedCallback() {
    // Initialize logic if needed when connected
    // Most init is driven by attributes or direct calls, but we can trigger init here if pub-id exists
    this.view.render();
    this.bindViewEvents(); // Re-bind events as DOM is re-rendered

    // Re-sync view with state set by attributes (attributeChangedCallback fires before DOM exists)
    if (this.state.speechToTextEnabled) {
      this.initializeAudioRecorderIfNeeded();
      this.view.updateSpeechUI();
    }
    if (this.state.cameraEnabled) {
      this.initializeCameraCaptureIfNeeded();
      this.view.updateCameraUI();
    }
    if (this.state.commandMode) {
      this.view.updateButtons();
    }
    // Explicitly sync input-label/input-placeholder attributes to state
    // (workaround for browsers that may pass null for empty attribute values in attributeChangedCallback)
    const inputLabelAttr = this.host.getAttribute('input-label');
    if (inputLabelAttr !== null) {
      this.state.inputLabel = inputLabelAttr;
    }
    const inputPlaceholderAttr = this.host.getAttribute('input-placeholder');
    if (inputPlaceholderAttr !== null) {
      this.state.inputPlaceholder = inputPlaceholderAttr;
    }
    this.view.updateInputUI();

    this.initialize();
  }

  public disconnectedCallback() {
    this.view.destroy();
    this.audioRecorder?.destroy();
    this.cameraCapture?.destroy();
  }

  public attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (name === 'api-base-url') this.state.apiBaseUrl = newValue ? newValue.trim().replace(/\/$/, '') : null;
    if (name === 'proxy-url') this.state.proxyUrl = newValue ? newValue.trim().replace(/\/$/, '') : null;
    if (name === 'auth-token') this.state.authToken = newValue;
    if (name === 'pub-id') this.state.pubId = newValue;
    if (name === 'display-mode') {
      this.state.displayMode = (newValue === 'last-turn') ? 'last-turn' : 'full';
    }
    if (name === 'enable-turn-navigation') {
      this.state.enableTurnNavigation = newValue !== null && newValue !== 'false';
    }
    if (name === 'collapsible') {
      this.state.collapsible = newValue !== null && newValue !== 'false';
    }
    if (name === 'command-mode') {
      this.state.commandMode = newValue !== null && newValue !== 'false';
      this.view.updateButtons();
      this.view.updateThread();
    }
    if (name === 'conversation-starters-enabled') {
      this.state.conversationStartersEnabled = newValue !== null && newValue !== 'false';
      this.view.updateThread();
    }
    if (name === 'attachments-enabled') {
      this.state.attachmentsEnabled = newValue !== null && newValue !== 'false';
    }
    if (name === 'speech-to-text-enabled') {
      this.state.speechToTextEnabled = newValue !== null && newValue !== 'false';
      this.initializeAudioRecorderIfNeeded();
      this.view.updateSpeechUI();
    }
    if (name === 'camera-enabled') {
      this.state.cameraEnabled = newValue !== null && newValue !== 'false';
      // Camera requires attachments - auto-enable
      if (this.state.cameraEnabled && !this.state.attachmentsEnabled) {
        this.setAttachmentsEnabled(true);
      }
      this.initializeCameraCaptureIfNeeded();
      this.view.updateCameraUI();
    }
    if (name === 'input-label') {
      this.state.inputLabel = newValue !== null ? newValue : 'Message';
      this.view.updateInputUI();
    }
    if (name === 'input-placeholder') {
      this.state.inputPlaceholder = newValue !== null ? newValue : 'Type your message...';
      this.view.updateInputUI();
    }
  }

  private initializeAudioRecorderIfNeeded(): void {
    if (this.state.speechToTextEnabled && !this.audioRecorder) {
      this.audioRecorder = new AudioRecorder({
        maxDurationSeconds: 60,
        onTranscriptionComplete: (text) => this.handleTranscriptionComplete(text),
        onError: (error) => this.showError(error),
        onStateChange: () => this.syncAudioRecorderState(),
      });
    }
    
    // Update API params when recorder exists
    if (this.audioRecorder) {
      this.audioRecorder.setApiParams({
        baseUrl: this.state.proxyUrl || this.state.apiBaseUrl || '',
        pubId: this.state.pubId || '',
        authToken: this.state.authToken,
        useProxyPaths: !!this.state.proxyUrl,
      });
    }
  }

  private syncAudioRecorderState(): void {
    if (this.audioRecorder) {
      const recorderState = this.audioRecorder.getState();
      this.state.isRecording = recorderState.isRecording;
      this.state.isTranscribing = recorderState.isTranscribing;
      this.state.recordingDuration = recorderState.recordingDuration;
      this.view.updateSpeechUI();
      this.view.updateButtons();
      this.view.updateTurnNavigation();
    }
  }

  private handleTranscriptionComplete(text: string): void {
    if (this.view.inputEl && text) {
      const currentValue = this.view.inputEl.value;
      const separator = currentValue && !currentValue.endsWith(' ') && !currentValue.endsWith('\n') ? ' ' : '';
      this.view.inputEl.value = currentValue + separator + text;
      this.view.adjustTextareaHeight();
      this.view.inputEl.focus();
    }
  }

  private async onMicClick(): Promise<void> {
    if (!this.audioRecorder) return;
    
    // Update API params before recording
    this.audioRecorder.setApiParams({
      baseUrl: this.state.proxyUrl || this.state.apiBaseUrl || '',
      pubId: this.state.pubId || '',
      authToken: this.state.authToken,
      useProxyPaths: !!this.state.proxyUrl,
    });
    
    if (this.state.isRecording) {
      await this.audioRecorder.stopRecording();
    } else {
      // Clear any existing error when starting a new recording
      this.setInlineError(null);
      await this.audioRecorder.startRecording();
    }
  }

  private initializeCameraCaptureIfNeeded(): void {
    if (this.state.cameraEnabled && !this.cameraCapture) {
      this.cameraCapture = new CameraCapture({
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 0.85,
        preferredFacingMode: 'environment',
        onCapture: (blob, fileName) => this.handleCameraCapture(blob, fileName),
        onError: (error) => this.showError(error),
        onStateChange: () => this.syncCameraCaptureState(),
      });
    }
  }

  private syncCameraCaptureState(): void {
    if (this.cameraCapture) {
      const cameraState = this.cameraCapture.getState();
      this.state.isCameraOpen = cameraState.isOpen;
      this.state.isCameraCapturing = cameraState.isCapturing;
      this.view.updateCameraUI();
      this.view.updateButtons();
    }
  }

  private async handleCameraCapture(blob: Blob, fileName: string): Promise<void> {
    if (!this.state.projectId || !this.state.notebookId) {
      await this.ensureConversation();
    }

    const file = new File([blob], fileName, { type: 'image/jpeg' });
    
    try {
      const uploaded = await this.service.uploadFile(file);
      this.state.pendingAttachments.push({ file, published: uploaded });
      this.view.renderAttachmentsQueue();
    } catch (err) {
      console.error('Camera capture upload failed:', err);
      this.showError('Failed to upload captured image');
    }
  }

  private async onCameraClick(): Promise<void> {
    if (!this.state.cameraEnabled || !this.state.attachmentsEnabled) return;
    
    this.initializeCameraCaptureIfNeeded();
    
    if (this.cameraCapture && !this.state.isCameraOpen) {
      await this.cameraCapture.open(this.view.getShadowRoot());
    }
  }

  private bindViewEvents() {
    this.view.onSend = () => this.onSend();
    this.view.onUndo = () => this.onUndo();
    this.view.onRestart = () => this.onRestart();
    this.view.onCollapseToggle = () => this.toggleCollapse();
    
    this.view.onInput = () => {
      // Clear any error when user types manually
      this.setInlineError(null);
    };
    
    this.view.onTurnNav = (action) => {
      if (action === 'first') this.goToTurn(1);
      else if (action === 'prev') this.goToPreviousTurn();
      else if (action === 'next') this.goToNextTurn();
      else if (action === 'last') {
        this.state.activeTurnIndex = null;
        this.view.updateThread();
      }
    };
    
    this.view.onStarterSelected = (index) => {
      const starter = this.state.conversationStarters[index] ?? '';
      if (!starter || !this.view.inputEl) return;
      // Clear any error when user selects a conversation starter
      this.setInlineError(null);
      this.view.inputEl.value = starter;
      this.view.adjustTextareaHeight();
      this.view.inputEl.focus();
      const len = starter.length;
      this.view.inputEl.setSelectionRange(len, len);
      this.host.dispatchEvent(new CustomEvent('wf-conversation-starter-selected', {
        bubbles: true,
        detail: { prompt: starter }
      }));
    };
    
    this.view.onRemoveAttachment = (index) => {
      this.state.pendingAttachments.splice(index, 1);
      this.view.renderAttachmentsQueue();
    };
    
    this.view.onPaste = (e) => this.handleInputPaste(e);
    this.view.onMicClick = () => this.onMicClick();
    this.view.onStopRecording = () => this.stopRecording();
    this.view.onCameraClick = () => this.onCameraClick();
  }

  // ========================================================================
  // Public API Implementations
  // ========================================================================

  public setAuthToken(token: string | null): void {
    this.state.authToken = token;
    if (token) {
      this.host.setAttribute('auth-token', token);
    } else {
      this.host.removeAttribute('auth-token');
    }
    this.state.authError = null;
    this.view.updateThread();
  }

  public beginResumeStream(): void {
    if (this.state.isStreaming && this.state.streamingAssistantMessageId) return;
    this.state.isStreaming = true;
    this.view.scrollManager?.setAutoScrollPinned(true);
    this.view.updateButtons();
    
    if (!this.state.streamingAssistantMessageId) {
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'Assistant',
        content: '',
        created: new Date().toISOString(),
        isEdited: false
      };
      this.state.messages.push(assistantMessage);
      this.state.streamingAssistantMessageId = assistantMessageId;
      this.view.updateThread();
      this.view.scrollManager?.maybeAutoScrollToBottom();
    }
  }

  public ingestStreamEvent(eventType: string, data: any): void {
    this.handleSseEvent({ type: eventType, data });
  }

  public async submitExternalToolResults(
    results: Array<{ toolCallId: string; name: string; content: string }>
  ): Promise<void> {
    if (!results || results.length === 0) return;
    if (this.state.isStreaming) return;
    
    this.state.isStreaming = true;
    this.view.scrollManager?.setAutoScrollPinned(true);
    this.view.updateButtons();
    this.host.dispatchEvent(new CustomEvent('wf-stream-start', { bubbles: true }));
    
    try {
      await this.ensureConversation();
      
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'Assistant',
        content: '',
        created: new Date().toISOString(),
        isEdited: false
      };
      this.state.messages.push(assistantMessage);
      this.state.streamingAssistantMessageId = assistantMessageId;
      this.view.updateThread();
      this.view.scrollManager?.maybeAutoScrollToBottom();
      
      await this.service.submitToolResults(results, (evt) => this.handleSseEvent(evt));
      
      await this.loadConversation();
      this.host.dispatchEvent(new CustomEvent('wf-complete', { bubbles: true }));
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        this.handleAuthError(err);
      } else {
        this.showError(err?.message || 'Submit tool results failed');
        this.host.dispatchEvent(new CustomEvent('wf-error', { bubbles: true, detail: err }));
      }
      this.view.updateThread();
    } finally {
      this.state.isStreaming = false;
      this.state.streamingAssistantMessageId = null;
      this.state.sanitizedMessageContent = null;
      this.view.updateButtons();
      this.view.updateThread();
      this.view.scrollManager?.setAutoScrollPinned(false);
      try { this.view.scrollManager?.scrollToBottom(); } catch {}
    }
  }

  public registerTool(
    toolName: string,
    handler: (call: { id: string; function: { name: string; arguments: string | object } }) => Promise<{ toolCallId: string; name: string; content: string } | null>
  ): void {
    this.toolRegistry.set(toolName, handler);
  }

  public setStreamEventCallback(callback?: (event: { type: string; data: any }) => void): void {
    this.streamEventCallback = callback;
  }

  public setContextProvider(provider?: (() => Promise<string | null> | string | null) | null): void {
    this.contextProvider = provider || undefined;
  }

  public setPubId(pubId: string): void {
    this.state.pubId = pubId;
    this.host.setAttribute('pub-id', pubId);
    this.state.projectId = null;
    this.state.notebookId = null;
    this.state.guideId = null;
    this.state.publishedGuideConfig = null;
    
    if (this.host.isConnected) {
      this.initialize();
    }
  }

  public setApiBaseUrl(url: string): void {
    const normalized = url.trim().replace(/\/$/, '');
    this.state.apiBaseUrl = normalized;
    this.host.setAttribute('api-base-url', normalized);
  }

  public setProxyUrl(url: string | null): void {
    if (url) {
      const normalized = url.trim().replace(/\/$/, '');
      this.state.proxyUrl = normalized;
      this.host.setAttribute('proxy-url', normalized);
    } else {
      this.state.proxyUrl = null;
      this.host.removeAttribute('proxy-url');
    }
  }

  public async testAuthentication(): Promise<PublishedGuideConfig> {
    if (!this.state.pubId) {
      throw new Error('pub-id must be set before testing authentication');
    }
    
    const config = await this.service.fetchConfig();
    
    this.state.publishedGuideConfig = config;
    const avatarUrl = await this.service.fetchAvatarUrl();
    this.state.publishedGuideAvatarUrl = avatarUrl;

    this.initializeConversationStartersFromConfig();
    try { this.view.updateButtons(); } catch {}
    return config;
  }

  public clearConversation(): void {
    this.state.conversationId = null;
    this.state.conversationContext = null;
    this.state.messages = [];
    this.state.authError = null;
    this.state.activeTurnIndex = null; // Reset turn navigation state
    this.view.updateThread();
  }

  public setConversationStarters(starters: string[]): void {
    this.state.conversationStarters = Array.isArray(starters) ? [...starters] : [];
    this.view.updateThread();
  }

  public setConversationStartersEnabled(enabled: boolean): void {
    this.state.conversationStartersEnabled = !!enabled;
    if (enabled) {
      this.host.setAttribute('conversation-starters-enabled', 'true');
    } else {
      this.host.removeAttribute('conversation-starters-enabled');
    }
    this.view.updateButtons();
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.state.displayMode = mode;
    this.host.setAttribute('display-mode', mode);
    this.view.updateThread();
  }

  public setTurnNavigationEnabled(enabled: boolean): void {
    this.state.enableTurnNavigation = enabled;
    if (enabled) {
      this.host.setAttribute('enable-turn-navigation', 'true');
    } else {
      this.host.removeAttribute('enable-turn-navigation');
    }
    this.view.updateThread();
  }

  public setCommandMode(enabled: boolean): void {
    this.state.commandMode = !!enabled;
    if (enabled) {
      this.host.setAttribute('command-mode', 'true');
    } else {
      this.host.removeAttribute('command-mode');
    }
    this.view.updateButtons();
    this.view.updateThread();
  }

  public goToTurn(turnIndex: number): void {
    if (this.state.displayMode !== 'last-turn') return;
    
    const maxTurn = this.state.getTurnCount();
    if (turnIndex < 1 || turnIndex > maxTurn) return;
    
    this.state.activeTurnIndex = turnIndex;
    this.view.updateThread();
    
    this.host.dispatchEvent(new CustomEvent('wf-turn-navigation', {
      bubbles: true,
      detail: { turnIndex, totalTurns: maxTurn }
    }));
  }

  public goToNextTurn(): void {
    if (this.state.displayMode !== 'last-turn') return;
    const maxTurn = this.state.messages.filter(m => m.role === 'User').length;
    const currentTurn = this.state.activeTurnIndex ?? maxTurn;
    if (currentTurn < maxTurn) {
      this.goToTurn(currentTurn + 1);
    }
  }

  public goToPreviousTurn(): void {
    if (this.state.displayMode !== 'last-turn') return;
    const currentTurn = this.state.activeTurnIndex ?? this.state.messages.filter(m => m.role === 'User').length;
    if (currentTurn > 1) {
      this.goToTurn(currentTurn - 1);
    }
  }

  public setCollapsible(enabled: boolean): void {
    this.state.collapsible = enabled;
    if (enabled) {
      this.host.setAttribute('collapsible', 'true');
    } else {
      this.host.removeAttribute('collapsible');
      this.state.isCollapsed = false;
    }
    this.view.updateCollapseUI();
  }

  public collapse(): void {
    if (!this.state.collapsible) return;
    this.state.isCollapsed = true;
    this.view.updateCollapseUI();
    this.view.updateThread();
    this.host.dispatchEvent(new CustomEvent('wf-collapsed', { bubbles: true }));
  }

  public expand(): void {
    if (!this.state.collapsible) return;
    this.state.isCollapsed = false;
    this.view.updateCollapseUI();
    this.view.updateThread();
    this.host.dispatchEvent(new CustomEvent('wf-expanded', { bubbles: true }));
  }

  public toggleCollapse(): void {
    if (!this.state.collapsible) return;
    if (this.state.isCollapsed) {
      this.expand();
    } else {
      this.collapse();
    }
  }

  public setAttachmentsEnabled(enabled: boolean): void {
    this.state.attachmentsEnabled = !!enabled;
    if (enabled) {
      this.host.setAttribute('attachments-enabled', 'true');
    } else {
      this.host.removeAttribute('attachments-enabled');
    }
  }

  public setAttachmentProvider(provider: (() => PublishedAttachment[] | Promise<PublishedAttachment[]>) | undefined): void {
    this.attachmentProvider = provider;
  }

  public async sendMessageWithAttachments(content: string, attachments: PublishedAttachment[]): Promise<void> {
    if (!this.state.attachmentsEnabled) {
      throw new Error('Attachments are disabled on this component');
    }
    if (this.state.isStreaming) {
      throw new Error('Cannot send a new message while streaming');
    }
    const trimmed = (content || '').trim();
    if (!trimmed) {
      throw new Error('Message content is required');
    }
    await this.performSend(trimmed, attachments || []);
  }

  // ========================================================================
  // Speech-to-Text Public API
  // ========================================================================

  public setSpeechToTextEnabled(enabled: boolean): void {
    this.state.speechToTextEnabled = !!enabled;
    if (enabled) {
      this.host.setAttribute('speech-to-text-enabled', 'true');
      this.initializeAudioRecorderIfNeeded();
    } else {
      this.host.removeAttribute('speech-to-text-enabled');
    }
    this.view.updateSpeechUI();
  }

  public getSpeechToTextEnabled(): boolean {
    return this.state.speechToTextEnabled;
  }

  public isRecording(): boolean {
    return this.state.isRecording;
  }

  public async startRecording(): Promise<void> {
    if (!this.state.speechToTextEnabled) {
      throw new Error('Speech-to-text is not enabled');
    }
    this.initializeAudioRecorderIfNeeded();
    if (this.audioRecorder && !this.state.isRecording) {
      // Clear any existing error when starting a new recording
      this.setInlineError(null);
      await this.audioRecorder.startRecording();
    }
  }

  public async stopRecording(): Promise<void> {
    if (this.audioRecorder && this.state.isRecording) {
      await this.audioRecorder.stopRecording();
    }
  }

  public cancelRecording(): void {
    if (this.audioRecorder) {
      this.audioRecorder.cancelRecording();
    }
  }

  // ========================================================================
  // Camera Capture Public API
  // ========================================================================

  public setCameraEnabled(enabled: boolean): void {
    this.state.cameraEnabled = !!enabled;
    if (enabled) {
      // Camera requires attachments - auto-enable
      if (!this.state.attachmentsEnabled) {
        this.setAttachmentsEnabled(true);
      }
      this.host.setAttribute('camera-enabled', 'true');
      this.initializeCameraCaptureIfNeeded();
    } else {
      this.host.removeAttribute('camera-enabled');
    }
    this.view.updateCameraUI();
  }

  public getCameraEnabled(): boolean {
    return this.state.cameraEnabled;
  }

  public isCameraOpen(): boolean {
    return this.state.isCameraOpen;
  }

  public async openCamera(): Promise<void> {
    if (!this.state.cameraEnabled) {
      throw new Error('Camera is not enabled');
    }
    if (!this.state.attachmentsEnabled) {
      throw new Error('Attachments must be enabled for camera capture');
    }
    this.initializeCameraCaptureIfNeeded();
    if (this.cameraCapture && !this.state.isCameraOpen) {
      await this.cameraCapture.open(this.view.getShadowRoot());
    }
  }

  public closeCamera(): void {
    if (this.cameraCapture && this.state.isCameraOpen) {
      this.cameraCapture.close(this.view.getShadowRoot());
    }
  }

  // ========================================================================
  // Input Customization Public API
  // ========================================================================

  public setInputLabel(label: string): void {
    this.state.inputLabel = label;
    this.view.updateInputUI();
  }

  public getInputLabel(): string {
    return this.state.inputLabel;
  }

  public setInputPlaceholder(placeholder: string): void {
    this.state.inputPlaceholder = placeholder;
    this.view.updateInputUI();
  }

  public getInputPlaceholder(): string {
    return this.state.inputPlaceholder;
  }

  // ========================================================================
  // Internal Logic & Helpers
  // ========================================================================

  private async ensureResolvedIds() {
    if (this.state.projectId && this.state.notebookId && this.state.guideId) return;
    await this.initialize();
    if (!this.state.projectId || !this.state.notebookId) {
       throw new Error('Missing guide configuration');
    }
  }

  private initializeConversationStartersFromConfig() {
    if (this.state.conversationStarters.length > 0) return;
    const starters = this.state.publishedGuideConfig?.conversationStarters;
    if (starters && starters.length > 0) {
      this.state.conversationStarters = [...starters];
    }
  }

  private applyConfigToComponentProps() {
    const cfg = this.state.publishedGuideConfig;
    if (!cfg) return;

    if (!this.host.hasAttribute('display-mode') && cfg.displayMode) {
      this.state.displayMode = cfg.displayMode as DisplayMode;
    }
    if (!this.host.hasAttribute('enable-turn-navigation') && cfg.showTurnNavigation !== undefined) {
      this.state.enableTurnNavigation = cfg.showTurnNavigation;
    }
    if (!this.host.hasAttribute('collapsible') && cfg.collapsible !== undefined) {
      this.state.collapsible = cfg.collapsible;
    }
    if (!this.host.hasAttribute('conversation-starters-enabled') && cfg.showConversationStarters !== undefined) {
      this.state.conversationStartersEnabled = cfg.showConversationStarters;
    }
    if (!this.host.hasAttribute('attachments-enabled') && cfg.showAttachments !== undefined) {
      this.state.attachmentsEnabled = cfg.showAttachments;
    }
    if (!this.host.hasAttribute('command-mode') && cfg.commandMode !== undefined) {
      this.state.commandMode = cfg.commandMode;
      this.view.updateButtons();
    }
  }

  private renderFullState() {
    this.view.updateButtons();
    this.view.updateThread();
    this.view.renderEmptyState();
    this.view.updateCollapseUI();
  }

  private handleInputPaste = async (event: ClipboardEvent) => {
    if (!this.state.attachmentsEnabled) return;
    const clipboardData = event.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items || []);
    const imageItems = items.filter(item => item.kind === 'file' && item.type.startsWith('image/'));

    if (imageItems.length === 0) return;

    const files: File[] = [];
    for (const item of imageItems) {
      const file = item.getAsFile();
      if (!file) continue;
      let ext = 'png'; 
      if (file.name && file.name.trim() !== '') {
        const match = file.name.match(/\.([a-zA-Z0-9]{1,8})$/);
        if (match) ext = match[1];
      } else {
         if (file.type === 'image/jpeg') ext = 'jpg';
         else if (file.type === 'image/gif') ext = 'gif';
         else if (file.type === 'image/webp') ext = 'webp';
      }
      const uniqueName = `pasted-${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`;
      files.push(new File([file], uniqueName, { type: file.type || `image/${ext}` }));
    }

    if (files.length > 0) {
      event.preventDefault();
      await this.uploadFiles(files);
    }
  };

  private async uploadFiles(files: File[]) {
    if (files.length === 0) return;
    this.state.isUploading = true;
    this.view.updateButtons();
    
    try {
        for (const file of files) {
            if (file.size > 20 * 1024 * 1024) {
                this.showError(`File ${file.name} exceeds the 20MB limit.`);
                continue;
            }
            this.view.renderLoadingAttachment(file.name);
            try {
                if (!this.state.projectId || !this.state.notebookId) {
                    await this.ensureConversation();
                }
                
                const uploaded = await this.service.uploadFile(file);
                this.state.pendingAttachments.push({ file, published: uploaded });
            } catch (err) {
                console.error('Upload failed:', err);
            } finally {
                this.view.renderAttachmentsQueue();
            }
        }
    } finally {
        this.state.isUploading = false;
        this.view.updateButtons();
    }
  }

  private async onSend() {
    if (!this.state.pubId) {
      this.showError('Missing pub-id attribute');
      return;
    }
    const content = (this.view.inputEl?.value || '').trim();
    if (!content) return;
    if (this.state.isStreaming) return;

    let attachments: PublishedAttachment[] | undefined;
    if (this.state.attachmentsEnabled && this.attachmentProvider) {
      try {
        const provided = await this.attachmentProvider();
        attachments = this.normalizeAttachments(provided);
      } catch (err: any) {
        this.showError(err?.message || 'Failed to process attachments');
        return;
      }
    }

    await this.performSend(content, attachments);
  }

  private async performSend(content: string, attachments?: PublishedAttachment[]): Promise<void> {
    if (!this.state.pubId) {
      this.showError('Missing pub-id attribute');
      return;
    }

    const normalizedAttachments = this.normalizeAttachments(attachments);

    if (this.state.collapsible && this.state.isCollapsed) {
      this.expand();
    }

    if (this.state.commandMode) {
      this.state.conversationId = null;
      this.state.conversationContext = null; 
      this.state.messages = [];
      this.state.authError = null;
      this.state.activeTurnIndex = null;
      this.view.updateThread();
    }

    try {
      await this.ensureResolvedIds();
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        this.handleAuthError(err);
      } else {
        this.showError(err?.message || 'Failed to load published guide configuration');
      }
      return;
    }

    const pending = [...this.state.pendingAttachments];
    this.state.pendingAttachments = [];
    this.view.renderAttachmentsQueue();

    const allAttachments = [
      ...(normalizedAttachments || []),
      ...(pending.map(p => ({
        ...p.published,
        fileName: p.file.name
      })))
    ];

    if (this.state.publishedGuideConfig?.maxUserMessageLength) {
      if (content.length > this.state.publishedGuideConfig.maxUserMessageLength) {
        this.showError(`Message exceeds maximum length of ${this.state.publishedGuideConfig.maxUserMessageLength} characters`);
        this.state.pendingAttachments = pending;
        this.view.renderAttachmentsQueue();
        return;
      }
    }

    if (this.state.publishedGuideConfig?.maxTurns) {
      const currentTurns = this.state.messages.filter(m => m.role === 'User').length;
      if (currentTurns >= this.state.publishedGuideConfig.maxTurns) {
        this.showError(`This conversation has reached the maximum of ${this.state.publishedGuideConfig.maxTurns} turns`);
        return;
      }
    }

    this.state.isStreaming = true;
    this.view.scrollManager?.setAutoScrollPinned(true);
    this.view.updateButtons();
    this.host.dispatchEvent(new CustomEvent('wf-stream-start', { bubbles: true }));

    try {
      await this.ensureConversation();

      if (this.view.inputEl) {
        this.view.inputEl.value = '';
        this.view.adjustTextareaHeight();
      }

      const userMessage: Message = {
        id: `temp-user-${Date.now()}`,
        role: 'User',
        content,
        created: new Date().toISOString(),
        isEdited: false,
        attachments: allAttachments
      };
      this.state.messages.push(userMessage);

      if (this.state.displayMode === 'last-turn') {
        this.state.activeTurnIndex = null;
      }

      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'Assistant',
        content: '',
        created: new Date().toISOString(),
        isEdited: false
      };
      this.state.messages.push(assistantMessage);
      this.state.streamingAssistantMessageId = assistantMessageId;

      this.view.updateThread();
      this.view.scrollManager?.maybeAutoScrollToBottom();

      await this.streamMessage(content, allAttachments);
    } catch (err: any) {
      this.state.messages = this.state.messages.filter(m => !m.id.startsWith('temp-'));
      
      if (typeof pending !== 'undefined' && pending.length > 0) {
        this.state.pendingAttachments = pending;
        this.view.renderAttachmentsQueue();
      }
      
      if (err instanceof AuthenticationError) {
        this.handleAuthError(err);
      } else {
        this.showError(err?.message || 'Request failed');
        this.host.dispatchEvent(new CustomEvent('wf-error', { bubbles: true, detail: err }));
      }
      this.view.updateThread();
    } finally {
      this.state.isStreaming = false;
      this.state.streamingAssistantMessageId = null;
      this.state.sanitizedMessageContent = null;
      
      this.view.updateButtons();
      this.view.updateThread();
      this.view.scrollManager?.setAutoScrollPinned(false);
      try { this.view.scrollManager?.scrollToBottom(); } catch {}
    }
  }

  private async onUndo() {
    if (this.state.commandMode) return;
    if (this.state.isStreaming || this.state.messages.length === 0) return;
    if (!this.state.conversationId) return;

    await this.ensureResolvedIds();

    try {
      const result = await this.service.deleteLastTurn();

      if (result === 'conflict') {
        this.showError('Cannot undo while conversation is streaming');
        return;
      }

      await this.loadConversation();
      this.host.dispatchEvent(new CustomEvent('wf-undo-complete', { bubbles: true }));
    } catch (err: any) {
      if (err instanceof AuthenticationError) {
        this.handleAuthError(err);
      } else {
        this.showError(err?.message || 'Failed to undo');
        this.host.dispatchEvent(new CustomEvent('wf-undo-error', { bubbles: true, detail: err }));
      }
    }
  }

  private onRestart() {
    if (this.state.commandMode) return;
    if (this.state.isStreaming) return;
    
    this.clearConversation();
    
    if (this.view.inputEl) {
      this.view.inputEl.value = '';
      this.view.adjustTextareaHeight();
    }
    
    this.setInlineError(null);
    this.view.updateThread();
    this.view.updateButtons();
    this.host.dispatchEvent(new CustomEvent('wf-restart', { bubbles: true }));
  }

  private handleAuthError(err: AuthenticationError) {
    this.state.authError = {
      code: err.errorCode,
      message: err.errorMessage
    };
    this.setInlineError(err.errorMessage);
    this.view.updateThread();
    this.host.dispatchEvent(new CustomEvent('wf-auth-error', {
      bubbles: true,
      detail: {
        errorCode: err.errorCode,
        message: err.errorMessage,
        requiresAuth: err.requiresAuth
      }
    }));
  }

  private async ensureConversation() {
    if (this.state.conversationId) {
      await this.loadConversation();
      return;
    }

    await this.ensureResolvedIds();

    // Capture context when conversation starts
    if (this.contextProvider && this.state.conversationContext === null) {
      try {
        const result = await Promise.resolve(this.contextProvider());
        if (result && typeof result === 'string' && result.trim().length > 0) {
          this.state.conversationContext = result.trim();
        }
      } catch (err) {
        console.error('[guideants-chat] Context provider error:', err);
      }
    }

    const now = new Date();
    const title = now.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'long' }) || now.toISOString();

    this.state.conversationId = await this.service.startConversation(title);
    
    if (!this.state.conversationId) throw new Error('conversation id missing from start response');
    
    await this.loadConversation();
  }

  private async loadConversation() {
    if (!this.state.conversationId) return;
    await this.ensureResolvedIds();
    
    const apiMessages = await this.service.fetchHistory();
    
    const loadedMessages = (apiMessages || []).map((m: ConversationMessage) => ({
      id: m.id,
      role: m.role as Message['role'],
      content: m.content,
      created: m.created,
      isEdited: m.isEdited || false,
      attachments: m.attachments
    }));
    
    if (this.state.sanitizedMessageContent) {
      let lastAssistantIndex = -1;
      for (let i = loadedMessages.length - 1; i >= 0; i--) {
        if (loadedMessages[i].role === 'Assistant') {
          lastAssistantIndex = i;
          break;
        }
      }
      if (lastAssistantIndex >= 0) {
        loadedMessages[lastAssistantIndex].content = this.state.sanitizedMessageContent;
      }
      this.state.sanitizedMessageContent = null;
    }
    
    this.state.messages = loadedMessages;
    
    if (!this.state.isStreaming) {
      this.view.updateThread();
    }
  }

  private async streamMessage(content: string, attachments?: PublishedAttachment[]) {
    await this.ensureResolvedIds();
    
    await this.service.streamResponse(
      content, 
      attachments, 
      (evt) => this.handleSseEvent(evt)
    );
    
    await this.loadConversation();
    this.host.dispatchEvent(new CustomEvent('wf-complete', { bubbles: true }));
  }

  private handleSseEvent(evt: { type: string; data: any }) {
    switch (evt.type) {
      case 'token': {
        const delta = evt.data?.contentDelta || '';
        if (!this.state.streamingAssistantMessageId) {
          this.state.isStreaming = true;
          this.view.scrollManager?.setAutoScrollPinned(true);
          const assistantMessageId = `temp-assistant-${Date.now()}`;
          const assistantMessage: Message = {
            id: assistantMessageId,
            role: 'Assistant',
            content: '',
            created: new Date().toISOString(),
            isEdited: false
          };
          this.state.messages.push(assistantMessage);
          this.state.streamingAssistantMessageId = assistantMessageId;
          this.view.updateThread();
          this.view.scrollManager?.maybeAutoScrollToBottom();
        }
        if (delta) {
          const msg = this.state.messages.find(m => m.id === this.state.streamingAssistantMessageId!);
          if (msg) { msg.content += delta; this.view.updateThread(); this.view.scrollManager?.maybeAutoScrollToBottom(); }
        }
        break;
      }
      case 'assistant_message': {
        const content = evt.data?.content || '';
        if (!this.state.streamingAssistantMessageId) {
          this.state.isStreaming = true;
          this.view.scrollManager?.setAutoScrollPinned(true);
          const assistantMessageId = `temp-assistant-${Date.now()}`;
          this.state.messages.push({ id: assistantMessageId, role: 'Assistant', content: '', created: new Date().toISOString(), isEdited: false });
          this.state.streamingAssistantMessageId = assistantMessageId;
        }
        if (content) {
          const msg = this.state.messages.find(m => m.id === this.state.streamingAssistantMessageId!);
          if (msg) { msg.content = content; this.view.updateThread(); this.view.scrollManager?.maybeAutoScrollToBottom(); }
        }
        break;
      }
      case 'external_tool_call': {
        this.state.isStreaming = false;
        this.view.updateButtons();
        const toolCalls = evt.data?.toolCalls || [];
        
        // Log tool calls for testing/debugging
        console.log('[guideants-chat] Tool calls received:', toolCalls.map((tc: any) => ({
          id: tc.id,
          name: tc.function?.name,
          arguments: tc.function?.arguments
        })));
        
        if (toolCalls.length === 0) break;
        
        const missingHandlers: string[] = [];
        for (const call of toolCalls) {
          const toolName = call.function?.name;
          if (toolName && !this.toolRegistry.has(toolName)) {
            missingHandlers.push(toolName);
          }
        }
        
        if (missingHandlers.length > 0) {
          const error = new Error(`No handler registered for tool(s): ${missingHandlers.join(', ')}`);
          this.showError(error.message);
          this.host.dispatchEvent(new CustomEvent('wf-error', { bubbles: true, detail: error }));
          break;
        }
        
        this.handleRegisteredTools(toolCalls).catch(err => {
          const errorMessage = err?.message || String(err);
          this.showError(`Tool execution error: ${errorMessage}`);
          this.host.dispatchEvent(new CustomEvent('wf-error', { bubbles: true, detail: err }));
        });
        
        if (this.streamEventCallback) {
          this.streamEventCallback({ type: 'external_tool_call', data: evt.data });
        }
        break;
      }
      case 'message': {
        const content = evt.data?.content || '';
        if (content) {
          this.state.sanitizedMessageContent = content;
          if (!this.state.streamingAssistantMessageId) {
            const assistantMessageId = `temp-assistant-${Date.now()}`;
            this.state.messages.push({ id: assistantMessageId, role: 'Assistant', content: '', created: new Date().toISOString(), isEdited: false });
            this.state.streamingAssistantMessageId = assistantMessageId;
          }
          const msg = this.state.messages.find(m => m.id === this.state.streamingAssistantMessageId!);
          if (msg) { msg.content = content; this.view.updateThread(); this.view.scrollManager?.maybeAutoScrollToBottom(); }
        }
        break;
      }
      case 'error': {
        this.showError(evt.data?.message || 'stream error');
        break;
      }
      case 'complete':
      case 'cancelled': {
        this.state.isStreaming = false;
        this.state.streamingAssistantMessageId = null;
        this.state.sanitizedMessageContent = null;
        this.view.updateButtons();
        this.view.scrollManager?.scrollToBottomOnNextResize();
        this.view.updateThread();
        this.view.scrollManager?.setAutoScrollPinned(false);
        try { this.view.scrollManager?.scrollToBottom(); } catch {}
        break;
      }
      default:
        break;
    }
    if (evt.type !== 'external_tool_call') {
      this.host.dispatchEvent(new CustomEvent(`wf-${evt.type}`, { bubbles: true, detail: evt.data }));
    }
  }

  private async handleRegisteredTools(toolCalls: Array<{ id: string; function?: { name?: string; arguments?: string | object } }>): Promise<void> {
    const results: Array<{ toolCallId: string; name: string; content: string }> = [];
    for (const call of toolCalls) {
      const toolName = call.function?.name;
      if (!toolName) continue;
      const handler = this.toolRegistry.get(toolName);
      if (!handler) continue;
      
      console.log(`[guideants-chat] Executing tool: ${toolName}`, call.function?.arguments);
      
      try {
        const result = await handler({
          id: call.id,
          function: {
            name: toolName,
            arguments: call.function?.arguments || {}
          }
        });
        if (result) {
          console.log(`[guideants-chat] Tool result for ${toolName}:`, result.content);
          results.push(result);
        }
      } catch (err: any) {
        console.error(`[guideants-chat] Error executing ${toolName}:`, err);
        results.push({
          toolCallId: call.id,
          name: toolName,
          content: JSON.stringify({ error: err?.message || String(err) })
        });
      }
    }
    if (results.length > 0) {
      console.log('[guideants-chat] Submitting tool results:', results.length, 'result(s)');
      await this.submitExternalToolResults(results);
    }
  }

  private normalizeAttachments(list?: PublishedAttachment[] | null): PublishedAttachment[] | undefined {
    if (!Array.isArray(list) || list.length === 0) return undefined;
    const normalized: PublishedAttachment[] = [];
    for (const att of list) {
      const id = att?.notebookFileId?.trim();
      const uploadType = att?.uploadType;
      if (!id) continue;
      if (uploadType === 'ImageFile' || uploadType === 'ImageUrl' || uploadType === 'AudioFile' || uploadType === 'TextFile' || uploadType === 'SandboxFile') {
        normalized.push({ notebookFileId: id, uploadType });
      }
    }
    return normalized.length > 0 ? normalized : undefined;
  }

  private showError(message: string) {
    this.setInlineError(message);
  }

  private setInlineError(message: string | null) {
    this.state.inlineError = message;
    if (this.view.errorBannerEl) {
      this.view.errorBannerEl.textContent = message ?? '';
    }
  }
}
