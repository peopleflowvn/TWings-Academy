import React from 'react';
import { Star, Quote, Award, CheckCircle, GraduationCap } from 'lucide-react';

export const TestimonialsSection: React.FC = () => {
  const reviews = [
    {
      name: 'Lê Thảo My',
      target: 'IELTS Overall 8.0 (Listening 8.5, Reading 8.5)',
      school: 'Sinh viên ĐH Ngoại Thương Hà Nội',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      comment: 'Hệ thống bài giảng Moodle tại Twings cực kỳ chi tiết, nhất là phần Flashcard từ vựng C1 và các bài luyện nghe Section 3 có lời giải thích cặn kẽ từng bẫy distractors. Nhờ thầy Tùng sửa bài Writing mà điểm của mình tăng vọt từ 6.0 lên 7.5!',
      rating: 5,
    },
    {
      name: 'Nguyễn Quốc Bảo',
      target: 'Tiếng Anh Doanh Nghiệp & Đàm Phán',
      school: 'Trưởng nhóm Dự án tại FPT Software',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      comment: 'Trước đây mình rất ngại nói tiếng Anh khi họp với khách hàng Mỹ. Khóa Giao tiếp 90 ngày của cô Thảo Vy dạy thực chiến vô cùng, từng mẫu email đến kỹ năng thuyết trình. Giờ mình đã tự tin lead các buổi sprint review.',
      rating: 5,
    },
    {
      name: 'Chị Hoàng Mai Lan',
      target: 'Phụ huynh bé Gia Hưng (15 khiên Cambridge Flyers)',
      school: 'Học sinh Lớp 5 Trường Archimedes',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      comment: 'Bé Hưng rất hào hứng mỗi khi học trên LMS của Twings vì có các trò chơi đố vui sinh động. Bố mẹ thanh toán VietQR quét mã xong là tài khoản được kích hoạt ngay, theo dõi tiến độ học của con rất minh bạch.',
      rating: 5,
    }
  ];

  return (
    <section className="py-16 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
            <GraduationCap className="w-4 h-4" />
            <span>Thành Tích Học Viên Thực Tế</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F294D] tracking-tight" style={{ textWrap: 'balance' }}>
            Học Viên Twings Nói Gì Về Chúng Tôi?
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Hàng nghìn học viên trên khắp cả nước đã tự tin chinh phục mục tiêu ngoại ngữ và mở ra những cơ hội học tập, nghề nghiệp rộng mở.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((rev, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>

                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <img
                  src={rev.avatar}
                  alt={rev.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 text-xs">
                  <div className="font-bold text-slate-900 truncate">{rev.name}</div>
                  <div className="text-[11px] text-emerald-700 font-semibold truncate">{rev.target}</div>
                  <div className="text-[10px] text-slate-400 truncate">{rev.school}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
