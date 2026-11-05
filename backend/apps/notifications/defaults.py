# ruff: noqa: E501  (e-mail HTML)
"""
The standard e-mail templates: the one source of their default content.

- render_template() falls back to these when a template is not in the database;
- migration 0008 and `seed_content` write them into the database (EmailTemplate), where staff can edit
  them in /app/content/email ("Khôi phục mẫu chuẩn" puts this version back).

Conventions (keep them when adding a template):
- subject: "<what it is> | {{site_name}}"; body: heading, "Chào {{customer_name}},", short paragraphs,
  data in an info table, one button for the main action; no signature (the frame adds it) and no
  hard-coded phone number, address or domain: use {{hotline}}, {{support_email}}, {{learn_url}}...
- variables are snake_case; a block built by code ({{payment_details}}, {{intake_block}}...) is HTML.
"""

from .components import CORPORATE, button, code_box, heading, info_table, note

HELP = '<p>Cần hỗ trợ? Gọi hotline <a href="tel:{{hotline_tel}}" style="font-weight:700;text-decoration:none;">{{hotline}}</a> hoặc trả lời email này.</p>'

AUTO = "Tự động"

CORRECTION = note("Thư này đính chính thư gửi trước đó; vui lòng dùng thông tin trong thư này.", "warning")

# Where an appointment takes place, by channel ({{location}}: meeting link or address entered by staff).
WHERE = (
    "{{#if is_call}}TWings sẽ gọi cho bạn qua số điện thoại đã đăng ký.{{/if}}"
    "{{#if is_zalo}}TWings sẽ liên hệ qua Zalo theo số điện thoại đã đăng ký.{{/if}}"
    "{{#if is_online}}{{#if location}}Họp trực tuyến: {{location}}{{else}}Đường dẫn họp trực tuyến sẽ được gửi trước giờ hẹn.{{/if}}{{/if}}"
    "{{#if is_office}}Địa điểm: {{#if location}}{{location}}{{else}}Văn phòng {{site_name}}{{/if}}{{/if}}"
)
MANUAL = "Gửi thủ công từ hồ sơ học viên (CRM)"


def _t(code, name, category, subject, body, variables, trigger, brand="twings"):
    return {
        "code": code,
        "name": name,
        "category": category,
        "subject": subject,
        "body": body.strip(),
        "variables": variables,
        "description": trigger,
        "brand": brand,
    }


