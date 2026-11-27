import React from 'react';
import { MarkdownContent } from './MarkdownContent';

/** Written with the rich text editor (HTML, sanitised by the server when saved) or, older ones, Markdown. */
export const isHtml = (content: string) => /^\s*<(p|h[1-6]|ul|ol|div|blockquote|table|figure|img|pre|hr)[\s>/]/i.test(content || '');

export const ArticleBody: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) =>
  isHtml(content) ? (
    <div className={`article-body ${className}`} dangerouslySetInnerHTML={{ __html: content }} />
  ) : (
    <MarkdownContent content={content} className={className} />
  );
