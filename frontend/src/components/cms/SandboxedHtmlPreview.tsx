import React from 'react';

interface SandboxedHtmlPreviewProps {
  html: string;
  className?: string;
  minHeight?: number;
  title?: string;
}

/**
 * Renders untrusted HTML (email templates, sent-email logs) inside a sandboxed iframe.
 * `sandbox=""` disables scripts, forms, popups and same-origin access, so markup injected into a
 * template can never run with the CMS session the way dangerouslySetInnerHTML would allow.
 */
export const SandboxedHtmlPreview: React.FC<SandboxedHtmlPreviewProps> = ({
  html,
  className = '',
  minHeight = 360,
  title = 'Xem trước email'
}) => (
  <iframe
    title={title}
    sandbox=""
    referrerPolicy="no-referrer"
    srcDoc={html}
    className={`w-full bg-white border-0 ${className}`}
    style={{ minHeight }}
  />
);
