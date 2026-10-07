import React, { useState } from 'react';
import { 
  Edit3, 
  Save, 
  CheckCircle2, 
  Sparkles, 
  Layers, 
  BookOpen, 
  HelpCircle, 
  Award, 
  GraduationCap, 
  Building2,
  Users,
  Plus,
  Trash2
} from 'lucide-react';
import { CMSSectionsConfig, FAQItem } from '../../types';
import { FAQ_ITEMS } from '../../data/courseraData';

interface CMSHomepageContentTabProps {
  cmsSections: CMSSectionsConfig;
  onUpdateCMSSections: (sections: CMSSectionsConfig) => void;
}

export const CMSHomepageContentTab: React.FC<CMSHomepageContentTabProps> = ({
  cmsSections,
  onUpdateCMSSections,
}) => {
  const [sections, setSections] = useState<CMSSectionsConfig>(cmsSections);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSubSection, setActiveSubSection] = useState<'intro' | 'shelves' | 'plus' | 'instructors' | 'about' | 'faq'>('intro');

  // FAQ questions are edited here; until saved once, the editor starts from the website's default list.
  const faqItems: FAQItem[] = sections.faq?.items?.length ? sections.faq.items : FAQ_ITEMS;
  const setFaqItems = (items: FAQItem[]) =>
    setSections({
      ...sections,
      faq: {
        enabled: sections.faq?.enabled ?? true,
        title: sections.faq?.title || 'Giải Đáp Thắc Mắc Thường Gặp (FAQ)',
        subtitle: sections.faq?.subtitle,
        items,
      },
    });
  const updateFaq = (id: string, patch: Partial<FAQItem>) =>
    setFaqItems(faqItems.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCMSSections(sections);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#0073C1]" />
            <h2 className="text-lg font-bold text-slate-900">
              Biên Tập Toàn Bộ Nội Dung Trang Chủ & Các Khối Giao Diện
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chỉnh sửa tiêu đề, khẩu hiệu, nội dung giới thiệu, 4 khay khóa học, gói đào tạo doanh nghiệp và thông tin học viện.
          </p>
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 bg-[#0073C1] hover:bg-[#005FA0] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Save className="w-4 h-4" />
          <span>Lưu Nội Dung Trang Chủ</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Đã lưu thành công nội dung trang chủ! Giao diện học viên được cập nhật ngay lập tức.</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveSubSection('intro')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubSection === 'intro' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          1. Khối Giới Thiệu (PDF Trang 2)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubSection('shelves')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubSection === 'shelves' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          2. Tiêu Đề 4 Khay Khóa Học (PDF Trang 2-6)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubSection('plus')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubSection === 'plus' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          3. Gói Đào Tạo Doanh Nghiệp / Plus
        </button>
        <button
          type="button"
          onClick={() => setActiveSubSection('about')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubSection === 'about' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          4. Về TWings: Tầm Nhìn & Sứ Mệnh (PDF Trang 11)
        </button>
        <button
          type="button"
          onClick={() => setActiveSubSection('faq')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
            activeSubSection === 'faq' ? 'bg-slate-900 text-white shadow-xs' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
          }`}
        >
          5. Giải Đáp Thắc Mắc (FAQ)
        </button>
      </div>

      {/* SUB-SECTION 1: INTRO (PDF Page 2) */}
      {activeSubSection === 'intro' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Khối Giới Thiệu Cốt Lõi (PDF Trang 2: "NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI")
          </h3>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Dòng chữ nhỏ (Eyebrow Tag)</label>
            <input
              type="text"
              value={sections.intro?.eyebrow || 'TWINGS ACADEMY'}
              onChange={(e) => setSections({
                ...sections,
                intro: { ...sections.intro, eyebrow: e.target.value }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-bold font-mono text-[#0073C1]"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tiêu đề chính (Headline)</label>
            <input
              type="text"
              value={sections.intro?.headline || 'NÂNG TẦM NĂNG LỰC, KIẾN TẠO TƯƠNG LAI'}
              onChange={(e) => setSections({
                ...sections,
                intro: { ...sections.intro, headline: e.target.value }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-black text-sm text-slate-900"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Đoạn mô tả chi tiết (Description)</label>
            <textarea
              rows={3}
              value={sections.intro?.description || 'TWings Academy giúp bạn phát triển nhanh những năng lực thực tiễn, thích ứng với thị trường lao động không ngừng thay đổi và chủ động tiến xa trên hành trình sự nghiệp.'}
              onChange={(e) => setSections({
                ...sections,
                intro: { ...sections.intro, description: e.target.value }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SUB-SECTION 2: 4 SHELVES (PDF Pages 2-6) */}
      {activeSubSection === 'shelves' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-6 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Tiêu Đề & Phụ Đề 4 Khay Khóa Học (Theo layout đính kèm PDF)
          </h3>

          {/* Shelf 1 */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <span className="font-bold text-[#0073C1] uppercase text-[11px]">Khay 1 (PDF Trang 3)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề khay 1</label>
                <input
                  type="text"
                  value={sections.bestsellers?.title || 'KHÓA HỌC BÁN CHẠY NHẤT'}
                  onChange={(e) => setSections({
                    ...sections,
                    bestsellers: { ...sections.bestsellers, title: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
                <input
                  type="text"
                  value={sections.bestsellers?.subtitle || 'Các khóa học nghiệp vụ tín dụng và quan hệ khách hàng được học viên đăng ký nhiều nhất.'}
                  onChange={(e) => setSections({
                    ...sections,
                    bestsellers: { ...sections.bestsellers, subtitle: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Shelf 2 */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <span className="font-bold text-[#0073C1] uppercase text-[11px]">Khay 2 (PDF Trang 4)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề khay 2</label>
                <input
                  type="text"
                  value={sections.recommended?.title || 'ĐƯỢC ĐỀ XUẤT CHO BẠN'}
                  onChange={(e) => setSections({
                    ...sections,
                    recommended: { ...sections.recommended, title: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
                <input
                  type="text"
                  value={sections.recommended?.subtitle || 'Lộ trình tối ưu hóa theo định hướng năng lực và phỏng vấn tuyển dụng.'}
                  onChange={(e) => setSections({
                    ...sections,
                    recommended: { ...sections.recommended, subtitle: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Shelf 3 */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <span className="font-bold text-[#0073C1] uppercase text-[11px]">Khay 3 (PDF Trang 5)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề khay 3</label>
                <input
                  type="text"
                  value={sections.newReleases?.title || 'KHÓA HỌC MỚI RA MẮT'}
                  onChange={(e) => setSections({
                    ...sections,
                    newReleases: { ...sections.newReleases, title: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
                <input
                  type="text"
                  value={sections.newReleases?.subtitle || 'Các chuyên đề mới nhất về AI ngân hàng, Design Thinking và Quản trị thực thi OKR.'}
                  onChange={(e) => setSections({
                    ...sections,
                    newReleases: { ...sections.newReleases, subtitle: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Shelf 4 */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <span className="font-bold text-[#0073C1] uppercase text-[11px]">Khay 4 (PDF Trang 6)</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tiêu đề khay 4</label>
                <input
                  type="text"
                  value={sections.mostUseful?.title || 'KHÓA HỌC HỮU ÍCH NHẤT'}
                  onChange={(e) => setSections({
                    ...sections,
                    mostUseful: { ...sections.mostUseful, title: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
                <input
                  type="text"
                  value={sections.mostUseful?.subtitle || 'Kỹ năng thiết yếu ứng dụng ngay trong công việc tại các định chế tài chính.'}
                  onChange={(e) => setSections({
                    ...sections,
                    mostUseful: { ...sections.mostUseful, subtitle: e.target.value }
                  })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-SECTION 3: COURSERA PLUS / GÓI ĐÀO TẠO DOANH NGHIỆP */}
      {activeSubSection === 'plus' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Khối Đào Tạo Doanh Nghiệp & Đăng Ký Hội Viên TWings Plus
          </h3>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối</label>
            <input
              type="text"
              value={sections.courseraPlus?.title || 'Đầu tư vào sự nghiệp của bạn với Gói Hội Viên & Đào Tạo Doanh Nghiệp'}
              onChange={(e) => setSections({
                ...sections,
                courseraPlus: { ...sections.courseraPlus, enabled: true, title: e.target.value }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mô tả chi tiết</label>
            <textarea
              rows={3}
              value={sections.courseraPlus?.subtitle || 'Truy cập không giới hạn hơn 7,000 khóa học thực chiến từ các ngân hàng, trường đại học hàng đầu thế giới với chứng chỉ chính thức và cố vấn 1-1.'}
              onChange={(e) => setSections({
                ...sections,
                courseraPlus: { 
                  enabled: sections.courseraPlus?.enabled ?? true,
                  title: sections.courseraPlus?.title || 'Đầu tư vào sự nghiệp của bạn với TWings Plus',
                  subtitle: e.target.value,
                  badgeText: sections.courseraPlus?.badgeText,
                  bulletPoints: sections.courseraPlus?.bulletPoints,
                }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SUB-SECTION 4: ABOUT TWINGS (PDF Page 11) */}
      {activeSubSection === 'about' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Về TWings Academy: Tầm Nhìn, Sứ Mệnh & Giá Trị Cốt Lõi (PDF Trang 11)
          </h3>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tầm nhìn (Vision)</label>
            <textarea
              rows={3}
              value={sections.about?.vision || 'Trở thành học viện hàng đầu Việt Nam về đào tạo thực chiến và đào tạo ngắn hạn trong lĩnh vực tài chính - ngân hàng, là cầu nối uy tín giúp học viên, sinh viên và người đi làm nâng cao năng lực nghề nghiệp, sẵn sàng thích ứng với nhu cầu ngày càng khắt khe của thị trường lao động.'}
              onChange={(e) => setSections({
                ...sections,
                about: { ...sections.about, vision: e.target.value }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Sứ mệnh (Mission - Các gạch đầu dòng)</label>
            <textarea
              rows={4}
              value={sections.about?.mission?.join('\n') || '• Cung cấp các chương trình đào tạo thực chiến và khóa học Short course ngắn hạn, tập trung vào kiến thức cốt lõi.\n• Xây dựng môi trường học tập năng động, linh hoạt, phù hợp với học viên và người đi làm.\n• Đồng hành cùng học viên trong quá trình định hướng nghề nghiệp và gia tăng lợi thế cạnh tranh.'}
              onChange={(e) => setSections({
                ...sections,
                about: { ...sections.about, mission: e.target.value.split('\n').filter(Boolean) }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Giá trị cốt lõi (Core Values)</label>
            <textarea
              rows={4}
              value={sections.about?.coreValues?.join('\n') || '• Thấu hiểu: Lắng nghe nhu cầu học tập và định hướng nghề nghiệp.\n• Thực tiễn: Tập trung vào kiến thức và kỹ năng có thể áp dụng ngay.\n• Tinh gọn: Thiết kế nội dung ngắn hạn, cô đọng, đúng trọng tâm.\n• Sáng tạo: Không ngừng đổi mới nội dung và phương pháp đào tạo.\n• Nâng tầm: Đồng hành cùng học viên mở rộng cơ hội nghề nghiệp.'}
              onChange={(e) => setSections({
                ...sections,
                about: { ...sections.about, coreValues: e.target.value.split('\n').filter(Boolean) }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* SUB-SECTION 5: FAQ */}
      {activeSubSection === 'faq' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
            Giải Đáp Thắc Mắc & Câu Hỏi Thường Gặp (FAQ)
          </h3>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tiêu đề khối FAQ</label>
            <input
              type="text"
              value={sections.faq?.title || 'Giải Đáp Thắc Mắc Thường Gặp (FAQ)'}
              onChange={(e) => setSections({
                ...sections,
                faq: { ...sections.faq, enabled: true, title: e.target.value }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl font-bold"
            />
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Mô tả phụ</label>
            <input
              type="text"
              value={sections.faq?.subtitle || 'Mọi điều bạn cần biết về hình thức học LMS, cấp tài khoản và cơ hội thực tập tại MSB.'}
              onChange={(e) => setSections({
                ...sections,
                faq: { 
                  enabled: sections.faq?.enabled ?? true,
                  title: sections.faq?.title || 'Giải Đáp Thắc Mắc Thường Gặp (FAQ)',
                  subtitle: e.target.value,
                  items: sections.faq?.items,
                }
              })}
              className="w-full p-2.5 border border-slate-300 rounded-xl"
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">Câu hỏi & trả lời ({faqItems.length})</label>
              <button
                type="button"
                onClick={() => setFaqItems([...faqItems, { id: `faq-${Date.now()}`, question: '', answer: '' }])}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 text-white font-bold"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
              </button>
            </div>
            {faqItems.map((item, index) => (
              <div key={item.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-slate-400 pt-2.5">{index + 1}.</span>
                  <input
                    type="text"
                    value={item.question}
                    placeholder="Câu hỏi"
                    onChange={(e) => updateFaq(item.id, { question: e.target.value })}
                    className="flex-1 p-2.5 border border-slate-300 rounded-xl font-bold bg-white"
                  />
                  <button
                    type="button"
                    title="Xóa câu hỏi"
                    onClick={() => setFaqItems(faqItems.filter((other) => other.id !== item.id))}
                    className="p-2.5 rounded-xl text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={item.answer}
                  placeholder="Trả lời"
                  rows={3}
                  onChange={(e) => updateFaq(item.id, { answer: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </form>
  );
};
