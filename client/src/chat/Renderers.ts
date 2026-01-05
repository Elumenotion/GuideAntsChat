import { escapeHtml } from '../Markdown';
import { Message } from './Types';
import { PublishedGuideConfig, PublishedAttachment } from '../GuideantsApi';

export function renderAuthError(code: string, message: string): string {
  let icon = '⚠️';
  let title = 'Authentication Error';
  let userMessage = '';

  switch (code) {
    case 'authentication_required':
      icon = '🔒';
      title = 'Authentication Required';
      userMessage = 'This chat requires you to sign in. Please contact the site admin.';
      break;
    case 'invalid_token':
      icon = '⚠️';
      title = 'Authentication Failed';
      userMessage = 'Please sign in again.';
      break;
    case 'auth_service_unavailable':
      icon = '⚠️';
      title = 'Authentication Service Offline';
      userMessage = 'The authentication service is not responding. Please try again later.';
      break;
    case 'auth_service_error':
      icon = '⚠️';
      title = 'Authentication Service Error';
      userMessage = 'Unable to verify authentication. Please try again later.';
      break;
  }

  return `
    <div class="flex items-center justify-center min-h-[200px] p-6">
      <div class="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div class="text-4xl mb-4">${icon}</div>
        <h3 class="text-lg font-semibold text-red-900 mb-2">${title}</h3>
        <p class="text-sm text-red-800 mb-3">${escapeHtml(message)}</p>
        ${userMessage ? `<p class="text-sm text-red-700">${userMessage}</p>` : ''}
      </div>
    </div>
  `;
}

export function renderConversationStartersEmptyState(
  starters: string[],
  config?: PublishedGuideConfig,
  avatarUrl?: string | null
): string {
  const assistantName = config?.guideName || 'Assistant';
  const avatarInitial = assistantName.trim().charAt(0).toUpperCase() || 'A';
  const url = (avatarUrl || '').trim();
  const hasAvatar = !!url;

  const starterButtons = starters.map((starter, index) => `
    <button
      type="button"
      class="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 shadow-sm hover:shadow-md group"
      data-wf-starter-index="${index}"
    >
      <div class="flex items-start">
        <div class="flex-shrink-0 mr-3 mt-0.5">
          <svg class="w-5 h-5 text-blue-500 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-gray-900 group-hover:text-blue-900 font-medium leading-relaxed">
            ${escapeHtml(starter)}
          </p>
        </div>
      </div>
    </button>
  `).join('');

  return `
    <div class="text-center py-4">
      <div class="text-gray-500 mb-6">
        ${hasAvatar
          ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(assistantName)}" class="w-16 h-16 mx-auto mb-4 rounded-full shadow-sm object-cover" />`
          : `<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-600"><span class="text-xl font-semibold">${escapeHtml(avatarInitial)}</span></div>`
        }
        <p class="text-lg font-medium text-gray-900 mb-2">Start a conversation</p>
        <p class="text-sm text-gray-600">Choose a conversation starter or type your message below</p>
      </div>
      <div class="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${starterButtons}
      </div>
    </div>
  `;
}

export function renderMessage(
  msg: Message, 
  type: 'user' | 'assistant', 
  config: PublishedGuideConfig | null,
  isStreaming: boolean = false
): string {
  const bgColor = type === 'user' ? 'bg-blue-50' : 'bg-gray-50';
  
  if (!config) {
    throw new Error('Published guide config not loaded - this is a bug');
  }
  const assistantName = config.guideName;
  
  let content: string;
  let attachmentsHtml = '';

  if (type === 'assistant') {
    // Always render assistant messages as markdown (updates in real-time during streaming)
    const encoded = encodeURIComponent(msg.content || '');
    content = `<div class="wf-assistant-markdown" data-msg-id="${msg.id}" data-md="${encoded}"></div>`;
  } else {
    // User messages: plain text with line breaks preserved
    content = escapeHtml(msg.content);

    if (msg.attachments && msg.attachments.length > 0) {
      const chips = msg.attachments.map(att => {
        let icon = '📄';
        if (att.uploadType?.startsWith('Image')) icon = '🖼️';
        else if (att.uploadType?.startsWith('Audio')) icon = '🎵';
        
        const label = att.fileName || 'Attachment';
        
        return `
          <div class="flex items-center px-2 py-1 bg-white border border-blue-200 rounded text-xs text-blue-900" title="${escapeHtml(label)}">
            <span class="mr-1">${icon}</span>
            <span class="truncate max-w-[120px]">${escapeHtml(label)}</span>
          </div>
        `;
      }).join('');
      
      attachmentsHtml = `<div class="flex flex-wrap gap-2 mt-2">${chips}</div>`;
    }
  }

  // Add streaming animations to assistant cells
  const streamingClasses = isStreaming ? 'wf-streaming-assistant border-l-4 border-blue-400' : '';
  const streamingIndicator = isStreaming ? `
    <div class="flex items-center space-x-2 mb-2">
      <div class="relative">
        <div class="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        <div class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
      </div>
      <span class="text-xs text-blue-600 animate-pulse">${escapeHtml(assistantName)} is thinking...</span>
    </div>
  ` : '';

  return `
    <div class="${bgColor} text-left p-3 rounded-lg ${streamingClasses} ${isStreaming ? 'animate-pulse' : ''}" role="article" aria-label="${type === 'user' ? 'User' : escapeHtml(assistantName)} message">
      <div class="text-xs text-gray-500 mb-1">${type === 'user' ? 'You' : escapeHtml(assistantName)}</div>
      ${streamingIndicator}
      <div class="text-sm prose prose-sm max-w-none ${type === 'assistant' ? '' : 'whitespace-pre-wrap'}">${content}</div>
      ${attachmentsHtml}
    </div>
  `;
}

