import React, { useState } from 'react';
import { useServerDocument } from '../../lib/serverCollection';
import { 
  Globe, 
  Sparkles, 
  Image as ImageIcon, 
  Save, 
  CheckCircle2, 
  FileText, 
  Share2, 
  Code2, 
  Check, 
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  Search,
  Tag,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ImageUploadField } from './ImageUploadField';
import { SiteSEOSettings } from '../../types';
import { INITIAL_SEO_SETTINGS } from '../../data/courseraData';

export const CMSSiteSEOSettingsTab: React.FC = () => {
  // Saved as the 'site_seo' site config in live mode (debounced auto-save + explicit save).
  const { doc: settings, update: setSettings, saveNow, live } = useServerDocument<SiteSEOSettings>('site_seo', INITIAL_SEO_SETTINGS);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewTab, setPreviewTab] = useState<'og' | 'serp'>('og');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      if (live && saveNow) {
        await saveNow();
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Chưa lưu được cấu hình');
      setTimeout(() => setSaveStatus('idle'), 4000);
    }
  };

  const handleKeywordsChange = (text: string) => {
    const list = text
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    setSettings({ ...settings, defaultKeywords: list });
  };

  const domainDisplay = (settings.canonicalDomain || 'https://twings.edu.vn')
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#0073C1]" />
            <h2 className="text-lg font-bold text-slate-900">
              Cài Đặt Website Chuẩn SEO & Nhận Diện Thương Hiệu
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cấu hình Favicon, Logo, thẻ OpenGraph Social Share Card, Robots.txt, Sitemap.xml, kênh liên hệ và thông tin Schema tổ chức.
          </p>
        </div>

        <button
          type="submit"
          disabled={saveStatus === 'saving'}
          className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] disabled:opacity-60 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          {saveStatus === 'saving' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>{saveStatus === 'saving' ? 'Đang lưu...' : 'Lưu Cài Đặt SEO'}</span>
        </button>
      </div>

      {saveStatus === 'saved' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Đã lưu thành công cấu hình SEO, kênh liên hệ và nhận diện website lên hệ thống!</span>
        </div>
      )}

      {saveStatus === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage || 'Lỗi lưu cấu hình. Vui lòng thử lại.'}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Brand & Meta Configuration */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Logo & Favicon */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              1. Biểu tượng & Logo Thương hiệu
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadField
                label="Favicon (32x32 hoặc 48x48)"
                value={settings.faviconUrl}
                onChange={(url) => setSettings({ ...settings, faviconUrl: url })}
                accept="image/png,image/x-icon,image/vnd.microsoft.icon,.ico"
                hint="PNG hoặc ICO, nền trong suốt. Hiển thị ở cả trang ngoài và trang /app."
                previewClassName="w-8 h-8 object-contain"
              />

              <ImageUploadField
                label="Logo Website (Header & Cổng vào)"
                value={settings.logoUrl}
                onChange={(url) => setSettings({ ...settings, logoUrl: url })}
                hint="PNG/WebP, nền trong suốt, tối đa 5 MB."
                previewClassName="w-16 h-8 object-contain"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Website / Học Viện *</label>
                <input
                  type="text"
                  value={settings.siteName || ''}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  placeholder="TWINGS ACADEMY - Học Viện Đào Tạo Thực Chiến"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Khẩu hiệu (Slogan)</label>
                <input
                  type="text"
                  value={settings.siteSlogan || ''}
                  onChange={(e) => setSettings({ ...settings, siteSlogan: e.target.value })}
                  placeholder="Khởi đầu sự nghiệp ngành Tài chính - Ngân hàng"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Contact Information & Organization Schema */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                2. Thông tin liên hệ & Địa chỉ (Hiển thị Footer, Nút gọi & Schema)
              </h3>
              <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-medium">
                Google Schema Org
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Các thông tin này dùng trên toàn bộ website: chân trang (Footer), nút gọi hotline góc màn hình, form đăng ký và dữ liệu có cấu trúc SEO của Google.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hotline tư vấn tuyển sinh *</span>
                </label>
                <input
                  type="text"
                  value={settings.hotline || ''}
                  onChange={(e) => setSettings({ ...settings, hotline: e.target.value })}
                  placeholder="0843 314 382 (Ms. Hường) hoặc 1900 633 898"
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Email tiếp nhận / CSKH *</span>
                </label>
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="hello@twings.edu.vn"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                <span>Địa chỉ trụ sở / Phòng đào tạo *</span>
              </label>
              <input
                type="text"
                value={settings.address || ''}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                placeholder="Tòa ROX Tower, 54A Nguyễn Chí Thanh, Phường Láng Thượng, Hà Nội"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Card 3: Default Meta Tags & Keywords */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              3. Thẻ Meta SEO Mặc Định (Global Meta & Keywords)
            </h3>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tiêu đề Meta mặc định (Meta Title) *</label>
              <input
                type="text"
                value={settings.defaultMetaTitle || ''}
                onChange={(e) => setSettings({ ...settings, defaultMetaTitle: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Độ dài: {(settings.defaultMetaTitle || '').length} ký tự (Khuyến nghị 50-60 ký tự)
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mô tả Meta mặc định (Meta Description) *</label>
              <textarea
                rows={3}
                value={settings.defaultMetaDescription || ''}
                onChange={(e) => setSettings({ ...settings, defaultMetaDescription: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Độ dài: {(settings.defaultMetaDescription || '').length} ký tự (Khuyến nghị 120-160 ký tự)
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                <span>Từ khóa SEO mặc định (Meta Keywords)</span>
              </label>
              <input
                type="text"
                value={(settings.defaultKeywords || []).join(', ')}
                onChange={(e) => handleKeywordsChange(e.target.value)}
                placeholder="Twings Academy, học nghiệp vụ ngân hàng, quan hệ khách hàng doanh nghiệp, thẩm định tín dụng"
                className="w-full p-2.5 border border-slate-300 rounded-lg"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Phân cách nhau bằng dấu phẩy (,). Hiện có: {(settings.defaultKeywords || []).length} từ khóa.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên miền chính thức (Canonical Domain)</label>
              <input
                type="text"
                value={settings.canonicalDomain || ''}
                onChange={(e) => setSettings({ ...settings, canonicalDomain: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Card 4: Robots.txt & Tracking */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              4. Tệp Robots.txt & Mã Đo Lường
            </h3>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nội dung tệp robots.txt</label>
              <textarea
                rows={4}
                value={settings.robotsTxt || ''}
                onChange={(e) => setSettings({ ...settings, robotsTxt: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs bg-slate-900 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Google Analytics ID (GA4)</label>
                <input
                  type="text"
                  value={settings.googleAnalyticsId || ''}
                  onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Facebook Pixel ID</label>
                <input
                  type="text"
                  value={settings.facebookPixelId || ''}
                  onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value })}
                  placeholder="XXXXXXXXXXXX"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Lưu mã GA4 / Pixel tại đây chưa đủ để đo lường: website đang chặn mọi script bên ngoài để bảo mật.
              Khi có mã thật, báo đội kỹ thuật bật (cần mở chính sách bảo mật nội dung cho Google/Meta và cập nhật
              Chính sách bảo mật về cookie).
            </p>
          </div>

          {/* Channels: footer + floating contact button */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              5. Kênh liên hệ & Mạng xã hội (Footer & Nút liên hệ nổi)
            </h3>
            <p className="text-[11px] text-slate-500">Để trống kênh nào thì kênh đó không hiện trên website.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {([
                ['zalo', 'Zalo (số điện thoại hoặc link zalo.me)', '0843314382 hoặc https://zalo.me/...'],
                ['facebookUrl', 'Fanpage Facebook (https://...)', 'https://www.facebook.com/...'],
                ['youtubeUrl', 'Kênh YouTube (https://...)', 'https://www.youtube.com/@...'],
                ['linkedinUrl', 'LinkedIn (https://...)', 'https://www.linkedin.com/company/...']
              ] as const).map(([key, label, placeholder]) => (
                <div key={key}>
                  <label className="font-bold text-slate-700 block mb-1">{label}</label>
                  <input
                    type="text"
                    value={settings[key] || ''}
                    onChange={(e) => setSettings({ ...settings, [key]: e.target.value.trim() })}
                    placeholder={placeholder}
                    className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">Zalo để trống thì hệ thống tự dùng số Hotline ở trên.</p>
          </div>

          {/* Legal pages */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              6. Trang pháp lý: <a href="/chinh-sach-bao-mat" target="_blank" rel="noopener" className="text-[#0073C1] underline">Chính sách bảo mật</a>
              {' '}· <a href="/dieu-khoan" target="_blank" rel="noopener" className="text-[#0073C1] underline">Điều khoản</a>
            </h3>
            <p className="text-[11px] text-slate-500">
              Để trống: website dùng bản soạn sẵn theo Luật Bảo vệ dữ liệu cá nhân 2025 (nên nhờ pháp chế rà soát).
              Muốn thay, dán nội dung HTML (thẻ h2, p, ul, li, a, strong) – máy chủ tự loại bỏ mã không an toàn.
            </p>
            {([
              ['privacyPolicyHtml', 'Chính sách bảo mật (HTML)'],
              ['termsHtml', 'Điều khoản sử dụng dịch vụ (HTML)']
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="font-bold text-slate-700 block mb-1">{label}</label>
                <textarea
                  rows={6}
                  value={settings[key] || ''}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  placeholder="Để trống để dùng bản mặc định"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: Social Share Card & Google SERP Preview Simulation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Sparkles className="w-4 h-4 text-[#0073C1]" />
                <span>Mô Phỏng Hiển Thị Thực Tế</span>
              </div>

              {/* Tabs Toggle: OpenGraph vs Google SERP */}
              <div className="flex p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewTab('og')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    previewTab === 'og'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Share2 className="w-3 h-3" />
                  <span>Facebook / Zalo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab('serp')}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                    previewTab === 'serp'
                      ? 'bg-white text-emerald-700 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Search className="w-3 h-3" />
                  <span>Google</span>
                </button>
              </div>
            </div>

            <ImageUploadField
              label="Ảnh đại diện khi chia sẻ (1200x630 px) *"
              value={settings.ogImageUrl}
              onChange={(url) => setSettings({ ...settings, ogImageUrl: url })}
              hint="JPEG/PNG/WebP, tỷ lệ 1.91:1, tối đa 5 MB."
              previewClassName="w-16 h-9 object-cover"
            />

            {previewTab === 'og' ? (
              /* Facebook/Zalo Social Share Card Preview */
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50 transition-all">
                <div className="aspect-[1.91/1] w-full bg-slate-200 relative overflow-hidden">
                  <img
                    src={settings.ogImageUrl || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80'}
                    alt="OG Preview"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono rounded">
                    1200 × 630 px
                  </span>
                </div>

                <div className="p-4 space-y-1 bg-white">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                    {domainDisplay}
                  </div>
                  <div className="text-xs font-bold text-slate-900 line-clamp-2">
                    {settings.defaultMetaTitle || 'Tiêu đề trang'}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                    {settings.defaultMetaDescription || 'Mô tả tóm tắt nội dung khi hiển thị trên mạng xã hội...'}
                  </div>
                </div>
              </div>
            ) : (
              /* Google SERP Search Snippet Preview */
              <div className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-2 font-sans transition-all">
                <div className="flex items-center gap-2">
                  {settings.faviconUrl ? (
                    <img src={settings.faviconUrl} alt="Favicon" className="w-4 h-4 object-contain rounded" />
                  ) : (
                    <div className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center text-[9px] text-white font-black">TW</div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-[12px] text-slate-800 font-medium leading-none">
                      {settings.siteName || 'TWINGS ACADEMY'}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      https://{domainDisplay}
                    </span>
                  </div>
                </div>

                <div className="text-[#1a0dab] hover:underline cursor-pointer font-medium text-sm leading-snug">
                  {settings.defaultMetaTitle || 'Tiêu đề website trên Google Tìm Kiếm'}
                </div>

                <p className="text-[12px] text-[#4d5156] leading-relaxed line-clamp-2">
                  {settings.defaultMetaDescription || 'Mô tả nội dung học viện và các khóa đào tạo hiển thị bên dưới tiêu đề trên Google...'}
                </p>

                {Boolean(settings.hotline || settings.address) && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-[10px] text-slate-500">
                    {settings.hotline && <span>Hotline: <strong className="text-slate-700">{settings.hotline}</strong></span>}
                    {settings.address && <span>• Địa chỉ: <strong className="text-slate-700">{settings.address}</strong></span>}
                  </div>
                )}
              </div>
            )}

            {/* Sitemap.xml Generator Live Preview */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sitemap.xml Tự Động</span>
                </span>
                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-mono">
                  Auto-Generated
                </span>
              </div>

              <div className="bg-slate-900 text-slate-300 p-3 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed">
                <code>{`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${settings.canonicalDomain || 'https://twings.edu.vn'}/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${settings.canonicalDomain || 'https://twings.edu.vn'}/catalog</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${settings.canonicalDomain || 'https://twings.edu.vn'}/articles</loc>
    <priority>0.8</priority>
  </url>
</urlset>`}</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
