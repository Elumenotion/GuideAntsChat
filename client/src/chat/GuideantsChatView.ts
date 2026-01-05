import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import tailwindStyles from '../styles.css?inline';
import MinimalChatMarkdownViewer from '../MinimalChatMarkdownViewer';
import { escapeHtml } from '../Markdown';
import { GuideantsChatState } from './GuideantsChatState';
import { getChatStyles } from './Css';
import { getChatTemplate } from './Template';
import { ScrollManager } from './ScrollManager';
import { renderMessage, renderConversationStartersEmptyState, renderAuthError } from './Renderers';
import { Message } from './Types';

export class GuideantsChatView {
  private shadow: ShadowRoot;
  private state: GuideantsChatState;
  
  // Element References
  public containerEl?: HTMLDivElement;
  public startersAreaEl?: HTMLDivElement;
  public attachmentsAreaEl?: HTMLDivElement;
  public threadEl?: HTMLDivElement;
  public threadContentEl?: HTMLDivElement;
  public bottomAnchorEl?: HTMLDivElement;
  public inputEl?: HTMLTextAreaElement;
  public sendButtonEl?: HTMLButtonElement;
  public undoButtonEl?: HTMLButtonElement;
  public restartButtonEl?: HTMLButtonElement;
  public errorBannerEl?: HTMLDivElement;
  
  // Collapse UI
  public collapseControlEl?: HTMLDivElement;
  public collapseToggleEl?: HTMLButtonElement;
  public collapseLabelEl?: HTMLSpanElement;
  public collapseIconEl?: HTMLSpanElement;
  public conversationWrapperEl?: HTMLDivElement;
  
  // Turn Navigation
  public turnNavEl?: HTMLDivElement;
  public turnFirstButtonEl?: HTMLButtonElement;
  public turnPrevButtonEl?: HTMLButtonElement;
  public turnNextButtonEl?: HTMLButtonElement;
  public turnLastButtonEl?: HTMLButtonElement;
  public turnIndicatorEl?: HTMLSpanElement;

  // Speech-to-Text
  public micButtonEl?: HTMLButtonElement;
  public micIconEl?: HTMLSpanElement;
  public recordingIndicatorEl?: HTMLDivElement;
  public recordingDurationEl?: HTMLSpanElement;
  public stopRecordingButtonEl?: HTMLButtonElement;
  public transcribingIndicatorEl?: HTMLDivElement;

  // Camera Capture
  public cameraButtonEl?: HTMLButtonElement;

  // Input Customization
  public inputLabelEl?: HTMLLabelElement;

  private assistantRoots: Map<string, { root: Root; container: Element }> = new Map();
  public scrollManager?: ScrollManager;

  // Event Handlers (to be bound by controller)
  public onSend?: () => void;
  public onUndo?: () => void;
  public onRestart?: () => void;
  public onInput?: () => void;
  public onPaste?: (e: ClipboardEvent) => void;
  public onCollapseToggle?: () => void;
  public onTurnNav?: (action: 'first' | 'prev' | 'next' | 'last') => void;
  public onStarterSelected?: (index: number) => void;
  public onRemoveAttachment?: (index: number) => void;
  public onMicClick?: () => void;
  public onStopRecording?: () => void;
  public onCameraClick?: () => void;

  constructor(shadow: ShadowRoot, state: GuideantsChatState) {
    this.shadow = shadow;
    this.state = state;
  }

  public render() {
    const style = document.createElement('style');
    style.textContent = tailwindStyles + getChatStyles();

    const container = document.createElement('div');
    container.id = 'wf-container';
    container.className = 'border border-gray-200 rounded-lg p-3 bg-white flex flex-col gap-3';
    container.innerHTML = getChatTemplate();

    const overlayRoot = document.createElement('div');
    overlayRoot.id = 'wf-overlay-root';
    overlayRoot.style.display = 'contents';

    this.shadow.innerHTML = '';
    this.shadow.append(style, container, overlayRoot);

    this.bindElements();
    this.initializeScrollManager();
    this.bindEvents();

    // Initial UI update
    this.updateInputUI();
    this.updateThread();
    this.updateButtons();
    this.updateCollapseUI();
  }

