import { useMemo } from 'react';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Configure DOMPurify with allowed tags and attributes
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['strong', 'em', 'code', 'br', 'span', 'div', 'hr', 'p'],
  ALLOWED_ATTR: ['class'],
  KEEP_CONTENT: true,
};

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    // Process markdown-like syntax
    let processed = content;
    
    // Headers - convert to styled divs (process BEFORE other formatting)
    // Must be at the start of a line
    processed = processed.replace(/^###\s+(.*)$/gm, '<div class="text-base font-semibold mt-3 mb-1 text-foreground">$1</div>');
    processed = processed.replace(/^##\s+(.*)$/gm, '<div class="text-lg font-bold mt-4 mb-2 text-primary">$1</div>');
    processed = processed.replace(/^#\s+(.*)$/gm, '<div class="text-xl font-bold mt-4 mb-2 text-foreground">$1</div>');
    
    // Horizontal rules / separators
    processed = processed.replace(/^---+$/gm, '<hr class="my-4 border-muted-foreground/30" />');
    
    // Bold text: **text** or __text__
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');
    
    // Italic text: *text* or _text_
    processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    processed = processed.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Inline code: `code`
    processed = processed.replace(/`([^`]+)`/g, '<code class="bg-muted-foreground/20 px-1 py-0.5 rounded text-xs">$1</code>');
    
    // Line breaks
    processed = processed.replace(/\n/g, '<br />');
    
    // Lists: - item or * item or numbered lists
    const lines = processed.split('<br />');
    const processedLines = lines.map((line) => {
      // Skip if already processed as header or hr
      if (line.startsWith('<div') || line.startsWith('<hr')) {
        return line;
      }
      // Unordered list item
      if (/^[-*]\s+/.test(line)) {
        return `<span class="flex items-start gap-2"><span class="text-primary">•</span><span>${line.replace(/^[-*]\s+/, '')}</span></span>`;
      }
      // Numbered list item
      if (/^\d+\.\s+/.test(line)) {
        const match = line.match(/^(\d+)\.\s+(.*)/);
        if (match) {
          return `<span class="flex items-start gap-2"><span class="text-primary font-medium">${match[1]}.</span><span>${match[2]}</span></span>`;
        }
      }
      return line;
    });
    
    // Sanitize the final HTML to prevent XSS attacks
    return DOMPurify.sanitize(processedLines.join('<br />'), PURIFY_CONFIG);
  }, [content]);

  return (
    <div
      className={`text-sm leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedContent }}
    />
  );
}
