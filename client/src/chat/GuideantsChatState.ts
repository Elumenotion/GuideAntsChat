import { Message, DisplayMode } from './Types';
import { PublishedGuideConfig, PublishedAttachment } from '../GuideantsApi';

export class GuideantsChatState {
  // Config & Identity
  public apiBaseUrl: string | null = null;
  public proxyUrl: string | null = null;
  public authToken: string | null = null;
  public pubId: string | null = null;
  public conversationId: string | null = null;
  public projectId: string | null = null;
  public notebookId: string | null = null;
  public guideId: string | null = null;
  public publishedGuideConfig: PublishedGuideConfig | null = null;
  public conversationStarters: string[] = [];
  public publishedGuideAvatarUrl: string | null = null;
  public conversationContext: string | null = null;

  // Chat Data
  public messages: Message[] = [];
  public authError: { code: string; message: string } | null = null;
  public inlineError: string | null = null;

  // Streaming State
  public isStreaming: boolean = false;
  public streamingAssistantMessageId: string | null = null;
  public sanitizedMessageContent: string | null = null;

  // UI Flags
  public displayMode: DisplayMode = 'full';
  public enableTurnNavigation: boolean = false;
  public activeTurnIndex: number | null = null;
  public collapsible: boolean = false;
  public isCollapsed: boolean = false;
  public commandMode: boolean = false;
  public conversationStartersEnabled: boolean = false;
  public attachmentsEnabled: boolean = false;

  // Attachment State
  public pendingAttachments: { file: File; published: PublishedAttachment }[] = [];
  public isUploading: boolean = false;

  // Speech-to-Text State
  public speechToTextEnabled: boolean = false;
  public isRecording: boolean = false;
  public isTranscribing: boolean = false;
  public recordingDuration: number = 0;

  // Camera Capture State
  public cameraEnabled: boolean = false;
  public isCameraOpen: boolean = false;
  public isCameraCapturing: boolean = false;

  // Input Customization
  public inputLabel: string = 'Message';
  public inputPlaceholder: string = 'Type your message...';

  constructor() {}

  // Basic mutations to keep state consistent
  public setAuthToken(token: string | null) {
    this.authToken = token;
    if (!token) this.authError = null;
  }

  public setConversationIds(ids: { projectId: string; notebookId: string; guideId: string }) {
    this.projectId = ids.projectId;
    this.notebookId = ids.notebookId;
    this.guideId = ids.guideId;
  }

  public clearConversation() {
    this.conversationId = null;
    this.conversationContext = null;
    this.messages = [];
    this.authError = null;
    this.activeTurnIndex = null;
  }

  public getTurnCount(): number {
    return this.messages.filter(m => m.role === 'User').length;
  }

  public getCurrentTurnIndex(): number | null {
    if (this.displayMode !== 'last-turn') return null;
    return this.activeTurnIndex ?? this.getTurnCount();
  }
}

