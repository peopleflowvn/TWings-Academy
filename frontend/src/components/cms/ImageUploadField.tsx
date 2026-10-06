import React, { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { apiFetch, ApiError } from '../../lib/api';

const MAX_BYTES = 5 * 1024 * 1024; // same limit as the server (MAX_UPLOAD_IMAGE_BYTES)

/** Upload an image to the site storage (POST /staff/uploads/images/); returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  if (file.size > MAX_BYTES) throw new ApiError(413, 'Ảnh vượt quá 5 MB.');
  const body = new FormData();
  body.append('file', file);
  const res = await apiFetch<{ url: string }>('/staff/uploads/images/', { method: 'POST', body });
  return res.url;
}

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  accept?: string;
  previewClassName?: string;
}

/**
 * Image field: upload a file straight to storage (the server re-encodes it and strips metadata),
 * or paste a link. The preview shows whatever URL is set.
 */
export const ImageUploadField: React.FC<Props> = ({
  label,
  value,
  onChange,
  hint,
  accept = 'image/png,image/jpeg,image/webp',
  previewClassName = 'w-12 h-12 object-contain'
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
      <label className="font-bold text-slate-700 block text-xs">{label}</label>
      <div className="flex items-center gap-2">
        {value ? (
          <img src={value} alt="" className={`${previewClassName} rounded border border-slate-200 p-0.5 bg-white shrink-0`} />
        ) : (
          <div className={`${previewClassName} rounded border border-dashed border-slate-300 bg-slate-50 shrink-0`} />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tải ảnh lên hoặc dán đường dẫn"
          className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-xs font-mono"
        />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="px-3 py-2 rounded-lg border border-[#0073C1] text-[#0073C1] text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Tải ảnh lên
        </button>
        <input ref={input} type="file" accept={accept} onChange={pick} className="hidden" />
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};
