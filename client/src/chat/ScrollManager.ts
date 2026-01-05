export class ScrollManager {
  private threadEl: HTMLElement;
  private bottomAnchorEl: HTMLElement;
  private isAutoScrollPinned: boolean = false;
  private suppressScrollHandler: boolean = false;
  private scrollOnNextResize: boolean = false;
  private resizeObserver?: ResizeObserver;
  private mutationObserver?: MutationObserver;
  
  private getIsStreaming: () => boolean;
  private getIsCollapsed: () => boolean;

  constructor(
    threadEl: HTMLElement, 
    bottomAnchorEl: HTMLElement,
    getIsStreaming: () => boolean,
    getIsCollapsed: () => boolean
  ) {
    this.threadEl = threadEl;
    this.bottomAnchorEl = bottomAnchorEl;
    this.getIsStreaming = getIsStreaming;
    this.getIsCollapsed = getIsCollapsed;
    
    this.init();
  }

  private init() {
    this.threadEl.addEventListener('scroll', this.handleThreadScroll);
    this.initAutoPinObservers();
  }

  public destroy() {
    this.threadEl.removeEventListener('scroll', this.handleThreadScroll);
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
  }

  public setAutoScrollPinned(pinned: boolean) {
    this.isAutoScrollPinned = pinned;
  }

  public getAutoScrollPinned(): boolean {
    return this.isAutoScrollPinned;
  }

  public scrollToBottomOnNextResize() {
    this.scrollOnNextResize = true;
    // Keep the flag active for a short window to catch multiple layout shifts 
    // (e.g. DOM mutation followed by React render resize)
    setTimeout(() => {
      this.scrollOnNextResize = false;
    }, 500);
  }

  /**
   * CRITICAL SCROLL HANDLER - DO NOT BREAK THIS
   * 
   * Detects when the user manually scrolls away from the bottom during streaming.
   * When detected, disables auto-pinning so we don't fight the user's scroll position.
   */
  private handleThreadScroll = () => {
    if (!this.getIsStreaming()) return;
    if (this.suppressScrollHandler) return; // Ignore our own programmatic scrolls
    if (!this.isAutoScrollPinned) return; // Already unpinned, nothing to do
      
    const epsilon = 24; // px threshold from bottom (allows for rounding errors)
    const distanceFromBottom = this.threadEl.scrollHeight - (this.threadEl.scrollTop + this.threadEl.clientHeight);
    
    if (distanceFromBottom > epsilon) {
      // User scrolled away from bottom; disable auto-pinning for this stream
      this.isAutoScrollPinned = false;
    }
  };

  /**
   * CRITICAL AUTOSCROLL OBSERVERS - DO NOT BREAK THIS AGAIN
   */
  private initAutoPinObservers() {
    // RESIZE OBSERVER: Detects when threadEl content size changes
    try {
      this.resizeObserver?.disconnect();
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          if ((this.getIsStreaming() && this.isAutoScrollPinned) || this.scrollOnNextResize) {
            this.scrollToBottom();
          }
        });
        this.resizeObserver.observe(this.threadEl);
      }
    } catch (err) {
      console.error('[wf] Failed to init ResizeObserver:', err);
    }
    
    // MUTATION OBSERVER: Detects when threadEl DOM changes
    try {
      this.mutationObserver?.disconnect();
      this.mutationObserver = new MutationObserver(() => {
        if ((this.getIsStreaming() && this.isAutoScrollPinned) || this.scrollOnNextResize) {
          this.scrollToBottom();
        }
      });
      this.mutationObserver.observe(this.threadEl, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    } catch (err) {
      console.error('[wf] Failed to init MutationObserver:', err);
    }
  }

  /**
   * CRITICAL AUTOSCROLL METHOD - DO NOT MODIFY WITHOUT UNDERSTANDING
   */
  public scrollToBottom() {
    if (!this.threadEl) return;
    
    // If content does not overflow, keep messages top-aligned
    try {
      const overflows = (this.threadEl.scrollHeight - this.threadEl.clientHeight) > 2;
      if (!overflows) {
        return;
      }
    } catch {}
    
    this.suppressScrollHandler = true;
    
    // IMMEDIATE SCROLL
    try {
      if (this.bottomAnchorEl?.scrollIntoView) {
        this.bottomAnchorEl.scrollIntoView({ block: 'end' });
      } else {
        this.threadEl.scrollTop = this.threadEl.scrollHeight;
      }
    } catch {
      this.threadEl.scrollTop = this.threadEl.scrollHeight;
    }
    
    // DEFERRED SCROLLS
    try {
      requestAnimationFrame(() => {
        if (!this.threadEl) { 
          this.suppressScrollHandler = false; 
          return; 
        }
        
        try {
          if (this.bottomAnchorEl?.scrollIntoView) {
            this.bottomAnchorEl.scrollIntoView({ block: 'end' });
          } else {
            this.threadEl.scrollTop = this.threadEl.scrollHeight;
          }
        } catch {
          this.threadEl.scrollTop = this.threadEl.scrollHeight;
        }
        
        setTimeout(() => {
          try {
            if (this.bottomAnchorEl?.scrollIntoView) {
              this.bottomAnchorEl.scrollIntoView({ block: 'end' });
            } else if (this.threadEl) {
              this.threadEl.scrollTop = this.threadEl.scrollHeight;
            }
          } catch {}
        }, 0);
        
        this.suppressScrollHandler = false;
      });
    } catch {
      this.suppressScrollHandler = false;
    }
  }

  public maybeAutoScrollToBottom() {
    if (!this.threadEl) return;
    if (this.getIsCollapsed()) return;
    
    if (this.isAutoScrollPinned) {
      this.scrollToBottom();
    }
  }
}