TEMPLATES = [
    # ------------------------------------------------------------------ admissions
    _t(
        "consultation_received",
        "Xác nhận đăng ký tư vấn",
        "admission",
        "Đã nhận đăng ký tư vấn khóa {{course_title}} | {{site_name}}",
        heading(
            "Cảm ơn bạn đã đăng ký tư vấn", "Chuyên viên tuyển sinh sẽ liên hệ với bạn trong giờ làm việc."
        )
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy đã nhận yêu cầu tư vấn của bạn về khóa học <strong>{{course_title}}</strong>.</p>
<p>Chuyên viên tuyển sinh sẽ gọi cho bạn qua số <strong>{{customer_phone}}</strong> để giới thiệu lộ trình học, lịch khai giảng, học phí và các hình thức hỗ trợ học phí phù hợp.</p>
"""
        + note(
            'Cần trao đổi ngay? Gọi hotline <a href="tel:{{hotline_tel}}" style="font-weight:700;text-decoration:none;">{{hotline}}</a> hoặc trả lời email này.'
        ),
        ["customer_name", "course_title", "customer_phone"],
        f"{AUTO}: ngay khi khách gửi form đăng ký tư vấn trên website.",
    ),
    _t(
        "admission_welcome",
        "Xác nhận nhập học",
        "admission",
        "Xác nhận nhập học khóa {{course_title}} | {{site_name}}",
        heading("Chào mừng bạn đến với TWings Academy", "Xác nhận nhập học khóa {{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy chúc mừng bạn đã hoàn tất thủ tục đăng ký và chính thức trở thành học viên khóa <strong>{{course_title}}</strong>.</p>
"""
        + info_table(
            [
                ("Khóa học", "{{course_title}}"),
                ("Lớp", "{{batch_cohort}}"),
                ("Ngày khai giảng", "{{start_date}}"),
                ("Giảng viên", "{{instructor_name}}"),
                ("Địa điểm", "{{location}}"),
                ("Mã hồ sơ", "{{order_code}}"),
            ]
        )
        + """
<p>Thông tin đăng nhập hệ thống học trực tuyến <strong>TWings LMS</strong> được gửi trong một email riêng khi khóa học được mở. Trong lúc chờ, bạn có thể hoàn thiện hồ sơ nhập học (CCCD, học vấn, CV) tại cổng học viên.</p>
"""
        + button("{{account_url}}", "Hoàn thiện hồ sơ nhập học")
        + "<p>Chuyên viên phụ trách hồ sơ của bạn: <strong>{{pic}}</strong>.</p>"
        + HELP,
        [
            "customer_name",
            "course_title",
            "batch_cohort",
            "start_date",
            "instructor_name",
            "location",
            "order_code",
            "pic",
        ],
        MANUAL + ".",
    ),
    # ------------------------------------------------------------------ payment
    _t(
        "checkout_received",
        "Thông tin chuyển khoản sau khi đăng ký học",
        "payment",
        "Thông tin chuyển khoản đơn {{order_code}} – {{course_title}} | {{site_name}}",
        heading("Đăng ký của bạn đã được ghi nhận", "Hoàn tất chuyển khoản để giữ chỗ và bắt đầu học.")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy đã nhận đăng ký khóa học <strong>{{course_title}}</strong>{{#if cohort_name}} – lớp <strong>{{cohort_name}}</strong>{{/if}}. Chỗ học và mức học phí hiện tại được giữ cho bạn đến <strong>{{hold_until}}</strong>.</p>
{{#if installment_count}}<p>Bạn chọn trả góp <strong>{{installment_count}} kỳ</strong>: chuyển khoản kỳ đầu theo thông tin dưới đây để vào học ngay.</p>{{/if}}
{{payment_details}}
<p>Hệ thống tự động xác nhận khi nhận được tiền và gửi email mở khóa học cho bạn. Theo dõi đơn tại <a href="{{account_url}}">Học phí &amp; hồ sơ</a>.</p>
"""
        + HELP,
        [
            "customer_name",
            "course_title",
            "order_code",
            "cohort_name",
            "hold_until",
            "installment_count",
            "payment_details",
        ],
        f"{AUTO}: ngay khi khách đặt mua khóa học có phí trên website.",
    ),
    _t(
        "checkout_hold_reminder",
        "Nhắc thanh toán trước khi hết hạn giữ chỗ",
        "payment",
        "Đơn {{order_code}} được giữ chỗ đến {{hold_until}} | {{site_name}}",
        heading("Chỗ học của bạn sắp hết thời hạn giữ", "Đơn {{order_code}} – {{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy đang giữ chỗ và mức học phí hiện tại cho bạn tại khóa <strong>{{course_title}}</strong> đến <strong>{{hold_until}}</strong>. Sau thời điểm này, đơn chưa thanh toán sẽ tự động hủy để nhường chỗ cho học viên khác.</p>
{{payment_details}}
<p>Nếu bạn đã chuyển khoản, bạn không cần làm gì thêm: hệ thống sẽ tự xác nhận và gửi email mở khóa học.</p>
"""
        + HELP,
        ["customer_name", "course_title", "hold_until", "order_code", "payment_details"],
        f"{AUTO}: một lần, khi đơn chưa thanh toán sắp hết thời gian giữ chỗ.",
    ),
    _t(
        "installment_reminder",
        "Nhắc học phí kỳ trả góp",
        "payment",
        "{{#if overdue}}Quá hạn{{else}}Nhắc{{/if}} học phí kỳ {{sequence}}/{{total_installments}} – đơn {{order_code}} | {{site_name}}",
        heading("Nhắc học phí kỳ {{sequence}}/{{total_installments}}", "Khóa {{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Kỳ học phí {{sequence}}/{{total_installments}} của khóa <strong>{{course_title}}</strong> {{#if overdue}}đã quá hạn từ{{else}}đến hạn vào{{/if}} ngày <strong>{{due_date}}</strong>. Thông tin chuyển khoản:</p>
{{payment_details}}
<p>Hệ thống tự động xác nhận khi nhận được tiền. Xem lịch trả góp và các kỳ đã đóng tại <a href="{{account_url}}">Học phí &amp; hồ sơ</a>.</p>
"""
        + HELP,
        [
            "customer_name",
            "sequence",
            "total_installments",
            "course_title",
            "order_code",
            "due_date",
            "overdue",
            "amount",
            "payment_details",
        ],
        f"{AUTO}: trước và sau ngày đến hạn của mỗi kỳ trả góp chưa đóng.",
    ),
    _t(
        "payment_receipt",
        "Biên nhận học phí",
        "payment",
        "Biên nhận học phí {{receipt_number}} – đơn {{order_code}} | {{site_name}}",
        heading("TWings Academy đã nhận học phí của bạn", "Biên nhận {{receipt_number}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Cảm ơn bạn đã thanh toán học phí khóa <strong>{{course_title}}</strong>. Thông tin khoản thanh toán:</p>
"""
        + info_table(
            [
                ("Mã biên nhận", "{{receipt_number}}"),
                ("Mã đơn", "{{order_code}}"),
                ("Số tiền đã nhận", "{{amount}}"),
                ("Tổng đã đóng", "{{total_paid}} / {{receivable}}"),
                (
                    "Tình trạng học phí",
                    "{{#if remaining}}Còn lại {{remaining}}{{else}}Đã hoàn tất học phí{{/if}}",
                ),
            ]
        )
        + button("{{receipt_url}}", "Xem và tải biên nhận")
        + """
<p>Cần hóa đơn giá trị gia tăng (VAT)? Gửi yêu cầu tại <a href="{{account_url}}">Học phí &amp; hồ sơ</a> hoặc trả lời email này.</p>
""",
        [
            "customer_name",
            "course_title",
            "amount",
            "order_code",
            "total_paid",
            "receivable",
            "remaining",
            "receipt_number",
            "receipt_url",
        ],
        f"{AUTO}: khi một khoản học phí được ghi nhận (chuyển khoản tự động hoặc kế toán xác nhận).",
    ),
    _t(
        "vietqr_tuition_invoice",
        "Thông tin chuyển khoản học phí (VietQR)",
        "payment",
        "Thông tin học phí đơn {{order_code}} – {{course_title}} | {{site_name}}",
        heading("Thông tin thanh toán học phí", "Đơn {{order_code}} – {{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy gửi bạn thông tin thanh toán học phí khóa <strong>{{course_title}}</strong>:</p>
"""
        + info_table(
            [
                ("Số tiền cần chuyển", "{{amount}}"),
                ("Ngân hàng", "{{bank_name}}"),
                ("Số tài khoản", "{{account_number}}"),
                ("Chủ tài khoản", "{{account_name}}"),
                ("Nội dung chuyển khoản", "{{transfer_content}}"),
            ]
        )
        + """
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0;"><tr><td align="center"><img src="{{qr_image_url}}" alt="Mã VietQR chuyển khoản" width="220" style="display:block;width:220px;max-width:100%;height:auto;border:1px solid #E2E8F0;border-radius:10px;"><div style="font-size:12px;color:#64748B;margin-top:8px;">Mở ứng dụng ngân hàng → Quét mã QR: số tiền và nội dung được điền sẵn.</div></td></tr></table>
<p>Vui lòng ghi đúng nội dung chuyển khoản để hệ thống tự động xác nhận. Sau khi nhận được tiền, TWings Academy sẽ gửi biên nhận qua email.</p>
<p>Chuyên viên phụ trách: <strong>{{pic}}</strong>.</p>
"""
        + HELP,
        [
            "customer_name",
            "course_title",
            "order_code",
            "amount",
            "bank_name",
            "account_number",
            "account_name",
            "transfer_content",
            "qr_image_url",
            "pic",
        ],
        MANUAL + " (thông tin tài khoản và mã QR lấy theo đơn).",
    ),
    # ------------------------------------------------------------------ learning
    _t(
        "lms_access",
        "Mở khóa học và hướng dẫn vào học",
        "lms",
        "Khóa học {{course}} đã sẵn sàng – hướng dẫn vào học | {{site_name}}",
        heading("Khóa học của bạn đã sẵn sàng", "{{course}}{{intake}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Khóa học <strong>{{course}}{{intake}}</strong> đã được mở cho bạn trên hệ thống học trực tuyến TWings LMS.</p>
<p><strong>Cách vào học:</strong></p>
<ol style="margin:0 0 14px 0;padding-left:20px;">
<li style="margin-bottom:4px;">Mở <a href="{{url}}">{{url}}</a></li>
<li style="margin-bottom:4px;">Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>
<li>Nhập email <strong>{{customer_email}}</strong> và mã 6 chữ số được gửi tới hộp thư này</li>
</ol>
"""
        + button("{{url}}", "Vào học ngay")
        + """
{{intake_block}}
<p><strong>Hoàn thiện hồ sơ nhập học</strong> (CCCD, học vấn, CV) và xem lịch học phí tại <a href="{{account_url}}">Học phí &amp; hồ sơ</a>.</p>
<p style="color:#64748B;font-size:13px;">Mã đơn: {{order_code}}</p>
"""
        + HELP,
        [
            "customer_name",
            "course",
            "intake",
            "url",
            "customer_email",
            "intake_block",
            "account_url",
            "order_code",
        ],
        f"{AUTO}: khi học viên được cấp quyền học (đã thanh toán hoặc khóa miễn phí); gửi lại được từ hồ sơ.",
    ),
    _t(
        "lms_certificate",
        "Chúc mừng hoàn thành khóa học và cấp chứng chỉ",
        "lms",
        "Chúc mừng bạn hoàn thành khóa {{course_title}} – chứng chỉ {{certificate_code}} | {{site_name}}",
        heading("Chúc mừng bạn đã hoàn thành khóa học", "{{course_title}}")
        + """
<p>Chào {{learner_name}},</p>
<p>TWings Academy chúc mừng bạn đã hoàn thành khóa học <strong>{{course_title}}</strong>. Chứng chỉ của bạn đã được cấp:</p>
"""
        + info_table(
            [
                ("Khóa học", "{{course_title}}{{#if cohort_name}} – {{cohort_name}}{{/if}}"),
                ("Mã chứng chỉ", "{{certificate_code}}"),
            ]
        )
        + button("{{url}}", "Xem chứng chỉ")
        + """
<p>Trang xác minh công khai ở trên có thể gửi cho nhà tuyển dụng. Bản để in hoặc lưu PDF: <a href="{{url}}in/">{{url}}in/</a>.</p>
""",
        ["learner_name", "course_title", "cohort_name", "certificate_code", "url"],
        f"{AUTO}: khi học viên đủ điều kiện hoàn thành và được cấp chứng chỉ.",
    ),
    # ------------------------------------------------------------------ CRM journeys
    _t(
        "journey_abandoned_checkout",
        "Hành trình: nhắc hoàn tất đăng ký",
        "crm",
        "Hoàn tất đăng ký khóa {{course_title}} – đơn {{order_code}} | {{site_name}}",
        heading("Bạn chỉ còn một bước nữa", "Hoàn tất thanh toán để bắt đầu khóa {{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Bạn đã đăng ký khóa <strong>{{course_title}}</strong> nhưng TWings Academy chưa nhận được học phí. Chỗ học vẫn đang được giữ cho bạn: chỉ cần chuyển khoản theo thông tin dưới đây, hệ thống sẽ tự xác nhận và mở khóa học.</p>
{{payment_details}}
<p>Bạn muốn được tư vấn thêm hoặc chia nhỏ học phí theo kỳ? Trả lời email này, chuyên viên TWings sẽ liên hệ với bạn.</p>
""",
        ["customer_name", "course_title", "order_code", "amount", "payment_details"],
        f"{AUTO} (hành trình CRM, bật/tắt trong Cấu hình hành trình): 1 ngày sau khi đặt mua mà chưa thanh toán.",
    ),
    _t(
        "journey_intake_starting",
        "Hành trình: lớp sắp khai giảng",
        "crm",
        "Lớp {{cohort_name}} khai giảng ngày {{start_date}} | {{site_name}}",
        heading("Lớp học của bạn sắp khai giảng", "{{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Lớp <strong>{{cohort_name}}</strong> của khóa <strong>{{course_title}}</strong> sẽ khai giảng ngày <strong>{{start_date}}</strong>.</p>
{{class_details}}
<p>Học liệu, lịch học và bài tập có sẵn trên TWings LMS: bấm “Đăng nhập bằng TWings” và nhập email <strong>{{customer_email}}</strong>.</p>
"""
        + button("{{lms_url}}", "Vào TWings LMS")
        + "<p>Hẹn gặp bạn tại buổi học đầu tiên!</p>",
        [
            "customer_name",
            "cohort_name",
            "course_title",
            "start_date",
            "class_details",
            "customer_email",
            "lms_url",
        ],
        f"{AUTO} (hành trình CRM): 3 ngày trước ngày khai giảng lớp.",
    ),
    _t(
        "journey_not_started",
        "Hành trình: nhắc bắt đầu học",
        "crm",
        "Bắt đầu khóa {{course_title}} ngay hôm nay | {{site_name}}",
        heading("Bắt đầu hành trình học tập của bạn", "Chỉ cần 20 phút mỗi ngày")
        + """
<p>Chào {{customer_name}},</p>
<p>Khóa <strong>{{course_title}}</strong> đã được mở cho bạn hơn một tuần nhưng bạn chưa bắt đầu bài học nào. Chỉ cần 20 phút mỗi ngày là đủ để theo kịp lộ trình.</p>
"""
        + button("{{lms_url}}", "Vào học ngay")
        + """
<p>Xem tiến độ học tập tại <a href="{{account_url}}">Học phí &amp; hồ sơ</a>. Gặp khó khăn khi đăng nhập hay sắp xếp thời gian? Trả lời email này để được hỗ trợ.</p>
""",
        ["customer_name", "course_title", "lms_url", "account_url"],
        f"{AUTO} (hành trình CRM): 7 ngày sau khi mở khóa học mà học viên chưa vào học.",
    ),
    _t(
        "journey_completed_next",
        "Hành trình: chúc mừng hoàn thành và gợi ý học tiếp",
        "crm",
        "Chúc mừng bạn hoàn thành khóa {{course_title}} | {{site_name}}",
        heading("Chúc mừng bạn đã hoàn thành khóa học", "{{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Cảm ơn bạn đã đồng hành cùng TWings Academy trong khóa <strong>{{course_title}}</strong>.</p>
{{#if certificate_code}}<p>Chứng chỉ của bạn (mã <strong>{{certificate_code}}</strong>) đã được cấp:</p>
"""
        + button("{{certificate_url}}", "Xem chứng chỉ")
        + """{{/if}}
<p>Cảm nhận của bạn giúp TWings nâng cao chất lượng đào tạo và giúp các học viên sau chọn đúng khóa học. Bạn có thể <a href="{{account_url}}">viết đánh giá trong cổng học viên</a> (chỉ mất vài phút, chỉ đăng lên website khi bạn đồng ý).</p>
{{#if suggestions}}<p><strong>Gợi ý học tiếp:</strong></p>
{{suggestions}}{{/if}}
""",
        [
            "customer_name",
            "course_title",
            "certificate_code",
            "certificate_url",
            "account_url",
            "suggestions",
        ],
        f"{AUTO} (hành trình CRM): sau khi học viên hoàn thành khóa học.",
    ),
    _t(
        "appointment_confirmation",
        "Xác nhận lịch hẹn tư vấn",
        "crm",
        "Xác nhận lịch tư vấn {{starts_at}} | {{site_name}}",
        heading("Xác nhận lịch hẹn tư vấn", "Buổi tư vấn cùng chuyên viên TWings Academy")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy xác nhận lịch hẹn tư vấn với bạn:</p>
"""
        + info_table(
            [
                ("Thời gian", "{{starts_at}}"),
                ("Thời lượng", "{{duration}} phút"),
                ("Hình thức", "{{channel}}"),
                ("Chi tiết", WHERE),
                ("Nội dung", "Tư vấn khóa học {{course}}"),
            ]
        )
        + '<p>Nếu cần đổi thời gian, vui lòng trả lời email này hoặc gọi hotline <a href="tel:{{hotline_tel}}" style="font-weight:700;text-decoration:none;">{{hotline}}</a>.</p>',
        ["customer_name", "starts_at", "duration", "channel", "location", "course"],
        f"{AUTO}: khi chuyên viên đặt lịch hẹn tư vấn với khách.",
    ),
    _t(
        "appointment_reminder",
        "Nhắc lịch hẹn tư vấn",
        "crm",
        "Nhắc lịch tư vấn lúc {{starts_at}} | {{site_name}}",
        heading("Nhắc lịch hẹn tư vấn", "Buổi tư vấn sẽ bắt đầu trong vài giờ tới")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy xin nhắc bạn lịch hẹn tư vấn sắp tới:</p>
"""
        + info_table(
            [
                ("Thời gian", "{{starts_at}}"),
                ("Thời lượng", "{{duration}} phút"),
                ("Hình thức", "{{channel}}"),
                ("Chi tiết", WHERE),
                ("Nội dung", "Tư vấn khóa học {{course}}"),
            ]
        )
        + "<p>Chuyên viên TWings sẽ liên hệ với bạn đúng giờ hẹn. Nếu cần đổi lịch, vui lòng trả lời email này.</p>",
        ["customer_name", "starts_at", "duration", "channel", "location", "course"],
        f"{AUTO}: khoảng 2 giờ trước giờ hẹn.",
    ),
    # ------------------------------------------------------------------ scheduling (manual)
    _t(
        "class_rollover_notice",
        "Thông báo chuyển lớp / cập nhật lịch học",
        "scheduling",
        "Cập nhật lớp học khóa {{course_title}} | {{site_name}}",
        heading("Thông báo cập nhật lớp học", "Khóa {{course_title}}")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy thông báo hồ sơ của bạn đã được chuyển sang lớp mới của khóa <strong>{{course_title}}</strong>:</p>
"""
        + info_table(
            [
                ("Lớp mới", "{{batch_cohort}}"),
                ("Ngày khai giảng", "{{start_date}}"),
                ("Địa điểm", "{{location}}"),
                ("Mã hồ sơ", "{{order_code}}"),
            ]
        )
        + """
<p>Học phí đã đóng và các quyền lợi học tập của bạn được giữ nguyên. Nếu lịch học mới chưa phù hợp, vui lòng trả lời email này hoặc liên hệ chuyên viên phụ trách <strong>{{pic}}</strong>.</p>
""",
        ["customer_name", "course_title", "batch_cohort", "start_date", "location", "order_code", "pic"],
        MANUAL + ".",
    ),
    _t(
        "bank_tour_invite",
        "Thư mời tham gia Bank Tour",
        "scheduling",
        "Thư mời tham gia Bank Tour – khóa {{course_title}} | {{site_name}}",
        heading("Thư mời tham gia Bank Tour", "Trải nghiệm thực tế môi trường làm việc tại ngân hàng")
        + """
<p>Chào {{customer_name}},</p>
<p>TWings Academy trân trọng mời bạn tham gia chương trình <strong>Bank Tour</strong> dành cho học viên khóa <strong>{{course_title}}</strong>: tham quan và tìm hiểu thực tế môi trường làm việc tại ngân hàng đối tác.</p>
"""
        + info_table(
            [
                ("Thời gian", "{{start_date}}"),
                ("Địa điểm tập trung", "{{location}}"),
                ("Trang phục", "Lịch sự: áo sơ mi, quần âu hoặc chân váy, giày"),
            ]
        )
        + """
<p>Vui lòng trả lời email này để xác nhận tham gia. Chuyên viên phụ trách: <strong>{{pic}}</strong>.</p>
""",
        ["customer_name", "course_title", "start_date", "location", "pic"],
        MANUAL + ".",
    ),
    # ------------------------------------------------------------------ placement
    _t(
        "placement_interview",
        "Giới thiệu việc làm: lịch phỏng vấn",
        "admission",
        "Lịch phỏng vấn tại {{employer}} | {{site_name}}",
        heading("Bạn được mời phỏng vấn", "{{role}} – {{employer}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Hồ sơ của bạn đã được <strong>{{employer}}</strong> chọn phỏng vấn cho vị trí <strong>{{role}}</strong>.</p>
"""
        + info_table(
            [("Thời gian", "{{interview_time}}"), ("Địa điểm / đường dẫn", "{{interview_location}}")]
        )
        + "<p>Vui lòng trả lời email này để xác nhận tham gia. Chúc bạn phỏng vấn thành công!</p>",
        ["customer_name", "employer", "role", "interview_time", "interview_location"],
        f"{AUTO}: khi chuyên viên cập nhật hồ sơ giới thiệu việc làm sang bước Phỏng vấn.",
    ),
    _t(
        "placement_offer",
        "Giới thiệu việc làm: đề nghị nhận việc",
        "admission",
        "Chúc mừng – {{employer}} gửi đề nghị làm việc | {{site_name}}",
        heading("Chúc mừng bạn đã vượt qua vòng phỏng vấn", "{{role}} – {{employer}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Chúc mừng bạn đã vượt qua vòng phỏng vấn vị trí <strong>{{role}}</strong> tại <strong>{{employer}}</strong>. Bộ phận tuyển dụng của đơn vị sẽ liên hệ với bạn để thống nhất thư mời nhận việc.</p>
<p>Nếu cần TWings hỗ trợ trong quá trình trao đổi, vui lòng trả lời email này.</p>
""",
        ["customer_name", "employer", "role"],
        f"{AUTO}: khi hồ sơ giới thiệu việc làm chuyển sang bước Đề nghị nhận việc.",
    ),
    _t(
        "placement_hired",
        "Giới thiệu việc làm: chính thức nhận việc",
        "admission",
        "Chúc mừng bạn chính thức gia nhập {{employer}} | {{site_name}}",
        heading("Chúc mừng bạn đã nhận việc", "{{role}} – {{employer}}")
        + """
<p>Chào {{customer_name}},</p>
<p>Chúc mừng bạn chính thức nhận việc vị trí <strong>{{role}}</strong> tại <strong>{{employer}}</strong>, ngày bắt đầu <strong>{{start_date}}</strong>.</p>
<p>TWings Academy sẽ tiếp tục đồng hành cùng bạn trong thời gian thử việc. Có bất kỳ khó khăn nào, hãy trả lời email này.</p>
""",
        ["customer_name", "employer", "role", "start_date"],
        f"{AUTO}: khi hồ sơ giới thiệu việc làm chuyển sang bước Đã nhận việc.",
    ),
    # ------------------------------------------------------------------ security
    _t(
        "auth_otp",
        "Mã đăng nhập (OTP)",
        "security",
        "{{code}} là mã đăng nhập {{site_name}} của bạn",
        heading("Mã đăng nhập của bạn")
        + """
<p>Xin chào,</p>
<p>Dùng mã dưới đây để đăng nhập cổng học viên TWings Academy bằng email <strong>{{email}}</strong>:</p>
"""
        + code_box("{{code}}")
        + """
<p>Mã có hiệu lực trong 10 phút và chỉ dùng được một lần. Không chia sẻ mã này với bất kỳ ai, kể cả nhân viên TWings.</p>
<p style="color:#64748B;font-size:13px;">Nếu bạn không yêu cầu đăng nhập, hãy bỏ qua email này: tài khoản của bạn vẫn an toàn.</p>
""",
        ["code", "email"],
        f"{AUTO}: khi đăng nhập cổng học viên bằng email. Mẫu bảo mật: chỉ quản trị hệ thống sửa được.",
    ),
    _t(
        "staff_password_reset",
        "Đặt lại mật khẩu tài khoản quản trị",
        "security",
        "Đặt lại mật khẩu tài khoản quản trị | {{site_name}}",
        heading("Đặt lại mật khẩu", "Tài khoản quản trị {{email}}")
        + """
<p>Chào {{name}},</p>
<p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản quản trị TWings <strong>{{email}}</strong>.</p>
"""
        + button("{{reset_link}}", "Đặt mật khẩu mới")
        + """
<p>Liên kết dùng một lần và hết hạn sau 1 giờ.</p>
<p style="color:#64748B;font-size:13px;">Nếu bạn không yêu cầu, hãy bỏ qua email này và báo cho quản trị hệ thống. Mật khẩu hiện tại vẫn giữ nguyên.</p>
""",
        ["name", "email", "reset_link"],
        f"{AUTO}: khi nhân viên bấm “Quên mật khẩu”. Mẫu bảo mật: chỉ quản trị hệ thống sửa được.",
    ),
    # ------------------------------------------------------------------ corporate (TNTalent)
    _t(
        "corporate_invitation",
        "Doanh nghiệp: thư mời tham gia lớp",
        "corporate",
        "Thư mời tham gia lớp {{course_title}} – {{cohort_name}} | {{site_name}}",
        heading("Thư mời tham gia lớp đào tạo", "{{course_title}} – {{cohort_name}}")
        + """
<p>Chào {{learner_name}},</p>
<p>Đơn vị của bạn đã đăng ký cho bạn tham gia lớp đào tạo <strong>{{course_title}} – {{cohort_name}}</strong>.</p>
{{class_details}}
<p>Lịch học chi tiết được đính kèm trong tệp <strong>lich-hoc.ics</strong>: mở tệp để thêm lịch vào Outlook, Google Calendar hoặc điện thoại.</p>
<p><strong>Vào học trực tuyến:</strong> mở <a href="{{learn_url}}">{{learn_url}}</a>, bấm “Đăng nhập bằng TWings”, nhập email <strong>{{learner_email}}</strong> và mã xác thực 6 chữ số được gửi tới hộp thư.</p>
"""
        + button("{{learn_url}}", "Vào học trực tuyến", CORPORATE)
        + """
<p>Ở mỗi buổi học, vui lòng điểm danh bằng cách quét mã QR do giảng viên trình chiếu.</p>
<p>Cần hỗ trợ, vui lòng trả lời email này.</p>
""",
        ["learner_name", "course_title", "cohort_name", "class_details", "learn_url", "learner_email"],
        f"{AUTO}: khi cán bộ đào tạo gửi thư mời lớp doanh nghiệp (CC cán bộ quản lý, kèm lịch .ics).",
        brand="corporate",
    ),
    _t(
        "corporate_lms_access",
        "Doanh nghiệp: lớp đã mở và hướng dẫn vào học",
        "corporate",
        "Lớp {{course_title}} đã mở – hướng dẫn vào học | {{site_name}}",
        heading("Lớp học của bạn đã mở", "{{course_title}} – {{cohort_name}}")
        + """
<p>Chào {{learner_name}},</p>
<p>Lớp <strong>{{course_title}} – {{cohort_name}}</strong> mà đơn vị của bạn đăng ký đã được mở trên hệ thống học trực tuyến.</p>
<p><strong>Cách vào học:</strong></p>
<ol style="margin:0 0 14px 0;padding-left:20px;">
<li style="margin-bottom:4px;">Mở <a href="{{url}}">{{url}}</a></li>
<li style="margin-bottom:4px;">Bấm nút <strong>“Đăng nhập bằng TWings”</strong></li>
<li>Nhập email <strong>{{email}}</strong> và mã 6 chữ số được gửi tới hộp thư này</li>
</ol>
"""
        + button("{{url}}", "Vào học ngay", CORPORATE)
        + """
{{intake_block}}
<p>Điểm danh tại lớp: quét mã QR do giảng viên trình chiếu ở mỗi buổi học (cần đăng nhập như trên).</p>
<p>Cần hỗ trợ, vui lòng trả lời email này.</p>
""",
        ["learner_name", "course_title", "cohort_name", "url", "email", "intake_block"],
        f"{AUTO}: khi học viên doanh nghiệp được ghi danh vào lớp trên LMS.",
        brand="corporate",
    ),
    # ------------------------------------------------------------------ corporate results (batches, approved by staff)
    _t(
        "corporate_results",
        "Doanh nghiệp: kết quả khóa học gửi học viên",
        "corporate",
        "Kết quả khóa học {{course_title}} – {{cohort_name}} | {{site_name}}",
        heading("Kết quả khóa học", "{{course_title}} – {{cohort_name}}")
        + """
<p>Chào {{learner_name}},</p>
{{#if is_correction}}"""
        + CORRECTION
        + """{{/if}}
<p>Lớp <strong>{{course_title}} – {{cohort_name}}</strong> đã kết thúc. Kết quả của bạn:</p>
{{result_details}}
{{message}}
<p>Tài liệu và nội dung khóa học vẫn xem được trên hệ thống học trực tuyến.</p>
"""
        + button("{{learn_url}}", "Xem lại khóa học", CORPORATE)
        + """
<p>Cần hỗ trợ, vui lòng trả lời email này.</p>
""",
        [
            "learner_name",
            "course_title",
            "cohort_name",
            "result_details",
            "is_correction",
            "message",
            "learn_url",
        ],
        f"{AUTO}: khi lô thư kết quả của lớp doanh nghiệp được duyệt và gửi (CC quản lý trực tiếp). Tiêu đề mặc định của lô lấy từ mẫu này.",
        brand="corporate",
    ),
    _t(
        "corporate_manager_digest",
        "Doanh nghiệp: kết quả nhân viên gửi quản lý",
        "corporate",
        "Kết quả học tập của nhân viên – {{course_title}} – {{cohort_name}} | {{site_name}}",
        heading("Kết quả học tập của nhân viên", "{{course_title}} – {{cohort_name}}")
        + """
<p>Kính gửi {{#if manager_name}}{{manager_name}}{{else}}Anh/Chị{{/if}},</p>
{{#if is_correction}}"""
        + CORRECTION
        + """{{/if}}
<p>Lớp <strong>{{course_title}} – {{cohort_name}}</strong> đã kết thúc. Kết quả của {{staff_count}} nhân viên thuộc quyền quản lý của Anh/Chị:</p>
{{results_table}}
{{message}}
<p>Cần trao đổi thêm, vui lòng trả lời email này.</p>
""",
        [
            "manager_name",
            "course_title",
            "cohort_name",
            "staff_count",
            "results_table",
            "is_correction",
            "message",
        ],
        f"{AUTO}: khi lô thư tổng hợp kết quả cho quản lý trực tiếp được duyệt và gửi. Tiêu đề mặc định của lô lấy từ mẫu này.",
        brand="corporate",
    ),
    # ------------------------------------------------------------------ internal notices (to staff; no signature, not archived)
    _t(
        "crm_lead_assigned",
        "Nội bộ: lead được giao cho tư vấn viên",
        "internal",
        "[TWings CRM] {{assignment_label}}: {{customer_name}} – {{course_title}}",
        heading("{{assignment_title}}", "Mã đơn {{order_code}}")
        + info_table(
            [
                ("Khách hàng", "{{customer_name}}"),
                ("Điện thoại", "{{customer_phone}}"),
                ("Email", "{{customer_email}}"),
                ("Quan tâm", "{{course_title}}"),
                ("Nguồn", "{{source}}"),
                ("Hạn liên hệ lần đầu", "{{response_due}}"),
            ]
        )
        + button("{{crm_url}}", "Mở CRM"),
        [
            "assignment_label",
            "assignment_title",
            "customer_name",
            "customer_phone",
            "customer_email",
            "course_title",
            "source",
            "response_due",
            "order_code",
            "crm_url",
        ],
        f"{AUTO}: gửi tư vấn viên khi được giao lead mới hoặc được chuyển lead.",
    ),
    _t(
        "crm_lead_unassigned",
        "Nội bộ: lead mới chưa có người nhận",
        "internal",
        "[TWings CRM] Lead chưa có người nhận: {{customer_name}}",
        heading("Lead mới chưa có người nhận", "Mọi tư vấn viên đang tắt nhận lead")
        + """
<p>Lead dưới đây chưa được giao cho tư vấn viên nào:</p>
{{lead_list}}
"""
        + button("{{crm_url}}", "Phân công trong CRM"),
        ["customer_name", "lead_list", "crm_url"],
        f"{AUTO}: gửi quản lý tuyển sinh khi có lead mới mà không tư vấn viên nào đang nhận lead.",
    ),
    _t(
        "crm_leads_overdue",
        "Nội bộ: nhắc tư vấn viên lead quá hạn liên hệ",
        "internal",
        "[TWings CRM] {{lead_count}} lead quá hạn liên hệ",
        heading("Lead quá hạn liên hệ lần đầu", "Cam kết liên hệ trong {{response_hours}} giờ làm việc")
        + """
<p>Các lead dưới đây đã quá hạn liên hệ lần đầu:</p>
{{lead_list}}
"""
        + button("{{crm_url}}", "Mở danh sách hôm nay"),
        ["lead_count", "response_hours", "lead_list", "crm_url"],
        f"{AUTO}: mỗi 30 phút trong giờ làm việc, gửi tư vấn viên một lần cho mỗi lead quá hạn.",
    ),
    _t(
        "crm_leads_escalation",
        "Nội bộ: báo quản lý lead chưa được xử lý",
        "internal",
        "[TWings CRM] {{lead_count}} lead cần quản lý xử lý",
        heading("Lead cần quản lý xử lý", "{{lead_count}} lead")
        + """
{{#if late_list}}<p><strong>Quá hạn liên hệ lâu</strong> (gấp đôi cam kết {{response_hours}} giờ):</p>
{{late_list}}{{/if}}
{{#if unassigned_list}}<p><strong>Chưa có tư vấn viên</strong>:</p>
{{unassigned_list}}{{/if}}
"""
        + button("{{crm_url}}", "Mở CRM để phân công / nhắc tư vấn viên"),
        ["lead_count", "late_list", "unassigned_list", "response_hours", "crm_url"],
        f"{AUTO}: mỗi 30 phút trong giờ làm việc, gửi quản lý tuyển sinh các lead quá gấp đôi hạn liên hệ hoặc chưa có tư vấn viên.",
    ),
    _t(
        "crm_appointment_staff_reminder",
        "Nội bộ: nhắc tư vấn viên lịch hẹn",
        "internal",
        "[TWings CRM] {{appointment_time}} hẹn tư vấn {{customer_name}}",
        heading("Nhắc lịch hẹn tư vấn", "{{starts_at}}")
        + info_table(
            [
                ("Khách hàng", "{{customer_name}}"),
                ("Điện thoại", "{{customer_phone}}"),
                ("Khóa quan tâm", "{{course}}"),
                ("Hình thức", "{{channel}}"),
                ("Thời lượng", "{{duration}} phút"),
            ]
        )
        + button("{{crm_url}}", "Mở CRM"),
        [
            "appointment_time",
            "starts_at",
            "customer_name",
            "customer_phone",
            "course",
            "channel",
            "duration",
            "crm_url",
        ],
        f"{AUTO}: khoảng 2 giờ trước lịch hẹn tư vấn, gửi tư vấn viên phụ trách (học viên nhận mẫu “Nhắc lịch hẹn”).",
    ),
    _t(
        "corporate_request_sla",
        "Nội bộ: yêu cầu doanh nghiệp sắp đến hạn SLA",
        "internal",
        "[{{site_name}}] {{request_count}} yêu cầu khách hàng cần xử lý (SLA)",
        heading("Yêu cầu khách hàng cần xử lý", "Quá hạn hoặc sắp đến hạn SLA")
        + """
<p>Các yêu cầu đào tạo dưới đây quá hạn hoặc sắp đến hạn SLA:</p>
{{request_list}}
<p>Cập nhật trạng thái trong mục Đào tạo doanh nghiệp → Yêu cầu &amp; SLA.</p>
"""
        + button("{{requests_url}}", "Mở danh sách yêu cầu", CORPORATE),
        ["request_count", "request_list", "requests_url"],
        f"{AUTO}: sáng các ngày làm việc, gửi người phụ trách (yêu cầu chưa giao: hộp thư đào tạo doanh nghiệp).",
        brand="corporate",
    ),
]

BY_CODE = {t["code"]: t for t in TEMPLATES}

# Notices to staff: sent without the signature, never archived (BCC) and always at once.
INTERNAL = frozenset(t["code"] for t in TEMPLATES if t["category"] == "internal")
