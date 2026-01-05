export const getChatTemplate = () => `
			<!-- Conversation Starters Area (shown when empty and enabled) -->
			<div id="wf-starters-area" class="hidden"></div>
			
			<!-- Input Area (always visible) -->
			<div class="flex flex-col gap-2">
        <label id="wf-input-label" for="wf-input" class="text-sm font-medium text-gray-700">Message</label>

        <div class="wf-input-wrapper flex flex-col gap-2">
            <textarea
              id="wf-input"
              placeholder="Type your message..."
              rows="1"
              class="w-full resize-none"
              style="min-height: 44px; overflow-y: hidden;"
            ></textarea>
            
            <!-- Attachments Queue (hidden when empty) -->
            <div id="wf-attachments-area" class="hidden flex flex-wrap gap-2"></div>
        </div>
        
        <!-- Persistent inline error banner for user-visible feedback -->
        <div id="wf-error-banner" class="text-sm text-red-600" role="alert" aria-live="polite"></div>
        
        <!-- Consolidated Control Bar: Buttons + Turn Navigation + Collapse -->
        <div id="wf-control-bar" class="flex items-center justify-between px-1 py-1 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md wf-bar-gap flex-nowrap">
        
          <!-- Left: Action Buttons -->
          <div class="flex wf-control-gap flex-shrink-0">
            <button 
              id="wf-restart" 
              class="wf-btn bg-red-600 text-white border-0 rounded cursor-pointer hover:bg-red-700 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap"
              aria-label="Start a new conversation"
            >
              Restart
            </button>
            <button 
              id="wf-undo" 
              class="wf-btn bg-gray-200 text-gray-700 border-0 rounded cursor-pointer hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap"
              aria-label="Undo last turn"
            >
              Undo
            </button>
          </div>
          
          <!-- Middle: Turn Navigation (hidden by default) -->
          <div id="wf-turn-nav" class="hidden items-center wf-control-gap flex-shrink-0" role="navigation" aria-label="Turn navigation">
            <button 
              id="wf-turn-first" 
              class="wf-btn wf-btn-icon bg-white text-blue-600 border border-blue-300 rounded cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Go to first turn"
            >
              ⇤
            </button>
            <button 
              id="wf-turn-prev" 
              class="wf-btn wf-btn-icon bg-white text-blue-600 border border-blue-300 rounded cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Go to previous turn"
            >
              ←
            </button>
            <span 
              id="wf-turn-indicator" 
              class="wf-turn-indicator font-medium text-gray-700 whitespace-nowrap" 
              role="status" 
              aria-live="polite"
            >
              1 of 1
            </span>
            <button 
              id="wf-turn-next" 
              class="wf-btn wf-btn-icon bg-white text-blue-600 border border-blue-300 rounded cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Go to next turn"
            >
              →
            </button>
            <button 
              id="wf-turn-last" 
              class="wf-btn wf-btn-icon bg-white text-blue-600 border border-blue-300 rounded cursor-pointer hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              aria-label="Go to last turn"
            >
              ⇥
            </button>
          </div>
          
          <!-- Right: Camera Button + Mic Button + Send Button + Collapse Toggle -->
          <div class="flex wf-control-gap items-center flex-shrink-0">
            <!-- Camera Button (hidden by default) - matches DraftUserCell.tsx styling -->
            <button 
              id="wf-camera" 
              class="hidden p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Take photo"
              title="Take photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z"/>
                <path fill-rule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3H4.5a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.152-.177a1.56 1.56 0 001.11-.71l.821-1.317a2.35 2.35 0 012.332-1.39zM12 12.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clip-rule="evenodd"/>
              </svg>
            </button>
            
            <!-- Microphone Button (hidden by default) - matches DraftUserCell.tsx styling -->
            <button 
              id="wf-mic" 
              class="hidden p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Start voice input"
              title="Start voice input"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1a1 1 0 0 1 2 0v1a5 5 0 0 0 10 0v-1a1 1 0 0 1 2 0z"/>
                <path d="M12 19a1 1 0 0 0-1 1v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-1-1z"/>
                <path d="M8 23h8a1 1 0 0 0 0-2H8a1 1 0 0 0 0 2z"/>
              </svg>
            </button>
            
            <!-- Recording Indicator (hidden by default) - matches full client MicrophoneButton -->
            <div id="wf-recording-indicator" class="hidden items-center gap-2">
              <!-- Listening indicator -->
              <div class="flex items-center gap-1.5 text-sm text-blue-600">
                <span class="animate-pulse">👂</span>
                <span id="wf-recording-duration">0:00</span>
              </div>
              <!-- Stop button with SVG square icon -->
              <button
                id="wf-stop-recording"
                class="p-1.5 rounded hover:bg-gray-100 text-gray-600 transition-colors"
                title="Stop listening"
                aria-label="Stop listening"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <rect x="6" y="6" width="12" height="12" rx="1"/>
                </svg>
              </button>
            </div>
            
            <!-- Transcribing Indicator (hidden by default) -->
            <div id="wf-transcribing-indicator" class="hidden items-center text-gray-500">
              <div class="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            </div>
            
            <button 
              id="wf-send" 
              class="wf-btn bg-blue-600 text-white border-0 rounded cursor-pointer hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center whitespace-nowrap"
              aria-label="Send message"
            >
              Send
            </button>
            
            <!-- Collapse Toggle Icon (hidden when not collapsible) -->
            <button 
              id="wf-collapse-toggle" 
              class="hidden cursor-pointer transition-colors text-gray-500 hover:text-gray-700 px-0.5"
              aria-label="Toggle conversation visibility"
              aria-expanded="true"
            >
              <span id="wf-collapse-icon" class="transition-transform text-xs" aria-hidden="true">▼</span>
            </button>
          </div>
          
          <!-- Hidden label for programmatic updates (not displayed) -->
          <span id="wf-collapse-label" class="hidden"></span>
        
        </div>
        <!-- END Control Bar -->
        
      </div>
      <!-- END Input Area -->
      
      <!-- Conversation Wrapper (collapsible container, floats when collapsible) -->
      <div id="wf-conversation-wrapper" class="hidden flex flex-col gap-2 p-3">
        
        <!-- Thread (messages) -->
        <div id="wf-thread" class="max-h-[calc(100vh-250px)] overflow-y-auto" role="log" aria-label="Conversation messages" aria-live="polite" aria-atomic="false">
          <div id="wf-thread-content" class="flex flex-col gap-4"></div>
          <div id="wf-thread-anchor" style="height:1px" aria-hidden="true"></div>
        </div>
        
      </div>
    `;

