import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Image as ImageIcon, Loader2, Trash2, Upload } from 'lucide-react';
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
  /** Optional callback triggered only when a file finishes uploading from disk (useful for auto-saving). */
  onUploaded?: (url: string) => void;
  hint?: string;
  accept?: string;
  previewClassName?: string;
  /** 'row' (default compact) or 'stacked' (dropzone on top, controls below). */
  layout?: 'row' | 'stacked';
}

/**
 * Image field: upload a file straight to storage (the server re-encodes it and strips metadata),
 * or paste a link.
 */
export const ImageUploadField: React.FC<Props> = ({
  label,
  value,
  onChange,
  onUploaded,
  hint,
  accept = 'image/png,image/jpeg,image/webp',
  previewClassName = 'w-12 h-12 object-contain',
  layout,
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [value]);

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    setLoadFailed(false);
    try {
      const uploadedUrl = await uploadImage(file);
      onChange(uploadedUrl);
      onUploaded?.(uploadedUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh thất bại');
    } finally {
      setBusy(false);
    }
  };

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await handleFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  // Auto-detect stacked layout if explicitly set or if preview is wide (e.g. w-full)
  const isStacked = layout === 'stacked' || previewClassName.includes('w-full');

  if (isStacked) {
    return (
      <div className="space-y-2">
        <label className="font-bold text-slate-700 block text-xs">{label}</label>

        {/* Dropzone / Preview */}
        <div
          onClick={() => !busy && input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative ${previewClassName || 'w-full h-36'} rounded-xl border-2 transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center text-center ${
            isDragOver
              ? 'border-[#0073C1] bg-blue-50/70 scale-[0.99]'
              : loadFailed
                ? 'border-red-300 bg-red-50/50'
                : value
                  ? 'border-slate-200 bg-white hover:border-slate-300'
                  : 'border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 hover:border-[#0073C1]'
          }`}
        >
          {value && !loadFailed ? (
            <div className="relative w-full h-full group">
              <img
                src={value}
                alt=""
                onError={() => setLoadFailed(true)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                <Upload className="w-5 h-5" />
                <span className="text-xs font-bold">Nhấn hoặc thả ảnh để thay thế</span>
              </div>
            </div>
          ) : (
            <div className="p-4 flex flex-col items-center justify-center gap-1 text-slate-500">
              {busy ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin text-[#0073C1] mb-1" />
                  <span className="text-xs font-bold text-[#0073C1]">Đang tải ảnh lên…</span>
                </>
              ) : loadFailed ? (
                <>
                  <AlertCircle className="w-6 h-6 text-red-500 mb-1" />
                  <span className="text-xs font-bold text-red-600">Không tải được ảnh xem trước</span>
                  <span className="text-[10px] text-red-400">Nhấn vào đây để tải ảnh mới lên</span>
                </>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-[#0073C1] flex items-center justify-center mb-0.5">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    Nhấn để tải ảnh từ máy tính hoặc kéo thả vào đây
                  </span>
                  <span className="text-[10px] text-slate-400">Định dạng JPG, PNG, WebP tối đa 5 MB</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Input controls row (always visible below the preview) */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Hoặc dán liên kết ảnh trực tiếp (https://...)"
            className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-[#0073C1]"
          />
          {value && (
            <button
              type="button"
              title="Gỡ ảnh này"
              onClick={(e) => {
                e.stopPropagation();
                setError('');
                setLoadFailed(false);
                onChange('');
              }}
              disabled={busy}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="px-3 py-2 rounded-lg border border-[#0073C1] text-[#0073C1] text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Tải tệp lên</span>
          </button>
          <input ref={input} type="file" accept={accept} onChange={pick} className="hidden" />
        </div>

        {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
        {loadFailed && !error && (
          <p className="text-[11px] text-amber-600">Đường dẫn ảnh không tải được. Vui lòng kiểm tra lại liên kết hoặc tải tệp mới.</p>
        )}
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  // Row layout (for compact fields)
  return (
    <div className="space-y-1">
      <label className="font-bold text-slate-700 block text-xs">{label}</label>
      <div className="flex items-center gap-2">
        {value && !loadFailed ? (
          <img
            src={value}
            alt=""
            onError={() => setLoadFailed(true)}
            className={`${previewClassName} rounded border border-slate-200 p-0.5 bg-white shrink-0`}
          />
        ) : (
          <div
            className={`${previewClassName} rounded border border-dashed ${
              loadFailed ? 'border-red-300 bg-red-50 text-red-500' : 'border-slate-300 bg-slate-50 text-slate-400'
            } flex items-center justify-center shrink-0`}
          >
            {loadFailed ? <AlertCircle className="w-4 h-4" /> : <ImageIcon className="w-4 h-4 opacity-50" />}
          </div>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Tải ảnh lên hoặc dán đường dẫn"
          className="flex-1 min-w-0 p-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-none focus:border-[#0073C1]"
        />
        {value && (
          <button
            type="button"
            title="Gỡ ảnh"
            onClick={() => {
              setError('');
              setLoadFailed(false);
              onChange('');
            }}
            disabled={busy}
            className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="px-3 py-2 rounded-lg border border-[#0073C1] text-[#0073C1] text-xs font-bold flex items-center gap-1.5 hover:bg-blue-50 cursor-pointer disabled:opacity-50 shrink-0 transition-colors"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Tải ảnh lên
        </button>
        <input ref={input} type="file" accept={accept} onChange={pick} className="hidden" />
      </div>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
      {loadFailed && !error && (
        <p className="text-[11px] text-amber-600">Không tải được ảnh xem trước từ đường dẫn này. Vui lòng kiểm tra lại hoặc tải ảnh mới.</p>
      )}
      {error && <p className="text-[11px] text-red-600">{error}</p>}
    </div>
  );
};
