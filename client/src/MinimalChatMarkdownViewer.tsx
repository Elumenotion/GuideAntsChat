import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidRenderer from './MermaidRenderer';
import ImageFullscreenViewer from './ImageFullscreenViewer';

export interface MinimalChatMarkdownViewerProps {
  text: string;
  className?: string;
  isStreaming?: boolean;
  maxImageHeight?: number | string;
  enableImageFullscreen?: boolean;
  apiBaseUrl?: string;
  authToken?: string;
  projectId?: string;
  notebookId?: string;
  conversationId?: string;
  pubId?: string;
  portalContainer?: HTMLElement;
  onLinkClick?: (path: string) => void;
}

// Preprocess HTML media tags into tokens recognized by the renderer
function preprocessHtmlMediaTags(text: string): string {
  text = text.replace(/<video\s+[^>]*?>(.*?)<\/video>/gis, (match, content) => {
    const videoSrcMatch = match.match(/<video\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (videoSrcMatch) return `[VIDEO:${videoSrcMatch[1]}]`;
    const sourceSrcMatch = content.match(/<source\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (sourceSrcMatch) return `[VIDEO:${sourceSrcMatch[1]}]`;
    return match;
  });
  text = text.replace(/<audio\s+[^>]*?>(.*?)<\/audio>/gis, (match, content) => {
    const audioSrcMatch = match.match(/<audio\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (audioSrcMatch) return `[AUDIO:${audioSrcMatch[1]}]`;
    const sourceSrcMatch = content.match(/<source\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (sourceSrcMatch) return `[AUDIO:${sourceSrcMatch[1]}]`;
    return match;
  });
  return text;
}

// Normalize common AI list issues
function normalizeOrderedListStructure(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let insideCodeFence = false;
  const isNumbered = (s: string) => /^(\d+)[\.\)]\s+/.test(s);
  const isBullet = (s: string) => /^[-*+]\s/.test(s);
  const isFence = (s: string) => /^```/.test(s);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (isFence(trimmed)) { out.push(raw); insideCodeFence = !insideCodeFence; continue; }
    if (insideCodeFence) { out.push(raw); continue; }
    if (isBullet(trimmed) && !raw.startsWith('  ')) {
      let foundNumberedItem = false;
      for (let j = i - 1; j >= 0; j--) {
        const prevLine = lines[j].trim();
        if (prevLine === '') continue;
        if (isNumbered(prevLine)) { foundNumberedItem = true; break; }
        break;
      }
      if (foundNumberedItem) {
        out.push('   ' + trimmed);
      } else {
        out.push(raw);
      }
    } else {
      out.push(raw);
    }
  }
  return out.join('\n');
}

function remarkNestFollowingListsUnderOrderedItems() {
  return function transformer(tree: any) {
    if (!tree || !Array.isArray((tree as any).children)) return;
    const root: any = tree;
    const children = root.children as any[];
    let i = 0;
    while (i < children.length) {
      const node = children[i];
      if (node?.type === 'list' && node.ordered && Array.isArray(node.children) && node.children.length > 0) {
        const lastLi = node.children[node.children.length - 1];
        let j = i + 1;
        const toMove: any[] = [];
        while (j < children.length) {
          const next = children[j];
          if (!next) break;
          const isParagraph = next.type === 'paragraph';
          const isUnorderedList = next.type === 'list' && !next.ordered;
          const isStop = next.type === 'list' && next.ordered || /^heading$/.test(next.type);
          if (isStop) break;
          if (isParagraph || isUnorderedList) {
            toMove.push(next);
            j++;
            continue;
          }
          break;
        }
        if (toMove.length > 0) {
          lastLi.children = lastLi.children || [];
          for (const m of toMove) lastLi.children.push(m);
          children.splice(i + 1, toMove.length);
          i++;
          continue;
        }
      }
      i++;
    }
  };
}

function remarkMergeAdjacentOrderedLists() {
  function mergeInParent(parent: any) {
    if (!parent || !Array.isArray(parent.children)) return;
    const arr = parent.children as any[];
    let i = 0;
    while (i < arr.length - 1) {
      const a = arr[i];
      const b = arr[i + 1];
      if (a?.type === 'list' && a.ordered && b?.type === 'list' && b.ordered) {
        a.children = (a.children || []).concat(b.children || []);
        arr.splice(i + 1, 1);
        continue;
      }
      i++;
    }
    for (const child of arr) mergeInParent(child);
  }
  return function transformer(tree: any) {
    mergeInParent(tree);
  };
}

// Helpers similar to main client, adapted for minimal environment
const authenticatedBlobCache = new Map<string, string>();

async function getAuthenticatedObjectUrl(inputUrl: string, apiBaseUrl?: string, authToken?: string): Promise<{ objectUrl: string; fileName?: string }> {
  const effectiveUrl = (() => {
    try {
      const u = new URL(inputUrl, window.location.origin);
      if (u.pathname.startsWith('/api/')) {
        const base = (apiBaseUrl || '').replace(/\/$/, '');
        // Keep the /api prefix when targeting the API host
        return `${base}${u.pathname}${u.search}`;
      }
    } catch {}
    return inputUrl;
  })();

  const cached = authenticatedBlobCache.get(effectiveUrl);
  if (cached) return { objectUrl: cached };

  const res = await fetch(effectiveUrl, {
    headers: {
      ...(authToken
        ? effectiveUrl.includes('/api/published/')
          ? { 'X-Published-Auth': `Bearer ${authToken}` }
          : { Authorization: `Bearer ${authToken}` }
        : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  authenticatedBlobCache.set(effectiveUrl, objectUrl);

  const cd = res.headers.get('content-disposition') || '';
  const fileNameMatch = cd.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : undefined;
  return { objectUrl, fileName };
}

const ExternalLink: React.FC<{ href?: string; children: React.ReactNode; apiBaseUrl?: string; authToken?: string }> = ({ href, children, apiBaseUrl, authToken }) => {
  const isApiHref = (raw?: string): boolean => {
    if (!raw) return false;
    try {
      const u = new URL(raw, window.location.origin);
      if (u.pathname.startsWith('/api/')) return true;
    } catch {}
    return Boolean(apiBaseUrl && raw.startsWith(apiBaseUrl));
  };
  const toApiUrl = (raw: string): string => {
    try {
      const u = new URL(raw, window.location.origin);
      if (u.pathname.startsWith('/api/')) {
        const base = (apiBaseUrl || '').replace(/\/$/, '');
        // Preserve /api prefix when directing to API base host
        return `${base}${u.pathname}${u.search}`;
      }
    } catch {}
    return raw;
  };
  const handleClick = async (e: React.MouseEvent) => {
    if (!href) return;
    e.preventDefault();
    if (isApiHref(href)) {
      try {
        const effective = toApiUrl(href);
        const result = await getAuthenticatedObjectUrl(effective, apiBaseUrl, authToken);
        const a = document.createElement('a');
        a.href = result.objectUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        if (result.fileName) a.download = result.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      } catch {}
    }
    try {
      window.open(href, '_blank', 'noopener,noreferrer');
    } catch {
      try { (e.currentTarget as HTMLAnchorElement).target = '_blank'; } catch {}
    }
  };
  return (
    <a href={href} onClick={handleClick} className="text-blue-600 hover:text-blue-800 underline cursor-pointer" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

const AuthenticatedContent: React.FC<{
  elementType: 'img' | 'a' | 'video' | 'audio';
  src?: string;
  href?: string;
  alt?: string;
  title?: string;
  isStreaming?: boolean;
  imgMaxHeight?: number | string;
  onImageClick?: (src: string, alt?: string, fileName?: string) => void;
  projectId?: string;
  notebookId?: string;
  conversationId?: string;
  pubId?: string;
  apiBaseUrl?: string;
  authToken?: string;
  children?: React.ReactNode;
  onLinkClick?: (path: string) => void;
}> = ({ elementType, src, href, alt, title, isStreaming, imgMaxHeight, onImageClick, projectId, notebookId, conversationId, pubId, apiBaseUrl, authToken, children, onLinkClick }) => {
  const original = src || href;
  let cleanedSource = original;
  let alignment: 'left' | 'right' | 'center' | undefined;
  if (original) {
    const alignToken = original.match(/(?:\||%7C)align=(right|left|center)/i);
    if (alignToken) alignment = alignToken[1].toLowerCase() as any;
    const pipeIndex = original.indexOf('|');
    const encPipeIndex = original.toLowerCase().indexOf('%7c');
    const cutIndex = [pipeIndex, encPipeIndex].filter(i => i >= 0).sort((a, b) => a - b)[0];
    if (cutIndex !== undefined) cleanedSource = original.substring(0, cutIndex);
  }
  const normalizeUrl = (value?: string): string | undefined => {
    if (!value) return value;
    return value.replace(/%5Cu0026/gi, '&').replace(/\\u0026/gi, '&');
  };
  
  const rewriteToPublishedUrl = (value?: string): string | undefined => {
    if (!value) return value;
    
    // Check if it's an authenticated notebook file URL (not already published)
    if (value.includes('/published/')) return value;
    
    // More robust pattern handling optional /api prefix
    const authPattern = /(?:api\/)?projects\/([^\/]+)\/notebooks\/([^\/]+)\/files\/content\?path=([^&]+)/i;
    const match = value.match(authPattern);
    
    if (match && conversationId && pubId) {
      const [, projId, nbId, pathParam] = match;
      // Extract any additional query params (like &m=...)
      const queryStart = value.indexOf('?path=');
      const restOfUrl = queryStart >= 0 ? value.substring(queryStart + 6 + pathParam.length) : '';
      const additionalParams = restOfUrl.startsWith('&') ? restOfUrl : '';
      
      // Build published URL using the configured apiBaseUrl instead of preserving the original host
      const base = (apiBaseUrl || '').replace(/\/$/, '');
      return `${base}/api/published/projects/${projId}/notebooks/${nbId}/conversations/${conversationId}/files/content?path=${pathParam}&pubId=${pubId}${additionalParams}`;
    }
    
    return value;
  };
  
  const resolveUrl = (value?: string): string | undefined => {
    if (!value) return value;
    const isRelative = !value.includes(':') && !value.startsWith('/');
    if (isRelative && projectId && notebookId && apiBaseUrl) {
      const cleanPath = value.replace(/^\.\.?\//, '');
      const encodedPath = encodeURIComponent(cleanPath);
      const base = (apiBaseUrl || '').replace(/\/$/, '');
      
      // If we have pubId and conversationId, use published endpoint (anonymous)
      if (conversationId && pubId) {
        return `${base}/api/published/projects/${projectId}/notebooks/${notebookId}/conversations/${conversationId}/files/content?path=${encodedPath}&pubId=${pubId}`;
      }
      
      // Otherwise use authenticated endpoint
      return `${base}/api/projects/${projectId}/notebooks/${notebookId}/files/content?path=${encodedPath}`;
    }
    return value;
  };

  // Helper to extract the relative path for onLinkClick
  const resolveRelativePath = (value?: string): string | undefined => {
    if (!value) return undefined;
    const isRelative = !value.includes(':') && !value.startsWith('/');
    if (isRelative) {
        return value.replace(/^\.\.?\//, '');
    }
    return undefined;
  };
  
  // Apply URL rewriting to convert auth URLs to published URLs
  const url = rewriteToPublishedUrl(normalizeUrl(resolveUrl(cleanedSource)));
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isAuthenticatedUrl = (() => {
    if (!url) return false;
    try {
      const u = new URL(url, window.location.origin);
      // Treat /api/ endpoints (including published ones) as authenticated to ensure correct headers
      if (u.pathname.startsWith('/api/')) return true;
      if (u.pathname.endsWith('/content') && u.searchParams.has('path')) return true;
    } catch {}
    return !!apiBaseUrl && url.startsWith(apiBaseUrl);
  })();

  const isLikelyMalformedUrl = (u: string): boolean => {
    if (!u) return true;
    const patterns = [
      /^https?:\/\/[^\/]*$/,
      /\.\.\./,
      /\s/,
      /[<>{}|\\^`\[\]]/,
      /^https?:\/\/[^\/]*\/?$/,
      /%5Cu0026/i,
      /\\u0026/i
    ];
    return patterns.some(p => p.test(u));
  };

  useEffect(() => {
    if (!url || !isAuthenticatedUrl) {
      setObjectUrl(url || null);
      return;
    }
    if ((elementType === 'img' || elementType === 'video' || elementType === 'audio') && url) {
      setError(null);
      if (isLikelyMalformedUrl(url)) {
        setIsLoading(true);
        const retryTimeout = setTimeout(() => {
          if (!isLikelyMalformedUrl(url)) {
            getAuthenticatedObjectUrl(url, apiBaseUrl, authToken)
              .then(r => { setObjectUrl(r.objectUrl); setFileName(r.fileName); setError(null); })
              .catch(err => setError(err.message))
              .finally(() => setIsLoading(false));
          } else if (retryCount < 3) {
            setRetryCount(prev => prev + 1);
          } else {
            setIsLoading(false);
            setError('Invalid image URL');
          }
        }, Math.min(500 * (retryCount + 1), 2000));
        return () => clearTimeout(retryTimeout);
      } else {
        setIsLoading(true);
        getAuthenticatedObjectUrl(url, apiBaseUrl, authToken)
          .then(r => { setObjectUrl(r.objectUrl); setFileName(r.fileName); setError(null); })
          .catch(err => setError(err.message))
          .finally(() => setIsLoading(false));
      }
    }
  }, [url, isAuthenticatedUrl, elementType, retryCount, apiBaseUrl, authToken]);

  const alignClass = alignment === 'right'
    ? 'float-right ml-4 mb-2'
    : alignment === 'left'
      ? 'float-left mr-4 mb-2'
      : alignment === 'center'
        ? 'mx-auto block my-2'
        : '';


  if (!isAuthenticatedUrl) {
    if (elementType === 'img') {
      const style = imgMaxHeight !== undefined
        ? { maxHeight: typeof imgMaxHeight === 'number' ? `${imgMaxHeight}px` : imgMaxHeight }
        : undefined;
      const isClickable = !!onImageClick;
      return (
        <img
          src={url}
          alt={alt}
          title={title}
          className={`max-w-full h-auto ${alignClass} ${isClickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`.trim()}
          style={style}
          onClick={isClickable && src ? () => onImageClick(src, alt) : undefined}
        />
      );
    } else if (elementType === 'video') {
      return <video src={url} controls className="max-w-full h-auto" />;
    } else if (elementType === 'audio') {
      return <audio src={url} controls className="max-w-full" />;
    } else {
      return <ExternalLink href={href} apiBaseUrl={apiBaseUrl} authToken={authToken}>{children}</ExternalLink>;
    }
  }

  if (elementType === 'img') {
    if (isStreaming && !objectUrl) {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>Image coming up...</span>
        </div>
      );
    }
    if (isLoading) {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
          <div className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <span>Loading image...</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-xs text-red-600">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>Image unavailable</span>
        </div>
      );
    }
    const style = imgMaxHeight !== undefined
      ? { maxHeight: typeof imgMaxHeight === 'number' ? `${imgMaxHeight}px` : imgMaxHeight }
      : undefined;
    const isClickable = !!onImageClick;
    return objectUrl ? (
      <img
        src={objectUrl}
        alt={alt}
        title={title}
        className={`max-w-full h-auto ${alignClass} ${isClickable ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`.trim()}
        style={style}
        onClick={isClickable ? () => onImageClick(objectUrl, alt, fileName) : undefined}
      />
    ) : null;
  }
  if (elementType === 'video') {
    if (isStreaming && !objectUrl) {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
          <span>Video coming up...</span>
        </div>
      );
    }
    if (isLoading) return <span className="text-xs text-blue-600">Loading video...</span>;
    if (error) return <span className="text-xs text-red-600">Video unavailable</span>;
    return objectUrl ? <video src={objectUrl} controls className="max-w-full h-auto" /> : null;
  }
  if (elementType === 'audio') {
    if (isStreaming && !objectUrl) {
      return (
        <div className="inline-flex items-center space-x-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs text-blue-600">
          <span>Audio coming up...</span>
        </div>
      );
    }
    if (isLoading) return <span className="text-xs text-blue-600">Loading audio...</span>;
    if (error) return <span className="text-xs text-red-600">Audio unavailable</span>;
    return objectUrl ? <audio src={objectUrl} controls className="max-w-full" /> : null;
  }
  const handleAuthenticatedLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Try to resolve as relative path first to use preview callback
    if (onLinkClick && cleanedSource) {
        const relativePath = resolveRelativePath(cleanedSource);
        if (relativePath) {
            try {
                onLinkClick(decodeURIComponent(relativePath));
            } catch {
                onLinkClick(relativePath);
            }
            return;
        }
    }

    if (!url) return;
    try {
      const result = await getAuthenticatedObjectUrl(url, apiBaseUrl, authToken);
      const link = document.createElement('a');
      link.href = result.objectUrl;
      if (result.fileName) link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(result.objectUrl);
    } catch {}
  };
  return (
    <a href={url || '#'} onClick={handleAuthenticatedLink} className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
};

