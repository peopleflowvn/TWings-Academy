"""
Standardize all Email Templates:
1. Clean separation: Templates store ONLY the inner content body.
   Master Header, Monogram Logo Badge, and Institutional Footer are added dynamically by layout.wrap().
2. Unify all 23+ email scenarios across CMS, LMS, CRM, Payments, Security, and Corporate into EmailTemplate.
3. Update fixtures/seed_content.json, SQLite database, and frontend/src/utils/resendEmail.ts.
"""

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BACKEND = ROOT / "backend"
FIXTURE_PATH = BACKEND / "fixtures" / "seed_content.json"
FRONTEND_RESEND_PATH = ROOT / "frontend" / "src" / "utils" / "resendEmail.ts"

sys.path.insert(0, str(BACKEND))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
import django
django.setup()

from apps.notifications.models import EmailTemplate


def clean_body(title: str, subtitle: str, content: str) -> str:
    """Return the clean inner content HTML (without outer doctype, header, footer)."""
    return f"""<div style="font-size: 20px; font-weight: 800; color: #002D62; margin-bottom: 6px; letter-spacing: -0.3px;">{title}</div>
<div style="font-size: 13px; color: #64748B; margin-bottom: 22px;">{subtitle}</div>
{content.strip()}"""


TEMPLATES = {
    # ---------------------------------------------------- 1. CMS Admission & Scheduling
    "admission_welcome": {
        "id": "tmpl-welcome",
        "code": "admission_welcome",
        "name": "Giấy Báo Nhập Học & Lịch Đào Tạo Chuẩn MSB",
        "category": "admission",
        "subject": "[TWings x MSB] Giấy Báo Nhập Học: Chúc mừng {{customerName}} - Khóa {{courseTitle}}",
        "description": "Gửi tự động khi học viên đăng ký hoặc được xác nhận xếp vào lớp học mới.",
        "variables": [
            "customerName", "courseTitle", "batchCohort", "startDate",
            "location", "pic", "customerPhone", "instructorName", "orderCode"
        ],
        "isDefault": True,
        "title": "GIẤY BÁO NHẬP HỌC CHÍNH THỨC",
        "subtitle": "Chương Trình Đào Tạo Thực Chiến & Tiếp Nhận Việc Làm MSB",
        "content": """
<p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;">
  Kính gửi Bạn <strong>{{customerName}}</strong>,
</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
  Hội đồng Tuyển sinh TWings Academy và Ban Đào tạo &amp; Phát triển Nguồn Nhân lực <strong>Ngân hàng TMCP Hàng Hải Việt Nam (MSB)</strong> trân trọng chúc mừng Bạn đã hoàn tất thủ tục đăng ký và chính thức đủ điều kiện tham gia khóa học:
</p>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #0056D2; border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 18px 20px;">
      <table class="data-table" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 140px;">Khóa đào tạo:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #0056D2;">{{courseTitle}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Lớp / Đợt khai giảng:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #0F172A;">{{batchCohort}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Lịch khai giảng:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #D97706;">{{startDate}} (19h00 - 21h30)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Giảng viên phụ trách:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #0F172A;">{{instructorName}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Địa điểm học tập:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #334155;">{{location}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Mã hồ sơ học viên:</td>
          <td style="padding: 6px 0; font-size: 13px; font-family: monospace; font-weight: 700; color: #0284C7;">{{orderCode}}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #EFF6FF; border-radius: 12px; margin-bottom: 24px; border: 1px solid #BFDBFE;">
  <tr>
    <td style="padding: 16px 20px;">
      <div style="font-size: 13px; font-weight: 700; color: #1E40AF; margin-bottom: 8px;">
        Quyền Lợi Độc Quyền Dành Cho Học Viên Lớp Này:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #1E3A8A; line-height: 1.6;">
        <li>Được cấp tài khoản học trực tuyến <strong>TWings LMS</strong>, đăng nhập bằng email tại mục Vào học.</li>
        <li>Cố vấn 1-1 cùng Giám đốc Khối ngân hàng MSB suốt thời gian thực chiến.</li>
        <li>Tham gia chương trình <strong>Bank Tour Hội sở MSB</strong> và cam kết phỏng vấn tiếp nhận việc làm sau tốt nghiệp.</li>
      </ul>
    </td>
  </tr>
</table>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 28px 0 20px 0;">
  <tr>
    <td align="center">
      <table border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td align="center" style="border-radius: 12px; background: linear-gradient(135deg, #0056D2 0%, #0073C1 100%); box-shadow: 0 4px 14px rgba(0, 86, 210, 0.35);">
            <a href="https://tuyensinh.twings.edu.vn/learn/" target="_blank" style="font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; display: inline-block; letter-spacing: 0.3px;">
              Xác Nhận Tham Gia &amp; Vào Cổng Học Viên LMS &rarr;
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="margin: 20px 0 0 0; font-size: 13px; color: #64748B; line-height: 1.6;">
  Chuyên viên tư vấn phụ trách hỗ trợ Bạn: <strong>{{pic}}</strong> &bull; Hotline: <strong>1900 633 898</strong>.
</p>
""",
    },

    "vietqr_tuition_invoice": {
        "id": "tmpl-invoice",
        "code": "vietqr_tuition_invoice",
        "name": "Hóa Đơn & Thông Tin Chuyển Khoản Học Phí VietQR",
        "category": "payment",
        "subject": "[TWings Academy] Hóa Đơn Học Phí & Mã VietQR Tự Động: {{orderCode}} - {{customerName}}",
        "description": "Gửi ngay sau khi học viên bấm Đăng Ký, kèm mã VietQR chứa sẵn số tiền và nội dung chuyển khoản tự động khớp lệnh.",
        "variables": [
            "customerName", "courseTitle", "amount", "orderCode", "bankAccount",
            "pic", "customerPhone", "batchCohort", "qrImageUrl"
        ],
        "isDefault": True,
        "title": "THÔNG TIN THANH TOÁN HỌC PHÍ",
        "subtitle": "Hệ thống xác thực giao dịch tự động qua cổng VietQR Napas247",
        "content": """
<p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;">
  Kính gửi Bạn <strong>{{customerName}}</strong>,
</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
  Hệ thống tiếp nhận hồ sơ đăng ký thành công cho khóa học <strong>{{courseTitle}}</strong> (Mã đơn: <code style="font-family: monospace; font-weight: 700; color: #0056D2; background: #EFF6FF; padding: 2px 6px; border-radius: 4px;">{{orderCode}}</code>).
</p>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #002D62 0%, #0056D2 100%); border-radius: 14px; margin: 20px 0; color: #ffffff; box-shadow: 0 6px 18px rgba(0, 45, 98, 0.25);">
  <tr>
    <td style="padding: 22px 24px; text-align: center;">
      <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #93C5FD; margin-bottom: 6px;">
        Số Tiền Học Phí Cần Thanh Toán
      </div>
      <div style="font-size: 28px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
        {{amount}}
      </div>
      <div style="font-size: 12px; color: #BFDBFE; margin-top: 4px;">
        Đã áp dụng chính sách ưu đãi học phí đợt tuyển sinh
      </div>
    </td>
  </tr>
</table>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 20px; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; color: #002D62; margin-bottom: 6px;">
        QUÉT MÃ VIETQR ĐỂ CHUYỂN KHOẢN NHANH
      </div>
      <div style="font-size: 12px; color: #64748B; margin-bottom: 16px;">
        Mở App Ngân hàng bất kỳ &gt; Chọn Quét QR để thanh toán chính xác 100%
      </div>
      <table border="0" cellpadding="0" cellspacing="0" role="presentation" align="center">
        <tr>
          <td style="background: #ffffff; padding: 12px; border-radius: 12px; border: 2px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <img src="{{qrImageUrl}}" alt="VietQR" width="220" style="display: block; border-radius: 8px; margin: 0 auto;" />
          </td>
        </tr>
      </table>
      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed #CBD5E1; font-size: 12px; color: #475569; line-height: 1.8; text-align: left;">
        &bull; <strong>Tài khoản thụ hưởng:</strong> {{bankAccount}}<br/>
        &bull; <strong>Nội dung chuyển khoản (Bắt buộc):</strong> <strong style="color: #D97706; font-family: monospace; font-size: 14px;">{{orderCode}}</strong><br/>
        &bull; <em>Hệ thống tự động kích hoạt tài khoản học trong vòng 60 giây sau khi nhận giao dịch.</em>
      </div>
    </td>
  </tr>
</table>
""",
    },

    "payment_receipt": {
        "id": "tmpl-receipt",
        "code": "payment_receipt",
        "name": "Biên Nhận Học Phí & Xác Nhận Vào Khóa Học",
        "category": "payment",
        "subject": "[Biên Nhận] TWings Academy xác nhận đã nhận học phí: {{orderCode}} - {{customerName}}",
        "description": "Gửi ngay sau khi hệ thống khớp lệnh thanh toán thành công qua VietQR hoặc thanh toán thủ công.",
        "variables": [
            "customerName", "courseTitle", "amount", "orderCode", "startDate",
            "batchCohort", "location", "pic", "total_paid", "receivable", "remaining", "receipt_number", "receipt_url"
        ],
        "isDefault": True,
        "title": "BIÊN NHẬN HỌC PHÍ ĐIỆN TỬ",
        "subtitle": "Xác nhận giao dịch học phí hợp lệ trên hệ thống TWings Academy",
        "content": """
<p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;">
  Kính gửi Bạn <strong>{{customerName}}</strong>,
</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
  Phòng Tài chính Kế toán TWings Academy trân trọng thông báo đã nhận thành công khoản học phí cho khóa đào tạo <strong>{{courseTitle}}</strong>.
</p>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 18px 20px;">
      <table class="data-table" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 140px;">Mã biên nhận:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #16A34A;">{{receipt_number}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Mã hồ sơ / đơn:</td>
          <td style="padding: 6px 0; font-size: 13px; font-family: monospace; font-weight: 700; color: #0F172A;">{{orderCode}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Số tiền đã thanh toán:</td>
          <td style="padding: 6px 0; font-size: 16px; font-weight: 800; color: #15803D;">{{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Trạng thái hồ sơ:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #16A34A;">ĐÃ HOÀN TẤT HỌC PHÍ &amp; GIỮ CHỖ CHÍNH THỨC</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<p style="margin: 20px 0 0 0; font-size: 13px; color: #475569; line-height: 1.6;">
  Biên nhận này có giá trị xác nhận quyền lợi học tập của học viên. Cần hóa đơn VAT, vui lòng gửi yêu cầu tại Cổng học viên hoặc phản hồi thư này.
</p>
""",
    },

    "bank_tour_invite": {
        "id": "tmpl-banktour",
        "code": "bank_tour_invite",
        "name": "Thư Mời Trải Nghiệm Thực Tế Bank Tour MSB",
        "category": "scheduling",
        "subject": "[Thư Mời] Tham Gia Bank Tour Trực Tiếp Tại Hội Sở Ngân Hàng MSB: {{customerName}}",
        "description": "Gửi mời học viên tham gia chương trình thực tế Bank Tour tại Hội sở MSB.",
        "variables": ["customerName", "courseTitle", "batchCohort", "startDate", "location", "pic", "orderCode"],
        "isDefault": True,
        "title": "THƯ MỜI TRẢI NGHIỆM BANK TOUR",
        "subtitle": "Chương trình tham quan & kiến tập thực tế tại Hội sở Ngân hàng TMCP Hàng Hải Việt Nam",
        "content": """
<p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;">
  Chào Bạn <strong>{{customerName}}</strong>,
</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
  Ban Đào tạo TWings trân trọng kính mời Bạn tham dự chương trình <strong>Bank Tour - Trải nghiệm thực tế môi trường làm việc Ngân hàng chuẩn Quốc tế</strong> tại Hội sở MSB (ROX Tower, Hà Nội).
</p>

<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #D97706; border-radius: 12px; margin: 20px 0;">
  <tr>
    <td style="padding: 18px 20px;">
      <table class="data-table" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B; width: 140px;">Thời gian tổ chức:</td>
          <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: #D97706;">08h30 - 11h30, Thứ Bảy ({{startDate}})</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Địa điểm tập trung:</td>
          <td style="padding: 6px 0; font-size: 13px; font-weight: 700; color: #0F172A;">Sảnh Tầng 1, Tòa nhà ROX Tower, 54A Nguyễn Chí Thanh, Hà Nội</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; font-size: 13px; color: #64748B;">Trang phục quy định:</td>
          <td style="padding: 6px 0; font-size: 13px; color: #334155;">Áo sơ mi trắng, quần/chân váy tối màu, đi giày lịch sự</td>
        </tr>
      </table>
    </td>
  </tr>
</table>
""",
    },

    "class_rollover_notice": {
        "id": "tmpl-rollover",
        "code": "class_rollover_notice",
        "name": "Thông Báo Chuyển Lịch Học / Bảo Lưu Khóa Đào Tạo",
        "category": "scheduling",
        "subject": "[Thông Báo] Cập Nhật Lịch Học & Điều Chuyển Lớp: {{customerName}} - Khóa {{courseTitle}}",
        "description": "Gửi cho học viên khi có sự thay đổi lịch học, chuyển đợt đào tạo hoặc học viên yêu cầu bảo lưu.",
        "variables": ["customerName", "courseTitle", "batchCohort", "startDate", "location", "pic", "orderCode"],
        "isDefault": True,
        "title": "THÔNG BÁO ĐIỀU CHUYỂN LỊCH ĐÀO TẠO",
        "subtitle": "Xác nhận cập nhật thông tin học phần & bảo lưu quyền lợi đào tạo",
        "content": """
<p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;">
  Chào Bạn <strong>{{customerName}}</strong>,
</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
  Ban Đào tạo TWings Academy xác nhận đã cập nhật lịch học mới cho hồ sơ của Bạn tại khóa <strong>{{courseTitle}}</strong>. Toàn bộ lộ trình và học phí đã đóng được bảo lưu 100%.
</p>
""",
    },

    "placement_offer": {
        "id": "tmpl-placement",
        "code": "placement_offer",
        "name": "Thư Mời Nhận Việc / Phỏng Vấn Tuyển Dụng Ngân Hàng",
        "category": "admission",
        "subject": "[Chúc Mừng] Lời Mời Nhận Việc & Phỏng Vấn Tiếp Nhận Tại Đối Tác Ngân Hàng: {{customerName}}",
        "description": "Gửi cho học viên tốt nghiệp đủ điều kiện tiếp nhận phỏng vấn hoặc tuyển thẳng vào ngân hàng đối tác.",
        "variables": ["customerName", "courseTitle", "pic", "orderCode", "employer", "role"],
        "isDefault": True,
        "title": "THƯ MỜI TIẾP NHẬN VIỆC LÀM",
        "subtitle": "Chương trình liên kết cung ứng nhân sự chất lượng cao ngành Ngân hàng",
        "content": """
<p style="margin: 0 0 16px 0; font-size: 15px; color: #0F172A; line-height: 1.6;">
  Chúc mừng Bạn <strong>{{customerName}}</strong>!
</p>
<p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 1.6;">
  Hội đồng Đánh giá Năng lực Học viện TWings trân trọng thông báo kết quả đào tạo xuất sắc của Bạn đã được đối tác ngân hàng tiếp nhận và đánh giá cao.
</p>
""",
    },

    # ---------------------------------------------------- 2. Automated LMS Training Emails
    "lms_access": {
        "id": "tmpl-lms-access",
        "code": "lms_access",
        "name": "Cấp Quyền Truy Cập LMS & Hướng Dẫn Vào Học",
        "category": "lms",
        "subject": "Khóa học của bạn đã sẵn sàng – vào học ngay | TWings Academy",
        "description": "Gửi tự động khi học viên được mở khóa học trên TWings LMS.",
        "variables": ["customer_name", "course", "intake", "url", "customer_email", "intake_block", "account_url", "order_code"],
        "isDefault": True,
        "title": "KHÓA HỌC ĐÃ SẴN SÀNG",
        "subtitle": "Hướng dẫn đăng nhập Cổng học trực tuyến TWings LMS",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Khóa học <strong>{{course}}{{intake}}</strong> của bạn đã được mở trên hệ thống học trực tuyến TWings LMS.</p>
<p><strong>Cách vào học:</strong></p>
<ol style="margin: 12px 0; padding-left: 20px; line-height: 1.8;">
  <li>Mở <a href="{{url}}" style="color: #0056D2; font-weight: 700;">{{url}}</a></li>
  <li>Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>
  <li>Nhập email <strong>{{customer_email}}</strong> và mã 6 chữ số được gửi tới email này</li>
</ol>
<p>Bạn cũng có thể đăng nhập bằng mật khẩu trong email “Tài khoản thành viên mới” của hệ thống học.</p>
{{intake_block}}
<p><strong>Hoàn thiện hồ sơ nhập học</strong> (CCCD, học vấn, CV) và xem lịch học phí tại
<a href="{{account_url}}" style="color: #0056D2; font-weight: 700;">Học phí &amp; hồ sơ</a> trong cổng học viên.</p>
<p>Mã đơn hàng: <strong>{{order_code}}</strong>. Cần hỗ trợ, vui lòng trả lời email này.</p>
""",
    },

    "corporate_lms_access": {
        "id": "tmpl-corp-lms-access",
        "code": "corporate_lms_access",
        "name": "Mở Lớp Đào Tạo Doanh Nghiệp (B2B LMS)",
        "category": "corporate",
        "subject": "Lớp {{course_title}} đã mở – hướng dẫn vào học",
        "description": "Gửi cho học viên thuộc chương trình đào tạo nội bộ doanh nghiệp của TNTalent.",
        "variables": ["learner_name", "course_title", "cohort_name", "url", "email", "intake_block", "brand_name"],
        "isDefault": True,
        "title": "LỚP ĐÀO TẠO NỘI BỘ DOANH NGHIỆP",
        "subtitle": "Giải pháp Phát triển Nguồn Nhân lực Doanh nghiệp TNTalent",
        "content": """
<p>Chào {{learner_name}},</p>
<p>Lớp <strong>{{course_title}} – {{cohort_name}}</strong> mà đơn vị của bạn đăng ký đã được mở trên hệ thống học trực tuyến.</p>
<p><strong>Cách vào học:</strong></p>
<ol style="margin: 12px 0; padding-left: 20px; line-height: 1.8;">
  <li>Mở <a href="{{url}}" style="color: #C8102E; font-weight: 700;">{{url}}</a></li>
  <li>Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>
  <li>Nhập email <strong>{{email}}</strong> và mã 6 chữ số được gửi tới email này</li>
</ol>
{{intake_block}}
<p>Điểm danh tại lớp: quét mã QR do giảng viên chiếu ở mỗi buổi học (cần đăng nhập như trên).</p>
<p>Cần hỗ trợ, vui lòng trả lời email này.</p>
""",
    },

    "lms_certificate": {
        "id": "tmpl-lms-certificate",
        "code": "lms_certificate",
        "name": "Cấp Chứng Chỉ Tốt Nghiệp Khóa Học",
        "category": "lms",
        "subject": "Chúc mừng bạn hoàn thành khóa học – chứng chỉ {{certificate_code}} | TWings Academy",
        "description": "Gửi cho học viên khi hoàn thành khóa học và được cấp chứng chỉ điện tử.",
        "variables": ["learner_name", "course_title", "cohort_name", "certificate_code", "url"],
        "isDefault": True,
        "title": "CHỨNG NHẬN TỐT NGHIỆP",
        "subtitle": "Xác thực năng lực thực chiến ngành Tài chính - Ngân hàng",
        "content": """
<p>Chúc mừng <strong>{{learner_name}}</strong>!</p>
<p>Bạn đã hoàn thành xuất sắc khóa học <strong>{{course_title}}</strong> {{cohort_name}}.</p>
<p>Chứng chỉ tốt nghiệp điện tử của bạn: Mã số <strong>{{certificate_code}}</strong>.<br>
Trang xác minh công khai (gửi cho nhà tuyển dụng): <a href="{{url}}" style="color: #0056D2; font-weight: 700;">{{url}}</a></p>
<p>Bản chứng chỉ để in / lưu file PDF: <a href="{{url}}in/" style="color: #0056D2; font-weight: 700;">Xem và tải chứng chỉ</a></p>
""",
    },

    # ---------------------------------------------------- 3. Installment & Checkout Reminders
    "installment_reminder": {
        "id": "tmpl-installment-reminder",
        "code": "installment_reminder",
        "name": "Nhắc Hạn Đóng Học Phí Kỳ Trả Góp",
        "category": "payment",
        "subject": "Nhắc học phí kỳ {{sequence}}/{{total_installments}} – {{order_code}} | TWings Academy",
        "description": "Gửi nhắc nhở học viên thanh toán kỳ trả góp kèm mã VietQR tự động.",
        "variables": [
            "customer_name", "sequence", "total_installments", "course_title", "due_date",
            "amount", "bank_name", "account_number", "account_name", "transfer_content", "qr_image_url", "account_url"
        ],
        "isDefault": True,
        "title": "NHẮC HẠN ĐÓNG HỌC PHÍ",
        "subtitle": "Kỳ học phí trả góp theo thỏa thuận đào tạo",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Kỳ học phí {{sequence}}/{{total_installments}} của khóa <strong>{{course_title}}</strong> đến hạn vào ngày <strong>{{due_date}}</strong>.</p>
<p>Số tiền cần chuyển: <strong>{{amount}}</strong><br>
Ngân hàng: {{bank_name}}<br>
Số tài khoản: <strong>{{account_number}}</strong> – {{account_name}}<br>
Nội dung chuyển khoản: <strong style="color: #0056D2; font-family: monospace;">{{transfer_content}}</strong></p>
<p><img src="{{qr_image_url}}" alt="VietQR" width="220" style="border-radius: 8px; border: 1px solid #E2E8F0;" /></p>
<p>Hệ thống tự động xác nhận sau khi nhận tiền. Xem lịch trả góp tại <a href="{{account_url}}" style="color: #0056D2; font-weight: 700;">{{account_url}}</a>.</p>
""",
    },

    "checkout_hold_reminder": {
        "id": "tmpl-checkout-hold",
        "code": "checkout_hold_reminder",
        "name": "Cảnh Báo Hết Hạn Giữ Chỗ Ưu Đãi Học Phí",
        "category": "payment",
        "subject": "Giữ chỗ đến {{hold_until}} – {{order_code}} | TWings Academy",
        "description": "Cảnh báo khi thời gian giữ chỗ ưu đãi học phí sắp hết hiệu lực.",
        "variables": ["customer_name", "course_title", "hold_until", "order_code", "payment_details"],
        "isDefault": True,
        "title": "CẢNH BÁO THỜI HẠN GIỮ CHỖ",
        "subtitle": "Chỗ học ưu đãi sắp hết hạn giữ chỗ",
        "content": """
<p>Chào {{customer_name}},</p>
<p>TWings Academy đang giữ chỗ và học phí ưu đãi của bạn cho khóa <strong>{{course_title}}</strong> đến <strong>{{hold_until}}</strong>.
Sau thời điểm này đơn chưa thanh toán sẽ tự hủy và chỗ được nhường cho học viên khác.</p>
{{payment_details}}
""",
    },

    # ---------------------------------------------------- 4. CRM Learner Journeys
    "journey_abandoned_checkout": {
        "id": "tmpl-journey-abandoned",
        "code": "journey_abandoned_checkout",
        "name": "Hành Trình CRM: Nhắc Hoàn Tất Đơn Đăng Ký (Ngày 1)",
        "category": "crm",
        "subject": "Hoàn tất đăng ký {{course_title}} – mã {{order_code}} | TWings Academy",
        "description": "Gửi tự động sau 1 ngày đăng ký nhưng chưa chuyển khoản học phí.",
        "variables": ["customer_name", "course_title", "order_code", "amount", "bank_name", "account_number", "account_name", "transfer_content", "qr_image_url"],
        "isDefault": True,
        "title": "HOÀN TẤT ĐĂNG KÝ KHÓA HỌC",
        "subtitle": "Chỗ học vẫn đang được ưu tiên giữ cho bạn",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Bạn đã đăng ký <strong>{{course_title}}</strong> nhưng TWings chưa nhận được học phí.
Chỗ học vẫn được giữ cho bạn – chỉ cần chuyển khoản theo thông tin dưới đây, hệ thống tự xác nhận và mở khóa học.</p>
<p>Số tiền: <strong>{{amount}}</strong><br>
Ngân hàng: {{bank_name}}<br>
Số tài khoản: <strong>{{account_number}}</strong> – {{account_name}}<br>
Nội dung chuyển khoản: <strong style="color: #0056D2; font-family: monospace;">{{transfer_content}}</strong></p>
<p><img src="{{qr_image_url}}" alt="VietQR" width="220" style="border-radius: 8px; border: 1px solid #E2E8F0;" /></p>
<p>Cần tư vấn thêm hoặc muốn trả góp? Trả lời email này, TWings sẽ liên hệ bạn ngay.</p>
""",
    },

    "journey_intake_starting": {
        "id": "tmpl-journey-starting",
        "code": "journey_intake_starting",
        "name": "Hành Trình CRM: Nhắc Lớp Sắp Khai Giảng (Trước 3 Ngày)",
        "category": "crm",
        "subject": "Sắp khai giảng {{cohort_name}} – {{course_title}} | TWings Academy",
        "description": "Gửi 3 ngày trước ngày khai giảng lớp học.",
        "variables": ["customer_name", "cohort_name", "course_title", "start_date", "location_info", "customer_email", "lms_url"],
        "isDefault": True,
        "title": "SẮP KHAI GIẢNG LỚP HỌC",
        "subtitle": "Chuẩn bị tham gia buổi học đầu tiên",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Lớp <strong>{{cohort_name}}</strong> của khóa <strong>{{course_title}}</strong> khai giảng ngày <strong>{{start_date}}</strong>.{{location_info}}</p>
<p>Học liệu, lịch học và bài tập có trên <a href="{{lms_url}}" style="color: #0056D2; font-weight: 700;">TWings LMS</a> – đăng nhập bằng nút “Đăng nhập bằng TWings” với email {{customer_email}}.</p>
<p>Hẹn gặp bạn tại lớp học!</p>
""",
    },

    "journey_not_started": {
        "id": "tmpl-journey-not-started",
        "code": "journey_not_started",
        "name": "Hành Trình CRM: Động Viên Bắt Đầu Học (Sau 7 Ngày)",
        "category": "crm",
        "subject": "Bắt đầu khóa {{course_title}} ngay hôm nay | TWings Academy",
        "description": "Gửi sau 7 ngày nếu học viên chưa vào học bài nào.",
        "variables": ["customer_name", "course_title", "lms_url", "account_url"],
        "isDefault": True,
        "title": "BẮT ĐẦU HÀNH TRÌNH HỌC TẬP",
        "subtitle": "Chỉ 20 phút mỗi ngày để chinh phục mục tiêu",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Khóa <strong>{{course_title}}</strong> đã mở cho bạn được một tuần nhưng bạn chưa bắt đầu bài học nào. Chỉ 20 phút mỗi ngày là đủ để theo kịp lộ trình đào tạo thực chiến.</p>
<p><a href="{{lms_url}}" style="color: #0056D2; font-weight: 700;">Vào học ngay trên TWings LMS</a> &bull; Xem tiến độ tại <a href="{{account_url}}" style="color: #0056D2; font-weight: 700;">Học phí &amp; hồ sơ</a></p>
<p>Gặp khó khăn khi đăng nhập hay sắp xếp thời gian? Trả lời email này để chuyên viên hỗ trợ bạn.</p>
""",
    },

    "journey_completed_next": {
        "id": "tmpl-journey-completed",
        "code": "journey_completed_next",
        "name": "Hành Trình CRM: Chúc Mừng & Gợi Ý Lộ Trình Kế Tiếp",
        "category": "crm",
        "subject": "Chúc mừng bạn hoàn thành {{course_title}} | TWings Academy",
        "description": "Gửi sau 2 ngày hoàn thành khóa học để xin feedback và giới thiệu lộ trình nâng cao.",
        "variables": ["customer_name", "course_title", "certificate_block", "account_url", "next_steps_block"],
        "isDefault": True,
        "title": "CHÚC MỪNG TỐT NGHIỆP",
        "subtitle": "Cảm ơn bạn đã đồng hành cùng TWings Academy",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Chúc mừng bạn đã hoàn thành khóa đào tạo <strong>{{course_title}}</strong>!</p>
{{certificate_block}}
<p>Cảm nhận của bạn giúp TWings nâng cao chất lượng đào tạo:
<a href="{{account_url}}" style="color: #0056D2; font-weight: 700;">Viết đánh giá trong cổng học viên</a>.</p>
{{next_steps_block}}
""",
    },

    # ---------------------------------------------------- 5. CRM Appointments
    "appointment_confirmation": {
        "id": "tmpl-appt-confirm",
        "code": "appointment_confirmation",
        "name": "Xác Nhận Lịch Hẹn Tư Vấn Tuyển Sinh",
        "category": "crm",
        "subject": "Xác nhận lịch tư vấn | TWings Academy",
        "description": "Gửi ngay khi đặt lịch hẹn tư vấn định hướng nghề nghiệp ngành Ngân hàng.",
        "variables": ["customer_name", "starts_at", "duration", "channel", "course"],
        "isDefault": True,
        "title": "XÁC NHẬN LỊCH TƯ VẤN",
        "subtitle": "Buổi tư vấn định hướng nghề nghiệp cùng chuyên viên TWings",
        "content": """
<p>Chào {{customer_name}},</p>
<p>TWings Academy xác nhận lịch hẹn tư vấn định hướng cùng bạn:</p>
<ul style="margin: 12px 0; padding-left: 20px; line-height: 1.8;">
  <li>Thời gian: <strong>{{starts_at}}</strong> (Thời lượng: {{duration}} phút)</li>
  <li>Hình thức: <strong>{{channel}}</strong></li>
  <li>Nội dung: Tư vấn định hướng khóa học <strong>{{course}}</strong></li>
</ul>
<p>Cần thay đổi thời gian hẹn, vui lòng phản hồi email này.</p>
""",
    },

    "appointment_reminder": {
        "id": "tmpl-appt-remind",
        "code": "appointment_reminder",
        "name": "Nhắc Lịch Hẹn Tư Vấn (Trước 2 Giờ)",
        "category": "crm",
        "subject": "Nhắc lịch tư vấn hôm nay | TWings Academy",
        "description": "Gửi nhắc nhở trước giờ hẹn tư vấn.",
        "variables": ["customer_name", "starts_at", "duration", "channel", "course"],
        "isDefault": True,
        "title": "NHẮC HẸN TƯ VẤN HÔM NAY",
        "subtitle": "Buổi tư vấn sẽ bắt đầu trong ít giờ tới",
        "content": """
<p>Chào {{customer_name}},</p>
<p>Nhắc bạn lịch tư vấn sắp tới cùng TWings Academy:</p>
<ul style="margin: 12px 0; padding-left: 20px; line-height: 1.8;">
  <li>Thời gian: <strong>{{starts_at}}</strong> (Thời lượng: {{duration}} phút)</li>
  <li>Hình thức: <strong>{{channel}}</strong></li>
  <li>Nội dung: Tư vấn định hướng khóa học <strong>{{course}}</strong></li>
</ul>
<p>Chuyên viên TWings sẽ liên hệ đúng giờ hẹn. Hẹn gặp bạn!</p>
""",
    },

    # ---------------------------------------------------- 6. Auth & Security
    "auth_otp": {
        "id": "tmpl-auth-otp",
        "code": "auth_otp",
        "name": "Mã OTP Xác Thực Đăng Nhập",
        "category": "security",
        "subject": "Mã đăng nhập TWings: {{code}}",
        "description": "Gửi mã OTP xác thực đăng nhập Cổng học viên không cần mật khẩu.",
        "variables": ["code", "email"],
        "isDefault": True,
        "title": "MÃ XÁC THỰC ĐĂNG NHẬP",
        "subtitle": "Mã OTP dùng một lần cho Cổng học viên TWings",
        "content": """
<p>Xin chào,</p>
<p>Mã xác thực đăng nhập Cổng học viên TWings Academy của bạn là:</p>
<div style="margin: 20px 0; text-align: center;">
  <span style="display: inline-block; font-family: monospace; font-size: 28px; font-weight: 800; letter-spacing: 6px; color: #0056D2; background: #EFF6FF; padding: 12px 24px; border-radius: 10px; border: 1px solid #BFDBFE;">
    {{code}}
  </span>
</div>
<p style="font-size: 13px; color: #64748B;">Mã có hiệu lực trong vòng 10 phút. Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này để đảm bảo an toàn.</p>
""",
    },

    "staff_password_reset": {
        "id": "tmpl-staff-pwd-reset",
        "code": "staff_password_reset",
        "name": "Đặt Lại Mật Khẩu Tài Khoản Quản Trị",
        "category": "security",
        "subject": "Đặt lại mật khẩu quản trị | TWings Academy",
        "description": "Gửi liên kết đặt lại mật khẩu cho tài khoản quản trị CMS.",
        "variables": ["name", "email", "reset_link"],
        "isDefault": True,
        "title": "ĐẶT LẠI MẬT KHẨU QUẢN TRỊ",
        "subtitle": "Yêu cầu khôi phục mật khẩu tài khoản nhân viên",
        "content": """
<p>Chào {{name}},</p>
<p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản quản trị TWings (<strong>{{email}}</strong>).</p>
<p style="margin: 20px 0;">
  <a href="{{reset_link}}" style="background: #0056D2; color: #ffffff; padding: 12px 24px; font-weight: 700; text-decoration: none; border-radius: 8px; display: inline-block;">
    Đặt Mật Khẩu Mới &rarr;
  </a>
</p>
<p style="font-size: 13px; color: #64748B;">Liên kết có hiệu lực trong 1 giờ. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email và liên hệ quản trị viên.</p>
""",
    },
}


