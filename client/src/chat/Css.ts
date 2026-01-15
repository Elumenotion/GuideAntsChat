export const getChatStyles = () => `
      :host {
        display: block;
        position: relative;

        /* CSS Custom Properties for Theming */
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
        --wf-text-error: #dc2626;
        --wf-border-radius: 0.375rem;
        --wf-border-radius-lg: 0.5rem;
        --wf-font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
        
        font-family: var(--wf-font-family);
      }
      
      /* Apply theme variables to elements */
      #wf-container {
        background-color: var(--wf-bg-container) !important;
        border-color: var(--wf-border-color) !important;
        border-radius: var(--wf-border-radius-lg) !important;
        position: relative; /* Ensure floating wrapper anchors to the container, not :host */
      }
      
      #wf-input {
        /* border-color: var(--wf-border-color) !important; - handled by wrapper */
        /* border-radius: var(--wf-border-radius) !important; - handled by wrapper */
        /* background-color: var(--wf-bg-container) !important; - handled by wrapper */
        color: var(--wf-text-primary) !important;
        border: none !important;
        padding: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
        outline: none !important;
      }
      
      #wf-input:focus {
        /* ring-color: var(--wf-primary-color) !important; */
        /* border-color: var(--wf-primary-color) !important; */
        box-shadow: none !important;
      }

      .wf-input-wrapper {
        border: 1px solid var(--wf-border-color);
        border-radius: var(--wf-border-radius);
        background-color: var(--wf-bg-container);
        padding: 0.75rem;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }

      .wf-input-wrapper:focus-within {
        border-color: var(--wf-primary-color);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      
      #wf-error-banner {
        color: var(--wf-text-error) !important;
      }
      
      #wf-control-bar {
        background-color: var(--wf-bg-control-bar) !important;
        border-color: var(--wf-border-color) !important;
        border-radius: var(--wf-border-radius) !important;
        container-type: inline-size;
        container-name: controlbar;
      }
      
      /* Base styles for control bar - tiny (< 300px) */
      #wf-control-bar .wf-btn { padding: 0.125rem 0.25rem !important; font-size: 0.625rem !important; height: 22px !important; }
      #wf-control-bar .wf-btn-icon { padding: 0.125rem 0.25rem !important; }
      #wf-control-bar .wf-turn-indicator { font-size: 0.625rem !important; }
      #wf-control-bar .wf-control-gap { gap: 0.125rem !important; }
      #wf-control-bar.wf-bar-gap { gap: 0.125rem !important; }
      
      /* Container query responsive sizing for control bar elements */
      @container controlbar (min-width: 300px) {
        #wf-control-bar .wf-btn { padding: 0.25rem 0.375rem !important; font-size: 0.6875rem !important; height: 26px !important; }
        #wf-control-bar .wf-btn-icon { padding: 0.25rem 0.375rem !important; }
        #wf-control-bar .wf-turn-indicator { font-size: 0.6875rem !important; }
        #wf-control-bar .wf-control-gap { gap: 0.25rem !important; }
        #wf-control-bar.wf-bar-gap { gap: 0.25rem !important; }
      }
      
      @container controlbar (min-width: 400px) {
        #wf-control-bar .wf-btn { padding: 0.375rem 0.5rem !important; font-size: 0.75rem !important; height: 30px !important; }
        #wf-control-bar .wf-btn-icon { padding: 0.375rem 0.5rem !important; }
        #wf-control-bar .wf-turn-indicator { font-size: 0.75rem !important; }
        #wf-control-bar .wf-control-gap { gap: 0.375rem !important; }
        #wf-control-bar.wf-bar-gap { gap: 0.5rem !important; }
      }
      
      @container controlbar (min-width: 540px) {
        #wf-control-bar .wf-btn { padding: 0.5rem 0.75rem !important; font-size: 0.875rem !important; height: 38px !important; }
        #wf-control-bar .wf-btn-icon { padding: 0.5rem 0.625rem !important; }
        #wf-control-bar .wf-turn-indicator { font-size: 0.875rem !important; }
        #wf-control-bar .wf-control-gap { gap: 0.5rem !important; }
        #wf-control-bar.wf-bar-gap { gap: 0.75rem !important; }
      }
      
      #wf-restart {
        background-color: var(--wf-danger-color) !important;
        border-radius: var(--wf-border-radius) !important;
      }
      
      #wf-restart:hover:not(:disabled) {
        background-color: var(--wf-danger-hover) !important;
      }
      
      #wf-undo {
        border-radius: var(--wf-border-radius) !important;
      }
      
      #wf-send {
        background-color: var(--wf-primary-color) !important;
        border-radius: var(--wf-border-radius) !important;
      }
      
      #wf-send:hover:not(:disabled) {
        background-color: var(--wf-primary-hover) !important;
      }
      
      #wf-turn-first, #wf-turn-prev, #wf-turn-next, #wf-turn-last {
        border-color: var(--wf-border-color) !important;
        color: var(--wf-primary-color) !important;
        border-radius: var(--wf-border-radius) !important;
      }
      
      #wf-turn-latest {
        background-color: var(--wf-primary-color) !important;
        border-radius: var(--wf-border-radius) !important;
      }
      
      #wf-turn-latest:hover:not(:disabled) {
        background-color: var(--wf-primary-hover) !important;
      }
      
      label {
        color: var(--wf-text-secondary) !important;
      }
      
      .bg-blue-50 {
        background-color: var(--wf-bg-user) !important;
      }
      
      .bg-gray-50 {
        background-color: var(--wf-bg-assistant) !important;
      }
      
      #wf-conversation-wrapper {
        background-color: var(--wf-bg-container) !important;
        border-color: var(--wf-border-color) !important;
      }
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
      
      /* ========================================================================
       * CONVERSATION WRAPPER POSITIONING - CRITICAL FOR AUTOSCROLL
       * ========================================================================
       * 
       * The wrapper contains threadEl (the scroll container). DO NOT change
       * these positioning rules without testing autoscroll thoroughly.
       * 
       * NORMAL MODE (not collapsible):
       * - position: static (default) - part of normal document flow
       * - Content pushes down elements below it
       * 
       * FLOATING MODE (collapsible):
       * - position: absolute - floats above page content
       * - Content overlays elements below it without affecting layout
       * 
       * WHY AUTOSCROLL WORKS IN BOTH:
       * threadEl is always the scroll container with overflow-y:auto.
       * The wrapper's position doesn't affect threadEl's scroll behavior.
       */
      
      /* Default: Normal document flow */
      #wf-conversation-wrapper {
        transition: max-height 0.3s ease-in-out, opacity 0.2s ease-in-out;
        max-height: calc(100vh - 250px);
        overflow: visible;
      }
      
      /* Floating mode: Applied ONLY when collapsible attribute is set */
      #wf-conversation-wrapper.wf-collapsible-mode {
        position: absolute;
        top: 100%; /* Position directly below the container */
        left: 0;
        right: 0;
        z-index: 1000;
        background: var(--wf-bg-container);
        border: 1px solid var(--wf-border-color);
        border-radius: var(--wf-border-radius-lg);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        margin-top: 0.5rem;
      }
      
      /* Collapsed state: Hide completely */
      #wf-conversation-wrapper.wf-collapsed {
        max-height: 0 !important;
        opacity: 0;
        overflow: hidden;
        border: none;
        box-shadow: none;
        pointer-events: none;
      }
      
      /* Control bar is always in normal flow inside the input area */
      /* It should NEVER float or have absolute positioning */
      
      /* Hide control bar when no messages */
      #wf-control-bar.hidden {
        display: none !important;
      }
      
      /* ========================================================================
       * SPEECH-TO-TEXT STYLES
       * ======================================================================== */
      
      /* Mic button disabled state */
      #wf-mic:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      /* Stop recording button hover */
      #wf-stop-recording:hover {
        background-color: #f3f4f6;
      }
      
      /* ========================================================================
       * CAMERA CAPTURE STYLES
       * ======================================================================== */
      
      .wf-camera-modal {
        position: fixed;
        inset: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      
      .wf-camera-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: none;
        border: none;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        padding: 0.5rem;
        line-height: 1;
      }
      
      .wf-camera-close:hover {
        color: #d1d5db;
      }
      
      .wf-camera-error {
        position: absolute;
        top: 1rem;
        left: 1rem;
        right: 4rem;
        background: #dc2626;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
      }
      
      .wf-camera-preview-container {
        max-width: 100%;
        max-height: 60vh;
        overflow: hidden;
        border-radius: 0.5rem;
      }
      
      .wf-camera-preview {
        max-width: 100%;
        max-height: 60vh;
        object-fit: contain;
      }
      
      .wf-camera-selector {
        margin-top: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        font-size: 0.875rem;
      }
      
      .wf-camera-selector select {
        padding: 0.25rem 0.75rem;
        border-radius: 0.375rem;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      
      .wf-camera-selector select option {
        color: black;
      }
      
      .wf-camera-controls {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 1.5rem;
      }
      
      .wf-camera-btn {
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        font-size: 1rem;
        cursor: pointer;
        border: none;
        transition: background-color 0.15s;
      }
      
      .wf-camera-btn-primary {
        background: #3b82f6;
        color: white;
      }
      
      .wf-camera-btn-primary:hover {
        background: #2563eb;
      }
      
      .wf-camera-btn-secondary {
        background: rgba(255, 255, 255, 0.2);
        color: white;
      }
      
      .wf-camera-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .wf-camera-capture-btn {
        width: 4rem;
        height: 4rem;
        border-radius: 50%;
        background: white;
        border: 4px solid #3b82f6;
        cursor: pointer;
        transition: background-color 0.15s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .wf-camera-capture-btn:hover {
        background: #eff6ff;
      }
      
      .wf-camera-capture-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      #wf-camera:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;

