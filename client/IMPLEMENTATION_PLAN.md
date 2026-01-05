# Implementation Plan: Minimal Chat Component - Last Turn Mode with Collapsible Content

## Overview
Extend the minimal chat component to support three new features:
1. **Last Turn Mode**: Display only the last turn instead of full conversation
2. **Turn Navigation**: Optional prev/next/latest controls (inside conversation area)
3. **Collapsible Content**: Option to collapse/expand conversation (auto-expands on send)

## Architecture Changes

### Component Structure

```
┌─────────────────────────────────────────┐
│  Input Area (always visible)            │
│  - Textarea                              │
│  - Send/Undo buttons                     │
│  - Error banner                          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Collapse Toggle (when collapsible)     │
│  [▼ Conversation (3 turns)]              │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  Conversation Area (collapsible)        │
│  ┌─────────────────────────────────────┐│
│  │ Turn Navigation (when enabled)      ││
│  │ [← Prev] [Turn 2 of 3] [Next →]    ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ Thread Content                      ││
│  │ - User message                      ││
│  │ - Assistant message                 ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**When Collapsed:**
```
┌─────────────────────────────────────────┐
│  Input Area (always visible)            │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  [▶ Conversation (3 turns)]              │
└─────────────────────────────────────────┘
```

## Detailed Implementation Plan

### 1. State Management

#### New Properties (around line 44)
```typescript
private displayMode: 'full' | 'last-turn' = 'full';
private enableTurnNavigation: boolean = false;
private activeTurnIndex: number | null = null; // null = show latest turn
private collapsible: boolean = false;
private isCollapsed: boolean = false;
```

#### New Element References (around line 66)
```typescript
// Collapse control (outside conversation area)
private collapseControlEl?: HTMLDivElement;
private collapseToggleEl?: HTMLButtonElement;
private collapseLabelEl?: HTMLSpanElement;
private collapseIconEl?: HTMLSpanElement;

// Conversation wrapper (contains nav + thread)
private conversationWrapperEl?: HTMLDivElement;

