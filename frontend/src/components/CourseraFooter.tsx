import React from 'react';
import { 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Building2, 
  Facebook, 
  Youtube, 
  Linkedin,
  MessageCircle,
  Sparkles
} from 'lucide-react';

interface CourseraFooterProps {
  onNavigate: (view: 'home' | 'catalog' | 'course-detail' | 'articles' | 'article-detail' | 'about') => void;
}

export const CourseraFooter: React.FC<CourseraFooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-950 text-slate-400 text-xs pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Col 1: Brand Info */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-sans uppercase">
                TWINGS ACADEMY
              </span>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/30">
                TNTALENT PARTNER
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Học viện tiên phong trong mô hình đào tạo thực chiến ngành Tài chính - Ngân hàng, kết hợp công nghệ AI và bảo lãnh đầu ra nghề nghiệp tại các tập đoàn hàng đầu.
            </p>
            
            {/* Social & Channel Icons */}
            <div className="pt-2 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Kết nối với chúng tôi
              </div>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://www.facebook.com/twings.academy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-[#1877F2] text-white flex items-center justify-center transition-colors shadow-2xs"
                  title="Facebook Fanpage: /twings.academy"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="mailto:hello@twings.edu.vn"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                  title="Email: hello@twings.edu.vn"
                >
                  <Mail className="w-4 h-4" />
                </a>
                <a
                  href="tel:0843314382"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                  title="Hotline: 0843 314 382"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-700 text-white flex items-center justify-center transition-colors shadow-2xs"
                  title="Kênh YouTube học thử"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-blue-600 text-white flex items-center justify-center transition-colors shadow-2xs"
                  title="LinkedIn TWings"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Col 2: Về TWings Academy */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Về TWings</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('home')} className="hover:text-white transition-colors cursor-pointer">Trang chủ</button></li>
              <li><button onClick={() => onNavigate('about')} className="hover:text-white transition-colors cursor-pointer text-[#38bdf8] font-semibold">Giới thiệu về chúng tôi</button></li>
              <li><button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">Khóa học thực chiến</button></li>
              <li><a href="/chuong-trinh" className="hover:text-white transition-colors">Chương trình đào tạo</a></li>
              <li><a href="/tai-khoan" className="hover:text-white transition-colors">Tài khoản học viên</a></li>
              <li><button onClick={() => onNavigate('articles')} className="hover:text-white transition-colors cursor-pointer">Tin tức & Cẩm nang</button></li>
              <li><span className="hover:text-white transition-colors cursor-pointer">Đội ngũ giảng viên MSB</span></li>
            </ul>
          </div>

          {/* Col 3: Khóa học nổi bật */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Chương Trình Đào Tạo</h4>
            <ul className="space-y-2">
              <li><button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">QHKH Doanh Nghiệp (SME)</button></li>
              <li><button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">QHKH Cá Nhân Thực Chiến</button></li>
              <li><button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">Khai Mở Sức Mạnh AI</button></li>
              <li><button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">Di Sản Từ MBO Đến OKR</button></li>
              <li><button onClick={() => onNavigate('catalog')} className="hover:text-white transition-colors cursor-pointer">Tư Duy Thiết Kế (Design Thinking)</button></li>
            </ul>
          </div>

          {/* Col 4: Liên hệ & Cơ sở (From PDF page 11) */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Thông Tin Liên Hệ</h4>
            <ul className="space-y-2.5 text-slate-400 text-xs">
              <li className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>Tòa ROX Tower, 54A Nguyễn Chí Thanh, Láng, Hà Nội</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-mono">0843 314 382 (Ms. Hường)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono">hello@twings.edu.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Bảo lãnh tuyển dụng MSB Bank</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2024 - 2026 TWINGS ACADEMY & TNTalent. Bảo lưu mọi quyền.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Điều khoản dịch vụ</span>
            <span className="hover:underline cursor-pointer">Chính sách bảo mật học viên</span>
            <span className="hover:underline cursor-pointer">Quy chế đào tạo thực chiến</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
