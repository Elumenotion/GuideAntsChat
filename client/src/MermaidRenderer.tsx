import { useState, useEffect, useRef } from 'react';
import { cleanupOrphanedMermaidElements, validateMermaidSyntax } from './MermaidCleanup';

let mermaidInitialized = false;

export default function MermaidRenderer({ chart, className = '', isStreaming = false }: { chart: string; className?: string; isStreaming?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    async function renderMermaid() {
      if (!containerRef.current) return;

      try {
        const mermaidLib = await import('mermaid');
        const mermaid = (mermaidLib as any).default ?? mermaidLib;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            suppressErrorRendering: true,
            securityLevel: 'loose',
            htmlLabels: false
          });
          mermaidInitialized = true;
        }

        const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
        
        // Clean up before starting a new render to prevent orphans
        cleanupOrphanedMermaidElements();

        const syntaxCheck = validateMermaidSyntax(chart);
        if (!syntaxCheck.isValid) {
          throw new Error(syntaxCheck.error || 'Invalid Mermaid syntax');
        }

        const isValidSyntax = await mermaid.parse(chart);
        if (!isValidSyntax) {
          throw new Error('Invalid Mermaid syntax - failed advanced validation');
        }

        const { svg } = await mermaid.render(id, chart);

        if (!isCancelled) {
          setSvgContent(svg);
          setErrorMessage(null);
        }
      } catch (err) {
        cleanupOrphanedMermaidElements();
        if (!isCancelled) {
          console.error('Failed to render mermaid diagram:', err);
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMessage(msg);
          // Don't clear svgContent here if we want to show stale diagram, 
          // but for now, let's clear it so we can show error or raw text
          setSvgContent(null);
        }
      }
    }

    if (isStreaming) {
      // Debounce during streaming
      timeoutId = setTimeout(renderMermaid, 1000);
    } else {
      renderMermaid();
    }

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      // Removed cleanupOrphanedMermaidElements() from here to prevent excessive DOM thrashing during streaming
    };
  }, [chart, isStreaming]);

  if (errorMessage) {
    return (
      <div className={`mermaid-error my-4 ${className}`.trim()}>
        <div className="border border-red-300 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Mermaid Diagram Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Failed to render diagram. Please check the syntax.</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-red-600 underline">View error details</summary>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">{errorMessage}</pre>
                </details>
              </div>
            </div>
          </div>
        </div>
        {/* Fallback to showing code when error occurs */}
        <pre className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">{chart}</pre>
      </div>
    );
  }

  if (svgContent) {
    return (
      <div 
        ref={containerRef} 
        className={`mermaid-diagram my-4 ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    );
  }

  // Pending state (waiting for debounce or render)
  // Show raw code block so content doesn't "disappear"
  return (
    <div ref={containerRef} className={`mermaid-pending my-4 ${className}`.trim()}>
      <div className="bg-gray-50 border border-blue-200 rounded p-3 relative">
        {isStreaming && (
          <div className="absolute top-2 right-2 flex items-center space-x-1 text-xs text-blue-500">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Rendering diagram...</span>
          </div>
        )}
        <pre className="text-sm overflow-x-auto text-gray-700">{chart}</pre>
      </div>
    </div>
  );
}