export default function MinimalChatMarkdownViewer({
  text,
  className = '',
  isStreaming = false,
  maxImageHeight,
  enableImageFullscreen = false,
  apiBaseUrl,
  authToken,
  projectId,
  notebookId,
  conversationId,
  pubId,
  portalContainer,
  onLinkClick
}: MinimalChatMarkdownViewerProps) {
  const combinedClass = `${className} select-text max-w-full overflow-hidden`.trim();
  const [fullscreenImage, setFullscreenImage] = useState<{ src: string; alt?: string; fileName?: string } | null>(null);
  
  const handleImageClick = useCallback((src: string, alt?: string, fileName?: string) => {
    if (enableImageFullscreen) setFullscreenImage({ src, alt, fileName });
  }, [enableImageFullscreen]);

  const processedText = normalizeOrderedListStructure(preprocessHtmlMediaTags(text));
  
  const markdownComponents = useMemo(() => ({
    h1({ children }: { children?: React.ReactNode }) { return <h1 className="text-2xl font-bold mb-2">{children}</h1>; },
    h2({ children }: { children?: React.ReactNode }) { return <h2 className="text-xl font-semibold mb-2">{children}</h2>; },
    h3({ children }: { children?: React.ReactNode }) { return <h3 className="text-lg font-semibold mb-2">{children}</h3>; },
    h4({ children }: { children?: React.ReactNode }) { return <h4 className="text-base font-semibold mb-2">{children}</h4>; },
    h5({ children }: { children?: React.ReactNode }) { return <h5 className="text-sm font-semibold mb-1">{children}</h5>; },
    p({ node, children }: { node?: any; children?: React.ReactNode }) {
      const buildText = (n: any): string => {
        if (!n) return '';
        if (typeof n === 'string') return n;
        if (Array.isArray(n)) return n.map(buildText).join('');
        if (n.type === 'text') return String(n.value ?? '');
        if (n.type === 'link' && n.url) return String(n.url);
        if (Array.isArray(n.children)) return n.children.map(buildText).join('');
        return '';
      };
      const raw = buildText(node);
      if (raw) {
        const videoMatch = raw.match(/\[VIDEO:([^\]]+)\]/);
        if (videoMatch) {
          return <div className="my-4"><AuthenticatedContent src={videoMatch[1]} elementType="video" isStreaming={isStreaming} projectId={projectId} notebookId={notebookId} conversationId={conversationId} pubId={pubId} apiBaseUrl={apiBaseUrl} authToken={authToken} /></div>;
        }
        const audioMatch = raw.match(/\[AUDIO:([^\]]+)\]/);
        if (audioMatch) {
          return <div className="my-4"><AuthenticatedContent src={audioMatch[1]} elementType="audio" isStreaming={isStreaming} projectId={projectId} notebookId={notebookId} conversationId={conversationId} pubId={pubId} apiBaseUrl={apiBaseUrl} authToken={authToken} /></div>;
        }
      }
      return <p className="mb-2 leading-relaxed break-words max-w-full overflow-wrap-anywhere">{children}</p>;
    },
    ul({ children }: { children?: React.ReactNode }) { return <ul className="ml-6 mb-2" style={{ listStyleType: 'disc', paddingLeft: '1rem' }}>{children}</ul>; },
    ol({ children }: { children?: React.ReactNode }) { return <ol className="ml-6 mb-2" style={{ listStyleType: 'decimal', paddingLeft: '1rem' }}>{children}</ol>; },
    li({ children }: { children?: React.ReactNode }) { return <li className="mb-1">{children}</li>; },
    blockquote({ children }: { children?: React.ReactNode }) {
      return <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600 break-words">{children}</blockquote>;
    },
    a: (props: { href?: string; children?: React.ReactNode; title?: string }) => {
      const isRelative = props.href &&
        !props.href.startsWith('http://') &&
        !props.href.startsWith('https://') &&
        !props.href.startsWith('/') &&
        !props.href.startsWith('mailto:') &&
        !props.href.startsWith('tel:') &&
        !props.href.startsWith('#');
      if (isRelative && projectId && notebookId) {
        return <AuthenticatedContent href={props.href} elementType="a" projectId={projectId} notebookId={notebookId} conversationId={conversationId} pubId={pubId} apiBaseUrl={apiBaseUrl} authToken={authToken} onLinkClick={onLinkClick}>{props.children}</AuthenticatedContent>;
      }
      return <ExternalLink href={props.href} apiBaseUrl={apiBaseUrl} authToken={authToken}>{props.children}</ExternalLink>;
    },
    img: (props: { src?: string; alt?: string; title?: string }) => <AuthenticatedContent {...props} elementType="img" isStreaming={isStreaming} imgMaxHeight={maxImageHeight} onImageClick={handleImageClick} projectId={projectId} notebookId={notebookId} conversationId={conversationId} pubId={pubId} apiBaseUrl={apiBaseUrl} authToken={authToken} />,
    table({ children }: { children?: React.ReactNode }) {
      return (
        <div className="my-4 overflow-x-auto max-w-full">
          <table className="w-full border-collapse border border-gray-300 table-auto">{children}</table>
        </div>
      );
    },
    thead({ children }: { children?: React.ReactNode }) { return <thead className="bg-gray-50">{children}</thead>; },
    tbody({ children }: { children?: React.ReactNode }) { return <tbody className="divide-y divide-gray-200">{children}</tbody>; },
    tr({ children }: { children?: React.ReactNode }) { return <tr className="hover:bg-gray-50">{children}</tr>; },
    th({ children }: { children?: React.ReactNode }) {
      return <th className="px-4 py-2 text-left text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300">{children}</th>;
    },
    td({ children }: { children?: React.ReactNode }) { return <td className="px-4 py-2 text-sm text-gray-900 border border-gray-300 break-words max-w-xs">{children}</td>; },
    code({ inline, className: codeClassName, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode; [key: string]: any }) {
      const match = /language-(\w+)/.exec(codeClassName || '');
      const codeText = String(children).replace(/\n$/, '');
      if (!inline && match?.[1] === 'mermaid') {
        return <MermaidRenderer chart={codeText} isStreaming={isStreaming} />;
      }
      const shouldRenderInline = inline || (!codeClassName && !codeText.includes('\n'));
      if (shouldRenderInline) {
        return <code className={`${codeClassName || ''} bg-gray-100 px-1 py-0.5 rounded text-sm whitespace-normal`} {...props}>{children}</code>;
      }
      return (
        <pre className="bg-gray-100 border border-gray-200 rounded p-3 my-3 overflow-x-auto max-w-full">
          <code className={`${codeClassName || ''} text-sm whitespace-pre-wrap break-words`} {...props}>{children}</code>
        </pre>
      );
    },
  }), [isStreaming, projectId, notebookId, conversationId, pubId, apiBaseUrl, authToken, maxImageHeight, handleImageClick]);

  const markdown = (
    <ReactMarkdown
      children={processedText}
      remarkPlugins={[remarkGfm, remarkNestFollowingListsUnderOrderedItems, remarkMergeAdjacentOrderedLists]}
      components={markdownComponents}
    />
  );

  return (
    <>
      <div className={combinedClass} data-testid="markdown-viewer">{markdown}</div>
      {fullscreenImage && (
        <ImageFullscreenViewer
          src={fullscreenImage.src}
          alt={fullscreenImage.alt}
          fileName={fullscreenImage.fileName}
          onClose={() => setFullscreenImage(null)}
          portalContainer={portalContainer}
        />
      )}
    </>
  );
}
