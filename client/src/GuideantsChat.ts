import './Shims';
import {
  type PublishedGuideConfig,
  type PublishedAttachment,
} from './GuideantsApi';

import { DisplayMode } from './chat/Types';
import { GuideantsChatState } from './chat/GuideantsChatState';
import { GuideantsChatView } from './chat/GuideantsChatView';
import { GuideantsChatService } from './chat/GuideantsChatService';
import { GuideantsChatController } from './chat/GuideantsChatController';

class GuideantsChatElement extends HTMLElement {
  private shadow: ShadowRoot;
  private state = new GuideantsChatState();
  private view: GuideantsChatView;
  private service: GuideantsChatService;
  private controller: GuideantsChatController;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.view = new GuideantsChatView(this.shadow, this.state);
    this.service = new GuideantsChatService(this.state);
    this.controller = new GuideantsChatController(this, this.state, this.view, this.service);
  }

  static get observedAttributes() {
    return [
      'api-base-url',
      'proxy-url',
      'auth-token',
      'pub-id',
      'display-mode',
      'enable-turn-navigation',
      'collapsible',
      'command-mode',
      'conversation-starters-enabled',
      'attachments-enabled',
      'speech-to-text-enabled',
      'camera-enabled',
      'input-label',
      'input-placeholder'
    ];
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    this.controller.attributeChangedCallback(name, oldValue, newValue);
  }

  connectedCallback() {
    this.controller.connectedCallback();
  }
  
  disconnectedCallback() {
    this.controller.disconnectedCallback();
  }

  // ========================================================================
  // Public API
  // ========================================================================

  public setAuthToken(token: string | null): void {
    this.controller.setAuthToken(token);
  }

  public getAuthToken(): string | null {
    return this.state.authToken;
  }

  public beginResumeStream(): void {
    this.controller.beginResumeStream();
  }

  public ingestStreamEvent(eventType: string, data: any): void {
    this.controller.ingestStreamEvent(eventType, data);
  }

  public async submitExternalToolResults(
    results: Array<{ toolCallId: string; name: string; content: string }>
  ): Promise<void> {
    return this.controller.submitExternalToolResults(results);
  }

  public registerTool(
    toolName: string,
    handler: (call: { id: string; function: { name: string; arguments: string | object } }) => Promise<{ toolCallId: string; name: string; content: string } | null>
  ): void {
    this.controller.registerTool(toolName, handler);
  }

  public setStreamEventCallback(callback?: (event: { type: string; data: any }) => void): void {
    this.controller.setStreamEventCallback(callback);
  }

  public setContextProvider(provider?: (() => Promise<string | null> | string | null) | null): void {
    this.controller.setContextProvider(provider);
  }

  public setPubId(pubId: string): void {
    this.controller.setPubId(pubId);
  }

  public getPubId(): string | null {
    return this.state.pubId;
  }

  public setApiBaseUrl(url: string): void {
    this.controller.setApiBaseUrl(url);
  }

  public getApiBaseUrl(): string | null {
    return this.state.apiBaseUrl;
  }

  public setProxyUrl(url: string | null): void {
    this.controller.setProxyUrl(url);
  }

  public getProxyUrl(): string | null {
    return this.state.proxyUrl;
  }

  public getPublishedGuideConfig(): PublishedGuideConfig | null {
    return this.state.publishedGuideConfig;
  }

  public getResolvedIds(): { projectId: string | null; notebookId: string | null; guideId: string | null } {
    return {
      projectId: this.state.projectId,
      notebookId: this.state.notebookId,
      guideId: this.state.guideId
    };
  }

  public getConversationId(): string | null {
    return this.state.conversationId;
  }

  public getAuthError(): { code: string; message: string } | null {
    return this.state.authError;
  }

  public async testAuthentication(): Promise<PublishedGuideConfig> {
    return this.controller.testAuthentication();
  }

  public clearConversation(): void {
    this.controller.clearConversation();
  }

  public setConversationStarters(starters: string[]): void {
    this.controller.setConversationStarters(starters);
  }

  public getConversationStarters(): string[] {
    return [...this.state.conversationStarters];
  }

  public setConversationStartersEnabled(enabled: boolean): void {
    this.controller.setConversationStartersEnabled(enabled);
  }

  public getConversationStartersEnabled(): boolean {
    return this.state.conversationStartersEnabled;
  }

  public setDisplayMode(mode: DisplayMode): void {
    this.controller.setDisplayMode(mode);
  }

  public getDisplayMode(): DisplayMode {
    return this.state.displayMode;
  }

  public setTurnNavigationEnabled(enabled: boolean): void {
    this.controller.setTurnNavigationEnabled(enabled);
  }

  public getTurnNavigationEnabled(): boolean {
    return this.state.enableTurnNavigation;
  }

  public setCommandMode(enabled: boolean): void {
    this.controller.setCommandMode(enabled);
  }

  public getCommandMode(): boolean {
    return this.state.commandMode;
  }

  public getTurnCount(): number {
    return this.state.messages.filter(m => m.role === 'User').length;
  }

  public getCurrentTurnIndex(): number | null {
    if (this.state.displayMode !== 'last-turn') return null;
    return this.state.activeTurnIndex ?? this.getTurnCount();
  }

  public goToTurn(turnIndex: number): void {
    this.controller.goToTurn(turnIndex);
  }

  public goToNextTurn(): void {
    this.controller.goToNextTurn();
  }

  public goToPreviousTurn(): void {
    this.controller.goToPreviousTurn();
  }

  public setCollapsible(enabled: boolean): void {
    this.controller.setCollapsible(enabled);
  }

  public getCollapsible(): boolean {
    return this.state.collapsible;
  }

  public collapse(): void {
    this.controller.collapse();
  }

  public expand(): void {
    this.controller.expand();
  }

  public toggleCollapse(): void {
    this.controller.toggleCollapse();
  }

  public getIsCollapsed(): boolean {
    return this.state.isCollapsed;
  }

  public setAttachmentsEnabled(enabled: boolean): void {
    this.controller.setAttachmentsEnabled(enabled);
  }

  public getAttachmentsEnabled(): boolean {
    return this.state.attachmentsEnabled;
  }

  public setAttachmentProvider(provider: (() => PublishedAttachment[] | Promise<PublishedAttachment[]>) | undefined): void {
    this.controller.setAttachmentProvider(provider);
  }

  public async sendMessageWithAttachments(content: string, attachments: PublishedAttachment[]): Promise<void> {
    return this.controller.sendMessageWithAttachments(content, attachments);
  }

  // Speech-to-Text API
  public setSpeechToTextEnabled(enabled: boolean): void {
    this.controller.setSpeechToTextEnabled(enabled);
  }

  public getSpeechToTextEnabled(): boolean {
    return this.controller.getSpeechToTextEnabled();
  }

  public isRecording(): boolean {
    return this.controller.isRecording();
  }

  public async startRecording(): Promise<void> {
    return this.controller.startRecording();
  }

  public async stopRecording(): Promise<void> {
    return this.controller.stopRecording();
  }

  public cancelRecording(): void {
    this.controller.cancelRecording();
  }

  // Camera Capture API
  public setCameraEnabled(enabled: boolean): void {
    this.controller.setCameraEnabled(enabled);
  }

  public getCameraEnabled(): boolean {
    return this.controller.getCameraEnabled();
  }

  public isCameraOpen(): boolean {
    return this.controller.isCameraOpen();
  }

  public async openCamera(): Promise<void> {
    return this.controller.openCamera();
  }

  public closeCamera(): void {
    this.controller.closeCamera();
  }

  // Input Customization API
  public setInputLabel(label: string): void {
    this.controller.setInputLabel(label);
  }

  public getInputLabel(): string {
    return this.state.inputLabel;
  }

  public setInputPlaceholder(placeholder: string): void {
    this.controller.setInputPlaceholder(placeholder);
  }

  public getInputPlaceholder(): string {
    return this.state.inputPlaceholder;
  }
}

if (!customElements.get('guideants-chat')) {
  customElements.define('guideants-chat', GuideantsChatElement);
}

export {};