  private bindElements() {
    this.containerEl = this.shadow.querySelector('#wf-container') as HTMLDivElement;
    this.startersAreaEl = this.shadow.querySelector('#wf-starters-area') as HTMLDivElement;
    this.attachmentsAreaEl = this.shadow.querySelector('#wf-attachments-area') as HTMLDivElement;
    this.threadEl = this.shadow.querySelector('#wf-thread') as HTMLDivElement;
    this.threadContentEl = this.shadow.querySelector('#wf-thread-content') as HTMLDivElement;
    this.bottomAnchorEl = this.shadow.querySelector('#wf-thread-anchor') as HTMLDivElement;
    this.inputEl = this.shadow.querySelector('#wf-input') as HTMLTextAreaElement;
    this.sendButtonEl = this.shadow.querySelector('#wf-send') as HTMLButtonElement;
    this.undoButtonEl = this.shadow.querySelector('#wf-undo') as HTMLButtonElement;
    this.restartButtonEl = this.shadow.querySelector('#wf-restart') as HTMLButtonElement;
    this.errorBannerEl = this.shadow.querySelector('#wf-error-banner') as HTMLDivElement;

    this.collapseControlEl = this.shadow.querySelector('#wf-control-bar') as HTMLDivElement;
    this.collapseToggleEl = this.shadow.querySelector('#wf-collapse-toggle') as HTMLButtonElement;
    this.collapseLabelEl = this.shadow.querySelector('#wf-collapse-label') as HTMLSpanElement;
    this.collapseIconEl = this.shadow.querySelector('#wf-collapse-icon') as HTMLSpanElement;
    this.conversationWrapperEl = this.shadow.querySelector('#wf-conversation-wrapper') as HTMLDivElement;
    
    this.turnNavEl = this.shadow.querySelector('#wf-turn-nav') as HTMLDivElement;
    this.turnFirstButtonEl = this.shadow.querySelector('#wf-turn-first') as HTMLButtonElement;
    this.turnPrevButtonEl = this.shadow.querySelector('#wf-turn-prev') as HTMLButtonElement;
    this.turnNextButtonEl = this.shadow.querySelector('#wf-turn-next') as HTMLButtonElement;
    this.turnLastButtonEl = this.shadow.querySelector('#wf-turn-last') as HTMLButtonElement;
    this.turnIndicatorEl = this.shadow.querySelector('#wf-turn-indicator') as HTMLSpanElement;
    
    // Speech-to-Text
    this.micButtonEl = this.shadow.querySelector('#wf-mic') as HTMLButtonElement;
    this.micIconEl = this.shadow.querySelector('#wf-mic-icon') as HTMLSpanElement;
    this.recordingIndicatorEl = this.shadow.querySelector('#wf-recording-indicator') as HTMLDivElement;
    this.recordingDurationEl = this.shadow.querySelector('#wf-recording-duration') as HTMLSpanElement;
    this.stopRecordingButtonEl = this.shadow.querySelector('#wf-stop-recording') as HTMLButtonElement;
    this.transcribingIndicatorEl = this.shadow.querySelector('#wf-transcribing-indicator') as HTMLDivElement;
    
    // Camera Capture
    this.cameraButtonEl = this.shadow.querySelector('#wf-camera') as HTMLButtonElement;

    // Input Customization
    this.inputLabelEl = this.shadow.querySelector('#wf-input-label') as HTMLLabelElement;
  }

  private initializeScrollManager() {
    if (!this.threadEl || !this.bottomAnchorEl) return;
    this.scrollManager = new ScrollManager(
      this.threadEl,
      this.bottomAnchorEl,
      () => this.state.isStreaming,
      () => this.state.isCollapsed
    );
  }

