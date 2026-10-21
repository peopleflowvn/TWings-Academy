# TMS B2B – Các câu cần nghiệp vụ / lãnh đạo trả lời

Ngày 21/10/2026 lãnh đạo đã chốt: **dùng mặc định / đề xuất cho mọi câu**, nghiệm thu dùng **mẫu chuẩn mặc định**
(chỉnh khi có mẫu khách hàng), **TNTalent cho B2B, TWings cho B2C**. Bảng dưới ghi cách hệ thống đang chạy; chỉ những
dòng ⏳ còn cần thêm thông tin (không chặn vận hành). ✅ đã chốt · ⏳ còn chờ thông tin.

Kế hoạch: [KE_HOACH_TICH_HOP_TMS_VAO_TWINGS_ACADEMY_V6.md](KE_HOACH_TICH_HOP_TMS_VAO_TWINGS_ACADEMY_V6.md) ·
hướng dẫn: [TMS_HUONG_DAN_SU_DUNG.md](TMS_HUONG_DAN_SU_DUNG.md).

## A. Dữ liệu và biểu mẫu thật

| # | Nội dung | Đang chạy | TT |
|---|---|---|---|
| A1–A2 | Mẫu nghiệm thu MSB / ROX | **Mẫu chuẩn mặc định**: biên bản nghiệm thu (quốc hiệu, căn cứ hợp đồng, Bên A / Bên B, Điều 1 khối lượng – giá trị – số tiền bằng chữ, Điều 2 chất lượng, Điều 3 thanh toán theo hạn hợp đồng, Điều 4 số bản, chữ ký) + bảng kê theo lớp + danh sách học viên. Có mẫu khách hàng thì chỉnh thêm | ✅ (chỉnh khi có mẫu) |
| A3 | File kế hoạch / DSHV thật | Nhận cột theo tiêu đề tiếng Việt phổ biến; tiêu đề khác thường thì tạo mẫu nhập riêng cho khách hàng trong hệ thống | ✅ |
| A4 | Báo cáo sau đào tạo khách hàng đang nhận | Kết quả đã chốt + KPI lớp (Excel, link báo cáo khách hàng, thư học viên, thư CBQL) | ✅ |
| A5 | Bảng kê chi phí thực tế | Hạng mục: giảng viên, phòng học, đi lại, in ấn / tài liệu, ăn uống, thiết bị, khác | ✅ |
| A6 | Checklist hồ sơ | DSHV, điểm danh có ký, kết quả, khảo sát, biên bản nghiệm thu, hóa đơn | ✅ |

## B. Quy tắc nghiệp vụ (đều theo mặc định)

| # | Quy tắc | TT |
|---|---|---|
| B1 | Chứng chỉ TWings cho học viên doanh nghiệp: không cấp, bật theo từng lớp nếu hợp đồng có | ✅ |
| B2 | Điều kiện hoàn thành: nhân viên đặt theo từng lớp; thiếu dữ liệu = "Chờ xác minh" | ✅ |
| B3 | Đơn giá theo học viên: mặc định học viên trong danh sách lúc chốt kết quả (chọn được khi lập đợt) | ✅ |
| B4 | Theo buổi / giờ: buổi đã diễn ra tới ngày cuối kỳ nghiệm thu | ✅ |
| B5 | Vắng có phép tính là không có mặt; "Học bù" (đã duyệt) tính là có mặt | ✅ |
| B6 | Người có quyền "Duyệt (doanh nghiệp)" duyệt; được tự duyệt, mọi thao tác có nhật ký | ✅ |
| B7 | Nhân sự nội bộ thấy mọi khách hàng (đã có sẵn và đã kiểm thử cơ chế giới hạn nếu cần sau này) | ✅ |
| B8 | CC: CBQL hiện tại + CC mặc định của khách hàng; không BCC; có thêm thư tổng hợp cho từng CBQL | ✅ |

## C. Cấu hình, hạ tầng

| # | Nội dung | Đang chạy | TT |
|---|---|---|---|
| C1 | Tên miền nội bộ được nhận CC | Biến `CORPORATE_INTERNAL_EMAIL_DOMAINS` (đang trống = chỉ tên miền gửi thư). Khi có danh sách (ví dụ tntalent.vn) thì điền vào `.env` | ⏳ |
| C2 | Thương hiệu / địa chỉ gửi thư B2B | **TNTalent** cho mọi thư, trang và tài liệu B2B; người gửi "TNTalent &lt;địa chỉ gửi hiện có&gt;". Muốn gửi từ tên miền TNTalent: xác minh tên miền trên Resend rồi đặt `CORPORATE_FROM_EMAIL` | ✅ (tên miền riêng ⏳) |
| C3 | Thông tin pháp nhân TNTalent in lên biên bản | Biến `CORPORATE_PROVIDER_*` (tên, địa chỉ, MST, người đại diện, chức vụ); đang trống thì in dòng chấm để điền tay. Màu thương hiệu `CORPORATE_BRAND_COLOR` | ⏳ (cần thông tin) |
| C4 | Staging | Thử nghiệm bằng dữ liệu giả trong CI (e2e trên trình duyệt, Moodle thật cho phần tích hợp) | ✅ |
| C5 | Tải thí điểm | Thiết kế cho lớp tới ~100 người quét QR trong vài phút; đo khi chạy lớp thật đầu tiên | ✅ |
| C6, C9 | Khảo sát chuẩn | Nhân viên tạo hoạt động Feedback trong khóa mẫu Moodle (ẩn danh hoặc ghi tên); hệ thống đọc mọi khảo sát | ✅ |
| C7 | Link báo cáo cho khách hàng | Mặc định 30 ngày (tối đa 180), thu hồi được | ✅ |
| C8 | Diễn tập khôi phục backup | Đã được đồng ý | ✅ |

---
*Cập nhật: 21/10/2026, sau quyết định của lãnh đạo.*
