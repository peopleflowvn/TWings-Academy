import React from 'react';
import { Facebook, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { Course } from '../types';
import { routePath, View } from '../lib/routes';
import { phoneDigits, safeUrl, useSiteSeo, zaloLink } from '../lib/siteSeo';

interface CourseraFooterProps {
  onNavigate: (view: View) => void;
  /** Published courses: the footer links the first few (real pages, real URLs). */
  courses?: Course[];
}

/** Real links only: <a href> with the page's own URL, handled by the SPA router on a plain click. */
const NavLink: React.FC<{ view: View; slug?: string; onNavigate: (view: View) => void; onSlug?: () => void; children: React.ReactNode }> = ({
  view,
  slug,
  onNavigate,
  onSlug,
  children
}) => (
  <a
    href={routePath(view, slug)}
    onClick={(e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // new tab / window: let the browser do it
      e.preventDefault();
      if (onSlug) onSlug();
      else onNavigate(view);
    }}
    className="hover:text-white transition-colors"
  >
    {children}
  </a>
);

export const CourseraFooter: React.FC<CourseraFooterProps & { onSelectCourse?: (course: Course) => void }> = ({
  onNavigate,
  courses = [],
  onSelectCourse
}) => {
  const seo = useSiteSeo();
  const phone = phoneDigits(seo?.hotline);
  const zalo = zaloLink(seo?.zalo || seo?.hotline);
  const socials = [
    { href: safeUrl(seo?.facebookUrl), label: 'Facebook', icon: Facebook, hover: 'hover:bg-[#1877F2]' },
    { href: safeUrl(seo?.youtubeUrl), label: 'YouTube', icon: Youtube, hover: 'hover:bg-[#FF0000]' },
    { href: safeUrl(seo?.linkedinUrl), label: 'LinkedIn', icon: Linkedin, hover: 'hover:bg-[#0A66C2]' }
  ].filter((s) => s.href);
  const featured = courses.slice(0, 5);
  const iconBtn = 'w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center transition-colors shadow-2xs';

  return (
    <footer className="bg-slate-950 text-slate-400 text-xs pt-12 pb-20 sm:pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-sans uppercase">TWINGS ACADEMY</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              {seo?.siteSlogan ||
                'Học viện đào tạo thực chiến ngành Tài chính - Ngân hàng, kết hợp công nghệ AI và định hướng nghề nghiệp.'}
            </p>
            {(socials.length > 0 || zalo || seo?.email || phone) && (
              <div className="pt-2 space-y-2">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Kết nối với chúng tôi</div>
                <div className="flex items-center gap-2.5">
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label} className={`${iconBtn} ${s.hover}`}>
                      <s.icon className="w-4 h-4" />
                    </a>
                  ))}
                  {zalo && (
                    <a href={zalo} target="_blank" rel="noopener noreferrer" title="Zalo" className={`${iconBtn} hover:bg-[#0068FF] text-[9px] font-black`}>
                      Zalo
                    </a>
                  )}
                  {seo?.email && (
                    <a href={`mailto:${seo.email}`} title={`Email: ${seo.email}`} className={`${iconBtn} hover:bg-slate-600`}>
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {phone && (
                    <a href={`tel:${phone}`} title={`Hotline: ${seo?.hotline}`} className={`${iconBtn} hover:bg-emerald-600`}>
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* About */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Về TWings</h4>
            <ul className="space-y-2">
              <li><NavLink view="home" onNavigate={onNavigate}>Trang chủ</NavLink></li>
              <li><NavLink view="about" onNavigate={onNavigate}>Giới thiệu về chúng tôi</NavLink></li>
              <li><NavLink view="catalog" onNavigate={onNavigate}>Khóa học & chương trình</NavLink></li>
              <li><NavLink view="articles" onNavigate={onNavigate}>Tin tức & Cẩm nang</NavLink></li>
              <li><a href="/tai-khoan" className="hover:text-white transition-colors">Tài khoản học viên</a></li>
            </ul>
          </div>

          {/* Courses (live) */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Khóa học nổi bật</h4>
            <ul className="space-y-2">
              {featured.map((c) => (
                <li key={c.id}>
                  <NavLink view="course-detail" slug={c.slug} onNavigate={onNavigate} onSlug={onSelectCourse ? () => onSelectCourse(c) : undefined}>
                    {c.title}
                  </NavLink>
                </li>
              ))}
              <li><NavLink view="catalog" onNavigate={onNavigate}>Xem tất cả →</NavLink></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Thông tin liên hệ</h4>
            <ul className="space-y-2.5">
              {seo?.address && (
                <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-500 shrink-0" /><span>{seo.address}</span></li>
              )}
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                  <a href={`tel:${phone}`} className="hover:text-white">{seo?.hotline}</a>
                </li>
              )}
              {seo?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                  <a href={`mailto:${seo.email}`} className="hover:text-white">{seo.email}</a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div>© {new Date().getFullYear()} TWINGS ACADEMY · Công ty Cổ phần Quản trị Nguồn Nhân lực TNTalent.</div>
          <div className="flex items-center gap-4">
            <a href="/dieu-khoan" className="hover:text-white">Điều khoản sử dụng</a>
            <a href="/chinh-sach-bao-mat" className="hover:text-white">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
