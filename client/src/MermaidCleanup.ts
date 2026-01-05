/**
 * Utility functions for cleaning up Mermaid diagram artifacts from the DOM
 */

export function cleanupOrphanedMermaidElements(): void {
  const selectors = [
    'svg[id^="mermaid-"]',
    'div[id^="mermaid-"]',
    'div[data-processed-by="mermaid"]',
    '.mermaid[data-processed]'
  ];

  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      if (element.parentNode === document.body) {
        try { element.remove(); } catch {}
      }
    });
  });
}

export function validateMermaidSyntax(chart: string): { isValid: boolean; error?: string } {
  if (!chart || typeof chart !== 'string') {
    return { isValid: false, error: 'Chart must be a non-empty string' };
  }

  const trimmedChart = chart.trim();
  if (!trimmedChart) {
    return { isValid: false, error: 'Chart cannot be empty' };
  }

  const diagramTypes = [
    'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
    'erDiagram', 'journey', 'gantt', 'pie', 'gitgraph', 'mindmap', 'timeline',
    'requirementDiagram', 'c4Context'
  ];

  const hasValidStart = diagramTypes.some(type =>
    trimmedChart.toLowerCase().startsWith(type.toLowerCase())
  );

  if (!hasValidStart) {
    return {
      isValid: false,
      error: `Chart must start with a valid diagram type. Supported types: ${diagramTypes.join(', ')}`
    };
  }

  return { isValid: true };
}

export function setupMermaidCleanupInterval(intervalMs: number = 30000): () => void {
  const intervalId = setInterval(() => {
    cleanupOrphanedMermaidElements();
  }, intervalMs);
  return () => clearInterval(intervalId);
}