def run():
    print(f"Standardizing {len(TEMPLATES)} templates...")

    # 1. Update SQLite database
    created_count = updated_count = 0
    for code, data in TEMPLATES.items():
        body_html = clean_body(data["title"], data["subtitle"], data["content"])
        obj, created = EmailTemplate.objects.update_or_create(
            code=code,
            defaults={
                "name": data["name"],
                "category": data["category"],
                "subject": data["subject"],
                "description": data["description"],
                "variables": data["variables"],
                "is_default": data["isDefault"],
                "body": body_html,
            },
        )
        if created:
            created_count += 1
        else:
            updated_count += 1
    print(f"Database updated: {created_count} created, {updated_count} updated.")

    # 2. Update backend/fixtures/seed_content.json
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        fixture_data = json.load(f)

    fixture_templates = []
    for code, data in TEMPLATES.items():
        body_html = clean_body(data["title"], data["subtitle"], data["content"])
        fixture_templates.append({
            "id": data["id"],
            "code": code,
            "name": data["name"],
            "category": data["category"],
            "subject": data["subject"],
            "description": data["description"],
            "variables": data["variables"],
            "isDefault": data["isDefault"],
            "updatedAt": "22/10/2026",
            "body": body_html,
        })
    fixture_data["emailTemplates"] = fixture_templates

    with open(FIXTURE_PATH, "w", encoding="utf-8") as f:
        json.dump(fixture_data, f, ensure_ascii=False, indent=1)
    print(f"Saved {len(fixture_templates)} templates to fixtures/seed_content.json.")


if __name__ == "__main__":
    run()
