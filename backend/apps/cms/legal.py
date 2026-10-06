# ruff: noqa: E501  (legal prose)
"""
Legal pages of the public site: /chinh-sach-bao-mat (privacy) and /dieu-khoan (terms).

Staff can replace the text in /app → Cài đặt SEO website (site_seo: privacy_policy_html / terms_html);
otherwise the defaults below are shown. The defaults describe what the system actually does (data
collected, processors, retention, rights) and must be reviewed by the company's legal adviser.
"""

from django.conf import settings
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import SiteConfig
from apps.core.sanitize import sanitize_html

COMPANY = "Công ty Cổ phần Quản trị Nguồn Nhân lực TNTalent"
UPDATED = "06/10/2026"


def _contact(seo: dict) -> str:
    parts = [
        f"<li>Đơn vị: {COMPANY} (vận hành thương hiệu TWings Academy)</li>",
        f"<li>Địa chỉ: {seo.get('address') or 'Tòa ROX Tower, 54A Nguyễn Chí Thanh, Láng, Hà Nội'}</li>",
        f"<li>Email: {seo.get('email') or 'hello@twings.edu.vn'}</li>",
    ]
    if seo.get("hotline"):
        parts.append(f"<li>Điện thoại: {seo['hotline']}</li>")
    return "<ul>" + "".join(parts) + "</ul>"


def default_privacy(seo: dict) -> str:
    site = settings.PUBLIC_SITE_URL
    return f"""
<p>Chính sách này giải thích TWings Academy thu thập, sử dụng, chia sẻ và bảo vệ dữ liệu cá nhân của bạn như
thế nào khi bạn dùng website {site}, hệ thống học trực tuyến TWings LMS và các dịch vụ liên quan, theo Luật Bảo vệ
dữ liệu cá nhân năm 2025 và các văn bản hướng dẫn.</p>

<h2>1. Bên kiểm soát và xử lý dữ liệu</h2>
{_contact(seo)}

<h2>2. Dữ liệu chúng tôi thu thập</h2>
<ul>
<li><strong>Khi đăng ký tư vấn / ghi danh:</strong> họ tên, email, số điện thoại, khu vực; tùy chọn: ngày sinh,
trình độ, chuyên ngành, trường, nhu cầu học, người giới thiệu.</li>
<li><strong>Khi nhập học:</strong> thông tin phục vụ hồ sơ học viên và chứng chỉ (có thể gồm số CCCD, địa chỉ);
các trường nhạy cảm này được mã hóa khi lưu trữ.</li>
<li><strong>Khi thanh toán:</strong> mã đơn, số tiền, thời điểm và mã giao dịch chuyển khoản do ngân hàng thông
báo. Chúng tôi không thu thập hay lưu số thẻ, mật khẩu ngân hàng.</li>
<li><strong>Khi học trên TWings LMS:</strong> tài khoản học, tiến độ, điểm, bài nộp, thời gian truy cập.</li>
<li><strong>Kỹ thuật:</strong> cookie phiên đăng nhập và chống giả mạo yêu cầu (bắt buộc để website hoạt động),
địa chỉ IP trong nhật ký bảo mật. Website không dùng cookie quảng cáo.</li>
</ul>

<h2>3. Mục đích xử lý</h2>
<ul>
<li>Tư vấn, xếp lớp, ghi danh và cấp tài khoản học; gửi thông tin khai giảng, lịch học, nhắc học phí.</li>
<li>Xác nhận thanh toán, trả góp, hoàn tiền; xuất chứng từ.</li>
<li>Theo dõi tiến độ, cấp và xác minh chứng chỉ (trang xác minh chỉ hiển thị họ tên, khóa học, ngày cấp).</li>
<li>Gửi email chăm sóc học viên liên quan đến khóa học bạn đã đăng ký (có thể từ chối bất kỳ lúc nào).</li>
<li>Bảo đảm an toàn hệ thống, phát hiện gian lận, thực hiện nghĩa vụ pháp lý.</li>
</ul>

<h2>4. Chia sẻ dữ liệu</h2>
<p>Chúng tôi không bán dữ liệu cá nhân. Dữ liệu chỉ được chia sẻ với:</p>
<ul>
<li>Nhà cung cấp dịch vụ xử lý thay chúng tôi theo hợp đồng: máy chủ đặt tại Việt Nam; dịch vụ gửi email
(Resend), lưu trữ tệp (Cloudflare R2) và phân giải tên miền có thể đặt máy chủ ở nước ngoài – việc chuyển dữ
liệu ra nước ngoài được thực hiện theo quy định và có biện pháp bảo vệ tương ứng.</li>
<li>Ngân hàng / đơn vị trung gian thông báo giao dịch để đối soát học phí.</li>
<li>Đối tác tuyển dụng, chỉ khi bạn đồng ý riêng cho từng trường hợp.</li>
<li>Cơ quan nhà nước có thẩm quyền theo yêu cầu hợp pháp.</li>
</ul>

<h2>5. Thời gian lưu trữ</h2>
<p>Hồ sơ tư vấn chưa nhập học: tối đa 24 tháng kể từ lần liên hệ cuối. Hồ sơ học viên, thanh toán và chứng chỉ:
theo thời hạn lưu trữ chứng từ kế toán và hồ sơ đào tạo do pháp luật quy định. Hết thời hạn, dữ liệu được xóa
hoặc ẩn danh.</p>

<h2>6. Quyền của bạn</h2>
<p>Bạn có quyền được biết, đồng ý hoặc rút lại sự đồng ý, truy cập, chỉnh sửa, xóa, hạn chế xử lý, yêu cầu cung
cấp dữ liệu, phản đối xử lý, khiếu nại và yêu cầu bồi thường theo quy định. Gửi yêu cầu tới email ở mục 1; chúng
tôi phản hồi trong thời hạn luật định. Việc rút lại đồng ý không ảnh hưởng tới các xử lý đã thực hiện trước đó
và có thể khiến chúng tôi không tiếp tục cung cấp được dịch vụ đào tạo.</p>

<h2>7. Bảo vệ dữ liệu</h2>
<p>Kết nối mã hóa HTTPS; mã hóa các trường nhạy cảm khi lưu; phân quyền truy cập theo vai trò cho nhân viên
và ghi nhật ký thao tác; sao lưu mã hóa định kỳ. Khi xảy ra sự cố vi phạm dữ liệu, chúng tôi thông báo theo quy
định.</p>

<h2>8. Thay đổi chính sách</h2>
<p>Bản cập nhật được đăng tại trang này kèm ngày hiệu lực. Cập nhật lần cuối: {UPDATED}.</p>
"""


