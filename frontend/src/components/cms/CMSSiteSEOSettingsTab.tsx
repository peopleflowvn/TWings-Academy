import React, { useState } from 'react';
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
  ExternalLink 
} from 'lucide-react';
import { SiteSEOSettings } from '../../types';
import { INITIAL_SEO_SETTINGS } from '../../data/courseraData';

export const CMSSiteSEOSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SiteSEOSettings>(INITIAL_SEO_SETTINGS);
  const [saveToast, setSaveToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

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
            Cấu hình Favicon, Logo, thẻ OpenGraph Social Share Card, Robots.txt, Sitemap.xml và mã đo lường Google Analytics.
          </p>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Cài Đặt SEO</span>
        </button>
      </div>

      {saveToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu thành công cấu hình SEO và nhận diện website!</span>
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
              <div>
                <label className="font-bold text-slate-700 block mb-1">Favicon URL (16x16 / 32x32)</label>
                <div className="flex items-center gap-2">
                  <img
                    src={settings.faviconUrl}
                    alt="Favicon"
                    className="w-8 h-8 rounded border border-slate-200 p-0.5 object-contain bg-white"
                  />
                  <input
                    type="text"
                    value={settings.faviconUrl}
                    onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                    className="flex-1 p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Logo Website (Header)</label>
                <div className="flex items-center gap-2">
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="w-16 h-8 rounded border border-slate-200 p-0.5 object-contain bg-white"
                  />
                  <input
                    type="text"
                    value={settings.logoUrl}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    className="flex-1 p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tên Website *</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Khẩu hiệu (Slogan)</label>
                <input
                  type="text"
                  value={settings.siteSlogan}
                  onChange={(e) => setSettings({ ...settings, siteSlogan: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Default Meta Tags */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              2. Thẻ Meta SEO Mặc Định (Global Meta)
            </h3>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tiêu đề Meta mặc định (Meta Title) *</label>
              <input
                type="text"
                value={settings.defaultMetaTitle}
                onChange={(e) => setSettings({ ...settings, defaultMetaTitle: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Độ dài: {settings.defaultMetaTitle.length} ký tự (Khuyến nghị 50-60 ký tự)
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Mô tả Meta mặc định (Meta Description) *</label>
              <textarea
                rows={3}
                value={settings.defaultMetaDescription}
                onChange={(e) => setSettings({ ...settings, defaultMetaDescription: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Độ dài: {settings.defaultMetaDescription.length} ký tự (Khuyến nghị 120-160 ký tự)
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tên miền chính thức (Canonical Domain)</label>
              <input
                type="text"
                value={settings.canonicalDomain}
                onChange={(e) => setSettings({ ...settings, canonicalDomain: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          {/* Card 3: Robots.txt & Tracking */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
              3. Tệp Robots.txt & Mã Đo Lường
            </h3>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nội dung tệp robots.txt</label>
              <textarea
                rows={4}
                value={settings.robotsTxt}
                onChange={(e) => setSettings({ ...settings, robotsTxt: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg font-mono text-xs bg-slate-900 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Google Analytics ID (GA4)</label>
                <input
                  type="text"
                  value={settings.googleAnalyticsId || 'G-TWINGS2026'}
                  onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Facebook Pixel ID</label>
                <input
                  type="text"
                  value={settings.facebookPixelId || '8924820192837'}
                  onChange={(e) => setSettings({ ...settings, facebookPixelId: e.target.value })}
                  placeholder="XXXXXXXXXXXX"
                  className="w-full p-2.5 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Social Share Card (OpenGraph) Preview Simulation */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Share2 className="w-4 h-4 text-blue-600" />
              <span>Mô Phỏng Thẻ Chia Sẻ Mạng Xã Hội (OpenGraph Thumbnail)</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1 text-xs">
                Ảnh đại diện khi chia sẻ (1200x630 px) *
              </label>
              <input
                type="text"
                value={settings.ogImageUrl}
                onChange={(e) => setSettings({ ...settings, ogImageUrl: e.target.value })}
                className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>

            {/* Facebook/Zalo Social Share Card Preview */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-slate-50">
              <div className="aspect-[1.91/1] w-full bg-slate-200 relative overflow-hidden">
                <img
                  src={settings.ogImageUrl}
                  alt="OG Preview"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono rounded">
                  1200 × 630 px
                </span>
              </div>

              <div className="p-4 space-y-1 bg-white">
                <div className="text-[10px] uppercase font-bold text-slate-400 font-mono">
                  {settings.canonicalDomain.replace('https://', '')}
                </div>
                <div className="text-xs font-bold text-slate-900 line-clamp-2">
                  {settings.defaultMetaTitle}
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-2 leading-snug">
                  {settings.defaultMetaDescription}
                </div>
              </div>
            </div>

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
    <loc>${settings.canonicalDomain}/</loc>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${settings.canonicalDomain}/catalog</loc>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${settings.canonicalDomain}/articles</loc>
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
