import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';

export async function renderMarkdown(text: string): Promise<string> {
  try {
    const processedText = preprocessHtmlMediaTags(text);
    const html = await remark()
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSanitize)
      .use(rehypeStringify)
      .process(processedText);
    return applyMarkdownStyles(String(html));
  } catch {
    return escapeHtml(text);
  }
}

export function preprocessHtmlMediaTags(text: string): string {
  // Replace video tags
  text = text.replace(/<video\s+[^>]*?>(.*?)<\/video>/gis, (match, content) => {
    const videoSrcMatch = match.match(/<video\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (videoSrcMatch) {
      return `[VIDEO:${videoSrcMatch[1]}]`;
    }
    const sourceSrcMatch = content.match(/<source\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (sourceSrcMatch) {
      return `[VIDEO:${sourceSrcMatch[1]}]`;
    }
    return match;
  });

  // Replace audio tags
  text = text.replace(/<audio\s+[^>]*?>(.*?)<\/audio>/gis, (match, content) => {
    const audioSrcMatch = match.match(/<audio\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (audioSrcMatch) {
      return `[AUDIO:${audioSrcMatch[1]}]`;
    }
    const sourceSrcMatch = content.match(/<source\s+[^>]*?src\s*=\s*["']([^"']*?)["']/i);
    if (sourceSrcMatch) {
      return `[AUDIO:${sourceSrcMatch[1]}]`;
    }
    return match;
  });

  return text;
}

export function applyMarkdownStyles(html: string): string {
  let styled = html;
  // Headings
  styled = styled.replace(/<h1>/g, '<h1 class="text-2xl font-bold mb-2">');
  styled = styled.replace(/<h2>/g, '<h2 class="text-xl font-semibold mb-2">');
  styled = styled.replace(/<h3>/g, '<h3 class="text-lg font-semibold mb-2">');
  styled = styled.replace(/<h4>/g, '<h4 class="text-base font-semibold mb-2">');
  styled = styled.replace(/<h5>/g, '<h5 class="text-sm font-semibold mb-1">');
  // Paragraphs
  styled = styled.replace(/<p>/g, '<p class="mb-2 leading-relaxed break-words max-w-full overflow-wrap-anywhere">');
  // Lists
  styled = styled.replace(/<ul>/g, '<ul class="ml-6 mb-2" style="list-style-type: disc; padding-left: 1rem;">');
  styled = styled.replace(/<ol>/g, '<ol class="ml-6 mb-2" style="list-style-type: decimal; padding-left: 1rem;">');
  styled = styled.replace(/<li>/g, '<li class="mb-1">');
  // Blockquotes
  styled = styled.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600 break-words">');
  // Code
  styled = styled.replace(/<code(?![^>]*class)/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm whitespace-normal"');
  styled = styled.replace(/<pre>/g, '<pre class="bg-gray-100 border border-gray-200 rounded p-3 my-3 overflow-x-auto max-w-full"><code class="text-sm whitespace-pre-wrap break-words"');
  styled = styled.replace(/<\/pre>/g, '</code></pre>');
  // Tables
  styled = styled.replace(/<table>/g, '<div class="my-4 overflow-x-auto max-w-full"><table class="w-full border-collapse border border-gray-300 table-auto">');
  styled = styled.replace(/<\/table>/g, '</table></div>');
  styled = styled.replace(/<thead>/g, '<thead class="bg-gray-50">');
  styled = styled.replace(/<tbody>/g, '<tbody class="divide-y divide-gray-200">');
  styled = styled.replace(/<tr>/g, '<tr class="hover:bg-gray-50">');
  styled = styled.replace(/<th>/g, '<th class="px-4 py-2 text-left text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300">');
  styled = styled.replace(/<td>/g, '<td class="px-4 py-2 text-sm text-gray-900 border border-gray-300 break-words max-w-xs">');
  // Links
  styled = styled.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline"');
  styled = styled.replace(/<a href="([^"]+)"(?![^>]*class)/g, '<a href="$1" class="text-blue-600 hover:text-blue-800 underline"');
  return styled;
}

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}