// Navigation elements (inside conversation area)
private turnNavEl?: HTMLDivElement;
private turnPrevButtonEl?: HTMLButtonElement;
private turnNextButtonEl?: HTMLButtonElement;
private turnLatestButtonEl?: HTMLButtonElement;
private turnIndicatorEl?: HTMLSpanElement;
```

### 2. Attributes

#### Update observedAttributes (line 108)
```typescript
static get observedAttributes() {
  return [
    'api-base-url', 
    'auth-token', 
    'pub-id', 
    'display-mode',           // NEW: 'full' | 'last-turn'
    'enable-turn-navigation', // NEW: boolean (default false)
    'collapsible'             // NEW: boolean (default false)
  ];
}
```

#### Update attributeChangedCallback (line 111)
```typescript
attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
  if (name === 'api-base-url') this.apiBaseUrl = newValue;
  if (name === 'auth-token') this.authToken = newValue;
  if (name === 'pub-id') this.pubId = newValue;
  if (name === 'display-mode') {
    this.displayMode = (newValue === 'last-turn') ? 'last-turn' : 'full';
  }
  if (name === 'enable-turn-navigation') {
    this.enableTurnNavigation = newValue !== null && newValue !== 'false';
  }
  if (name === 'collapsible') {
    this.collapsible = newValue !== null && newValue !== 'false';
  }
}
```

#### Update connectedCallback (line 117)
```typescript
connectedCallback() {
  this.apiBaseUrl = this.getAttribute('api-base-url');
  this.authToken = this.getAttribute('auth-token');
  this.pubId = this.getAttribute('pub-id');
  this.displayMode = (this.getAttribute('display-mode') === 'last-turn') ? 'last-turn' : 'full';
  this.enableTurnNavigation = this.hasAttribute('enable-turn-navigation') && 
                               this.getAttribute('enable-turn-navigation') !== 'false';
  this.collapsible = this.hasAttribute('collapsible') && 
                     this.getAttribute('collapsible') !== 'false';
  this.isCollapsed = false; // Always start expanded
  this.render();
}
```

### 3. HTML Structure Changes

#### Update render() Method (line 294)

Move turn navigation INSIDE conversation wrapper:

```typescript
container.innerHTML = `
  <!-- Input Area (always visible) -->
  <div class="flex flex-col gap-2">
    <label for="wf-input" class="text-sm font-medium text-gray-700">Message</label>
    <textarea 
      id="wf-input" 
      placeholder="Type your message..." 
      class="w-full min-h-[90px] p-2 border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    ></textarea>
    <div class="flex gap-2 justify-end">
      <button 
        id="wf-undo" 
        class="bg-gray-200 text-gray-700 border-0 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-sm"
      >
        Undo last
      </button>
      <button 
        id="wf-send" 
        class="bg-blue-600 text-white border-0 px-3 py-2 rounded-md cursor-pointer hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Send
      </button>
    </div>
    <div id="wf-error-banner" class="min-h-[1.5rem] text-sm text-red-600"></div>
  </div>
  
  <!-- Collapse Toggle (outside conversation, hidden by default) -->
  <div id="wf-collapse-control" class="hidden">
    <button 
      id="wf-collapse-toggle" 
      class="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md cursor-pointer transition-colors text-sm font-medium text-gray-700"
    >
      <span id="wf-collapse-label">Conversation</span>
      <span id="wf-collapse-icon" class="text-gray-500 transition-transform">▼</span>
    </button>
  </div>
  
  <!-- Conversation Wrapper (collapsible container) -->
  <div id="wf-conversation-wrapper" class="flex flex-col gap-2">
    
    <!-- Turn Navigation (INSIDE wrapper, hidden by default) -->
    <div id="wf-turn-nav" class="hidden items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
      <div class="flex items-center gap-2">
        <button 
          id="wf-turn-prev" 
          class="bg-white text-blue-600 border border-blue-300 px-2 py-1 rounded cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          title="Previous turn"
        >
          ← Prev
        </button>
        <span id="wf-turn-indicator" class="text-sm font-medium text-blue-900">Turn 1 of 1</span>
        <button 
          id="wf-turn-next" 
          class="bg-white text-blue-600 border border-blue-300 px-2 py-1 rounded cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          title="Next turn"
        >
          Next →
        </button>
      </div>
      <button 
        id="wf-turn-latest" 
        class="bg-blue-600 text-white border-0 px-2 py-1 rounded cursor-pointer hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
        title="Jump to latest turn"
      >
        Latest
      </button>
    </div>
    
    <!-- Thread (messages) -->
    <div id="wf-thread" class="min-h-[100px] max-h-[calc(100vh-250px)] overflow-y-auto border-b border-gray-200 pb-3">
      <div id="wf-thread-content" class="flex flex-col gap-4"></div>
      <div id="wf-thread-anchor" style="height:1px"></div>
    </div>
    
  </div>
`;
```

### 4. CSS Styling

#### Update Style Section (line 258)
```typescript
const style = document.createElement('style');
style.textContent = tailwindStyles + `
  :host {
    display: block;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  }
  
  /* Existing streaming animations */
  @keyframes pulse-gradient {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.3; }
  }
  @keyframes bounce-dot {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  .wf-streaming-assistant {
    position: relative;
    overflow: hidden;
  }
  .wf-streaming-assistant::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 50%, rgba(59, 130, 246, 0.1) 100%);
    background-size: 200% 100%;
    animation: pulse-gradient 2s ease-in-out infinite;
    pointer-events: none;
    z-index: 0;
  }
  .wf-streaming-assistant > * {
    position: relative;
    z-index: 1;
  }
  
  /* NEW: Collapse transitions */
  #wf-conversation-wrapper {
    transition: max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, margin 0.3s ease-in-out;
    overflow: hidden;
  }
  #wf-conversation-wrapper.wf-collapsed {
    max-height: 0 !important;
    opacity: 0;
    margin: 0;
  }
  
  /* Collapse icon rotation */
  #wf-collapse-icon {
    transition: transform 0.2s ease-in-out;
  }
  #wf-collapse-icon.wf-rotated {
    transform: rotate(-90deg);
  }
`;
```

### 5. Element Reference Storage

#### Update render() Method - Store References (line 325)
```typescript
// Existing references
this.inputEl = this.shadow.querySelector('#wf-input') as HTMLTextAreaElement;
this.sendButtonEl = this.shadow.querySelector('#wf-send') as HTMLButtonElement;
this.undoButtonEl = this.shadow.querySelector('#wf-undo') as HTMLButtonElement;
this.errorBannerEl = this.shadow.querySelector('#wf-error-banner') as HTMLDivElement;
this.threadEl = this.shadow.querySelector('#wf-thread') as HTMLDivElement;
this.threadContentEl = this.shadow.querySelector('#wf-thread-content') as HTMLDivElement;
this.bottomAnchorEl = this.shadow.querySelector('#wf-thread-anchor') as HTMLDivElement;