def default_terms(seo: dict) -> str:
    return f"""
<p>Điều khoản này áp dụng khi bạn đăng ký và sử dụng dịch vụ đào tạo của TWings Academy ({COMPANY}).</p>

<h2>1. Đăng ký và tài khoản</h2>
<p>Bạn cung cấp thông tin chính xác khi đăng ký. Tài khoản học (TWings LMS) và mã đăng nhập gửi qua email là
của riêng bạn, không chia sẻ cho người khác.</p>

<h2>2. Học phí và thanh toán</h2>
<ul>
<li>Học phí hiển thị trên website là giá đã bao gồm ưu đãi đang áp dụng (nếu có); số tiền và nội dung chuyển
khoản trên mã VietQR do hệ thống tạo cho từng đơn.</li>
<li>Khóa học / chương trình có trả góp: kỳ đầu mở quyền học; các kỳ sau thanh toán đúng hạn theo lịch hiển thị
trong Tài khoản học viên. Quá hạn, TWings liên hệ để hỗ trợ và có thể tạm dừng quyền học tới khi hoàn tất.</li>
</ul>

<h2>3. Hoàn học phí</h2>
<p>Yêu cầu hoàn học phí gửi qua mục “Yêu cầu hoàn tiền” trong Tài khoản học viên hoặc email. Mức hoàn theo chính
sách công bố của từng khóa học / đợt khai giảng tại thời điểm đăng ký. Khi hoàn toàn bộ học phí, quyền học trên
LMS kết thúc và chứng chỉ đã cấp (nếu có) bị thu hồi.</p>

<h2>4. Học tập và chứng chỉ</h2>
<p>Chứng chỉ hoàn thành được cấp khi bạn đạt điều kiện hoàn thành do khóa học đặt ra trên TWings LMS và có thể
được xác minh công khai bằng mã chứng chỉ. Mọi cam kết về thực tập, tuyển dụng (nếu có) được nêu cụ thể trong
thông tin của từng khóa học và theo điều kiện riêng.</p>

<h2>5. Quyền sở hữu trí tuệ</h2>
<p>Học liệu, video, bài kiểm tra thuộc quyền của TWings Academy hoặc đối tác; chỉ dùng cho mục đích học tập cá
nhân, không sao chép, phát tán.</p>

<h2>6. Dữ liệu cá nhân</h2>
<p>Được xử lý theo <a href="/chinh-sach-bao-mat">Chính sách bảo mật</a>.</p>

<h2>7. Giải quyết tranh chấp</h2>
<p>Hai bên ưu tiên thương lượng; không thành thì giải quyết theo pháp luật Việt Nam.</p>

<h2>8. Liên hệ</h2>
{_contact(seo)}
<p>Cập nhật lần cuối: {UPDATED}.</p>
"""


PAGES = {
    "privacy": ("Chính sách bảo mật", "privacy_policy_html", default_privacy),
    "terms": ("Điều khoản sử dụng dịch vụ", "terms_html", default_terms),
}


def legal_page(key: str) -> dict:
    title, field, default = PAGES[key]
    doc = SiteConfig.objects.filter(key=SiteConfig.KEY_SITE_SEO).first()
    seo = doc.data if doc and isinstance(doc.data, dict) else {}
    custom = str(seo.get(field) or "").strip()
    return {"title": title, "html": sanitize_html(custom) if custom else default(seo), "custom": bool(custom)}


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([])
def legal_view(request, key: str):
    if key not in PAGES:
        return Response({"detail": "Không tìm thấy trang."}, status=404)
    return Response(legal_page(key))