  private bindEvents() {
    this.sendButtonEl?.addEventListener('click', () => this.onSend?.());
    this.undoButtonEl?.addEventListener('click', () => this.onUndo?.());
    this.restartButtonEl?.addEventListener('click', () => this.onRestart?.());
    
    this.inputEl?.addEventListener('input', () => {
      this.adjustTextareaHeight();
      this.onInput?.();
    });
    this.inputEl?.addEventListener('paste', (e) => this.onPaste?.(e));
    this.inputEl?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.onSend?.();
      }
    });

    this.collapseToggleEl?.addEventListener('click', () => this.onCollapseToggle?.());
    
    this.turnFirstButtonEl?.addEventListener('click', () => this.onTurnNav?.('first'));
    this.turnPrevButtonEl?.addEventListener('click', () => this.onTurnNav?.('prev'));
    this.turnNextButtonEl?.addEventListener('click', () => this.onTurnNav?.('next'));
    this.turnLastButtonEl?.addEventListener('click', () => this.onTurnNav?.('last'));
    
    // Speech-to-Text
    this.micButtonEl?.addEventListener('click', () => this.onMicClick?.());
    this.stopRecordingButtonEl?.addEventListener('click', () => this.onStopRecording?.());
    
    // Camera Capture
    this.cameraButtonEl?.addEventListener('click', () => this.onCameraClick?.());
  }

  public destroy() {
    this.scrollManager?.destroy();
    this.unmountAssistantRoots();
  }

  public updateThread() {
    if (!this.threadEl) return;

    if (this.state.authError) {
      this.unmountAssistantRoots();
      const errorHtml = renderAuthError(this.state.authError.code, this.state.authError.message);
      if (this.threadContentEl) {
        this.threadContentEl.innerHTML = errorHtml;
      } else {
        this.threadEl.innerHTML = errorHtml;
      }
      return;
    }

    if (this.state.messages.length === 0) {
      this.unmountAssistantRoots();
      if (this.threadContentEl) {
        this.threadContentEl.innerHTML = '';
      }
      this.updateTurnNavigation(0); // Hide turn navigation when no messages
      this.renderEmptyState(); // Ensure empty state is shown if appropriate
      return;
    }

    // Determine turns to display
    const turns = this.groupMessagesIntoTurns();
    const displayTurns = this.getDisplayTurns(turns);

    this.updateTurnNavigation(turns.length);
    this.emitTurnsHiddenEvent(turns.length, displayTurns.length);

    const rendered = this.renderTurns(displayTurns);
    
    if (this.threadContentEl) {
      this.threadContentEl.innerHTML = rendered.join('');
    } else {
      this.threadEl.innerHTML = rendered.join('');
    }
    
    this.mountAssistantMarkdown();
    this.updateCollapseUI();
    this.scrollManager?.maybeAutoScrollToBottom();
  }

  private groupMessagesIntoTurns() {
    const turns: Array<{ user: Message | null; assistants: Message[] }> = [];
    let currentTurn: { user: Message | null; assistants: Message[] } | null = null;

    for (const msg of this.state.messages) {
      if (msg.role === 'User') {
        if (currentTurn) turns.push(currentTurn);
        currentTurn = { user: msg, assistants: [] };
      } else if (msg.role === 'Assistant' && currentTurn) {
        currentTurn.assistants.push(msg);
      }
    }
    if (currentTurn) turns.push(currentTurn);
    return turns;
  }

  private getDisplayTurns(turns: Array<{ user: Message | null; assistants: Message[] }>) {
    if (this.state.displayMode === 'last-turn' && turns.length > 0) {
      const targetTurnNumber = this.state.activeTurnIndex ?? turns.length;
      const turnArrayIndex = targetTurnNumber - 1;
      if (turnArrayIndex >= 0 && turnArrayIndex < turns.length) {
        return [turns[turnArrayIndex]];
      }
      return [turns[turns.length - 1]];
    }
    return turns;
  }

  private emitTurnsHiddenEvent(totalTurns: number, displayedCount: number) {
    if (this.state.displayMode === 'last-turn' && totalTurns > 0 && displayedCount < totalTurns) {
      const currentTurnNumber = this.state.activeTurnIndex ?? totalTurns;
      this.shadow.dispatchEvent(new CustomEvent('wf-turns-hidden', {
        bubbles: true,
        composed: true,
        detail: {
          totalTurns: totalTurns,
          displayedTurnIndex: currentTurnNumber,
          hiddenTurns: totalTurns - 1
        }
      }));
    }
  }

  private renderTurns(turns: Array<{ user: Message | null; assistants: Message[] }>) {
    const rendered: string[] = [];
    for (const turn of turns) {
      if (turn.user) {
        rendered.push(renderMessage(turn.user, 'user', this.state.publishedGuideConfig));
      }
      if (turn.user) {
        if (turn.assistants.length > 0) {
          this.renderAssistantTurn(turn.assistants, rendered);
        } else {
          this.renderEmptyAssistant(turn.user, rendered);
        }
      }
    }
    return rendered;
  }

  private renderAssistantTurn(assistants: Message[], rendered: string[]) {
    // Deduplicate identical sequential messages
    const uniqueAssistants = assistants.filter((msg, i, arr) => {
      return i === arr.length - 1 || msg.content !== arr[i + 1].content;
    });

    const mergedContent = uniqueAssistants
      .map(m => m.content)
      .filter(c => c != null && c.trim() !== '')
      .join('\n\n');
      
    const lastAssistant = assistants[assistants.length - 1];
    const mergedMessage: Message = {
      id: lastAssistant.id,
      role: 'Assistant',
      content: mergedContent,
      created: lastAssistant.created,
      isEdited: lastAssistant.isEdited
    };
    
    rendered.push(renderMessage(
      mergedMessage, 
      'assistant', 
      this.state.publishedGuideConfig, 
      this.state.isStreaming && this.state.streamingAssistantMessageId === lastAssistant.id
    ));
  }

  private renderEmptyAssistant(user: Message, rendered: string[]) {
    const emptyAssistant: Message = {
      id: this.state.streamingAssistantMessageId || `empty-${user.id}`,
      role: 'Assistant',
      content: '',
      created: user.created,
      isEdited: false
    };
    rendered.push(renderMessage(
      emptyAssistant, 
      'assistant', 
      this.state.publishedGuideConfig, 
      this.state.isStreaming && this.state.streamingAssistantMessageId === emptyAssistant.id
    ));
  }

  private mountAssistantMarkdown() {
    if (!this.threadEl) return;
    const baseUrl = this.state.apiBaseUrl || undefined;
    const scope = this.threadContentEl || this.threadEl;
    const nodes = Array.from(scope.querySelectorAll('.wf-assistant-markdown')) as HTMLDivElement[];
    const visibleIds = new Set(nodes.map(n => n.getAttribute('data-msg-id') || ''));
    
    // Unmount invisible
    for (const [id, entry] of this.assistantRoots.entries()) {
      if (!visibleIds.has(id)) {
        try { entry.root.unmount(); } catch {}
        this.assistantRoots.delete(id);
      }
    }
    
    // Mount visible
    for (const node of nodes) {
      const msgId = node.getAttribute('data-msg-id') || '';
      const encodedContent = node.getAttribute('data-md') || '';
      let content = '';
      try {
        content = decodeURIComponent(encodedContent);
      } catch {
        const message = this.state.messages.find(m => m.id === msgId);
        if (message) content = message.content;
        else continue;
      }
      
      const existing = this.assistantRoots.get(msgId);
      if (existing && existing.container !== node) {
        try { existing.root.unmount(); } catch {}
        this.assistantRoots.delete(msgId);
      }
      
      let entry = this.assistantRoots.get(msgId);
      if (!entry) {
        const newRoot = createRoot(node);
        entry = { root: newRoot, container: node };
        this.assistantRoots.set(msgId, entry);
      }
      
      entry.root.render(
        React.createElement(MinimalChatMarkdownViewer, {
          text: content,
          isStreaming: this.state.isStreaming && this.state.streamingAssistantMessageId === msgId,
          apiBaseUrl: baseUrl,
          authToken: this.state.authToken || undefined,
          projectId: this.state.projectId || undefined,
          notebookId: this.state.notebookId || undefined,
          conversationId: this.state.conversationId || undefined,
          pubId: this.state.pubId || undefined,
          maxImageHeight: 450,
          enableImageFullscreen: true,
          portalContainer: this.shadow.querySelector('#wf-overlay-root') as HTMLElement
        })
      );
    }
  }

  public unmountAssistantRoots() {
    for (const [, entry] of this.assistantRoots) {
      try { entry.root.unmount(); } catch {}
    }
    this.assistantRoots.clear();
  }

  public updateButtons() {
    if (this.sendButtonEl) {
      this.sendButtonEl.disabled = this.state.isStreaming || this.state.isUploading;
    }
    if (this.undoButtonEl) {
      const disabled = this.state.isStreaming || this.state.messages.length === 0 || this.state.commandMode;
      this.undoButtonEl.disabled = disabled;
      if (this.state.commandMode) this.undoButtonEl.classList.add('hidden'); 
      else this.undoButtonEl.classList.remove('hidden');
    }
    if (this.restartButtonEl) {
      const disabled = this.state.isStreaming || this.state.commandMode;
      this.restartButtonEl.disabled = disabled;
      if (this.state.commandMode) this.restartButtonEl.classList.add('hidden'); 
      else this.restartButtonEl.classList.remove('hidden');
    }
    if (this.containerEl) {
      this.containerEl.setAttribute('aria-busy', this.state.isStreaming.toString());
    }
    this.updateCollapseUI();
  }

  public updateCollapseUI() {
    if (!this.collapseControlEl || !this.conversationWrapperEl) return;
    
    const hasMessages = this.state.messages.length > 0;
    const hasStarters = this.state.conversationStartersEnabled && this.state.conversationStarters.length > 0 && !this.state.authError;
    
    if (!hasMessages && hasStarters && this.startersAreaEl) {
      this.renderEmptyState();
    } else if (this.startersAreaEl) {
      this.startersAreaEl.classList.add('hidden');
      this.startersAreaEl.innerHTML = '';
    }
    
    if (hasMessages) {
      this.conversationWrapperEl.classList.remove('hidden');
    } else {
      this.conversationWrapperEl.classList.add('hidden');
    }
    
    if (this.collapseToggleEl) {
      if (this.state.collapsible && hasMessages) {
        this.collapseToggleEl.classList.remove('hidden');
      } else {
        this.collapseToggleEl.classList.add('hidden');
      }
    }
    
    if (this.state.collapsible) {
      this.conversationWrapperEl.classList.add('wf-collapsible-mode');
    } else {
      this.conversationWrapperEl.classList.remove('wf-collapsible-mode');
    }
    
    if (this.state.isCollapsed) {
      this.conversationWrapperEl.classList.add('wf-collapsed');
      if (this.collapseIconEl) this.collapseIconEl.textContent = '◀';
      if (this.collapseToggleEl) this.collapseToggleEl.setAttribute('aria-expanded', 'false');
    } else {
      this.conversationWrapperEl.classList.remove('wf-collapsed');
      if (this.collapseIconEl) this.collapseIconEl.textContent = '▼';
      if (this.collapseToggleEl) this.collapseToggleEl.setAttribute('aria-expanded', 'true');
    }
  }

  public renderEmptyState() {
    if (!this.startersAreaEl) return;
    
    const hasStarters = this.state.conversationStartersEnabled && this.state.conversationStarters.length > 0 && !this.state.authError;
    
    if (hasStarters) {
      this.startersAreaEl.classList.remove('hidden');
      this.startersAreaEl.innerHTML = renderConversationStartersEmptyState(
        this.state.conversationStarters, 
        this.state.publishedGuideConfig || undefined, 
        this.state.publishedGuideAvatarUrl
      );
      this.bindConversationStarterHandlers();
    } else {
      this.startersAreaEl.classList.add('hidden');
      this.startersAreaEl.innerHTML = '';
    }
  }

  private bindConversationStarterHandlers() {
    if (!this.startersAreaEl) return;
    const buttons = Array.from(this.startersAreaEl.querySelectorAll<HTMLButtonElement>('[data-wf-starter-index]'));
    if (buttons.length === 0) return;

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const index = Number(button.getAttribute('data-wf-starter-index') || '0');
        this.onStarterSelected?.(index);
      });
    });
  }

  public renderAttachmentsQueue() {
    if (!this.attachmentsAreaEl) return;
    this.attachmentsAreaEl.innerHTML = '';
    
    if (this.state.pendingAttachments.length === 0) {
        this.attachmentsAreaEl.classList.add('hidden');
        return;
    }
    
    this.attachmentsAreaEl.classList.remove('hidden');
    
    this.state.pendingAttachments.forEach((item, index) => {
        const chip = document.createElement('div');
        chip.className = 'flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1 text-xs text-blue-800 group';
        
        let icon = '📄';
        if (item.published.uploadType.startsWith('Image')) icon = '🖼️';
        else if (item.published.uploadType.startsWith('Audio')) icon = '🎵';
        
        chip.innerHTML = `
          <span>${icon}</span>
          <span class="truncate max-w-[120px]">${escapeHtml(item.file.name)}</span>
          <button type="button" class="ml-1 text-blue-400 hover:text-blue-600 focus:outline-none font-bold cursor-pointer" aria-label="Remove attachment">×</button>
        `;
        
        const removeBtn = chip.querySelector('button');
        removeBtn?.addEventListener('click', () => {
            this.onRemoveAttachment?.(index);
        });
        
        this.attachmentsAreaEl!.appendChild(chip);
    });
  }

  public renderLoadingAttachment(fileName: string) {
    if (!this.attachmentsAreaEl) return;
    this.attachmentsAreaEl.classList.remove('hidden');
    
    const chip = document.createElement('div');
    chip.className = 'flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 animate-pulse';
    chip.innerHTML = `
      <span class="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
      <span class="truncate max-w-[120px]">${escapeHtml(fileName)}</span>
    `;
    this.attachmentsAreaEl.appendChild(chip);
  }

  public updateTurnNavigation(totalTurns?: number) {
    if (!this.turnNavEl) return;

    const effectiveTotalTurns = typeof totalTurns === 'number'
      ? totalTurns
      : this.state.getTurnCount();

    const shouldShowNav = this.state.displayMode === 'last-turn' && 
                          this.state.enableTurnNavigation && 
                          effectiveTotalTurns > 1 &&
                          !this.state.commandMode &&
                          !this.state.isCollapsed &&
                          !this.state.isStreaming &&
                          !this.state.isRecording &&
                          !this.state.isTranscribing;
    
    if (shouldShowNav) {
      this.turnNavEl.classList.remove('hidden');
      this.turnNavEl.classList.add('flex');
      
      const currentTurn = this.state.activeTurnIndex ?? effectiveTotalTurns;
      
      if (this.turnIndicatorEl) {
        this.turnIndicatorEl.textContent = `${currentTurn} of ${effectiveTotalTurns}`;
      }
      if (this.turnFirstButtonEl) this.turnFirstButtonEl.disabled = currentTurn <= 1;
      if (this.turnPrevButtonEl) this.turnPrevButtonEl.disabled = currentTurn <= 1;
      if (this.turnNextButtonEl) this.turnNextButtonEl.disabled = currentTurn >= effectiveTotalTurns;
      if (this.turnLastButtonEl) this.turnLastButtonEl.disabled = currentTurn === effectiveTotalTurns;
    } else {
      this.turnNavEl.classList.add('hidden');
      this.turnNavEl.classList.remove('flex');
    }
  }

  public setInlineError(message: string | null) {
    this.state.inlineError = message;
    if (this.errorBannerEl) {
      this.errorBannerEl.textContent = message ?? '';
    }
  }

  public adjustTextareaHeight() {
    if (!this.inputEl) return;
    this.inputEl.style.height = 'auto';
    const maxHeight = 400;
    const newHeight = Math.min(this.inputEl.scrollHeight, maxHeight);
    this.inputEl.style.height = `${newHeight}px`;
    if (this.inputEl.scrollHeight > maxHeight) {
      this.inputEl.style.overflowY = 'auto';
    } else {
      this.inputEl.style.overflowY = 'hidden';
    }
  }

  /**
   * Updates the speech-to-text UI based on current state.
   * Matches full client MicrophoneButton behavior:
   * - Idle: Show mic button (SVG icon)
   * - Recording: Show ear + duration + stop button (SVG square)
   * - Transcribing: Show spinner + "Transcribing..."
   */
  public updateSpeechUI(): void {
    // Mic button: visible only when idle and feature enabled
    if (this.micButtonEl) {
      const showMic = this.state.speechToTextEnabled && !this.state.isRecording && !this.state.isTranscribing;
      this.micButtonEl.classList.toggle('hidden', !showMic);
      if (showMic) {
        this.micButtonEl.disabled = this.state.isStreaming;
      }
    }

    // Recording indicator: visible only when recording
    if (this.recordingIndicatorEl) {
      this.recordingIndicatorEl.classList.toggle('hidden', !this.state.isRecording);
      if (this.state.isRecording) {
        this.recordingIndicatorEl.style.display = 'flex';
      } else {
        this.recordingIndicatorEl.style.display = '';
      }
    }

    // Update recording duration display
    if (this.recordingDurationEl && this.state.isRecording) {
      const mins = Math.floor(this.state.recordingDuration / 60);
      const secs = this.state.recordingDuration % 60;
      this.recordingDurationEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Transcribing indicator: visible only when transcribing
    if (this.transcribingIndicatorEl) {
      this.transcribingIndicatorEl.classList.toggle('hidden', !this.state.isTranscribing);
      if (this.state.isTranscribing) {
        this.transcribingIndicatorEl.style.display = 'flex';
      } else {
        this.transcribingIndicatorEl.style.display = '';
      }
    }
  }

  /**
   * Updates the camera UI based on current state.
   */
  public updateCameraUI(): void {
    // Show/hide camera button based on feature flag, attachments enabled, and support
    // Camera requires attachments to be enabled since it uploads the captured image
    if (this.cameraButtonEl) {
      const shouldShow = this.state.cameraEnabled && this.state.attachmentsEnabled;
      this.cameraButtonEl.classList.toggle('hidden', !shouldShow);
      this.cameraButtonEl.disabled = this.state.isStreaming || this.state.isCameraOpen;
    }
  }

  /**
   * Updates the input label and placeholder based on current state.
   */
  public updateInputUI(): void {
    // Re-query elements if not bound (defensive - they may not exist during early attributeChangedCallback)
    const labelEl = this.inputLabelEl ?? this.shadow.querySelector('#wf-input-label') as HTMLLabelElement | null;
    const inputEl = this.inputEl ?? this.shadow.querySelector('#wf-input') as HTMLTextAreaElement | null;

    if (labelEl) {
      const labelText = this.state.inputLabel;
      labelEl.textContent = labelText;
      // Hide the label entirely when empty to take zero height
      if (labelText === '') {
        labelEl.classList.add('hidden');
      } else {
        labelEl.classList.remove('hidden');
      }
    }
    if (inputEl) {
      inputEl.placeholder = this.state.inputPlaceholder;
    }
  }

  /**
   * Get the shadow root for modal rendering.
   */
  public getShadowRoot(): ShadowRoot {
    return this.shadow;
  }
}