// NEW: Collapse elements
this.collapseControlEl = this.shadow.querySelector('#wf-collapse-control') as HTMLDivElement;
this.collapseToggleEl = this.shadow.querySelector('#wf-collapse-toggle') as HTMLButtonElement;
this.collapseLabelEl = this.shadow.querySelector('#wf-collapse-label') as HTMLSpanElement;
this.collapseIconEl = this.shadow.querySelector('#wf-collapse-icon') as HTMLSpanElement;

// NEW: Conversation wrapper
this.conversationWrapperEl = this.shadow.querySelector('#wf-conversation-wrapper') as HTMLDivElement;

// NEW: Navigation elements
this.turnNavEl = this.shadow.querySelector('#wf-turn-nav') as HTMLDivElement;
this.turnPrevButtonEl = this.shadow.querySelector('#wf-turn-prev') as HTMLButtonElement;
this.turnNextButtonEl = this.shadow.querySelector('#wf-turn-next') as HTMLButtonElement;
this.turnLatestButtonEl = this.shadow.querySelector('#wf-turn-latest') as HTMLButtonElement;
this.turnIndicatorEl = this.shadow.querySelector('#wf-turn-indicator') as HTMLSpanElement;
```

### 6. Event Listeners

#### Update render() Method - Wire Up Events (line 340)
```typescript
// Existing listeners
this.sendButtonEl?.addEventListener('click', () => this.onSend());
this.undoButtonEl?.addEventListener('click', () => this.onUndo());
this.inputEl?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    this.onSend();
  }
});
this.threadEl?.addEventListener('scroll', this.handleThreadScroll);

// NEW: Collapse listener
this.collapseToggleEl?.addEventListener('click', () => this.toggleCollapse());

// NEW: Turn navigation listeners
this.turnPrevButtonEl?.addEventListener('click', () => this.goToPreviousTurn());
this.turnNextButtonEl?.addEventListener('click', () => this.goToNextTurn());
this.turnLatestButtonEl?.addEventListener('click', () => {
  this.activeTurnIndex = null; // null = latest
  this.updateThread();
});

// Initialize UI
this.initAutoPinObservers();
this.updateThread();
this.updateButtons();
this.updateCollapseUI();
```

### 7. Core Logic Changes

#### Update updateThread() Method (line 796)

Add turn filtering logic:

```typescript
// After grouping messages into turns (line 796)
if (currentTurn) turns.push(currentTurn);

// NEW: Filter turns based on display mode
let displayTurns = turns;
if (this.displayMode === 'last-turn' && turns.length > 0) {
  // Determine which turn to display
  const targetTurnIndex = this.activeTurnIndex ?? turns[turns.length - 1].user?.turnIndex ?? 0;
  
  // Find the turn with matching turnIndex
  const targetTurn = turns.find(t => t.user?.turnIndex === targetTurnIndex);
  
  if (targetTurn) {
    displayTurns = [targetTurn];
  } else {
    // Fallback to last turn if target not found
    displayTurns = [turns[turns.length - 1]];
  }
}

// NEW: Update navigation UI
this.updateTurnNavigation(turns.length);

// NEW: Emit event if turns are hidden
if (this.displayMode === 'last-turn' && turns.length > 0 && displayTurns.length < turns.length) {
  const currentTurn = this.activeTurnIndex ?? turns[turns.length - 1].user?.turnIndex ?? 0;
  this.dispatchEvent(new CustomEvent('wf-turns-hidden', {
    bubbles: true,
    detail: {
      totalTurns: turns.length,
      displayedTurnIndex: currentTurn,
      hiddenTurns: turns.length - 1
    }
  }));
}

// Render each turn: User message, then merged Assistant messages
const rendered: string[] = [];
for (const turn of displayTurns) {  // Changed from 'turns' to 'displayTurns'
  // ... existing rendering logic unchanged
}

// ... existing rendering code ...

