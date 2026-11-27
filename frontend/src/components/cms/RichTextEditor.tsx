import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TableKit } from '@tiptap/extension-table';
import { TextStyleKit } from '@tiptap/extension-text-style';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, CloudUpload, Code, Code2, Eraser, Highlighter, Image as ImageIcon,
  Italic, Link2, Link2Off, List, ListOrdered, Loader2, Maximize2, Minimize2, Minus, Palette, Quote, Redo2, Strikethrough,
  Subscript as SubIcon, Superscript as SupIcon, Table as TableIcon, Underline, Undo2, FileCode2
} from 'lucide-react';
import { api } from '../../lib/api';
import { uploadImage } from './ImageUploadField';

/** An image with a display width (25–100%), written as an inline style the server keeps. */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.width || null,
        renderHTML: (attrs: { size?: string | null }) => (attrs.size ? { style: `width: ${attrs.size}` } : {})
      }
    };
  }
});

const COLORS = ['#0f172a', '#475569', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0073c1', '#7c3aed', '#db2777'];
const HIGHLIGHTS = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#e2e8f0'];
const SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '30px'];

/** Where our uploaded images are served from (R2): anything else is "from another site". */
let mediaBase: Promise<string> | null = null;
const loadMediaBase = () =>
  (mediaBase ??= api.get<{ base: string }>('/staff/uploads/images/import/').then((r) => r.base).catch(() => ''));

async function toOurStorage(src: string): Promise<string> {
  if (src.startsWith('data:')) {
    const blob = await (await fetch(src)).blob();
    return uploadImage(new File([blob], 'pasted', { type: blob.type || 'image/png' }));
  }
  const res = await api.post<{ url: string }>('/staff/uploads/images/import/', { url: src });
  return res.url;
}

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Words / characters, for the SEO panel. */
  onStats?: (stats: { words: number; characters: number }) => void;
}

/**
 * Word-like editor for articles: styles, fonts sizes, colours, alignment, lists, quotes, tables, links and
 * images uploaded to our storage (R2) – picked, pasted or dropped. Images still on another site (pasted from
 * a web page or Word) are listed and copied to R2 in one click. Writes sanitisable HTML.
 */
