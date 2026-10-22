import { EmailTemplate, EmailSendLog, Order, ResendWebhookConfig, ResendWebhookEvent, ResendEmailStatus } from '../types';
import { api, API_ROOT, isBackendEnabled } from '../lib/api';

/**
 * PRODUCTION-GRADE RESPONSIVE HTML EMAIL TEMPLATES
 * Designed for 100% cross-client compatibility (Gmail, Outlook, Apple Mail, iOS, Android)
 * Incorporating TWings Academy, MSB Maritime Bank & Coursera Global Partner branding
 */
export const INITIAL_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "tmpl-welcome",
    code: "admission_welcome",
    name: "Giấy Báo Nhập Học & Lịch Đào Tạo Chuẩn MSB",
    category: "admission",
    subject: "[TWings x MSB] Giấy Báo Nhập Học: Chúc mừng {{customerName}} - Khóa {{courseTitle}}",
    description: "Gửi tự động khi học viên đăng ký hoặc được xác nhận xếp vào lớp học mới.",
    variables: ["customerName", "courseTitle", "batchCohort", "startDate", "location", "pic", "customerPhone", "instructorName", "orderCode"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">GIẤY BÁO NHẬP HỌC CHÍNH THỨC</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chương Trình Đào Tạo Thực Chiến & Tiếp Nhận Việc Làm MSB</div>\n<p style=\"margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;\">\n  Kính gửi Bạn <strong>{{customerName}}</strong>,\n</p>\n<p style=\"margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;\">\n  Hội đồng Tuyển sinh TWings Academy và Ban Đào tạo &amp; Phát triển Nguồn Nhân lực <strong>Ngân hàng TMCP Hàng Hải Việt Nam (MSB)</strong> trân trọng chúc mừng Bạn đã hoàn tất thủ tục đăng ký và chính thức đủ điều kiện tham gia khóa học:\n</p>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #0056D2; border-radius: 12px; margin: 20px 0;\">\n  <tr>\n    <td style=\"padding: 18px 20px;\">\n      <table class=\"data-table\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\">\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B; width: 140px;\">Khóa đào tạo:</td>\n          <td style=\"padding: 6px 0; font-size: 14px; font-weight: 700; color: #0056D2;\">{{courseTitle}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Lớp / Đợt khai giảng:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-weight: 700; color: #0F172A;\">{{batchCohort}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Lịch khai giảng:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-weight: 700; color: #D97706;\">{{startDate}} (19h00 - 21h30)</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Giảng viên phụ trách:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-weight: 700; color: #0F172A;\">{{instructorName}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Địa điểm học tập:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #334155;\">{{location}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Mã hồ sơ học viên:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-family: monospace; font-weight: 700; color: #0284C7;\">{{orderCode}}</td>\n        </tr>\n      </table>\n    </td>\n  </tr>\n</table>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color: #EFF6FF; border-radius: 12px; margin-bottom: 24px; border: 1px solid #BFDBFE;\">\n  <tr>\n    <td style=\"padding: 16px 20px;\">\n      <div style=\"font-size: 13px; font-weight: 700; color: #1E40AF; margin-bottom: 8px;\">\n        Quyền Lợi Độc Quyền Dành Cho Học Viên Lớp Này:\n      </div>\n      <ul style=\"margin: 0; padding-left: 18px; font-size: 13px; color: #1E3A8A; line-height: 1.6;\">\n        <li>Được cấp tài khoản học trực tuyến <strong>TWings LMS</strong>, đăng nhập bằng email tại mục Vào học.</li>\n        <li>Cố vấn 1-1 cùng Giám đốc Khối ngân hàng MSB suốt thời gian thực chiến.</li>\n        <li>Tham gia chương trình <strong>Bank Tour Hội sở MSB</strong> và cam kết phỏng vấn tiếp nhận việc làm sau tốt nghiệp.</li>\n      </ul>\n    </td>\n  </tr>\n</table>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"margin: 28px 0 20px 0;\">\n  <tr>\n    <td align=\"center\">\n      <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\">\n        <tr>\n          <td align=\"center\" style=\"border-radius: 12px; background: linear-gradient(135deg, #0056D2 0%, #0073C1 100%); box-shadow: 0 4px 14px rgba(0, 86, 210, 0.35);\">\n            <a href=\"https://tuyensinh.twings.edu.vn/learn/\" target=\"_blank\" style=\"font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; letter-spacing: 0.3px;\">\n              Xác Nhận Tham Gia &amp; Vào Cổng Học Viên LMS &rarr;\n            </a>\n          </td>\n        </tr>\n      </table>\n    </td>\n  </tr>\n</table>\n\n<p style=\"margin: 20px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.6;\">\n  Chuyên viên tư vấn phụ trách hỗ trợ Bạn: <strong>{{pic}}</strong> &bull; Hotline: <strong>1900 633 898</strong>.\n</p>"
  },
  {
    id: "tmpl-invoice",
    code: "vietqr_tuition_invoice",
    name: "Hóa Đơn & Thông Tin Chuyển Khoản Học Phí VietQR",
    category: "payment",
    subject: "[TWings Academy] Hóa Đơn Học Phí & Mã VietQR Tự Động: {{orderCode}} - {{customerName}}",
    description: "Gửi ngay sau khi học viên bấm Đăng Ký, kèm mã VietQR chứa sẵn số tiền và nội dung chuyển khoản tự động khớp lệnh.",
    variables: ["customerName", "courseTitle", "amount", "orderCode", "bankAccount", "pic", "customerPhone", "batchCohort", "qrImageUrl"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">THÔNG TIN THANH TOÁN HỌC PHÍ</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Hệ thống xác thực giao dịch tự động qua cổng VietQR Napas247</div>\n<p style=\"margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;\">\n  Kính gửi Bạn <strong>{{customerName}}</strong>,\n</p>\n<p style=\"margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;\">\n  Hệ thống tiếp nhận hồ sơ đăng ký thành công cho khóa học <strong>{{courseTitle}}</strong> (Mã đơn: <code style=\"font-family: monospace; font-weight: 700; color: #0056D2; background: #EFF6FF; padding: 2px 6px; border-radius: 4px;\">{{orderCode}}</code>).\n</p>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background: linear-gradient(135deg, #002D62 0%, #0056D2 100%); border-radius: 14px; margin: 20px 0; color: #ffffff; box-shadow: 0 6px 18px rgba(0, 45, 98, 0.25);\">\n  <tr>\n    <td style=\"padding: 22px 24px; text-align: center;\">\n      <div style=\"font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #93C5FD; margin-bottom: 6px;\">\n        Số Tiền Học Phí Cần Thanh Toán\n      </div>\n      <div style=\"font-size: 28px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;\">\n        {{amount}}\n      </div>\n      <div style=\"font-size: 12px; color: #BFDBFE; margin-top: 4px;\">\n        Đã áp dụng chính sách ưu đãi học phí đợt tuyển sinh\n      </div>\n    </td>\n  </tr>\n</table>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0;\">\n  <tr>\n    <td style=\"padding: 20px; text-align: center;\">\n      <div style=\"font-size: 14px; font-weight: 700; color: #002D62; margin-bottom: 6px;\">\n        QUÉT MÃ VIETQR ĐỂ CHUYỂN KHOẢN NHANH\n      </div>\n      <div style=\"font-size: 12px; color: #64748B; margin-bottom: 16px;\">\n        Mở App Ngân hàng bất kỳ &gt; Chọn Quét QR để thanh toán chính xác 100%\n      </div>\n      <table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" align=\"center\">\n        <tr>\n          <td style=\"background: #ffffff; padding: 12px; border-radius: 12px; border: 2px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);\">\n            <img src=\"{{qrImageUrl}}\" alt=\"VietQR\" width=\"220\" style=\"display: block; border-radius: 8px; margin: 0 auto;\" />\n          </td>\n        </tr>\n      </table>\n      <div style=\"margin-top: 18px; padding-top: 14px; border-top: 1px dashed #CBD5E1; font-size: 12px; color: #475569; line-height: 1.8; text-align: left;\">\n        &bull; <strong>Tài khoản thụ hưởng:</strong> {{bankAccount}}<br/>\n        &bull; <strong>Nội dung chuyển khoản (Bắt buộc):</strong> <strong style=\"color: #D97706; font-family: monospace; font-size: 14px;\">{{orderCode}}</strong><br/>\n        &bull; <em>Hệ thống tự động kích hoạt tài khoản học trong vòng 60 giây sau khi nhận giao dịch.</em>\n      </div>\n    </td>\n  </tr>\n</table>"
  },
  {
    id: "tmpl-receipt",
    code: "payment_receipt",
    name: "Biên Nhận Học Phí & Xác Nhận Vào Khóa Học",
    category: "payment",
    subject: "[Biên Nhận] TWings Academy xác nhận đã nhận học phí: {{orderCode}} - {{customerName}}",
    description: "Gửi ngay sau khi hệ thống khớp lệnh thanh toán thành công qua VietQR hoặc thanh toán thủ công.",
    variables: ["customerName", "courseTitle", "amount", "orderCode", "startDate", "batchCohort", "location", "pic", "total_paid", "receivable", "remaining", "receipt_number", "receipt_url"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">BIÊN NHẬN HỌC PHÍ ĐIỆN TỬ</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Xác nhận giao dịch học phí hợp lệ trên hệ thống TWings Academy</div>\n<p style=\"margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;\">\n  Kính gửi Bạn <strong>{{customerName}}</strong>,\n</p>\n<p style=\"margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;\">\n  Phòng Tài chính Kế toán TWings Academy trân trọng thông báo đã nhận thành công khoản học phí cho khóa đào tạo <strong>{{courseTitle}}</strong>.\n</p>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 12px; margin: 20px 0;\">\n  <tr>\n    <td style=\"padding: 18px 20px;\">\n      <table class=\"data-table\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\">\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B; width: 140px;\">Mã biên nhận:</td>\n          <td style=\"padding: 6px 0; font-size: 14px; font-weight: 700; color: #16A34A;\">{{receipt_number}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Mã hồ sơ / đơn:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-family: monospace; font-weight: 700; color: #0F172A;\">{{orderCode}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Số tiền đã thanh toán:</td>\n          <td style=\"padding: 6px 0; font-size: 16px; font-weight: 800; color: #15803D;\">{{amount}}</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Trạng thái hồ sơ:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-weight: 700; color: #16A34A;\">ĐÃ HOÀN TẤT HỌC PHÍ &amp; GIỮ CHỖ CHÍNH THỨC</td>\n        </tr>\n      </table>\n    </td>\n  </tr>\n</table>\n\n<p style=\"margin: 20px 0 0 0; font-size: 13px; color: #475569; line-height: 1.6;\">\n  Biên nhận này có giá trị xác nhận quyền lợi học tập của học viên. Cần hóa đơn VAT, vui lòng gửi yêu cầu tại Cổng học viên hoặc phản hồi thư này.\n</p>"
  },
  {
    id: "tmpl-banktour",
    code: "bank_tour_invite",
    name: "Thư Mời Trải Nghiệm Thực Tế Bank Tour MSB",
    category: "scheduling",
    subject: "[Thư Mời] Tham Gia Bank Tour Trực Tiếp Tại Hội Sở Ngân Hàng MSB: {{customerName}}",
    description: "Gửi mời học viên tham gia chương trình thực tế Bank Tour tại Hội sở MSB.",
    variables: ["customerName", "courseTitle", "batchCohort", "startDate", "location", "pic", "orderCode"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">THƯ MỜI TRẢI NGHIỆM BANK TOUR</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chương trình tham quan & kiến tập thực tế tại Hội sở Ngân hàng TMCP Hàng Hải Việt Nam</div>\n<p style=\"margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;\">\n  Chào Bạn <strong>{{customerName}}</strong>,\n</p>\n<p style=\"margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;\">\n  Ban Đào tạo TWings trân trọng kính mời Bạn tham dự chương trình <strong>Bank Tour - Trải nghiệm thực tế môi trường làm việc Ngân hàng chuẩn Quốc tế</strong> tại Hội sở MSB (ROX Tower, Hà Nội).\n</p>\n\n<table width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\" style=\"background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #D97706; border-radius: 12px; margin: 20px 0;\">\n  <tr>\n    <td style=\"padding: 18px 20px;\">\n      <table class=\"data-table\" width=\"100%\" border=\"0\" cellpadding=\"0\" cellspacing=\"0\" role=\"presentation\">\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B; width: 140px;\">Thời gian tổ chức:</td>\n          <td style=\"padding: 6px 0; font-size: 14px; font-weight: 700; color: #D97706;\">08h30 - 11h30, Thứ Bảy ({{startDate}})</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Địa điểm tập trung:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; font-weight: 700; color: #0F172A;\">Sảnh Tầng 1, Tòa nhà ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội</td>\n        </tr>\n        <tr>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #64748B;\">Trang phục quy định:</td>\n          <td style=\"padding: 6px 0; font-size: 13px; color: #334155;\">Áo sơ mi trắng, quần/chân váy tối màu, đi giày lịch sự</td>\n        </tr>\n      </table>\n    </td>\n  </tr>\n</table>"
  },
  {
    id: "tmpl-rollover",
    code: "class_rollover_notice",
    name: "Thông Báo Chuyển Lịch Học / Bảo Lưu Khóa Đào Tạo",
    category: "scheduling",
    subject: "[Thông Báo] Cập Nhật Lịch Học & Điều Chuyển Lớp: {{customerName}} - Khóa {{courseTitle}}",
    description: "Gửi cho học viên khi có sự thay đổi lịch học, chuyển đợt đào tạo hoặc học viên yêu cầu bảo lưu.",
    variables: ["customerName", "courseTitle", "batchCohort", "startDate", "location", "pic", "orderCode"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">THÔNG BÁO ĐIỀU CHUYỂN LỊCH ĐÀO TẠO</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Xác nhận cập nhật thông tin học phần & bảo lưu quyền lợi đào tạo</div>\n<p style=\"margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;\">\n  Chào Bạn <strong>{{customerName}}</strong>,\n</p>\n<p style=\"margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;\">\n  Ban Đào tạo TWings Academy xác nhận đã cập nhật lịch học mới cho hồ sơ của Bạn tại khóa <strong>{{courseTitle}}</strong>. Toàn bộ lộ trình và học phí đã đóng được bảo lưu 100%.\n</p>"
  },
  {
    id: "tmpl-placement",
    code: "placement_offer",
    name: "Thư Mời Nhận Việc / Phỏng Vấn Tuyển Dụng Ngân Hàng",
    category: "admission",
    subject: "[Chúc Mừng] Lời Mời Nhận Việc & Phỏng Vấn Tiếp Nhận Tại Đối Tác Ngân Hàng: {{customerName}}",
    description: "Gửi cho học viên tốt nghiệp đủ điều kiện tiếp nhận phỏng vấn hoặc tuyển thẳng vào ngân hàng đối tác.",
    variables: ["customerName", "courseTitle", "pic", "orderCode", "employer", "role"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">THƯ MỜI TIẾP NHẬN VIỆC LÀM</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chương trình liên kết cung ứng nhân sự chất lượng cao ngành Ngân hàng</div>\n<p style=\"margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;\">\n  Chúc mừng Bạn <strong>{{customerName}}</strong>!\n</p>\n<p style=\"margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;\">\n  Hội đồng Đánh giá Năng lực Học viện TWings trân trọng thông báo kết quả đào tạo xuất sắc của Bạn đã được đối tác ngân hàng tiếp nhận và đánh giá cao.\n</p>"
  },
  {
    id: "tmpl-lms-access",
    code: "lms_access",
    name: "Cấp Quyền Truy Cập LMS & Hướng Dẫn Vào Học",
    category: "lms",
    subject: "Khóa học của bạn đã sẵn sàng – vào học ngay | TWings Academy",
    description: "Gửi tự động khi học viên được mở khóa học trên TWings LMS.",
    variables: ["customer_name", "course", "intake", "url", "customer_email", "intake_block", "account_url", "order_code"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">KHÓA HỌC ĐÃ SẴN SÀNG</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Hướng dẫn đăng nhập Cổng học trực tuyến TWings LMS</div>\n<p>Chào {{customer_name}},</p>\n<p>Khóa học <strong>{{course}}{{intake}}</strong> của bạn đã được mở trên hệ thống học trực tuyến TWings LMS.</p>\n<p><strong>Cách vào học:</strong></p>\n<ol style=\"margin: 12px 0; padding-left: 20px; line-height: 1.8;\">\n  <li>Mở <a href=\"{{url}}\" style=\"color: #0056D2; font-weight: 700;\">{{url}}</a></li>\n  <li>Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>\n  <li>Nhập email <strong>{{customer_email}}</strong> và mã 6 chữ số được gửi tới email này</li>\n</ol>\n<p>Bạn cũng có thể đăng nhập bằng mật khẩu trong email “Tài khoản thành viên mới” của hệ thống học.</p>\n{{intake_block}}\n<p><strong>Hoàn thiện hồ sơ nhập học</strong> (CCCD, học vấn, CV) và xem lịch học phí tại\n<a href=\"{{account_url}}\" style=\"color: #0056D2; font-weight: 700;\">Học phí &amp; hồ sơ</a> trong cổng học viên.</p>\n<p>Mã đơn hàng: <strong>{{order_code}}</strong>. Cần hỗ trợ, vui lòng trả lời email này.</p>"
  },
  {
    id: "tmpl-corp-lms-access",
    code: "corporate_lms_access",
    name: "Mở Lớp Đào Tạo Doanh Nghiệp (B2B LMS)",
    category: "corporate",
    subject: "Lớp {{course_title}} đã mở – hướng dẫn vào học",
    description: "Gửi cho học viên thuộc chương trình đào tạo nội bộ doanh nghiệp của TNTalent.",
    variables: ["learner_name", "course_title", "cohort_name", "url", "email", "intake_block", "brand_name"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">LỚP ĐÀO TẠO NỘI BỘ DOANH NGHIỆP</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Giải pháp Phát triển Nguồn Nhân lực Doanh nghiệp TNTalent</div>\n<p>Chào {{learner_name}},</p>\n<p>Lớp <strong>{{course_title}} – {{cohort_name}}</strong> mà đơn vị của bạn đăng ký đã được mở trên hệ thống học trực tuyến.</p>\n<p><strong>Cách vào học:</strong></p>\n<ol style=\"margin: 12px 0; padding-left: 20px; line-height: 1.8;\">\n  <li>Mở <a href=\"{{url}}\" style=\"color: #C8102E; font-weight: 700;\">{{url}}</a></li>\n  <li>Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>\n  <li>Nhập email <strong>{{email}}</strong> và mã 6 chữ số được gửi tới email này</li>\n</ol>\n{{intake_block}}\n<p>Điểm danh tại lớp: quét mã QR do giảng viên chiếu ở mỗi buổi học (cần đăng nhập như trên).</p>\n<p>Cần hỗ trợ, vui lòng trả lời email này.</p>"
  },
  {
    id: "tmpl-lms-certificate",
    code: "lms_certificate",
    name: "Cấp Chứng Chỉ Tốt Nghiệp Khóa Học",
    category: "lms",
    subject: "Chúc mừng bạn hoàn thành khóa học – chứng chỉ {{certificate_code}} | TWings Academy",
    description: "Gửi cho học viên khi hoàn thành khóa học và được cấp chứng chỉ điện tử.",
    variables: ["learner_name", "course_title", "cohort_name", "certificate_code", "url"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">CHỨNG NHẬN TỐT NGHIỆP</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Xác thực năng lực thực chiến ngành Tài chính - Ngân hàng</div>\n<p>Chúc mừng <strong>{{learner_name}}</strong>!</p>\n<p>Bạn đã hoàn thành xuất sắc khóa học <strong>{{course_title}}</strong> {{cohort_name}}.</p>\n<p>Chứng chỉ tốt nghiệp điện tử của bạn: Mã số <strong>{{certificate_code}}</strong>.<br>\nTrang xác minh công khai (gửi cho nhà tuyển dụng): <a href=\"{{url}}\" style=\"color: #0056D2; font-weight: 700;\">{{url}}</a></p>\n<p>Bản chứng chỉ để in / lưu file PDF: <a href=\"{{url}}in/\" style=\"color: #0056D2; font-weight: 700;\">Xem và tải chứng chỉ</a></p>"
  },
  {
    id: "tmpl-installment-reminder",
    code: "installment_reminder",
    name: "Nhắc Hạn Đóng Học Phí Kỳ Trả Góp",
    category: "payment",
    subject: "Nhắc học phí kỳ {{sequence}}/{{total_installments}} – {{order_code}} | TWings Academy",
    description: "Gửi nhắc nhở học viên thanh toán kỳ trả góp kèm mã VietQR tự động.",
    variables: ["customer_name", "sequence", "total_installments", "course_title", "due_date", "amount", "bank_name", "account_number", "account_name", "transfer_content", "qr_image_url", "account_url"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">NHẮC HẠN ĐÓNG HỌC PHÍ</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Kỳ học phí trả góp theo thỏa thuận đào tạo</div>\n<p>Chào {{customer_name}},</p>\n<p>Kỳ học phí {{sequence}}/{{total_installments}} của khóa <strong>{{course_title}}</strong> đến hạn vào ngày <strong>{{due_date}}</strong>.</p>\n<p>Số tiền cần chuyển: <strong>{{amount}}</strong><br>\nNgân hàng: {{bank_name}}<br>\nSố tài khoản: <strong>{{account_number}}</strong> – {{account_name}}<br>\nNội dung chuyển khoản: <strong style=\"color: #0056D2; font-family: monospace;\">{{transfer_content}}</strong></p>\n<p><img src=\"{{qr_image_url}}\" alt=\"VietQR\" width=\"220\" style=\"border-radius: 8px; border: 1px solid #E2E8F0;\" /></p>\n<p>Hệ thống tự động xác nhận sau khi nhận tiền. Xem lịch trả góp tại <a href=\"{{account_url}}\" style=\"color: #0056D2; font-weight: 700;\">{{account_url}}</a>.</p>"
  },
  {
    id: "tmpl-checkout-hold",
    code: "checkout_hold_reminder",
    name: "Cảnh Báo Hết Hạn Giữ Chỗ Ưu Đãi Học Phí",
    category: "payment",
    subject: "Giữ chỗ đến {{hold_until}} – {{order_code}} | TWings Academy",
    description: "Cảnh báo khi thời gian giữ chỗ ưu đãi học phí sắp hết hiệu lực.",
    variables: ["customer_name", "course_title", "hold_until", "order_code", "payment_details"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">CẢNH BÁO THỜI HẠN GIỮ CHỖ</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chỗ học ưu đãi sắp hết hạn giữ chỗ</div>\n<p>Chào {{customer_name}},</p>\n<p>TWings Academy đang giữ chỗ và học phí ưu đãi của bạn cho khóa <strong>{{course_title}}</strong> đến <strong>{{hold_until}}</strong>.\nSau thời điểm này đơn chưa thanh toán sẽ tự hủy và chỗ được nhường cho học viên khác.</p>\n{{payment_details}}"
  },
  {
    id: "tmpl-journey-abandoned",
    code: "journey_abandoned_checkout",
    name: "Hành Trình CRM: Nhắc Hoàn Tất Đơn Đăng Ký (Ngày 1)",
    category: "crm",
    subject: "Hoàn tất đăng ký {{course_title}} – mã {{order_code}} | TWings Academy",
    description: "Gửi tự động sau 1 ngày đăng ký nhưng chưa chuyển khoản học phí.",
    variables: ["customer_name", "course_title", "order_code", "amount", "bank_name", "account_number", "account_name", "transfer_content", "qr_image_url"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">HOÀN TẤT ĐĂNG KÝ KHÓA HỌC</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chỗ học vẫn đang được ưu tiên giữ cho bạn</div>\n<p>Chào {{customer_name}},</p>\n<p>Bạn đã đăng ký <strong>{{course_title}}</strong> nhưng TWings chưa nhận được học phí.\nChỗ học vẫn được giữ cho bạn – chỉ cần chuyển khoản theo thông tin dưới đây, hệ thống tự xác nhận và mở khóa học.</p>\n<p>Số tiền: <strong>{{amount}}</strong><br>\nNgân hàng: {{bank_name}}<br>\nSố tài khoản: <strong>{{account_number}}</strong> – {{account_name}}<br>\nNội dung chuyển khoản: <strong style=\"color: #0056D2; font-family: monospace;\">{{transfer_content}}</strong></p>\n<p><img src=\"{{qr_image_url}}\" alt=\"VietQR\" width=\"220\" style=\"border-radius: 8px; border: 1px solid #E2E8F0;\" /></p>\n<p>Cần tư vấn thêm hoặc muốn trả góp? Trả lời email này, TWings sẽ liên hệ bạn ngay.</p>"
  },
  {
    id: "tmpl-journey-starting",
    code: "journey_intake_starting",
    name: "Hành Trình CRM: Nhắc Lớp Sắp Khai Giảng (Trước 3 Ngày)",
    category: "crm",
    subject: "Sắp khai giảng {{cohort_name}} – {{course_title}} | TWings Academy",
    description: "Gửi 3 ngày trước ngày khai giảng lớp học.",
    variables: ["customer_name", "cohort_name", "course_title", "start_date", "location_info", "customer_email", "lms_url"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">SẮP KHAI GIẢNG LỚP HỌC</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chuẩn bị tham gia buổi học đầu tiên</div>\n<p>Chào {{customer_name}},</p>\n<p>Lớp <strong>{{cohort_name}}</strong> của khóa <strong>{{course_title}}</strong> khai giảng ngày <strong>{{start_date}}</strong>.{{location_info}}</p>\n<p>Học liệu, lịch học và bài tập có trên <a href=\"{{lms_url}}\" style=\"color: #0056D2; font-weight: 700;\">TWings LMS</a> – đăng nhập bằng nút “Đăng nhập bằng TWings” với email {{customer_email}}.</p>\n<p>Hẹn gặp bạn tại lớp học!</p>"
  },
  {
    id: "tmpl-journey-not-started",
    code: "journey_not_started",
    name: "Hành Trình CRM: Động Viên Bắt Đầu Học (Sau 7 Ngày)",
    category: "crm",
    subject: "Bắt đầu khóa {{course_title}} ngay hôm nay | TWings Academy",
    description: "Gửi sau 7 ngày nếu học viên chưa vào học bài nào.",
    variables: ["customer_name", "course_title", "lms_url", "account_url"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">BẮT ĐẦU HÀNH TRÌNH HỌC TẬP</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Chỉ 20 phút mỗi ngày để chinh phục mục tiêu</div>\n<p>Chào {{customer_name}},</p>\n<p>Khóa <strong>{{course_title}}</strong> đã mở cho bạn được một tuần nhưng bạn chưa bắt đầu bài học nào. Chỉ 20 phút mỗi ngày là đủ để theo kịp lộ trình đào tạo thực chiến.</p>\n<p><a href=\"{{lms_url}}\" style=\"color: #0056D2; font-weight: 700;\">Vào học ngay trên TWings LMS</a> &bull; Xem tiến độ tại <a href=\"{{account_url}}\" style=\"color: #0056D2; font-weight: 700;\">Học phí &amp; hồ sơ</a></p>\n<p>Gặp khó khăn khi đăng nhập hay sắp xếp thời gian? Trả lời email này để chuyên viên hỗ trợ bạn.</p>"
  },
  {
    id: "tmpl-journey-completed",
    code: "journey_completed_next",
    name: "Hành Trình CRM: Chúc Mừng & Gợi Ý Lộ Trình Kế Tiếp",
    category: "crm",
    subject: "Chúc mừng bạn hoàn thành {{course_title}} | TWings Academy",
    description: "Gửi sau 2 ngày hoàn thành khóa học để xin feedback và giới thiệu lộ trình nâng cao.",
    variables: ["customer_name", "course_title", "certificate_block", "account_url", "next_steps_block"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">CHÚC MỪNG TỐT NGHIỆP</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Cảm ơn bạn đã đồng hành cùng TWings Academy</div>\n<p>Chào {{customer_name}},</p>\n<p>Chúc mừng bạn đã hoàn thành khóa đào tạo <strong>{{course_title}}</strong>!</p>\n{{certificate_block}}\n<p>Cảm nhận của bạn giúp TWings nâng cao chất lượng đào tạo:\n<a href=\"{{account_url}}\" style=\"color: #0056D2; font-weight: 700;\">Viết đánh giá trong cổng học viên</a>.</p>\n{{next_steps_block}}"
  },
  {
    id: "tmpl-appt-confirm",
    code: "appointment_confirmation",
    name: "Xác Nhận Lịch Hẹn Tư Vấn Tuyển Sinh",
    category: "crm",
    subject: "Xác nhận lịch tư vấn | TWings Academy",
    description: "Gửi ngay khi đặt lịch hẹn tư vấn định hướng nghề nghiệp ngành Ngân hàng.",
    variables: ["customer_name", "starts_at", "duration", "channel", "course"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">XÁC NHẬN LỊCH TƯ VẤN</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Buổi tư vấn định hướng nghề nghiệp cùng chuyên viên TWings</div>\n<p>Chào {{customer_name}},</p>\n<p>TWings Academy xác nhận lịch hẹn tư vấn định hướng cùng bạn:</p>\n<ul style=\"margin: 12px 0; padding-left: 20px; line-height: 1.8;\">\n  <li>Thời gian: <strong>{{starts_at}}</strong> (Thời lượng: {{duration}} phút)</li>\n  <li>Hình thức: <strong>{{channel}}</strong></li>\n  <li>Nội dung: Tư vấn định hướng khóa học <strong>{{course}}</strong></li>\n</ul>\n<p>Cần thay đổi thời gian hẹn, vui lòng phản hồi email này.</p>"
  },
  {
    id: "tmpl-appt-remind",
    code: "appointment_reminder",
    name: "Nhắc Lịch Hẹn Tư Vấn (Trước 2 Giờ)",
    category: "crm",
    subject: "Nhắc lịch tư vấn hôm nay | TWings Academy",
    description: "Gửi nhắc nhở trước giờ hẹn tư vấn.",
    variables: ["customer_name", "starts_at", "duration", "channel", "course"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">NHẮC HẸN TƯ VẤN HÔM NAY</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Buổi tư vấn sẽ bắt đầu trong ít giờ tới</div>\n<p>Chào {{customer_name}},</p>\n<p>Nhắc bạn lịch tư vấn sắp tới cùng TWings Academy:</p>\n<ul style=\"margin: 12px 0; padding-left: 20px; line-height: 1.8;\">\n  <li>Thời gian: <strong>{{starts_at}}</strong> (Thời lượng: {{duration}} phút)</li>\n  <li>Hình thức: <strong>{{channel}}</strong></li>\n  <li>Nội dung: Tư vấn định hướng khóa học <strong>{{course}}</strong></li>\n</ul>\n<p>Chuyên viên TWings sẽ liên hệ đúng giờ hẹn. Hẹn gặp bạn!</p>"
  },
  {
    id: "tmpl-auth-otp",
    code: "auth_otp",
    name: "Mã OTP Xác Thực Đăng Nhập",
    category: "security",
    subject: "Mã đăng nhập TWings: {{code}}",
    description: "Gửi mã OTP xác thực đăng nhập Cổng học viên không cần mật khẩu.",
    variables: ["code", "email"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">MÃ XÁC THỰC ĐĂNG NHẬP</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Mã OTP dùng một lần cho Cổng học viên TWings</div>\n<p>Xin chào,</p>\n<p>Mã xác thực đăng nhập Cổng học viên TWings Academy của bạn là:</p>\n<div style=\"margin: 20px 0; text-align: center;\">\n  <span style=\"display: inline-block; font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #0056D2; background: #EFF6FF; padding: 12px 24px; border-radius: 10px; border: 1px solid #BFDBFE;\">\n    {{code}}\n  </span>\n</div>\n<p style=\"font-size: 13px; color: #64748B;\">Mã có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này để đảm bảo an toàn.</p>"
  },
  {
    id: "tmpl-staff-pwd-reset",
    code: "staff_password_reset",
    name: "Đặt Lại Mật Khẩu Tài Khoản Quản Trị",
    category: "security",
    subject: "Đặt lại mật khẩu quản trị | TWings Academy",
    description: "Gửi liên kết đặt lại mật khẩu cho tài khoản quản trị CMS.",
    variables: ["name", "email", "reset_link"],
    isDefault: true,
    updatedAt: "22/10/2026",
    body: "<div style=\"font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;\">ĐẶT LẠI MẬT KHẨU QUẢN TRỊ</div>\n<div style=\"font-size: 13px; color: #64748B; margin-bottom: 22px;\">Yêu cầu khôi phục mật khẩu tài khoản nhân viên</div>\n<p>Chào {{name}},</p>\n<p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản quản trị TWings (<strong>{{email}}</strong>).</p>\n<p style=\"margin: 20px 0;\">\n  <a href=\"{{reset_link}}\" style=\"background: #0056D2; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;\">\n    Đặt Mật Khẩu Mới &rarr;\n  </a>\n</p>\n<p style=\"font-size: 13px; color: #64748B;\">Liên kết có hiệu lực trong 1 giờ. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và liên hệ quản trị viên.</p>"
  }
];

export const INITIAL_EMAIL_SEND_LOGS: EmailSendLog[] = [
  {
    id: 'log-1',
    templateId: 'tmpl-welcome',
    templateName: 'Giấy Báo Nhập Học & Lịch Đào Tạo Chuẩn MSB',
    recipientEmail: 'ntkhanhlinh.ka@gmail.com',
    recipientName: 'Nguyễn Thị Khánh Linh',
    subject: '[TWings x MSB] Giấy Báo Nhập Học: Chúc mừng Nguyễn Thị Khánh Linh - Khóa RM Doanh Nghiệp',
    sentAt: '02/10/2026 09:30:15',
    deliveredAt: '02/10/2026 09:30:18',
    openedAt: '02/10/2026 09:42:05',
    openCount: 3,
    clickedAt: '02/10/2026 09:43:10',
    clickCount: 1,
    lastClickedUrl: 'https://twings.edu.vn/lms/confirm',
    status: 'clicked',
    resendMessageId: 'msg_01J9XVK7890MSB',
    webhookEvents: [
      { type: 'email.sent', timestamp: '02/10/2026 09:30:15', details: 'Gửi qua máy chủ Resend MX' },
      { type: 'email.delivered', timestamp: '02/10/2026 09:30:18', details: 'Gmail MX đã tiếp nhận (250 OK)' },
      { type: 'email.opened', timestamp: '02/10/2026 09:42:05', details: 'Học viên mở thư trên Apple Mail (iOS 18)' },
      { type: 'email.clicked', timestamp: '02/10/2026 09:43:10', details: 'Click xác nhận nhận tài khoản LMS' }
    ]
  },
  {
    id: 'log-2',
    templateId: 'tmpl-invoice',
    templateName: 'Thông Báo Học Phí & Mã Chuyển Khoản VietQR 24/7',
    recipientEmail: 'duc.hm@msb.com.vn',
    recipientName: 'Hoàng Minh Đức',
    subject: '[Học Phí TWings] Hướng dẫn quét mã VietQR - Mã đơn: 0415_MSB_Hoang Minh Duc',
    sentAt: '01/10/2026 14:15:22',
    deliveredAt: '01/10/2026 14:15:25',
    openedAt: '01/10/2026 14:20:00',
    openCount: 2,
    status: 'opened',
    resendMessageId: 'msg_01J9XVJ4512MSB',
    webhookEvents: [
      { type: 'email.sent', timestamp: '01/10/2026 14:15:22', details: 'Gửi qua máy chủ Resend MX' },
      { type: 'email.delivered', timestamp: '01/10/2026 14:15:25', details: 'MSB Exchange Server đã nhận thư' },
      { type: 'email.opened', timestamp: '01/10/2026 14:20:00', details: 'Người nhận mở thư trên Outlook Desktop' }
    ]
  },
  {
    id: 'log-3',
    templateId: 'tmpl-receipt',
    templateName: 'Biên Lai Điện Tử Xác Nhận Thu Học Phí Thành Công',
    recipientEmail: 'huy.tq@gmail.com',
    recipientName: 'Trần Quốc Huy',
    subject: '[Biên Lai Điện Tử] Xác nhận thanh toán thành công cho học viên Trần Quốc Huy',
    sentAt: '02/09/2026 09:16:00',
    deliveredAt: '02/09/2026 09:16:04',
    status: 'delivered',
    resendMessageId: 'msg_01J8ABC1234MSB',
    webhookEvents: [
      { type: 'email.sent', timestamp: '02/09/2026 09:16:00', details: 'Gửi qua máy chủ Resend MX' },
      { type: 'email.delivered', timestamp: '02/09/2026 09:16:04', details: 'Gmail MX phản hồi 250 2.0.0 OK' }
    ]
  }
];

export const INITIAL_WEBHOOK_CONFIG: ResendWebhookConfig = {
  webhookUrl: API_ROOT
    ? `${API_ROOT.startsWith('/') ? window.location.origin : ''}${API_ROOT}/webhooks/resend/`
    : '(chưa cấu hình VITE_API_BASE_URL)',
  // The real signing secret (whsec_...) lives only on the server as RESEND_WEBHOOK_SECRET.
  signingSecret: '',
  enabledEvents: ['email.sent', 'email.delivered', 'email.opened', 'email.clicked', 'email.bounced'],
  status: isBackendEnabled() ? 'active' : 'not_configured'
};

/**
 * Live delivery happens only through the backend, which holds RESEND_API_KEY.
 * The browser never sees or stores a Resend API key.
 */
export function isLiveEmailEnabled(): boolean {
  return isBackendEnabled();
}

export const SENDER_DISPLAY = isBackendEnabled()
  ? 'Cấu hình trên máy chủ (RESEND_FROM_EMAIL)'
  : 'Sandbox – không gửi thư thật';

/**
 * Resend Webhook Config storage
 */
export function getSavedWebhookConfig(): ResendWebhookConfig {
  return INITIAL_WEBHOOK_CONFIG;
}

/**
 * Send logs storage
 */
export function getSavedEmailSendLogs(): EmailSendLog[] {
  if (typeof window === 'undefined') return INITIAL_EMAIL_SEND_LOGS;
  try {
    const raw = localStorage.getItem('twings_resend_send_logs');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return INITIAL_EMAIL_SEND_LOGS;
}

export function saveEmailSendLog(log: EmailSendLog): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedEmailSendLogs();
    const updated = [log, ...current];
    localStorage.setItem('twings_resend_send_logs', JSON.stringify(updated.slice(0, 100)));
  } catch {
    // ignore
  }
}

/**
 * Webhook Events storage
 */
export function getSavedWebhookEvents(): ResendWebhookEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('twings_resend_webhook_events');
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback
  }
  return [];
}

export function saveWebhookEvent(event: ResendWebhookEvent): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getSavedWebhookEvents();
    const updated = [event, ...current];
    localStorage.setItem('twings_resend_webhook_events', JSON.stringify(updated.slice(0, 100)));
  } catch {
    // ignore
  }
}

/**
 * Applies incoming Webhook event to update EmailSendLog state in real-time
 */
export function processIncomingWebhookEvent(event: ResendWebhookEvent): { updatedLog?: EmailSendLog } {
  saveWebhookEvent(event);

  const logs = getSavedEmailSendLogs();
  const index = logs.findIndex((l) => l.resendMessageId === event.emailId);

  if (index !== -1) {
    const log = { ...logs[index] };
    const now = new Date().toLocaleString('vi-VN');

    if (!log.webhookEvents) log.webhookEvents = [];

    switch (event.type) {
      case 'email.delivered':
        log.status = 'delivered';
        log.deliveredAt = now;
        log.webhookEvents.push({ type: 'email.delivered', timestamp: now, details: 'Máy chủ hộp thư người nhận xác nhận tiếp nhận thành công' });
        break;
      case 'email.opened':
        log.status = 'opened';
        log.openedAt = now;
        log.openCount = (log.openCount || 0) + 1;
        log.webhookEvents.push({ type: 'email.opened', timestamp: now, details: `Học viên mở email (Lần ${log.openCount})` });
        break;
      case 'email.clicked':
        log.status = 'clicked';
        log.clickedAt = now;
        log.clickCount = (log.clickCount || 0) + 1;
        log.lastClickedUrl = event.payload?.click?.link || 'https://twings.edu.vn';
        log.webhookEvents.push({ type: 'email.clicked', timestamp: now, details: `Click vào liên kết: ${log.lastClickedUrl}` });
        break;
      case 'email.bounced':
        log.status = 'bounced';
        log.bouncedAt = now;
        log.bounceReason = event.payload?.bounce?.message || 'Địa chỉ email không tồn tại hoặc bị từ chối';
        log.webhookEvents.push({ type: 'email.bounced', timestamp: now, details: `Thư bị dội (Bounce): ${log.bounceReason}` });
        break;
    }

    logs[index] = log;
    localStorage.setItem('twings_resend_send_logs', JSON.stringify(logs));

    return { updatedLog: log };
  }

  return {};
}

/**
 * Renders template body and subject with real order/student variables
 */
export function renderEmailTemplate(
  templateString: string,
  variables: Record<string, string | number | undefined>
): string {
  let rendered = templateString;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, String(val ?? ''));
  }
  return rendered;
}

/**
 * Format currency in VND
 */
function formatVND(num?: number) {
  if (num === undefined || num === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

/** What a template can use, and what it means (shown to the editor and in "missing data" warnings). */
export const EMAIL_VARIABLE_LABELS: Record<string, string> = {
  customerName: 'Họ tên học viên',
  courseTitle: 'Tên khóa học',
  batchCohort: 'Lớp / đợt khai giảng',
  startDate: 'Ngày khai giảng',
  instructorName: 'Giảng viên phụ trách lớp',
  amount: 'Số tiền cần đóng',
  orderCode: 'Mã đăng ký',
  bankAccount: 'Tài khoản nhận học phí (theo hướng dẫn thanh toán của đơn)',
  qrImageUrl: 'Ảnh mã VietQR của đơn',
  bankName: 'Ngân hàng nhận học phí',
  accountNumber: 'Số tài khoản nhận học phí',
  accountName: 'Chủ tài khoản nhận học phí',
  transferContent: 'Nội dung chuyển khoản (mã đơn)',
  location: 'Địa điểm học',
  pic: 'Tư vấn viên phụ trách',
  customerPhone: 'SĐT học viên'
};

/** Facts about a registration that are not on the order itself (loaded by the screen that sends). */
export interface EmailContext {
  /** Payment instructions and amount due (GET /staff/orders/<id>/billing/). */
  billing?: {
    amountDueNow: number;
    payment: { bankName: string; accountNumber: string; accountName: string; transferContent: string; qrImageUrl: string } | null;
  } | null;
  /** The intake of the registration (GET /staff/cohorts/<id>/). */
  cohort?: { startDate?: string | null; location?: string; leadInstructorName?: string } | null;
}

/**
 * Template variables of one registration, from real data only: what is not known is left empty (the
 * sending screen lists it) rather than filled with an example value.
 */
export function extractOrderEmailVariables(order: Order, ctx: EmailContext = {}): Record<string, string | number> {
  const pay = ctx.billing?.payment;
  const due = ctx.billing ? ctx.billing.amountDueNow : order.totalReceivable || order.amount;
  const start = ctx.cohort?.startDate;
  return {
    customerName: order.customerName || '',
    courseTitle: order.courseTitle || '',
    batchCohort: order.batchCohort || '',
    orderCode: order.orderCode || '',
    amount: due ? formatVND(due) : '',
    customerPhone: order.customerPhone || '',
    customerEmail: order.customerEmail || '',
    pic: order.pic || '',
    startDate: start ? start.slice(0, 10).split('-').reverse().join('/') : '',
    location: ctx.cohort?.location || '',
    bankAccount: pay ? `${pay.accountNumber} – ${pay.accountName} – ${pay.bankName} (nội dung: ${pay.transferContent})` : '',
    // The order's own payment instructions (same as the learner's payment page and the bank webhook).
    qrImageUrl: pay?.qrImageUrl || '',
    bankName: pay?.bankName || '',
    accountNumber: pay?.accountNumber || '',
    accountName: pay?.accountName || '',
    transferContent: pay?.transferContent || '',
    instructorName: ctx.cohort?.leadInstructorName || ''
  };
}

/** Variables the texts use that have no value for this registration. */
export function missingEmailVariables(texts: string[], variables: Record<string, string | number | undefined>): string[] {
  const used = new Set<string>();
  texts.forEach((t) => (t.match(/{{\s*(\w+)\s*}}/g) || []).forEach((m) => used.add(m.replace(/[{}\s]/g, ''))));
  return [...used].filter((k) => k in variables && (variables[k] === '' || variables[k] === undefined));
}

/** For previews without a real registration: every empty variable shows as [its meaning]. */
export function withPlaceholders(variables: Record<string, string | number>): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(variables).map(([k, v]) => [k, v === '' ? `[${EMAIL_VARIABLE_LABELS[k] || k}]` : v])
  );
}

/**
 * Sends email via Resend API (direct REST endpoint if API key present) or realistic enterprise mock dispatcher
 */
export async function sendEmailWithResend(params: {
  to: string;
  subject: string;
  html: string;
  templateId?: string;
  templateName?: string;
  recipientName?: string;
  /** Server template code (EmailTemplate.code) and the order the e-mail belongs to (CRM history). */
  templateCode?: string;
  orderId?: string;
}): Promise<{ success: boolean; messageId: string; status: ResendEmailStatus; error?: string; isLiveApi?: boolean }> {
  // 1. Live delivery via the TWings backend (holds the Resend key server-side)
  if (isBackendEnabled()) {
    try {
      const data = await api.post<{ id: string; resendMessageId: string; status: ResendEmailStatus }>(
        '/staff/emails/send/',
        {
          to: params.to,
          subject: params.subject,
          html: params.html,
          templateCode: params.templateCode || '',
          recipientName: params.recipientName,
          orderId: params.orderId || ''
        }
      );
      saveEmailSendLog({
        id: data.id,
        templateId: params.templateId || 'custom',
        templateName: params.templateName || 'Email tùy chỉnh',
        recipientEmail: params.to,
        recipientName: params.recipientName || params.to.split('@')[0],
        subject: params.subject,
        sentAt: new Date().toLocaleString('vi-VN'),
        status: data.status,
        resendMessageId: data.resendMessageId,
        webhookEvents: [
          { type: 'email.sent', timestamp: new Date().toLocaleString('vi-VN'), details: 'Đã phát qua máy chủ TWings → Resend' }
        ]
      });
      return { success: true, messageId: data.resendMessageId, status: data.status, isLiveApi: true };
    } catch (err) {
      return {
        success: false,
        messageId: '',
        status: 'failed',
        error: err instanceof Error ? err.message : 'Lỗi gửi email qua máy chủ'
      };
    }
  }

  // 2. High-fidelity developer sandbox simulation
  await new Promise((resolve) => setTimeout(resolve, 850));
  const simMessageId = `msg_resend_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const logEntry: EmailSendLog = {
    id: `log-${Date.now()}`,
    templateId: params.templateId || 'custom',
    templateName: params.templateName || 'Email tùy chỉnh',
    recipientEmail: params.to,
    recipientName: params.recipientName || params.to.split('@')[0],
    subject: params.subject,
    sentAt: new Date().toLocaleString('vi-VN'),
    deliveredAt: new Date().toLocaleString('vi-VN'),
    status: 'delivered',
    resendMessageId: simMessageId,
    renderedHtml: params.html,
    webhookEvents: [
      { type: 'email.sent', timestamp: new Date().toLocaleString('vi-VN'), details: 'Khởi tạo và phát qua Resend Sandbox' },
      { type: 'email.delivered', timestamp: new Date().toLocaleString('vi-VN'), details: 'Máy chủ hộp thư nhận phản hồi 250 OK' }
    ]
  };
  saveEmailSendLog(logEntry);

  return {
    success: true,
    messageId: simMessageId,
    status: 'delivered',
    isLiveApi: false
  };
}

/**
 * Wraps an inner HTML body into the master branded email frame.
 * If the HTML already contains <html> or <body>, it is returned unchanged.
 * Brands supported: 'twings' (default) and 'corporate'.
 */
export function wrapEmailPreview(html: string, brandName: string = 'twings'): string {
  if (/<(html|body)\b/i.test(html)) {
    return html;
  }
  const isCorp = brandName === 'corporate';
  const brand = isCorp
    ? {
        name: 'TNTalent - Corporate Training',
        badgeGradient: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)',
        badgeShadow: 'rgba(200, 16, 46, 0.4)',
        monogram: 'TN',
        tagline: 'Giải Pháp Đào Tạo Nhân Lực Doanh Nghiệp',
        taglineColor: '#FCA5A5',
        badgeLabel: 'CORPORATE',
        accentGradient: 'linear-gradient(90deg, #991B1B 0%, #DC2626 50%, #F87171 100%)',
        footerLinks: '<a href="https://twings.edu.vn/learn" style="color:#C8102E;text-decoration:none;font-weight:700;">Học trực tuyến</a> · <a href="mailto:hello@tntalent.vn" style="color:#C8102E;text-decoration:none;">hello@tntalent.vn</a>',
        addressInfo: 'Công ty CP Quản trị Nguồn nhân lực TNTalent<br>Tòa nhà ROX Tower, số 54A Nguyễn Chí Thanh, Phường Láng Hạ, Hà Nội',
      }
    : {
        name: 'TWings Academy',
        badgeGradient: 'linear-gradient(135deg, #00388A 0%, #0073C1 100%)',
        badgeShadow: 'rgba(0, 115, 193, 0.4)',
        monogram: 'TW',
        tagline: 'Học Viện Đào Tạo Thực Chiến Tài Chính Ngân Hàng',
        taglineColor: '#93C5FD',
        badgeLabel: 'CỔNG THÔNG BÁO',
        accentGradient: 'linear-gradient(90deg, #00388A 0%, #0073C1 50%, #38BDF8 100%)',
        footerLinks: '<a href="https://twings.edu.vn/learn" style="color:#0056D2;text-decoration:none;font-weight:700;">Cổng học viên LMS</a> · <a href="https://twings.edu.vn" style="color:#0056D2;text-decoration:none;font-weight:700;">Học phí &amp; hồ sơ</a> · <a href="mailto:hello@twings.edu.vn" style="color:#0056D2;text-decoration:none;">hello@twings.edu.vn</a>',
        addressInfo: 'Trụ sở: Tòa nhà ROX Tower, 54A Nguyễn Chí Thanh, Q. Đống Đa, TP. Hà Nội<br>Hotline: 1900 633 898 / 0843 314 382 · Website: <a href="https://twings.edu.vn" style="color:#64748B;text-decoration:none;">twings.edu.vn</a>',
      };

  return `<!doctype html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${brand.name}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F1F5F9; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    p { margin: 0 0 14px 0; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-header { padding: 20px 18px !important; }
      .email-body { padding: 24px 18px !important; }
      .email-footer { padding: 20px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F1F5F9;padding:32px 12px;">
<tr><td align="center">
<!--[if mso]>
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center">
<tr><td>
<![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="email-container" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(15,23,42,0.06);">
  <!-- Brand Header Bar with Logo Monogram -->
  <tr>
    <td class="email-header" style="background:#0F172A;padding:24px 30px;border-radius:16px 16px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="middle" style="width:44px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" valign="middle" style="width:40px;height:40px;border-radius:10px;background:${brand.badgeGradient};color:#ffffff;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:900;font-size:16px;text-align:center;box-shadow:0 4px 12px ${brand.badgeShadow};">
                  ${brand.monogram}
                </td>
              </tr>
            </table>
          </td>
          <td valign="middle" style="padding-left:14px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-weight:800;font-size:17px;line-height:1.2;color:#ffffff;letter-spacing:0.3px;">${brand.name}</td>
              </tr>
            </table>
            <div style="font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:10px;font-weight:600;color:${brand.taglineColor};letter-spacing:0.8px;text-transform:uppercase;margin-top:3px;">
              ${brand.tagline}
            </div>
          </td>
          <td align="right" valign="middle">
            <span style="display:inline-block;padding:4px 10px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.18);border-radius:20px;font-family:'Plus Jakarta Sans',Segoe UI,Arial,sans-serif;font-size:10px;font-weight:700;color:#93C5FD;letter-spacing:0.5px;">
              ${brand.badgeLabel}
            </span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td height="3" style="background:${brand.accentGradient};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td class="email-body" style="padding:32px 30px 24px 30px;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;font-size:14px;line-height:1.65;">
      ${html}
    </td>
  </tr>
  <tr>
    <td class="email-footer" style="background:#F8FAFC;border-top:1px solid #E2E8F0;border-radius:0 0 16px 16px;padding:24px 30px;text-align:center;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#475569;">
        ${brand.footerLinks}
      </div>
      <div style="font-size:11px;color:#94A3B8;line-height:1.6;margin-bottom:8px;">
        ${brand.addressInfo}
      </div>
      <div style="font-size:10px;color:#CBD5E1;">
        &copy; 2026 ${brand.name}. Bản quyền được bảo lưu. Email được gửi tự động từ hệ thống.
      </div>
    </td>
  </tr>
</table>
<!--[if mso]>
</td></tr>
</table>
<![endif]-->
</td></tr>
</table>
</body></html>`;
}

/**
 * 1-click test send email via the TWings backend API (/staff/emails/test-send/).
 */
export async function testSendEmailWithBackend(params: {
  to: string;
  code?: string;
  subject?: string;
  body?: string;
  brand?: string;
  variables?: Record<string, string | number>;
}): Promise<{ success: boolean; messageId: string; status: ResendEmailStatus; error?: string }> {
  if (isBackendEnabled()) {
    try {
      const data = await api.post<{ id: string; status: ResendEmailStatus; messageId?: string; error?: string }>(
        '/staff/emails/test-send/',
        {
          to: params.to,
          code: params.code || '',
          subject: params.subject || '',
          body: params.body || '',
          brand: params.brand || 'twings',
          variables: params.variables || {},
          sync: true
        }
      );
      return {
        success: data.status === 'sent' || data.status === 'simulated',
        messageId: data.messageId || data.id,
        status: data.status,
        error: data.error
      };
    } catch (err) {
      return {
        success: false,
        messageId: '',
        status: 'failed',
        error: err instanceof Error ? err.message : 'Lỗi gửi email thử nghiệm qua máy chủ'
      };
    }
  }
  return sendEmailWithResend({
    to: params.to,
    subject: `[TEST] ${params.subject || 'Thử nghiệm'}`,
    html: wrapEmailPreview(params.body || '', params.brand || 'twings'),
    templateCode: params.code
  });
}