this.mountAssistantMarkdown();
this.updateCollapseUI(); // NEW: Update collapse UI after rendering
```

#### Update onSend() Method (line 355)

Add auto-expand and turn reset:

```typescript
private async onSend() {
  if (!this.pubId) {
    this.showError('Missing pub-id attribute');
    return;
  }
  const content = (this.inputEl?.value || '').trim();
  if (!content) return;
  if (this.isStreaming) return;

  // NEW: Auto-expand if collapsed
  if (this.collapsible && this.isCollapsed) {
    this.expand();
  }

  // Ensure IDs are resolved and config is loaded
  try {
    await this.ensureResolvedIds();
  } catch (err: any) {
    // ... existing error handling
  }

  // ... existing validation ...

  try {
    console.log('[wf] stream:start', { contentLen: content.length });
  } catch {}
  this.isStreaming = true;
  this.isAutoScrollPinned = true;
  this.updateButtons();
  this.dispatchEvent(new CustomEvent('wf-stream-start', { bubbles: true }));

  try {
    await this.ensureConversation();

    if (this.inputEl) {
      this.inputEl.value = '';
    }

    // Optimistic update: add user message
    const newTurnIndex = this.currentTurnIndex + 1;
    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: 'User',
      content,
      turnIndex: newTurnIndex,
      messageSequence: 1,
      created: new Date().toISOString(),
      isEdited: false
    };
    this.messages.push(userMessage);

    // NEW: Reset to latest turn when sending new message
    if (this.displayMode === 'last-turn') {
      this.activeTurnIndex = null; // null = show latest
    }

    // ... rest of method unchanged
  }
}
```

#### Update maybeAutoScrollToBottom() Method (line 1042)

Respect collapsed state:

```typescript
private maybeAutoScrollToBottom() {
  if (!this.threadEl) return;
  // NEW: Don't auto-scroll when collapsed
  if (this.isCollapsed) return;
  if (this.isAutoScrollPinned) {
    this.scrollToBottom();
  }
}
```

### 8. New Methods

#### Add updateTurnNavigation() Method
```typescript
private updateTurnNavigation(totalTurns: number) {
  if (!this.turnNavEl) return;
  
  // Show/hide navigation based on mode and enablement
  const shouldShowNav = this.displayMode === 'last-turn' && 
                        this.enableTurnNavigation && 
                        totalTurns > 0 &&
                        !this.isCollapsed; // NEW: Hide when collapsed
  
  if (shouldShowNav) {
    this.turnNavEl.classList.remove('hidden');
    this.turnNavEl.classList.add('flex');
    
    // Update indicator and button states
    const currentTurn = this.activeTurnIndex ?? totalTurns;
    
    if (this.turnIndicatorEl) {
      this.turnIndicatorEl.textContent = `Turn ${currentTurn} of ${totalTurns}`;
    }
    
    if (this.turnPrevButtonEl) {
      this.turnPrevButtonEl.disabled = currentTurn <= 1;
    }
    
    if (this.turnNextButtonEl) {
      this.turnNextButtonEl.disabled = currentTurn >= totalTurns;
    }
    
    if (this.turnLatestButtonEl) {
      this.turnLatestButtonEl.disabled = currentTurn === totalTurns;
    }
  } else {
    this.turnNavEl.classList.add('hidden');
    this.turnNavEl.classList.remove('flex');
  }
}
```

#### Add updateCollapseUI() Method
```typescript
private updateCollapseUI() {
  if (!this.collapseControlEl || !this.conversationWrapperEl) return;
  
  // Show/hide collapse control based on collapsible setting
  if (this.collapsible && this.messages.length > 0) {
    this.collapseControlEl.classList.remove('hidden');
    this.collapseControlEl.classList.add('block');
  } else {
    this.collapseControlEl.classList.add('hidden');
    this.collapseControlEl.classList.remove('block');
  }
  
  // Update collapsed state
  if (this.isCollapsed) {
    this.conversationWrapperEl.classList.add('wf-collapsed');
    if (this.collapseIconEl) {
      this.collapseIconEl.classList.add('wf-rotated');
    }
  } else {
    this.conversationWrapperEl.classList.remove('wf-collapsed');
    if (this.collapseIconEl) {
      this.collapseIconEl.classList.remove('wf-rotated');
    }
  }
  
  // Update label to show message count when collapsed
  if (this.collapseLabelEl) {
    const turnCount = this.getTurnCount();
    if (this.isCollapsed && turnCount > 0) {
      this.collapseLabelEl.textContent = `Conversation (${turnCount} turn${turnCount !== 1 ? 's' : ''})`;
    } else {
      this.collapseLabelEl.textContent = 'Conversation';
    }
  }
  
  // Update turn navigation visibility
  this.updateTurnNavigation(this.getTurnCount());
}
```

### 9. Public API Methods

#### Display Mode Methods
```typescript
public setDisplayMode(mode: 'full' | 'last-turn'): void {
  this.displayMode = mode;
  this.setAttribute('display-mode', mode);
  this.updateThread();
}

