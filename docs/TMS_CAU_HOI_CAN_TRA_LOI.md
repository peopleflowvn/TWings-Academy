# TMS B2B – Các câu cần nghiệp vụ / lãnh đạo trả lời

Danh sách gom lại để trả lời một lần. Mỗi câu ghi **mặc định đang dùng**: hệ thống đã chạy theo mặc định đó, trả lời
khác thì chỉ cần cấu hình hoặc sửa nhỏ, không chặn phát triển. Trạng thái: ⏳ chưa trả lời · ✅ đã trả lời.

Kế hoạch tổng thể: [KE_HOACH_TICH_HOP_TMS_VAO_TWINGS_ACADEMY_V6.md](KE_HOACH_TICH_HOP_TMS_VAO_TWINGS_ACADEMY_V6.md).

## A. Dữ liệu và biểu mẫu thật (cần file)

| # | Cần cung cấp | Dùng cho | Mặc định đang dùng | TT |
|---|---|---|---|---|
| A1 | Mẫu biên bản / bảng kê **nghiệm thu MSB** (file Excel đang dùng) | Xuất nghiệm thu đúng mẫu khách hàng | Xuất theo mẫu chung của TWings (thông tin HĐ, kỳ, danh sách lớp, khối lượng × đơn giá, VAT, tổng) | ⏳ |
| A2 | Mẫu nghiệm thu **ROX** | Như trên | Như trên | ⏳ |
| A3 | 1 file **kế hoạch đào tạo** và 1 file **DSHV có CBQL** thật của mỗi khách hàng (bản được phép dùng thử) | Kiểm tra nhận cột khi nhập Excel; tạo mẫu nhập riêng nếu tiêu đề khác thường | Nhận cột theo tiêu đề tiếng Việt phổ biến (Họ tên, Email, Mã CBNV, Phòng ban, Email CBQL…) | ⏳ |
| A4 | 1 **báo cáo sau đào tạo** khách hàng đang nhận | Báo cáo 4 góc nhìn (tuần 7) | Báo cáo theo bản kết quả đã chốt + KPI lớp | ⏳ |
| A5 | **Bảng kê chi phí** thực tế của 1 lớp (giảng viên, phòng, ăn uống…) | Hạng mục chi phí (tuần 7) | Hạng mục: giảng viên, phòng học, đi lại, in ấn/tài liệu, ăn uống, thiết bị, khác | ⏳ |
| A6 | **Checklist hồ sơ** nghiệm thu của mỗi khách hàng | Checklist hồ sơ theo hợp đồng | Danh sách chung: DSHV, điểm danh, kết quả, khảo sát, biên bản nghiệm thu, hóa đơn | ⏳ |

## B. Quy tắc nghiệp vụ

| # | Câu hỏi | Mặc định đang dùng | TT |
|---|---|---|---|
| B1 | Học viên doanh nghiệp hoàn thành có được cấp **chứng chỉ TWings (TWC-…)** không? | Không cấp; bật theo từng lớp (ô "Cấp chứng chỉ TWings") nếu hợp đồng có | ⏳ |
| B2 | **Điều kiện hoàn thành** mặc định (chuyên cần tối thiểu, điểm tối thiểu, bắt buộc khảo sát, phải hoàn thành trên Moodle)? | Không áp điều kiện nào cho tới khi nhân viên đặt ở từng lớp | ⏳ |
| B3 | Đơn giá **theo học viên** khi nghiệm thu tính trên: học viên trong danh sách, học viên có đi học ít nhất 1 buổi, hay học viên đạt? | Học viên trong danh sách lớp lúc chốt kết quả (chọn được khi lập đợt nghiệm thu) | ⏳ |
| B4 | Đơn giá **theo buổi / theo giờ**: chỉ tính buổi đã diễn ra, hay theo lịch đã chốt? | Buổi đã diễn ra tính đến ngày cuối kỳ nghiệm thu; giờ = tổng thời lượng các buổi đó | ⏳ |
| B5 | **Vắng có phép** có tính vào mẫu số chuyên cần không? | Có tính (vắng có phép = không có mặt); điều chỉnh "Học bù" mới tính là có mặt | ⏳ |
| B6 | Ai **duyệt**: điều chỉnh điểm danh, phát hành kết quả, lô email, đợt nghiệm thu? Có cần người duyệt khác người đề nghị (4 mắt) không? | Người có quyền "Duyệt (doanh nghiệp)" duyệt; cùng một người được tự duyệt, mọi thao tác có nhật ký | ⏳ |
| B7 | Nhân sự nội bộ có cần **giới hạn theo khách hàng** (chỉ thấy khách hàng mình phụ trách) không? | Ai có quyền xem đào tạo doanh nghiệp thì thấy mọi khách hàng (đã chuẩn bị sẵn chỗ để giới hạn) | ⏳ |
| B8 | Khi gửi thư kết quả, ngoài CBQL trực tiếp còn **CC ai** (phòng đào tạo khách hàng, PIC nội bộ…)? | CBQL hiện tại + "CC mặc định" khai ở khách hàng; BCC: không | ⏳ |

## C. Cấu hình, hạ tầng, pháp lý

| # | Câu hỏi | Mặc định đang dùng | TT |
|---|---|---|---|
| C1 | **Tên miền nội bộ** được phép nhận CC (ví dụ tntalent.vn, twings.edu.vn) → biến `CORPORATE_INTERNAL_EMAIL_DOMAINS` trên production | Chỉ tên miền gửi thư của Resend | ⏳ |
| C2 | Thư B2B gửi từ **địa chỉ / thương hiệu** nào (TNTalent hay TWings)? Ai cấu hình DNS cho tên miền gửi trên Resend? | Gửi như thư TWings hiện nay, khung thư TWings | ⏳ |
| C3 | Logo / màu / chân thư **TNTalent** (nếu dùng thương hiệu TNTalent cho thư và file xuất) | Chưa áp | ⏳ |
| C4 | **Staging**: dựng thêm một bản trên VPS (tốn RAM) hay dùng máy khác? | Thử nghiệm bằng dữ liệu giả trên CI; chưa thử dữ liệu thật | ⏳ |
| C5 | **Tải thí điểm**: số học viên mỗi lớp, số lớp chạy song song, số người quét QR cùng lúc | Thiết kế cho lớp tới ~100 người quét QR trong vài phút | ⏳ |
| C6 | Khảo sát chuẩn: **bộ câu hỏi** khảo sát cuối khóa (để tạo sẵn trong khóa mẫu Moodle), ẩn danh hay ghi tên? | Nhân viên tự tạo hoạt động Feedback trên Moodle; hệ thống đọc mọi khảo sát của lớp | ⏳ |
| C7 | Khách hàng có cần **tự xem báo cáo** qua link (không cần tài khoản) không? Link hết hạn sau bao lâu? | Sẽ làm link có hạn 30 ngày, chỉ xem được dữ liệu khách hàng đó (tuần 7) | ⏳ |

---
*Cập nhật lần cuối: 21/10/2026, khi bắt đầu tuần 6 (nghiệm thu).*