export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, onStats }) => {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [source, setSource] = useState(false);
  const [sourceText, setSourceText] = useState('');
  const [foreign, setForeign] = useState<string[]>([]);
  const [base, setBase] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    loadMediaBase().then(setBase);
  }, []);

  const insertFiles = useCallback(async (files: File[], pos?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    setError('');
    for (const file of files.filter((f) => f.type.startsWith('image/'))) {
      setBusy(`Đang tải ảnh ${file.name} lên…`);
      try {
        const url = await uploadImage(file);
        const chain = editor.chain().focus();
        (pos != null ? chain.insertContentAt(pos, { type: 'image', attrs: { src: url, alt: '' } }) : chain.setImage({ src: url, alt: '' })).run();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Không tải được ảnh.');
      }
    }
    setBusy('');
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { target: '_blank' } }
      }),
      SizedImage.configure({ HTMLAttributes: { loading: 'lazy' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Subscript,
      Superscript,
      TableKit.configure({ table: { resizable: true } }),
      TextStyleKit.configure({ fontFamily: false, lineHeight: false }),
      CharacterCount,
      Placeholder.configure({ placeholder: placeholder || 'Soạn nội dung bài viết…' })
    ],
    content: value,
    editorProps: {
      attributes: { class: 'article-body article-editor focus:outline-none min-h-[420px] px-5 py-4' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files || []);
        if (!files.some((f) => f.type.startsWith('image/'))) return false;
        event.preventDefault();
        insertFiles(files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files || []);
        if (!files.some((f) => f.type.startsWith('image/'))) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertFiles(files, pos);
        return true;
      }
    },
    onUpdate: ({ editor: e }) => onChange(e.getHTML())
  });
  editorRef.current = editor;

  // The parent loads another article / restores a version: replace the document.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const srcs: string[] = [];
      e.state.doc.descendants((node) => {
        if (node.type.name === 'image' && node.attrs.src) srcs.push(node.attrs.src as string);
      });
      return {
        words: e.storage.characterCount.words() as number,
        characters: e.storage.characterCount.characters() as number,
        srcs: srcs.join('\n'),
        heading: [2, 3, 4].find((l) => e.isActive('heading', { level: l })) ?? 0,
        image: e.isActive('image'),
        table: e.isActive('table'),
        link: e.isActive('link'),
        fontSize: (e.getAttributes('textStyle').fontSize as string) || ''
      };
    }
  });

  useEffect(() => {
    if (state) onStats?.({ words: state.words, characters: state.characters });
  }, [state?.words, state?.characters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const srcs = (state?.srcs || '').split('\n').filter(Boolean);
    setForeign(base ? srcs.filter((s) => !s.startsWith(base)) : srcs.filter((s) => s.startsWith('data:')));
  }, [state?.srcs, base]);

  if (!editor || !state) return null;

  const copyForeignImages = async () => {
    setError('');
    let done = 0;
    for (const src of Array.from(new Set(foreign))) {
      setBusy(`Đang chuyển ảnh ${done + 1}/${new Set(foreign).size} về kho ảnh…`);
      try {
        const url = await toOurStorage(src);
        const { tr } = editor.state;
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name === 'image' && node.attrs.src === src) tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: url });
        });
        editor.view.dispatch(tr);
        done += 1;
      } catch (e) {
        setError(`Không chuyển được 1 ảnh: ${e instanceof Error ? e.message : ''}`);
      }
    }
    setBusy('');
  };

  const setLink = () => {
    const previous = (editor.getAttributes('link').href as string) || '';
    const url = window.prompt('Địa chỉ liên kết (https://…, /khoa-hoc/…):', previous);
    if (url === null) return;
    if (!url.trim()) editor.chain().focus().extendMarkRange('link').unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
  };

  const imageFromLink = async () => {
    const url = window.prompt('Liên kết ảnh trên trang khác: ảnh sẽ được tải về kho ảnh của TWings (R2) rồi chèn vào bài.');
    if (!url?.trim()) return;
    setBusy('Đang tải ảnh về kho ảnh…');
    setError('');
    try {
      editor.chain().focus().setImage({ src: await toOurStorage(url.trim()), alt: '' }).run();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được ảnh.');
    }
    setBusy('');
  };

  const toggleSource = () => {
    if (source) editor.commands.setContent(sourceText, { emitUpdate: true });
    else setSourceText(editor.getHTML());
    setSource(!source);
  };

  const btn = (active: boolean, onClick: () => void, title: string, icon: React.ReactNode, disabled = false) => (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled || source}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-1.5 rounded-lg cursor-pointer disabled:opacity-30 ${active ? 'bg-[#0073C1] text-white' : 'text-slate-700 hover:bg-slate-200'}`}
    >
      {icon}
    </button>
  );
  const sep = <span className="w-px h-6 bg-slate-300 mx-0.5" />;
  const ic = 'w-4 h-4';
  const chain = () => editor.chain().focus();

  return (
    <div className={`${fullscreen ? 'fixed inset-0 z-[90] bg-white flex flex-col' : 'border border-slate-300 rounded-2xl overflow-hidden bg-white'}`}>
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 p-1.5 bg-slate-50 border-b border-slate-200">
        {btn(false, () => chain().undo().run(), 'Hoàn tác (Ctrl+Z)', <Undo2 className={ic} />, !editor.can().undo())}
        {btn(false, () => chain().redo().run(), 'Làm lại (Ctrl+Y)', <Redo2 className={ic} />, !editor.can().redo())}
        {sep}
        <select
          title="Kiểu đoạn"
          disabled={source}
          value={state.heading}
          onChange={(e) => {
            const level = Number(e.target.value) as 0 | 2 | 3 | 4;
            if (level) chain().setHeading({ level }).run();
            else chain().setParagraph().run();
          }}
          className="text-xs font-bold border border-slate-300 rounded-lg px-1.5 py-1 bg-white"
        >
          <option value={0}>Đoạn văn</option>
          <option value={2}>Tiêu đề lớn (H2)</option>
          <option value={3}>Tiêu đề vừa (H3)</option>
          <option value={4}>Tiêu đề nhỏ (H4)</option>
        </select>
        <select
          title="Cỡ chữ"
          disabled={source}
          value={state.fontSize}
          onChange={(e) => (e.target.value ? chain().setFontSize(e.target.value).run() : chain().unsetFontSize().run())}
          className="text-xs border border-slate-300 rounded-lg px-1.5 py-1 bg-white"
        >
          <option value="">Cỡ chữ</option>
          {SIZES.map((s) => (
            <option key={s} value={s}>{s.replace('px', '')}</option>
          ))}
        </select>
        {sep}
        {btn(editor.isActive('bold'), () => chain().toggleBold().run(), 'In đậm (Ctrl+B)', <Bold className={ic} />)}
        {btn(editor.isActive('italic'), () => chain().toggleItalic().run(), 'In nghiêng (Ctrl+I)', <Italic className={ic} />)}
        {btn(editor.isActive('underline'), () => chain().toggleUnderline().run(), 'Gạch chân (Ctrl+U)', <Underline className={ic} />)}
        {btn(editor.isActive('strike'), () => chain().toggleStrike().run(), 'Gạch ngang', <Strikethrough className={ic} />)}
        {btn(editor.isActive('subscript'), () => chain().toggleSubscript().run(), 'Chỉ số dưới', <SubIcon className={ic} />)}
        {btn(editor.isActive('superscript'), () => chain().toggleSuperscript().run(), 'Chỉ số trên', <SupIcon className={ic} />)}
        {btn(editor.isActive('code'), () => chain().toggleCode().run(), 'Mã (code)', <Code className={ic} />)}
        <Swatches icon={<Palette className={ic} />} title="Màu chữ" colors={COLORS} disabled={source}
          onPick={(c) => (c ? chain().setColor(c).run() : chain().unsetColor().run())} />
        <Swatches icon={<Highlighter className={ic} />} title="Tô nền chữ" colors={HIGHLIGHTS} disabled={source}
          onPick={(c) => (c ? chain().setHighlight({ color: c }).run() : chain().unsetHighlight().run())} />
        {btn(false, () => chain().unsetAllMarks().clearNodes().run(), 'Xóa định dạng', <Eraser className={ic} />)}
        {sep}
        {btn(editor.isActive({ textAlign: 'left' }), () => chain().setTextAlign('left').run(), 'Căn trái', <AlignLeft className={ic} />)}
        {btn(editor.isActive({ textAlign: 'center' }), () => chain().setTextAlign('center').run(), 'Căn giữa', <AlignCenter className={ic} />)}
        {btn(editor.isActive({ textAlign: 'right' }), () => chain().setTextAlign('right').run(), 'Căn phải', <AlignRight className={ic} />)}
        {btn(editor.isActive({ textAlign: 'justify' }), () => chain().setTextAlign('justify').run(), 'Căn đều', <AlignJustify className={ic} />)}
        {sep}
        {btn(editor.isActive('bulletList'), () => chain().toggleBulletList().run(), 'Danh sách chấm', <List className={ic} />)}
        {btn(editor.isActive('orderedList'), () => chain().toggleOrderedList().run(), 'Danh sách số', <ListOrdered className={ic} />)}
        {btn(editor.isActive('blockquote'), () => chain().toggleBlockquote().run(), 'Trích dẫn', <Quote className={ic} />)}
        {btn(editor.isActive('codeBlock'), () => chain().toggleCodeBlock().run(), 'Khối mã', <Code2 className={ic} />)}
        {btn(false, () => chain().setHorizontalRule().run(), 'Đường kẻ ngang', <Minus className={ic} />)}
        {sep}
        {btn(state.link, setLink, 'Chèn / sửa liên kết', <Link2 className={ic} />)}
        {btn(false, () => chain().unsetLink().run(), 'Bỏ liên kết', <Link2Off className={ic} />, !state.link)}
        {btn(false, () => fileRef.current?.click(), 'Tải ảnh lên (lưu trên R2)', <ImageIcon className={ic} />)}
        {btn(false, imageFromLink, 'Chèn ảnh từ liên kết (tự tải về R2)', <CloudUpload className={ic} />)}
        {btn(state.table, () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), 'Chèn bảng 3×3', <TableIcon className={ic} />)}
        {sep}
        {btn(source, toggleSource, source ? 'Quay lại soạn thảo' : 'Xem / sửa mã HTML', <FileCode2 className={ic} />)}
        <button type="button" title={fullscreen ? 'Thu nhỏ' : 'Toàn màn hình'} onClick={() => setFullscreen(!fullscreen)}
          className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200 cursor-pointer ml-auto">
          {fullscreen ? <Minimize2 className={ic} /> : <Maximize2 className={ic} />}
        </button>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
          onChange={(e) => { insertFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
      </div>

      {(state.table || state.image) && !source && (
        <div className="flex flex-wrap items-center gap-1 px-2 py-1 bg-blue-50 border-b border-blue-100 text-[11px] font-bold text-slate-700">
          {state.table && (
            <>
              <span className="text-slate-500 mr-1">Bảng:</span>
              {[
                ['+ Hàng trên', () => chain().addRowBefore().run()],
                ['+ Hàng dưới', () => chain().addRowAfter().run()],
                ['+ Cột trái', () => chain().addColumnBefore().run()],
                ['+ Cột phải', () => chain().addColumnAfter().run()],
                ['− Hàng', () => chain().deleteRow().run()],
                ['− Cột', () => chain().deleteColumn().run()],
                ['Gộp / tách ô', () => chain().mergeOrSplit().run()],
                ['Hàng tiêu đề', () => chain().toggleHeaderRow().run()],
                ['Xóa bảng', () => chain().deleteTable().run()]
              ].map(([label, run]) => (
                <button key={label as string} type="button" onClick={run as () => void}
                  className="px-2 py-0.5 rounded-md bg-white border border-blue-200 hover:bg-blue-100 cursor-pointer">{label as string}</button>
              ))}
            </>
          )}
          {state.image && (
            <>
              <span className="text-slate-500 mr-1">Ảnh:</span>
              {['25%', '50%', '75%', '100%'].map((w) => (
                <button key={w} type="button" onClick={() => chain().updateAttributes('image', { size: w }).run()}
                  className="px-2 py-0.5 rounded-md bg-white border border-blue-200 hover:bg-blue-100 cursor-pointer">Rộng {w}</button>
              ))}
              <button type="button"
                onClick={() => {
                  const alt = window.prompt('Mô tả ảnh (alt, tốt cho SEO và người khiếm thị):', (editor.getAttributes('image').alt as string) || '');
                  if (alt !== null) chain().updateAttributes('image', { alt: alt.trim() }).run();
                }}
                className="px-2 py-0.5 rounded-md bg-white border border-blue-200 hover:bg-blue-100 cursor-pointer">Mô tả ảnh (alt)</button>
            </>
          )}
        </div>
      )}

      {foreign.length > 0 && !source && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900">
          <span className="font-bold">{new Set(foreign).size} ảnh trong bài đang nằm trên trang khác (dán từ web / Word).</span>
          <span>Ảnh có thể mất khi trang đó xóa: nên chuyển về kho ảnh TWings (R2).</span>
          <button type="button" disabled={!!busy} onClick={copyForeignImages}
            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 cursor-pointer disabled:opacity-50">
            Chuyển tất cả về R2
          </button>
        </div>
      )}

      {source ? (
        <textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} spellCheck={false}
          className={`w-full p-4 font-mono text-xs leading-relaxed focus:outline-none ${fullscreen ? 'flex-1' : 'min-h-[420px]'}`} />
      ) : (
        <div className={fullscreen ? 'flex-1 overflow-y-auto' : 'max-h-[75vh] overflow-y-auto'}>
          <div className={fullscreen ? 'max-w-3xl mx-auto' : ''}>
            <EditorContent editor={editor} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500">
        <span>
          {state.words.toLocaleString('vi-VN')} từ · {state.characters.toLocaleString('vi-VN')} ký tự · dán hoặc kéo-thả ảnh vào bài để tải lên R2
        </span>
        {busy && <span className="flex items-center gap-1 text-[#0073C1] font-bold"><Loader2 className="w-3 h-3 animate-spin" />{busy}</span>}
        {error && <span className="text-red-600 font-bold">{error}</span>}
      </div>
    </div>
  );
};

const Swatches: React.FC<{ icon: React.ReactNode; title: string; colors: string[]; disabled?: boolean; onPick: (c: string | null) => void }> = ({
  icon, title, colors, disabled, onPick
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" title={title} aria-label={title} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => setOpen(!open)}
        className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200 cursor-pointer disabled:opacity-30">
        {icon}
      </button>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 p-2 bg-white border border-slate-200 rounded-xl shadow-lg grid grid-cols-5 gap-1 w-40" onMouseLeave={() => setOpen(false)}>
          {colors.map((c) => (
            <button key={c} type="button" title={c} onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(c); setOpen(false); }}
              className="w-6 h-6 rounded-md border border-slate-200 cursor-pointer" style={{ backgroundColor: c }} />
          ))}
          <label className="col-span-5 flex items-center gap-1 text-[11px] text-slate-600 mt-1">
            Màu khác <input type="color" onChange={(e) => onPick(e.target.value)} className="w-6 h-6 cursor-pointer" />
          </label>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { onPick(null); setOpen(false); }}
            className="col-span-5 text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer text-left">Bỏ màu</button>
        </div>
      )}
    </div>
  );
};