public getDisplayMode(): 'full' | 'last-turn' {
  return this.displayMode;
}
```

#### Turn Navigation Methods
```typescript
public setTurnNavigationEnabled(enabled: boolean): void {
  this.enableTurnNavigation = enabled;
  if (enabled) {
    this.setAttribute('enable-turn-navigation', 'true');
  } else {
    this.removeAttribute('enable-turn-navigation');
  }
  this.updateTurnNavigation(this.getTurnCount());
}

public getTurnNavigationEnabled(): boolean {
  return this.enableTurnNavigation;
}

public getTurnCount(): number {
  return Math.max(...this.messages.map(m => m.turnIndex), 0);
}

public getCurrentTurnIndex(): number | null {
  if (this.displayMode !== 'last-turn') return null;
  return this.activeTurnIndex ?? this.getTurnCount();
}

public goToTurn(turnIndex: number): void {
  if (this.displayMode !== 'last-turn') return;
  
  const maxTurn = this.getTurnCount();
  if (turnIndex < 1 || turnIndex > maxTurn) return;
  
  this.activeTurnIndex = turnIndex;
  this.updateThread();
  
  this.dispatchEvent(new CustomEvent('wf-turn-navigation', {
    bubbles: true,
    detail: { turnIndex, totalTurns: maxTurn }
  }));
}

public goToNextTurn(): void {
  if (this.displayMode !== 'last-turn') return;
  const maxTurn = this.getTurnCount();
  const currentTurn = this.activeTurnIndex ?? maxTurn;
  if (currentTurn < maxTurn) {
    this.goToTurn(currentTurn + 1);
  }
}

public goToPreviousTurn(): void {
  if (this.displayMode !== 'last-turn') return;
  const currentTurn = this.activeTurnIndex ?? this.getTurnCount();
  if (currentTurn > 1) {
    this.goToTurn(currentTurn - 1);
  }
}
```

#### Collapse Methods
```typescript
public setCollapsible(enabled: boolean): void {
  this.collapsible = enabled;
  if (enabled) {
    this.setAttribute('collapsible', 'true');
  } else {
    this.removeAttribute('collapsible');
    this.isCollapsed = false;
  }
  this.updateCollapseUI();
}

public getCollapsible(): boolean {
  return this.collapsible;
}

public collapse(): void {
  if (!this.collapsible) return;
  this.isCollapsed = true;
  this.updateCollapseUI();
  this.dispatchEvent(new CustomEvent('wf-collapsed', { bubbles: true }));
}

public expand(): void {
  if (!this.collapsible) return;
  this.isCollapsed = false;
  this.updateCollapseUI();
  this.dispatchEvent(new CustomEvent('wf-expanded', { bubbles: true }));
}

public toggleCollapse(): void {
  if (!this.collapsible) return;
  if (this.isCollapsed) {
    this.expand();
  } else {
    this.collapse();
  }
}

public getIsCollapsed(): boolean {
  return this.isCollapsed;
}
```

## API Reference

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `display-mode` | `'full'` \| `'last-turn'` | `'full'` | Show entire conversation or only last turn |
| `enable-turn-navigation` | `boolean` | `false` | Enable prev/next/latest navigation in last-turn mode |
| `collapsible` | `boolean` | `false` | Enable collapse/expand of conversation content |

### Public Methods

#### Display Mode
- `setDisplayMode(mode: 'full' | 'last-turn'): void`
- `getDisplayMode(): 'full' | 'last-turn'`
- `setTurnNavigationEnabled(enabled: boolean): void`
- `getTurnNavigationEnabled(): boolean`

#### Turn Navigation
- `getTurnCount(): number`
- `getCurrentTurnIndex(): number | null`
- `goToTurn(turnIndex: number): void`
- `goToNextTurn(): void`
- `goToPreviousTurn(): void`

#### Collapse
- `setCollapsible(enabled: boolean): void`
- `getCollapsible(): boolean`
- `collapse(): void`
- `expand(): void`
- `toggleCollapse(): void`
- `getIsCollapsed(): boolean`

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `wf-turns-hidden` | `{ totalTurns, displayedTurnIndex, hiddenTurns }` | Emitted when turns are hidden in last-turn mode |
| `wf-turn-navigation` | `{ turnIndex, totalTurns }` | Emitted when navigating to a different turn |
| `wf-collapsed` | none | Emitted when conversation is collapsed |
| `wf-expanded` | none | Emitted when conversation is expanded |

## Usage Examples

### HTML Attributes

```html
<!-- All features combined -->
<guideants-chat 
  display-mode="last-turn"
  enable-turn-navigation
  collapsible
  api-base-url="https://api.example.com"
  pub-id="abc-123">
