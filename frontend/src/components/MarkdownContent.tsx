import React from 'react';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Lightweight, zero-dependency Markdown renderer for articles and notes.
 * Parses headers (##, ###), unordered lists (- or *), ordered lists (1.),
 * bold text (**text**), links ([text](url)), italic (*text*), blockquotes (> text).
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split into paragraphs / blocks by double newline
  const blocks = content.split(/\n\s*\n/);

  const renderInline = (text: string): React.ReactNode => {
    // Regex for inline elements: bold, italic, link, code
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Pattern matching [label](url) OR **bold** OR `code`
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(remaining)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index));
      }

      const matchStr = match[0];
      if (matchStr.startsWith('[') && matchStr.includes('](') && matchStr.endsWith(')')) {
        const label = matchStr.substring(1, matchStr.indexOf(']('));
        const url = matchStr.substring(matchStr.indexOf('](') + 2, matchStr.length - 1);
        parts.push(
          <a
            key={keyIdx++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#0073C1] font-semibold hover:underline"
          >
            {label}
          </a>
        );
      } else if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        const boldText = matchStr.slice(2, -2);
        parts.push(<strong key={keyIdx++} className="font-bold text-slate-900">{boldText}</strong>);
      } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        const codeText = matchStr.slice(1, -1);
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-xs text-blue-800">
            {codeText}
          </code>
        );
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`space-y-4 text-slate-800 leading-relaxed ${className}`}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Heading 2: ## ...
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={bIdx} className="text-xl sm:text-2xl font-black text-slate-900 pt-3 pb-1 tracking-tight border-b border-slate-100 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#0073C1] rounded-full inline-block" />
              <span>{renderInline(trimmed.replace(/^##\s+/, ''))}</span>
            </h2>
          );
        }

        // Heading 3: ### ...
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={bIdx} className="text-base sm:text-lg font-bold text-slate-900 pt-2 tracking-tight">
              {renderInline(trimmed.replace(/^###\s+/, ''))}
            </h3>
          );
        }

        // Heading 4: #### ...
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={bIdx} className="text-sm sm:text-base font-bold text-slate-800 pt-1">
              {renderInline(trimmed.replace(/^####\s+/, ''))}
            </h4>
          );
        }

        // Blockquote: > ...
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={bIdx} className="border-l-4 border-[#0073C1] pl-4 py-2 italic bg-blue-50/50 rounded-r-xl text-slate-700 text-sm">
              {renderInline(trimmed.replace(/^>\s+/, ''))}
            </blockquote>
          );
        }

        // Unordered list: lines starting with "- " or "* "
        const lines = trimmed.split('\n');
        const isList = lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '));
        if (isList) {
          return (
            <ul key={bIdx} className="space-y-2 pl-2">
              {lines.map((item, iIdx) => {
                const itemText = item.trim().replace(/^[-*]\s+/, '');
                return (
                  <li key={iIdx} className="flex items-start gap-2.5 text-sm sm:text-[15px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0073C1] shrink-0 mt-2" />
                    <span>{renderInline(itemText)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Numbered list: lines starting with "1. ", "2. ", etc.
        const isNumberedList = lines.every((l) => /^\d+\.\s+/.test(l.trim()));
        if (isNumberedList) {
          return (
            <ol key={bIdx} className="space-y-2 pl-2">
              {lines.map((item, iIdx) => {
                const match = item.trim().match(/^(\d+)\.\s+(.*)$/);
                const num = match ? match[1] : `${iIdx + 1}`;
                const itemText = match ? match[2] : item.trim();
                return (
                  <li key={iIdx} className="flex items-start gap-2.5 text-sm sm:text-[15px]">
                    <span className="font-bold text-[#0073C1] text-xs font-mono shrink-0 mt-0.5 px-1.5 py-0.5 bg-blue-50 rounded">
                      {num}.
                    </span>
                    <span>{renderInline(itemText)}</span>
                  </li>
                );
              })}
            </ol>
          );
        }

        // Regular Paragraph (preserving single linebreaks within a paragraph if any)
        return (
          <p key={bIdx} className="text-sm sm:text-[15px] text-justify leading-relaxed text-slate-700">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
