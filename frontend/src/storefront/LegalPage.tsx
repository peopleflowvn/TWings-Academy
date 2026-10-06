import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../lib/api';

/**
 * /chinh-sach-bao-mat and /dieu-khoan. The HTML comes from the server: the built-in text or the
 * version staff wrote in /app, sanitised server-side (apps.cms.legal).
 */
export const LegalPage: React.FC<{ kind: 'privacy' | 'terms' }> = ({ kind }) => {
  const [page, setPage] = useState<{ title: string; html: string } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .get<{ title: string; html: string }>(`/public/legal/${kind}/`)
      .then(setPage)
      .catch(() => setError('Không tải được nội dung, vui lòng thử lại sau.'));
  }, [kind]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!page) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  return (
    <article className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-10">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">{page.title}</h1>
      <div
        className="text-sm text-slate-700 leading-relaxed space-y-3 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-[#0056D2] [&_a]:underline"
        dangerouslySetInnerHTML={{ __html: page.html }}
      />
    </article>
  );
};