</guideants-chat>

<!-- Just collapsible in full mode -->
<guideants-chat 
  collapsible
  api-base-url="https://api.example.com"
  pub-id="abc-123">
</guideants-chat>

<!-- Last-turn mode without navigation -->
<guideants-chat 
  display-mode="last-turn"
  api-base-url="https://api.example.com"
  pub-id="abc-123">
</guideants-chat>
```

### JavaScript API

```javascript
const chat = document.querySelector('guideants-chat');

// Configure display
chat.setDisplayMode('last-turn');
chat.setTurnNavigationEnabled(true);
chat.setCollapsible(true);

// Control collapse state
chat.collapse();
chat.expand();
chat.toggleCollapse();

// Navigate turns
chat.goToNextTurn();
chat.goToPreviousTurn();
chat.goToTurn(3);

// Listen for events
chat.addEventListener('wf-collapsed', () => {
  console.log('Conversation collapsed');
});

chat.addEventListener('wf-expanded', () => {
  console.log('Conversation expanded');
});

chat.addEventListener('wf-turn-navigation', (e) => {
  console.log(`Viewing turn ${e.detail.turnIndex} of ${e.detail.totalTurns}`);
});

chat.addEventListener('wf-turns-hidden', (e) => {
  console.log(`${e.detail.hiddenTurns} turns hidden`);
});
```

## Behavior Matrix

| Scenario | Behavior |
|----------|----------|
| Send message while collapsed | Auto-expands, then sends |
| Send message in last-turn mode | Resets to show latest turn |
| Navigate turns while collapsed | Updates turn, remains collapsed (nav not visible) |
| Undo while collapsed | Works normally, remains collapsed |
| Disable collapsible | Auto-expands and hides collapse button |
| No messages + collapsible | Hides collapse button |
| Streaming while collapsed | Content updates (not visible), can expand to see |
| Collapse with navigation enabled | Navigation controls hidden (inside collapsed area) |

## Implementation Checklist

- [ ] Add new properties to class (line 44)
- [ ] Add new element references (line 66)
- [ ] Update `observedAttributes` (line 108)
- [ ] Update `attributeChangedCallback` (line 111)
- [ ] Update `connectedCallback` (line 117)
- [ ] Update `render()` - add CSS styles (line 258)
- [ ] Update `render()` - update HTML structure (line 294)
- [ ] Update `render()` - store element references (line 325)
- [ ] Update `render()` - wire up event listeners (line 340)
- [ ] Update `updateThread()` - add turn filtering (line 796)
- [ ] Update `onSend()` - add auto-expand and turn reset (line 355)
- [ ] Update `maybeAutoScrollToBottom()` - respect collapsed state (line 1042)
- [ ] Add `updateTurnNavigation()` method (new)
- [ ] Add `updateCollapseUI()` method (new)
- [ ] Add display mode public API methods (new)
- [ ] Add turn navigation public API methods (new)
- [ ] Add collapse public API methods (new)

## Testing Requirements

### Unit Tests
- [ ] Display mode switching (full ↔ last-turn)
- [ ] Turn navigation (prev, next, latest, goToTurn)
- [ ] Collapse/expand functionality
- [ ] Auto-expand on send
- [ ] Turn reset on send (in last-turn mode)
- [ ] Navigation visibility (inside collapsed area)
- [ ] Edge cases (empty conversation, single turn, etc.)

### Integration Tests
- [ ] Full conversation flow with all features enabled
- [ ] Streaming behavior in last-turn mode
- [ ] Streaming behavior when collapsed
- [ ] Undo in last-turn mode
- [ ] Undo when collapsed
- [ ] Event emission (turns-hidden, turn-navigation, collapsed, expanded)

### Visual/Manual Tests
- [ ] Collapse animation smoothness
- [ ] Navigation UI appearance/positioning
- [ ] Responsive behavior
- [ ] Accessibility (keyboard navigation)
- [ ] Turn indicator accuracy
- [ ] Message count in collapsed state

## Notes

- **Isolation**: All changes are isolated and do not affect existing scroll, streaming, or markdown rendering behavior
- **Backward Compatibility**: All new features are opt-in via attributes; default behavior unchanged
- **Navigation Position**: Turn navigation is inside the collapsible conversation wrapper and hidden when collapsed
- **Auto-Expand**: Sending a message always expands the conversation if collapsed
- **Turn Reset**: Sending a message in last-turn mode always resets to show the latest turn



