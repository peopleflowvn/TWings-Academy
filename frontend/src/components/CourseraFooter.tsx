import React from 'react';
import { Facebook, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { Course } from '../types';
import { routePath, View } from '../lib/routes';
import { phoneDigits, safeUrl, useSiteSeo, zaloLink } from '../lib/siteSeo';
import { BrandLogo } from './BrandLogo';

interface CourseraFooterProps {
  onNavigate: (view: View) => void;
  /** Published courses: the footer links the first few (real pages, real URLs). */
  courses?: Course[];
}

/** Real links only: <a href> with the page's own URL, handled by the SPA router on a plain click. */
const NavLink: React.FC<{ 
  view: View; 
  slug?: string; 
  onNavigate: (view: View) => void; 
  onSlug?: () => void; 
  className?: string;
  children: React.ReactNode 
}> = ({
  view,
  slug,
  onNavigate,
  onSlug,
  className,
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
    className={className || "hover:text-white transition-colors"}
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
  const rawFb = seo?.facebookUrl !== undefined ? seo.facebookUrl : 'https://www.facebook.com/twings.academy';
  const fbUrl = safeUrl(rawFb);
  const socials = [
    { href: fbUrl, label: 'Facebook Fanpage', icon: Facebook, hover: 'hover:bg-[#1877F2]' },
    { href: safeUrl(seo?.youtubeUrl), label: 'YouTube', icon: Youtube, hover: 'hover:bg-[#FF0000]' },
    { href: safeUrl(seo?.linkedinUrl), label: 'LinkedIn', icon: Linkedin, hover: 'hover:bg-[#0A66C2]' }
  ].filter((s) => s.href);
  const featured = courses.slice(0, 5);
  const iconBtn = 'w-8 h-8 rounded-xl bg-[#263060] hover:bg-[#0073C1] text-white flex items-center justify-center transition-colors shadow-2xs shrink-0';

  return (
    <footer className="bg-[#181E3D] text-slate-300 text-xs pt-12 pb-20 sm:pb-8 border-t border-[#263060]" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand & Socials */}
          <div className="flex flex-col justify-between space-y-5 lg:col-span-2">
            <div className="space-y-3">
              <div className="flex items-center">
                <BrandLogo dark={true} size="lg" />
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                Hệ thống đào tạo thực chiến & giải pháp phát triển nhân lực chất lượng cao, đồng hành cùng thế hệ trẻ bứt phá sự nghiệp.
              </p>
            </div>

            {(socials.length > 0 || zalo || seo?.email || phone) && (
              <div className="space-y-2.5 pt-1">
                <div className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                  Kết nối với chúng tôi
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  {socials.map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={s.label}
                      aria-label={s.label}
                      className={`${iconBtn} ${s.hover}`}
                    >
                      <s.icon className="w-4 h-4" />
                    </a>
                  ))}
                  {zalo && (
                    <a
                      href={zalo}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Nhắn tin qua Zalo"
                      aria-label="Nhắn tin Zalo"
                      className={`${iconBtn} hover:bg-[#0068FF] text-[9px] font-black`}
                    >
                      Zalo
                    </a>
                  )}
                  {seo?.email && (
                    <a
                      href={`mailto:${seo.email}`}
                      title={`Email: ${seo.email}`}
                      aria-label={`Gửi email đến ${seo.email}`}
                      className={`${iconBtn} hover:bg-slate-600`}
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  )}
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      title={`Hotline: ${seo?.hotline}`}
                      aria-label={`Gọi hotline ${seo?.hotline}`}
                      className={`${iconBtn} hover:bg-emerald-600`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Direct Fanpage Link Badge for higher visibility and trust */}
                {fbUrl && (
                  <div className="pt-1">
                    <a
                      href={fbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#263060]/70 hover:bg-[#1877F2]/20 border border-[#263060] hover:border-[#1877F2]/60 text-slate-300 hover:text-white transition-all text-[11px]"
                    >
                      <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                      <span>Theo dõi Fanpage TWings Academy</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* About */}
          <div className="space-y-3">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Về TWings</div>
            <ul className="space-y-2">
              <li><NavLink view="home" onNavigate={onNavigate}>Trang chủ</NavLink></li>
              <li><NavLink view="about" onNavigate={onNavigate}>Giới thiệu về chúng tôi</NavLink></li>
              <li><NavLink view="catalog" onNavigate={onNavigate}>Khóa học & tuyển sinh</NavLink></li>
              <li><NavLink view="articles" onNavigate={onNavigate}>Tin tức & Cẩm nang</NavLink></li>
              <li><a href="/learn/" className="hover:text-white transition-colors text-[#5FBEFF] font-semibold">Cổng học viên (LMS)</a></li>
              <li><a href="/learn/user/profile.php" className="hover:text-white transition-colors">Học phí & hồ sơ</a></li>
            </ul>
          </div>

          {/* Courses (live) */}
          <div className="space-y-3">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Khóa học nổi bật</div>
            <ul className="space-y-2">
              {featured.length > 0 ? (
                featured.map((c) => (
                  <li key={c.id}>
                    <NavLink view="course-detail" slug={c.slug} onNavigate={onNavigate} onSlug={onSelectCourse ? () => onSelectCourse(c) : undefined}>
                      {c.title}
                    </NavLink>
                  </li>
                ))
              ) : (
                <>
                  <li><NavLink view="catalog" onNavigate={onNavigate}>Chương trình Đào tạo Thực chiến</NavLink></li>
                  <li><NavLink view="catalog" onNavigate={onNavigate}>Kỹ năng số & Ứng dụng AI</NavLink></li>
                  <li><NavLink view="catalog" onNavigate={onNavigate}>Quản trị & Phát triển Sự nghiệp</NavLink></li>
                </>
              )}
              <li className="pt-1">
                <NavLink view="catalog" onNavigate={onNavigate} className="text-[#5FBEFF] hover:underline font-medium">
                  Xem tất cả khóa học →
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <div className="font-bold text-white text-xs uppercase tracking-wider">Thông tin liên hệ</div>
            <ul className="space-y-2.5">
              {seo?.address && (
                <li className="flex items-start gap-2 text-slate-300">
                  <MapPin className="w-4 h-4 text-[#5FBEFF] shrink-0 mt-0.5" />
                  <span>{seo.address}</span>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#5FBEFF] shrink-0" />
                  <a href={`tel:${phone}`} className="hover:text-white transition-colors">{seo?.hotline}</a>
                </li>
              )}
              {seo?.email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#5FBEFF] shrink-0" />
                  <a href={`mailto:${seo.email}`} className="hover:text-white transition-colors">{seo.email}</a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400">
          <div>© {new Date().getFullYear()} TWINGS ACADEMY · Công ty Cổ phần Quản trị Nguồn Nhân lực TNTalent.</div>
          <div className="flex items-center gap-4">
            <a href="/dieu-khoan" className="hover:text-white transition-colors">Điều khoản sử dụng</a>
            <span className="text-slate-600">·</span>
            <a href="/chinh-sach-bao-mat" className="hover:text-white transition-colors">Chính sách bảo mật</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
